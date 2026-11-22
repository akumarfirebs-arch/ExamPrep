export type Language = 'en' | 'hi';

export interface SubExam {
  id: string;
  examId: string;
  name: string;
  shortName: string;
  description: string;
}

export interface ExamCategory {
  id: string;
  name: string;
  shortName: string;
  description: string;
  subExams: SubExam[];
}

export type TestType = 'MOCK' | 'SUBJECT_WISE' | 'PYQ' | 'DPP';

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  examId: string;
  subExamId?: string;
  testType: TestType;
  subject?: string;
  subjectHi?: string;
  year?: number;
  date?: string;
  dayNumber?: number;
  text: string;
  textHi?: string;
  options: Option[];
  optionsHi?: Option[];
  correctOptionId: string;
  positiveMarks?: number;
  negativeMarks?: number;
  explanation: string;
  explanationHi?: string;
}

export interface TestConfig {
  id: string;
  examId: string;
  subExamId?: string;
  testType: TestType;
  title: string;
  titleHi?: string;
  description: string;
  descriptionHi?: string;
  subject?: string;
  subjectHi?: string;
  year?: number;
  date?: string;
  dayNumber?: number;
  shift?: string;
  paper?: string;
  section?: string;
  durationMinutes?: number;
  timed: boolean;
  positiveMarks: number;
  negativeMarks: number;
  passPercentage?: number;
  questions: Question[];
  isCustom?: boolean;
}

export type QuestionStatus = 'NOT_VISITED' | 'UNANSWERED' | 'ANSWERED' | 'REVIEW' | 'ANSWERED_AND_REVIEW';
export type AnswerFilter = 'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';

export interface ActiveAttempt {
  testId: string;
  answers: Record<string, string>;
  visitedQuestionIds: string[];
  reviewQuestionIds: string[];
  answeredAndReviewQuestionIds?: string[];
  startedAt: number;
  deadlineAt?: number;
  language?: Language;
  instructionAccepted?: boolean;
}

export interface SubjectResult {
  subject: string;
  attempted: number;
  correct: number;
  incorrect: number;
  netMarks: number;
  accuracy: number;
}

export interface TestResult {
  id: string;
  test: TestConfig;
  answers: Record<string, string>;
  startedAt: number;
  completedAt: number;
  timeTakenSeconds: number;
  score: number;
  maxMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  attemptedCount: number;
  accuracy: number;
  positiveMarksGained: number;
  negativeMarksDeducted: number;
  subjectResults: SubjectResult[];
}
