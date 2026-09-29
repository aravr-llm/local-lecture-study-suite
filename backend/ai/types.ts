import { z } from 'zod';

export const DefinitionSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
  context: z.string().optional(),
});

export type Definition = z.infer<typeof DefinitionSchema>;

export const TopicSchema = z.object({
  topicName: z.string().min(1),
  explanation: z.string().min(1),
  examples: z.string().optional().default(''),
  terminology: z.string().optional().default(''),
  approximateTimestamp: z.number().default(0),
});

export type Topic = z.infer<typeof TopicSchema>;

export const LectureAnalysisSchema = z.object({
  title: z.string().min(1).default('Lecture Notes'),
  summary: z.string().min(1),
  topics: z.array(TopicSchema).default([]),
  keyConcepts: z.array(z.string()).default([]),
  definitions: z.array(DefinitionSchema).default([]),
  importantFacts: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
  studyQuestions: z.array(z.string()).default([]),
});

export type LectureAnalysis = z.infer<typeof LectureAnalysisSchema>;

export const FlashcardTypeEnum = z.enum([
  'definition',
  'question_answer',
  'concept_explanation',
  'compare_contrast',
  'example_based',
  'application_based',
]);

export const FlashcardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  topic: z.string().min(1).default('General'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  cardType: FlashcardTypeEnum.default('concept_explanation'),
  timestamp: z.number().default(0),
});

export type FlashcardItem = z.infer<typeof FlashcardSchema>;

export const QuizQuestionTypeEnum = z.enum(['multiple_choice', 'true_false', 'short_answer']);

export const QuizQuestionSchema = z.object({
  question: z.string().min(1),
  questionType: QuizQuestionTypeEnum.default('multiple_choice'),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  topic: z.string().min(1).default('General'),
  timestamp: z.number().default(0),
});

export type QuizQuestionItem = z.infer<typeof QuizQuestionSchema>;

export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  listModels?(): Promise<string[]>;
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  generateStructured<T>(prompt: string, schema: z.ZodType<T, any, any>, systemPrompt?: string): Promise<T>;
}
