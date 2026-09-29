import { TranscriptSegment } from '../transcription/types';
import { LectureAnalysis, Topic, Definition } from './types';

export interface TranscriptChunk {
  chunkIndex: number;
  totalChunks: number;
  startTime: number;
  endTime: number;
  text: string;
  formattedWithTimestamps: string;
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) {
    return `[${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  }
  return `[${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
}

/**
 * Splits transcript segments into manageable chunks that fit within standard local LLM context windows (e.g., 2000-3000 words).
 */
export function chunkTranscript(segments: TranscriptSegment[], maxWordsPerChunk = 1200): TranscriptChunk[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  const chunks: TranscriptChunk[] = [];
  let currentSegments: TranscriptSegment[] = [];
  let currentWordCount = 0;

  for (const seg of segments) {
    const segWordCount = seg.text.split(/\s+/).filter(Boolean).length;

    if (currentWordCount + segWordCount > maxWordsPerChunk && currentSegments.length > 0) {
      const startTime = currentSegments[0].start;
      const endTime = currentSegments[currentSegments.length - 1].end;
      const text = currentSegments.map((s) => s.text).join(' ');
      const formattedWithTimestamps = currentSegments
        .map((s) => `${formatTimestamp(s.start)} ${s.text}`)
        .join('\n');

      chunks.push({
        chunkIndex: chunks.length,
        totalChunks: 0, // Assigned below
        startTime,
        endTime,
        text,
        formattedWithTimestamps,
      });

      currentSegments = [];
      currentWordCount = 0;
    }

    currentSegments.push(seg);
    currentWordCount += segWordCount;
  }

  if (currentSegments.length > 0) {
    const startTime = currentSegments[0].start;
    const endTime = currentSegments[currentSegments.length - 1].end;
    const text = currentSegments.map((s) => s.text).join(' ');
    const formattedWithTimestamps = currentSegments
      .map((s) => `${formatTimestamp(s.start)} ${s.text}`)
      .join('\n');

    chunks.push({
      chunkIndex: chunks.length,
      totalChunks: 0,
      startTime,
      endTime,
      text,
      formattedWithTimestamps,
    });
  }

  // Update totalChunks
  for (const chunk of chunks) {
    chunk.totalChunks = chunks.length;
  }

  return chunks;
}

/**
 * Merges multiple chunk-level analyses into a unified coherent LectureAnalysis.
 */
export function mergeChunkAnalyses(analyses: LectureAnalysis[], overallTitle = 'Lecture Analysis'): LectureAnalysis {
  if (analyses.length === 0) {
    return {
      title: overallTitle,
      summary: 'No transcript content to analyze.',
      topics: [],
      keyConcepts: [],
      definitions: [],
      importantFacts: [],
      uncertainties: [],
      studyQuestions: [],
    };
  }

  if (analyses.length === 1) {
    return analyses[0];
  }

  // Combine summaries
  const combinedSummary = analyses.map((a) => a.summary).filter(Boolean).join('\n\n');

  // Deduplicate and merge topics
  const topics: Topic[] = [];
  const seenTopicNames = new Set<string>();

  for (const a of analyses) {
    for (const t of a.topics) {
      const norm = t.topicName.toLowerCase().trim();
      if (!seenTopicNames.has(norm)) {
        seenTopicNames.add(norm);
        topics.push(t);
      }
    }
  }

  // Deduplicate definitions
  const definitions: Definition[] = [];
  const seenTerms = new Set<string>();

  for (const a of analyses) {
    for (const d of a.definitions) {
      const norm = d.term.toLowerCase().trim();
      if (!seenTerms.has(norm)) {
        seenTerms.add(norm);
        definitions.push(d);
      }
    }
  }

  // Deduplicate strings
  const keyConcepts = Array.from(new Set(analyses.flatMap((a) => a.keyConcepts)));
  const importantFacts = Array.from(new Set(analyses.flatMap((a) => a.importantFacts)));
  const uncertainties = Array.from(new Set(analyses.flatMap((a) => a.uncertainties)));
  const studyQuestions = Array.from(new Set(analyses.flatMap((a) => a.studyQuestions)));

  return {
    title: analyses[0].title || overallTitle,
    summary: combinedSummary,
    topics,
    keyConcepts,
    definitions,
    importantFacts,
    uncertainties,
    studyQuestions,
  };
}
