
export enum QuestionType {
  VOCABULARY = 'VOCABULARY',
  DIALOGUE = 'DIALOGUE',
  SENTENCE_ORDER = 'SENTENCE_ORDER',
  READING_COMPREHENSION = 'READING_COMPRE_HENSION'
}

export type TargetSection = 'PART_1' | 'PART_2' | 'PART_3' | 'PART_4';

export type EikenGrade = 'GRADE_5' | 'GRADE_4' | 'GRADE_3' | 'GRADE_PRE_2' | 'GRADE_2' | 'GRADE_2_PLUS' | 'GRADE_PRE_1' | 'GRADE_1';

export interface Question {
  id: number;
  type: QuestionType;
  context?: string;
  text: string;
  skeleton?: string; // For SENTENCE_ORDER: "Please ( ) [ 2 ] ( ) [ 4 ] ( ) today."
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

export interface MissedQuestionEntry {
  question: Question;
  userAnswer: number;
}

export interface ExamResult {
  score: number;
  total: number;
  isPassed: boolean;
  timestamp: number;
  durationSeconds: number; // For speed/patience badges
  missedQuestions: MissedQuestionEntry[];
  isTargetPractice?: boolean;
  targetSection?: TargetSection;
  grade?: EikenGrade;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  jpDescription: string;
  icon: string;
  color: string;
  earnedAt: number;
}

export interface UserStats {
  totalQuestionsAnswered: number;
  streakCount: number;
  lastStudyTimestamp: number;
  remakeUsed: boolean;
  targetCompletions: Record<TargetSection, number>;
}

export interface User {
  id: string;
  name: string; // Student Kanji
  studentFurigana?: string;
  pin: string; // School PIN
  barcodeNumber?: string; // Entry/Exit Card ID (Security Key)
  
  // At-Home specific fields
  isHomeUser: boolean;
  parentEmail?: string;
  parentNameKanji?: string;
  parentNameFurigana?: string;
  hashedPassword?: string;
  credits: number;
  hasSubscription: boolean;

  history: ExamResult[];
  badges: Badge[];
  stats: UserStats;
}

export interface Exam {
  id: string;
  questions: Question[];
}
