export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Lecture {
  id: string;
  title: string;
  subject: string;
  duration_seconds: number;
  status:
    | 'RECORDING'
    | 'RECORDED'
    | 'TRANSCRIBING'
    | 'TRANSCRIBED'
    | 'ANALYZING'
    | 'GENERATING_NOTES'
    | 'GENERATING_FLASHCARDS'
    | 'GENERATING_QUIZ'
    | 'COMPLETE'
    | 'FAILED'
    | 'CANCELLED';
  created_at: string;
  updated_at: string;
  flashcards_count?: number;
  quizzes_count?: number;
  has_audio?: number;
}

export interface TranscriptSegment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number;
}

export interface NoteSection {
  id: string;
  topic_name: string;
  content: string;
  examples?: string;
  terminology?: string;
  timestamp_start?: number;
  order_index: number;
}

export interface LectureNote {
  id: string;
  title: string;
  summary: string;
  key_concepts: string[];
  definitions: Array<{ term: string; definition: string; context?: string }>;
  important_facts: string[];
  uncertainties: string[];
  study_questions: string[];
  sections: NoteSection[];
  is_custom_edited: number;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  lecture_id: string;
  question: string;
  answer: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  card_type: string;
  timestamp_ref?: number;
  is_known: number;
  is_difficult: number;
  repetitions?: number;
  ease_factor?: number;
  interval_days?: number;
  next_review_at?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  timestamp_ref?: number;
  order_index: number;
}

export interface QuizSet {
  id: string;
  title: string;
  created_at: string;
  questions: QuizQuestion[];
  attempts: Array<{
    id: string;
    score: number;
    total_questions: number;
    weakTopics: string[];
    completed_at: string;
  }>;
}

export interface SystemDiagnostics {
  privacyBanners: {
    aiProcessing: string;
    externalAiServices: string;
    transcription: string;
    audioUpload: string;
  };
  aiStatus: {
    aiProcessing: string;
    externalServices: string;
    activeProvider: string;
    ollamaAvailable: boolean;
    llamacppAvailable: boolean;
    availableModels: string[];
  };
  transcriptionStatus: {
    activeProvider: string;
    isAvailable: boolean;
  };
  storage: {
    recordingsDir: string;
    audioTotalFormatted: string;
    databaseSizeFormatted: string;
  };
}
