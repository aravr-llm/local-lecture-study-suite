import { z } from 'zod';
import { logger } from '../security/logger';

/**
 * Attempts to extract and repair raw JSON strings produced by local LLMs.
 */
export function extractRawJson(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.includes('```')) {
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1].trim();
    }
  }

  // Find the first opening brace or bracket and last closing brace or bracket
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = cleaned.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // Common LLM syntax error fixes: trailing commas in objects or arrays
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned;
}

/**
 * Safely parses and validates LLM JSON response against a Zod schema.
 */
export function safeValidateJson<T>(rawText: string, schema: z.ZodSchema<T>): { success: true; data: T } | { success: false; error: string } {
  const extracted = extractRawJson(rawText);

  try {
    const parsed = JSON.parse(extracted);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      logger.warn('JSONValidator', 'Schema validation failed for model response', {
        issues: result.error.issues,
      });
      return { success: false, error: result.error.message };
    }
  } catch (err: any) {
    logger.warn('JSONValidator', 'Failed to parse JSON from model response', {
      error: err.message,
      snippet: rawText.slice(0, 150),
    });
    return { success: false, error: err.message };
  }
}
