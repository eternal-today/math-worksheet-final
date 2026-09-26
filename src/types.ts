export type ProblemType = 'addition' | 'subtraction' | 'multiplication' | 'mixed';

export interface MathProblem {
  expr: string;
  a?: number;
  b?: number;
  op: string;
  ans: string;
  unitName: string;
}

export interface LearningRecord {
  date: string;
  correct: number;
  total: number;
  ts: number;
  unitNames: string[];
  wrongExprs: string[];
  problems?: MathProblem[];
  answers?: {val: string, ok: boolean}[];
  updatedAt?: number;   // 동기화: 마지막 수정 시각 (없으면 ts)
  profileId?: string;   // 동기화: 프로필 (현재 'default' 하나)
}

export interface GradingResult {
  score: number;
  total: number;
  feedback: string;
  corrections: {
    problemId: string;
    userAnswer: number | string;
    isCorrect: boolean;
  }[];
}
