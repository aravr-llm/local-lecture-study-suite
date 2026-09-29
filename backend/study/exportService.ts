import { getDb } from '../database/db';

export interface LectureExportBundle {
  lecture: any;
  transcript: any;
  segments: any[];
  notes: any;
  sections: any[];
  flashcards: any[];
  quizzes: any[];
}

export function getLectureExportBundle(lectureId: string): LectureExportBundle {
  const db = getDb();

  const lecture = db.prepare('SELECT id, title, subject, duration_seconds, created_at FROM lectures WHERE id = ?').get(lectureId);
  if (!lecture) {
    throw new Error('Lecture not found');
  }

  const transcript = db.prepare('SELECT full_text, language FROM transcripts WHERE lecture_id = ?').get(lectureId);
  const segments = db.prepare(`
    SELECT start_time, end_time, text, confidence
    FROM transcript_segments ts
    JOIN transcripts t ON ts.transcript_id = t.id
    WHERE t.lecture_id = ?
    ORDER BY start_time ASC
  `).all(lectureId);

  const notes = db.prepare(`
    SELECT title, summary, key_concepts, definitions, important_facts, uncertainties, study_questions
    FROM notes WHERE lecture_id = ?
  `).get(lectureId) as any;

  let parsedNotes: any = null;
  let sections: any[] = [];

  if (notes) {
    parsedNotes = {
      title: notes.title,
      summary: notes.summary,
      keyConcepts: JSON.parse(notes.key_concepts || '[]'),
      definitions: JSON.parse(notes.definitions || '[]'),
      importantFacts: JSON.parse(notes.important_facts || '[]'),
      uncertainties: JSON.parse(notes.uncertainties || '[]'),
      studyQuestions: JSON.parse(notes.study_questions || '[]'),
    };

    sections = db.prepare(`
      SELECT topic_name, content, examples, terminology, timestamp_start
      FROM note_sections ns
      JOIN notes n ON ns.note_id = n.id
      WHERE n.lecture_id = ?
      ORDER BY order_index ASC
    `).all(lectureId);
  }

  const flashcards = db.prepare(`
    SELECT question, answer, topic, difficulty, card_type, timestamp_ref
    FROM flashcards WHERE lecture_id = ?
    ORDER BY order_index ASC
  `).all(lectureId);

  const quizzes = db.prepare(`
    SELECT q.id, q.title, qq.question, qq.question_type, qq.options_json, qq.correct_answer, qq.explanation, qq.topic
    FROM quiz_sets q
    JOIN quiz_questions qq ON qq.quiz_set_id = q.id
    WHERE q.lecture_id = ?
    ORDER BY qq.order_index ASC
  `).all(lectureId);

  return {
    lecture,
    transcript,
    segments,
    notes: parsedNotes,
    sections,
    flashcards,
    quizzes,
  };
}

export function exportToMarkdown(bundle: LectureExportBundle): string {
  const { lecture, notes, sections, flashcards, transcript } = bundle;

  let md = `# ${notes?.title || lecture.title}\n\n`;
  md += `**Subject:** ${lecture.subject}  \n`;
  md += `**Date:** ${new Date(lecture.created_at).toLocaleDateString()}  \n`;
  md += `**Duration:** ${Math.floor(lecture.duration_seconds / 60)} minutes  \n\n`;

  if (notes?.summary) {
    md += `## Overview & Summary\n\n${notes.summary}\n\n`;
  }

  if (sections && sections.length > 0) {
    md += `## Main Topics\n\n`;
    for (const sec of sections) {
      md += `### ${sec.topic_name}\n\n`;
      md += `${sec.content}\n\n`;
      if (sec.examples) md += `*Examples:* ${sec.examples}\n\n`;
      if (sec.terminology) md += `*Key Terminology:* ${sec.terminology}\n\n`;
    }
  }

  if (notes?.keyConcepts && notes.keyConcepts.length > 0) {
    md += `## Key Concepts\n\n`;
    for (const c of notes.keyConcepts) {
      md += `- ${c}\n`;
    }
    md += '\n';
  }

  if (notes?.definitions && notes.definitions.length > 0) {
    md += `## Terminology & Definitions\n\n`;
    for (const d of notes.definitions) {
      md += `- **${d.term}:** ${d.definition}\n`;
    }
    md += '\n';
  }

  if (notes?.importantFacts && notes.importantFacts.length > 0) {
    md += `## Important Exam Facts\n\n`;
    for (const f of notes.importantFacts) {
      md += `- ${f}\n`;
    }
    md += '\n';
  }

  if (notes?.uncertainties && notes.uncertainties.length > 0) {
    md += `## Identified Uncertainties in Lecture\n\n`;
    for (const u of notes.uncertainties) {
      md += `> [!NOTE]\n> ${u}\n\n`;
    }
  }

  if (flashcards && flashcards.length > 0) {
    md += `## Flashcard Study Deck\n\n`;
    for (const card of flashcards) {
      md += `**Q: ${card.question}** [${card.topic}]  \n`;
      md += `*A:* ${card.answer}  \n\n`;
    }
  }

  if (transcript?.full_text) {
    md += `## Full Transcript\n\n${transcript.full_text}\n\n`;
  }

  return md;
}

export function exportToPlainText(bundle: LectureExportBundle): string {
  const md = exportToMarkdown(bundle);
  // Strip markdown formatting symbols for clean plain text
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^>\s*\[!.*?\]\s*/gm, '')
    .replace(/^>\s*/gm, '');
}
