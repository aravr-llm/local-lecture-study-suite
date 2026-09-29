import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, AlertCircle, Volume2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

interface AudioRecorderProps {
  onRecordingComplete: (lectureId: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [lectureTitle, setLectureTitle] = useState('Physics Lecture - Mechanics');
  const [lectureSubject, setLectureSubject] = useState('Physics');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [quality, setQuality] = useState<'standard' | 'high'>('high');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to record');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Enumerate microphone input devices
  useEffect(() => {
    async function getMicrophones() {
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devList.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.warn('Microphone enumeration notice:', err);
      }
    }
    getMicrophones();
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      setStatusMessage('Creating lecture session...');

      // 1. Create lecture in database
      const { lecture } = await api.createLecture({
        title: lectureTitle.trim() || 'Untitled Lecture',
        subject: lectureSubject.trim() || 'General',
      });
      setCurrentLectureId(lecture.id);

      // 2. Request user microphone stream
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // 3. Audio visualizer setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // 4. MediaRecorder with incremental chunks streaming to backend
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: quality === 'high' ? 128000 : 64000,
      });

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && lecture.id) {
          try {
            await fetch(`/api/lectures/${lecture.id}/audio-chunk?format=webm`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: e.data,
            });
          } catch (err) {
            console.error('Error streaming chunk to local storage:', err);
          }
        }
      };

      // Stream chunks every 3 seconds incrementally to prevent memory bloat
      recorder.start(3000);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setStatusMessage('Recording active... writing audio locally');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Microphone access denied or audio device failure');
      setStatusMessage('Error starting recording');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
      setStatusMessage('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      setStatusMessage('Recording active');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !currentLectureId) return;

    setStatusMessage('Finalizing local audio recording...');
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    mediaRecorderRef.current.stop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);

    // Wait 500ms to allow final chunk to upload
    await new Promise((r) => setTimeout(r, 500));

    try {
      await api.finishRecording(currentLectureId, {
        durationSeconds: duration,
        format: 'webm',
      });
      setStatusMessage('Lecture saved locally! AI pipeline launched in background.');
      onRecordingComplete(currentLectureId);
    } catch (err: any) {
      setError(err.message || 'Failed to finalize lecture');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Title and Subject inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Lecture Title
            </label>
            <input
              type="text"
              disabled={isRecording}
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="e.g. Introduction to Neuroscience"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Subject
              </label>
              <input
                type="text"
                disabled={isRecording}
                value={lectureSubject}
                onChange={(e) => setLectureSubject(e.target.value)}
                placeholder="e.g. Biology"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Quality
              </label>
              <select
                disabled={isRecording}
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
              >
                <option value="high">High Quality (128 kbps Opus)</option>
                <option value="standard">Standard Quality (64 kbps Opus)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Microphone Device
            </label>
            <select
              disabled={isRecording}
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
            >
              {devices.length === 0 && <option value="">Default Microphone</option>}
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Audio Visualizer and Timer */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-xs font-semibold tracking-wider uppercase">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isRecording ? (isPaused ? 'bg-amber-400 animate-pulse' : 'bg-rose-500 animate-ping') : 'bg-slate-600'
              }`}
            />
            <span className={isRecording ? (isPaused ? 'text-amber-400' : 'text-rose-400') : 'text-slate-400'}>
              {isRecording ? (isPaused ? 'Recording Paused' : 'Recording Live') : 'Microphone Ready'}
            </span>
          </div>

          <div className="font-mono text-5xl font-bold tracking-tight text-white">
            {formatTime(duration)}
          </div>

          {/* Decibel audio meter */}
          <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-75 rounded-full ${
                audioLevel > 70 ? 'bg-rose-500' : audioLevel > 35 ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
              style={{ width: `${audioLevel}%` }}
            />
          </div>

          <div className="text-xs text-slate-400">{statusMessage}</div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-rose-600/30 transition active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording Lecture</span>
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 transition"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              )}

              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/40 font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg transition"
              >
                <Square className="w-4 h-4 text-rose-400 fill-current" />
                <span>Stop & Process</span>
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center space-x-2 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            Audio streams directly to your local drive. Never uploaded.
          </span>
          <span>Background processing continues if you switch tabs</span>
        </div>
      </div>
    </div>
  );
};
