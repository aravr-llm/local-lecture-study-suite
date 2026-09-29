import crypto from 'crypto';
import { getDb } from '../database/db';
import { AIProviderFactory } from '../ai/provider';
import { chunkTranscript, mergeChunkAnalyses } from '../ai/chunker';
import { buildNotesPrompt } from '../../prompts/notes';
import { LectureAnalysis, LectureAnalysisSchema } from '../ai/types';
import { TranscriptSegment } from '../transcription/types';
import { logger } from '../security/logger';

export async function generateLectureNotes(lectureId: string): Promise<LectureAnalysis> {
  const db = getDb();

  // Fetch segments
  const transcriptRow = db.prepare('SELECT id, full_text FROM transcripts WHERE lecture_id = ?').get(lectureId) as {
    id: string;
    full_text: string;
  } | undefined;

  if (!transcriptRow) {
    throw new Error('Transcript not found for this lecture');
  }

  const segments = (db.prepare(`
    SELECT start_time as start, end_time as end, text, confidence
    FROM transcript_segments
    WHERE transcript_id = ?
    ORDER BY start_time ASC
  `).all(transcriptRow.id) as unknown) as TranscriptSegment[];

  const chunks = chunkTranscript(segments);
  const provider = await AIProviderFactory.getProvider();
  logger.info('NoteGenerator', `Generating notes using provider: ${provider.name}`, {
    lectureId,
    chunkCount: chunks.length,
  });

  const chunkAnalyses: LectureAnalysis[] = [];

  for (const chunk of chunks) {
    const prompt = buildNotesPrompt(chunk.formattedWithTimestamps);
    const analysis = await provider.generateStructured(prompt, LectureAnalysisSchema);
    chunkAnalyses.push(analysis);
  }

  const combined = mergeChunkAnalyses(chunkAnalyses);

  // Check if existing notes were manually edited
  const existing = db.prepare('SELECT id, is_custom_edited FROM notes WHERE lecture_id = ?').get(lectureId) as {
    id: string;
    is_custom_edited: number;
  } | undefined;

  if (existing && existing.is_custom_edited === 1) {
    logger.warn('NoteGenerator', 'Preserving user custom edits. Skipped overwriting existing note.', { lectureId });
    return combined;
  }

  const noteId = existing?.id || crypto.randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    if (existing) {
      db.prepare('DELETE FROM note_sections WHERE note_id = ?').run(noteId);
      db.prepare(`
        UPDATE notes
        SET title = ?, summary = ?, key_concepts = ?, definitions = ?, important_facts = ?,
            uncertainties = ?, study_questions = ?, updated_at = ?
        WHERE id = ?
      `).run(
        combined.title,
        combined.summary,
        JSON.stringify(combined.keyConcepts),
        JSON.stringify(combined.definitions),
        JSON.stringify(combined.importantFacts),
        JSON.stringify(combined.uncertainties),
        JSON.stringify(combined.studyQuestions),
        now,
        noteId
      );
    } else {
      db.prepare(`
        INSERT INTO notes (
          id, lecture_id, title, summary, key_concepts, definitions,
          important_facts, uncertainties, study_questions, is_custom_edited,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        noteId,
        lectureId,
        combined.title,
        combined.summary,
        JSON.stringify(combined.keyConcepts),
        JSON.stringify(combined.definitions),
        JSON.stringify(combined.importantFacts),
        JSON.stringify(combined.uncertainties),
        JSON.stringify(combined.studyQuestions),
        now,
        now
      );
    }

    // Insert note sections
    const insertSection = db.prepare(`
      INSERT INTO note_sections (id, note_id, topic_name, content, examples, terminology, timestamp_start, order_index)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    combined.topics.forEach((topic, idx) => {
      insertSection.run(
        crypto.randomUUID(),
        noteId,
        topic.topicName,
        topic.explanation,
        topic.examples || null,
        topic.terminology || null,
        topic.approximateTimestamp || 0,
        idx
      );
    });

    // Update lecture title if still default
    db.prepare(`UPDATE lectures SET title = ?, updated_at = ? WHERE id = ? AND title = 'Untitled Lecture'`).run(
      combined.title,
      now,
      lectureId
    );

    db.exec('COMMIT;');
    logger.info('NoteGenerator', 'Notes successfully saved to database', { lectureId, noteId });
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return combined;
}
