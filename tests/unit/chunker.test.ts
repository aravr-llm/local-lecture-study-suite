import { describe, it, expect } from 'vitest';
import { chunkTranscript, mergeChunkAnalyses } from '../../backend/ai/chunker';
import { TranscriptSegment } from '../../backend/transcription/types';
import { LectureAnalysis } from '../../backend/ai/types';

describe('Transcript Chunker & Map-Reduce Synthesizer', () => {
  it('splits long segments into bounded chunks while preserving timestamps', () => {
    const segments: TranscriptSegment[] = [];
    for (let i = 0; i < 50; i++) {
      segments.push({
        start: i * 10,
        end: (i + 1) * 10,
        text: `Segment ${i} discusses concept ${i} with extended explanation to fill word count.`,
      });
    }

    const chunks = chunkTranscript(segments, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startTime).toBe(0);
    expect(chunks[chunks.length - 1].endTime).toBe(500);
    expect(chunks[0].formattedWithTimestamps).toContain('[00:00]');
  });

  it('merges multiple chunk analyses into a unified structured analysis', () => {
    const analysis1: LectureAnalysis = {
      title: 'Mechanics Part 1',
      summary: 'Summary of part 1.',
      topics: [
        {
          topicName: "Newton's First Law",
          explanation: 'Law of inertia.',
          examples: '',
          terminology: '',
          approximateTimestamp: 10,
        },
      ],
      keyConcepts: ['Inertia'],
      definitions: [{ term: 'Inertia', definition: 'Resistance to change' }],
      importantFacts: ['First law was published in 1687.'],
      uncertainties: [],
      studyQuestions: ['What is inertia?'],
    };

    const analysis2: LectureAnalysis = {
      title: 'Mechanics Part 2',
      summary: 'Summary of part 2.',
      topics: [
        {
          topicName: "Newton's Second Law",
          explanation: 'F = ma.',
          examples: '',
          terminology: '',
          approximateTimestamp: 120,
        },
      ],
      keyConcepts: ['Force proportionality'],
      definitions: [{ term: 'Newton', definition: 'Unit of force' }],
      importantFacts: ['Force is a vector.'],
      uncertainties: ['Potentially unclear derivation'],
      studyQuestions: ['State F=ma'],
    };

    const merged = mergeChunkAnalyses([analysis1, analysis2]);
    expect(merged.topics.length).toBe(2);
    expect(merged.definitions.length).toBe(2);
    expect(merged.keyConcepts).toContain('Inertia');
    expect(merged.keyConcepts).toContain('Force proportionality');
    expect(merged.uncertainties).toContain('Potentially unclear derivation');
    expect(merged.summary).toContain('Summary of part 1.');
    expect(merged.summary).toContain('Summary of part 2.');
  });
});
