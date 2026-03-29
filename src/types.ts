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
