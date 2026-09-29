import { describe, it, expect } from 'vitest';
import { extractRawJson, safeValidateJson } from '../../backend/ai/jsonValidator';
import { FlashcardSchema, LectureAnalysisSchema } from '../../backend/ai/types';
import { z } from 'zod';

describe('AI JSON Validation & Extraction', () => {
  it('extracts raw JSON cleanly from markdown code blocks', () => {
    const raw = "Here is the result:\n```json\n{\"title\": \"Calculus\", \"summary\": \"Overview of limits\"}\n```\nHope that helps!";
    const extracted = extractRawJson(raw);
    expect(extracted).toBe('{"title": "Calculus", "summary": "Overview of limits"}');
  });

  it('fixes trailing commas produced by LLMs', () => {
    const raw = '{"items": ["one", "two", ], "count": 2,}';
    const extracted = extractRawJson(raw);
    expect(extracted).toBe('{"items": ["one", "two"], "count": 2}');
    expect(JSON.parse(extracted)).toEqual({ items: ['one', 'two'], count: 2 });
  });

  it('validates against Zod schema and rejects invalid structures', () => {
    const validCardJson = JSON.stringify({
      question: 'What is F = ma?',
      answer: "Newton's Second Law",
      topic: 'Physics',
      difficulty: 'medium',
      cardType: 'concept_explanation',
      timestamp: 15.0,
    });

    const result = safeValidateJson(validCardJson, FlashcardSchema);
    expect(result.success).toBe(true);

    const invalidCardJson = JSON.stringify({
      question: '', // Empty question should fail min(1)
      answer: 'Some answer',
    });

    const invalidResult = safeValidateJson(invalidCardJson, FlashcardSchema);
    expect(invalidResult.success).toBe(false);
  });
});
