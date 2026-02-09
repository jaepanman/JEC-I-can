
export enum QuestionType {
  VOCABULARY = 'VOCABULARY',
  DIALOGUE = 'DIALOGUE',
  SENTENCE_ORDER = 'SENTENCE_ORDER',
  READING_COMPREHENSION = 'READING_COMPREHENSION'
}

export type TargetSection = 'PART_1' | 'PART_2' | 'PART_3' | 'PART_4';

export type EikenGrade = 'GRADE_5' | 'GRADE_4' | 'GRADE_3' | 'GRADE_PRE_2' | 'GRADE_2' | 'GRADE_2_PLUS' | 'GRADE_PRE_1' | 'GRADE_1';

export interface Question {
  id: number;
  type: QuestionType;
  context?: string;
  text: string;
  skeleton?: string; // For SENTENCE_ORDER: e.g., "[ 1 ] ( ) [ 3 ] ( )"
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
  durationSeconds: number;
  missedQuestions: MissedQuestionEntry[];
  isTargetPractice?: boolean;
  targetSection?: TargetSection;
  grade?: EikenGrade;
  newBadges?: Badge[]; // Tracks badges earned in THIS session
  theme?: string; // The theme used for this session
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  jpDescription: string;
  icon: string;
  color: string;
  earnedAt: number;
  count: number; // For leveling up
}

export interface UserStats {
  totalQuestionsAnswered: number;
  streakCount: number;
  lastStudyTimestamp: number;
  remakeCountToday: number;
  lastRemakeDate: string;
  targetCompletions: Record<TargetSection, number>;
  examsTakenToday: number;
  targetExamsTakenToday: number;
  lastExamDate: string;
  // Usage tracking for limits
  scenarioUsesRemaining: number;
  lastScenarioUseMonth: string; // YYYY-MM
  dailyMockExamsCount: number;
  dailyTargetPracticeCount: number;
  lastActionDate: string; // YYYY-MM-DD
  thematicProgress: Record<string, Record<string, boolean>>; // { "Shopping": { "PART_1": true, ... } }
}

export interface User {
  id: string;
  name: string;
  studentFurigana?: string;
  pin: string;
  barcodeNumber?: string;
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
