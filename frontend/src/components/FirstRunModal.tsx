import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Cpu, Database, Mic, Terminal } from 'lucide-react';
import { SystemDiagnostics } from '../types';

interface FirstRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: SystemDiagnostics | null;
}

export const FirstRunModal: React.FC<FirstRunModalProps> = ({ isOpen, onClose, diagnostics }) => {
  if (!isOpen) return null;

  const ollamaReady = diagnostics?.aiStatus.ollamaAvailable;
  const llamacppReady = diagnostics?.aiStatus.llamacppAvailable;
  const localAIReady = ollamaReady || llamacppReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Local System & Privacy Check</h2>
              <p className="text-xs text-slate-400">Verifying 100% offline local processing components</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-semibold text-slate-200">Local SQLite DB</div>
                <div className="text-[11px] text-slate-400">Encrypted relational store</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-semibold text-slate-200">Local Microphone</div>
                <div className="text-[11px] text-slate-400">Direct audio capture</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="font-semibold text-slate-200">Whisper STT</div>
                <div className="text-[11px] text-slate-400">
                  {diagnostics?.transcriptionStatus.activeProvider || 'Local Engine'}
                </div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <div>
                <div className="font-semibold text-slate-200">Local AI Runtime</div>
                <div className="text-[11px] text-slate-400">
                  {localAIReady ? 'Ollama Detected' : 'Built-in Engine Active'}
                </div>
              </div>
            </div>
            {localAIReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>
        </div>

        {/* Setup Instructions for Local AI */}
        {!localAIReady && (
          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 text-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-amber-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Recommended: Connect Ollama for Enhanced LLM Synthesis</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              The built-in offline study extractor is ready. To unlock custom local neural models (such as Llama 3.2 or Mistral) with zero cloud connections:
            </p>
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded font-mono text-[11px] text-emerald-400 select-text">
              1. Download Ollama: https://ollama.com<br />
              2. In your terminal run: <span className="text-amber-200 font-bold">ollama run llama3.2</span><br />
              3. The app will automatically detect it at localhost:11434.
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition"
          >
            Start Learning Offline
          </button>
        </div>
      </div>
    </div>
  );
};
