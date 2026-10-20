/**
 * 개념노트 내용 (1단계: 1~3학년 22개 단원, 2단계: 4학년 5개, 5학년 6개 단원)
 *
 * 구성: ① 개념 쏙(정의 + 예시 하나 + 그림 3칸) → ② 이렇게 풀어요(대표 풀이, strategies.ts가 계산)
 *       → ③ 조심해요 → ④ 개념 확인(대표 풀이로 빈칸 3문제)
 * - 풀이 줄과 빈칸 정답은 모두 strategies.ts가 숫자로 계산한다 (여기 적힌 건 예시 숫자뿐)
 * - 정의의 **굵게**는 화면에서 강조로 바뀐다
 * - 1학년은 "10개씩 묶음과 낱개", 2학년부터 "십의 자리·일의 자리", "십 모형·일 모형"
 */

export type Tone = 'a' | 'b' | 'r' | 'x';   // a: 첫 수, b: 둘째 수, r: 올린 것, x: 뺀 것
export type Visual =
  | { kind: 'dots'; groups: { n: number; tone: Tone; box?: boolean }[] }
  | { kind: 'blocks'; items: { h?: number; t: number; o: number; tone: Tone; box?: boolean }[] }
  | { kind: 'array'; rows: number; cols: number; splitCol?: number; splitRow?: number; extra?: number }
  | { kind: 'area'; h: string; parts: { w: number; label: string; value: string }[] }
  | { kind: 'expr'; text: string }
  /** 자릿값 표: heads(천·백·십·일), 줄마다 자리별 숫자 */
  /** 자릿값 표: heads(천·백·십·일, 소수는 '.' 칸 포함), 줄마다 자리별 숫자. faint: 흐리게 쓸 칸(붙인 0) */
  | { kind: 'placeTable'; heads: string[]; rows: { cells: string[]; tone: Tone; sym?: string; faint?: number[] }[]; sumRow?: string[] }
  /** 차례로 써 보는 식 목록 (hl: 고른 줄, mark: 기준 수, dim: 넘는 줄) */
  | { kind: 'steps'; items: { text: string; tag?: 'hl' | 'mark' | 'dim'; side?: string }[] }
  /** 분수 나눠 담기: 자연수 막대들과 분수 조각들 */
  | { kind: 'fracSplit'; d: number; wholes: Tone[]; pieces: Tone[] }
  /** 분수 곱셈 넓이 모형: rows×cols 칸, 앞 colsOn칸을 연하게, 그중 위 rowsOn줄을 진하게 */
  | { kind: 'fracArea'; rows: number; cols: number; colsOn: number; rowsOn?: number }
  /** 혼합 계산 식에 순서 번호·색 붙이기 */
  | { kind: 'mixMarks'; e: string }
  /** 수 목록 칩 (ring: 공통인 수, hl: 고른 수) */
  | { kind: 'chips'; rows: { label?: string; items: { text: string; tag?: 'ring' | 'hl' }[] }[] }
  /** 분수의 분자·분모에 같은 연산 (÷2 →) */
  | { kind: 'fracOp'; from: [number, number]; op: '÷' | '×'; k: number; to: [number, number]; bar?: boolean }
  /** 100칸 모눈 (한 칸 = 0.01). groups마다 parts를 이어서 칠함 */
  | { kind: 'grid100'; groups: { parts: { n: number; tone: Tone }[] }[] }
  /** 분수 막대: w개 꽉 찬 막대 + n/d 막대 */
  | { kind: 'fracBar'; items: { w: number; n: number; d: number; tone: Tone }[] };

export interface Panel { title: string; visual: Visual; caption: string }
export interface Example { a: number; b: number; op: string; ans: string; fa?: string; fb?: string; e?: string }
export interface ConceptNoteData {
  unitId: string;
  term: string;
  def: string;
  example: Example;
  panels: Panel[];
  caution: { text: string; wrong: string; wrongWhy: string; right: string; rightWhy: string };
  checks: Example[];
  /** 개념 쏙 정의 아래에 붙이는 띠 (mix: 계산 순서 색 띠) */
  strip?: 'mix';
}

const ex = (a: number, op: string, b: number, ans?: string): Example => ({
  a, b, op,
  ans: ans ?? String(op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b),
});

/** 분수 예시 (fa, fb는 "2 3/5"처럼) */
const exf = (fa: string, op: string, fb: string, ans: string): Example => ({ a: 0, b: 0, op, ans, fa, fb });
/** 혼합 계산 예시 (식 그대로) */
const exm = (e: string, ans: string): Example => ({ a: 0, b: 0, op: 'mix', ans, e });
/** 최대공약수·최소공배수 예시 */
const exq = (a: number, op: 'gcd' | 'lcm', b: number, ans: string): Example => ({ a, b, op, ans, e: `${a}${[1, 3, 6, 7, 8, 0].includes(a % 10) ? '과' : '와'} ${b}의 ${op === 'gcd' ? '최대공약수' : '최소공배수'}` });
/** 약분 예시 */
const exr = (fa: string, ans: string): Example => ({ a: 0, b: 0, op: 'reduce', ans, fa });

export const CONCEPT_NOTES: ConceptNoteData[] = [
  // ───────────── 1학년 1학기 ─────────────
  {
    unitId: '1-1-0', term: '모으기와 가르기',
    def: '두 수를 **모으면** 더 큰 수가 되고, 한 수는 두 수로 **가를** 수 있어요. 덧셈은 모으기, 뺄셈은 가르기예요.',
    example: ex(3, '+', 4),
    panels: [
      { title: '1. 두 묶음 보기', visual: { kind: 'dots', groups: [{ n: 3, tone: 'a' }, { n: 4, tone: 'b' }] }, caption: '동그라미 3개와 4개가 있어요' },
      { title: '2. 하나로 모으기', visual: { kind: 'dots', groups: [{ n: 3, tone: 'a', box: true }, { n: 4, tone: 'b', box: true }] }, caption: '두 묶음을 한곳에 모아요' },
      { title: '3. 모두 세기', visual: { kind: 'expr', text: '3 + 4 = 7' }, caption: '모으면 모두 7개예요' },
    ],
    caution: { text: '모은 뒤에 처음부터 다시 세다가 하나를 두 번 세기 쉬워요.', wrong: '3 + 4 = 8', wrongWhy: '하나를 두 번 셌어요', right: '3 + 4 = 7', rightWhy: '4에서 5, 6, 7 이어 세기' },
    checks: [ex(2, '+', 5), ex(4, '+', 4), ex(1, '+', 6)],
  },
  {
    unitId: '1-1-1', term: '이어 세기',
    def: '더할 때는 **큰 수부터 시작**해서, 작은 수만큼 **이어 세면** 빠르고 정확해요.',
    example: ex(2, '+', 6),
    panels: [
      { title: '1. 두 수 보기', visual: { kind: 'dots', groups: [{ n: 2, tone: 'a' }, { n: 6, tone: 'b' }] }, caption: '2와 6을 더해요' },
      { title: '2. 큰 수에서 시작', visual: { kind: 'dots', groups: [{ n: 6, tone: 'b', box: true }] }, caption: '6은 이미 있으니 6부터 시작해요' },
      { title: '3. 2번 이어 세기', visual: { kind: 'dots', groups: [{ n: 6, tone: 'b', box: true }, { n: 2, tone: 'a' }] }, caption: '7, 8! 그래서 2 + 6 = 8' },
    ],
    caution: { text: '시작하는 수를 한 번 더 세면 1이 커져요.', wrong: '2 + 6 = 9', wrongWhy: '6, 7, 8, 9처럼 6부터 셌어요', right: '2 + 6 = 8', rightWhy: '6 다음 수부터 7, 8' },
    checks: [ex(3, '+', 5), ex(4, '+', 2), ex(1, '+', 7)],
  },
  {
    unitId: '1-1-2', term: '가르기로 빼기',
    def: '빼기는 전체를 **빼는 수**와 **남는 수**로 가르는 것과 같아요.',
    example: ex(7, '-', 3),
    panels: [
      { title: '1. 전체 보기', visual: { kind: 'dots', groups: [{ n: 7, tone: 'a' }] }, caption: '동그라미 7개가 있어요' },
      { title: '2. 3과 4로 가르기', visual: { kind: 'dots', groups: [{ n: 3, tone: 'x', box: true }, { n: 4, tone: 'a', box: true }] }, caption: '7을 3과 4로 갈라요' },
      { title: '3. 3을 빼기', visual: { kind: 'dots', groups: [{ n: 4, tone: 'a' }] }, caption: '3을 빼면 4가 남아요' },
    ],
    caution: { text: '거꾸로 셀 때 처음 수부터 세면 1이 커져요.', wrong: '7 − 3 = 5', wrongWhy: '7, 6, 5처럼 7부터 셌어요', right: '7 − 3 = 4', rightWhy: '7 다음부터 6, 5, 4' },
    checks: [ex(8, '-', 5), ex(6, '-', 2), ex(9, '-', 4)],
  },
  {
    unitId: '1-1-3', term: '10개씩 묶음과 낱개',
    def: '수를 **10개씩 묶음**과 **낱개**로 나누면 계산이 쉬워요. 묶음은 묶음끼리, 낱개는 낱개끼리 계산해요. 묶음을 **십**, 낱개를 **일**이라고도 해요.',
    example: ex(23, '+', 14),
    panels: [
      { title: '1. 묶음과 낱개로', visual: { kind: 'blocks', items: [{ t: 2, o: 3, tone: 'a' }, { t: 1, o: 4, tone: 'b' }] }, caption: '23은 묶음 2, 낱개 3 / 14는 묶음 1, 낱개 4' },
      { title: '2. 묶음끼리', visual: { kind: 'blocks', items: [{ t: 3, o: 0, tone: 'a' }] }, caption: '묶음 2 + 1 = 3 → 30' },
      { title: '3. 낱개끼리', visual: { kind: 'blocks', items: [{ t: 3, o: 7, tone: 'a' }] }, caption: '낱개 3 + 4 = 7 → 37' },
    ],
    caution: { text: '낱개를 묶음에 더하면 안 돼요.', wrong: '23 + 4 = 63', wrongWhy: '낱개 4를 묶음 2에 더했어요', right: '23 + 4 = 27', rightWhy: '낱개끼리 3 + 4 = 7' },
    checks: [ex(32, '+', 15), ex(41, '+', 26), ex(36, '-', 14)],
  },
  // ───────────── 1학년 2학기 ─────────────
  {
    unitId: '1-2-0', term: '10씩 뛰어 세기',
    def: '몇십을 더하거나 뺄 때는 **10씩 뛰어 세면** 돼요. 이때 **낱개는 그대로**예요.',
    example: ex(56, '+', 20),
    panels: [
      { title: '1. 56 보기', visual: { kind: 'blocks', items: [{ t: 5, o: 6, tone: 'a' }] }, caption: '묶음 5, 낱개 6' },
      { title: '2. 20 더하기', visual: { kind: 'blocks', items: [{ t: 5, o: 6, tone: 'a' }, { t: 2, o: 0, tone: 'b' }] }, caption: '20은 10개씩 묶음 2개' },
      { title: '3. 10씩 두 번', visual: { kind: 'expr', text: '56 → 66 → 76' }, caption: '묶음만 2개 늘고 낱개 6은 그대로' },
    ],
    caution: { text: '20을 더할 때 낱개에 2를 더하면 안 돼요.', wrong: '56 + 20 = 58', wrongWhy: '낱개에 2를 더했어요', right: '56 + 20 = 76', rightWhy: '묶음이 2개 늘어요' },
    checks: [ex(34, '+', 30), ex(47, '+', 20), ex(85, '-', 30)],
  },
  {
    unitId: '1-2-1', term: '십끼리, 일끼리 더하기',
    def: '두 자리 수끼리 더할 때는 **십(묶음)끼리**, **일(낱개)끼리** 따로 더한 다음 합쳐요.',
    example: ex(34, '+', 25),
    panels: [
      { title: '1. 두 수 보기', visual: { kind: 'blocks', items: [{ t: 3, o: 4, tone: 'a' }, { t: 2, o: 5, tone: 'b' }] }, caption: '34와 25' },
      { title: '2. 십끼리', visual: { kind: 'blocks', items: [{ t: 5, o: 0, tone: 'a' }] }, caption: '30 + 20 = 50' },
      { title: '3. 일끼리', visual: { kind: 'blocks', items: [{ t: 5, o: 9, tone: 'a' }] }, caption: '4 + 5 = 9 → 59' },
    ],
    caution: { text: '다른 자리끼리 더하면 틀려요.', wrong: '34 + 25 = 89', wrongWhy: '3과 5, 4와 5를 더했어요', right: '34 + 25 = 59', rightWhy: '3 + 2, 4 + 5처럼 같은 자리끼리' },
    checks: [ex(42, '+', 35), ex(23, '+', 61), ex(50, '+', 27)],
  },
  {
    unitId: '1-2-2', term: '십끼리, 일끼리 빼기',
    def: '두 자리 수끼리 뺄 때도 **십(묶음)끼리**, **일(낱개)끼리** 따로 뺀 다음 합쳐요.',
    example: ex(68, '-', 25),
    panels: [
      { title: '1. 68 보기', visual: { kind: 'blocks', items: [{ t: 6, o: 8, tone: 'a' }] }, caption: '묶음 6, 낱개 8' },
      { title: '2. 묶음 2개 빼기', visual: { kind: 'blocks', items: [{ t: 4, o: 8, tone: 'a' }, { t: 2, o: 0, tone: 'x' }] }, caption: '60 − 20 = 40' },
      { title: '3. 낱개 5개 빼기', visual: { kind: 'blocks', items: [{ t: 4, o: 3, tone: 'a' }, { t: 0, o: 5, tone: 'x' }] }, caption: '8 − 5 = 3 → 43' },
    ],
    caution: { text: '낱개를 묶음에서 빼면 안 돼요.', wrong: '68 − 5 = 18', wrongWhy: '5를 묶음 6에서 뺐어요', right: '68 − 5 = 63', rightWhy: '낱개끼리 8 − 5 = 3' },
    checks: [ex(79, '-', 34), ex(56, '-', 23), ex(87, '-', 50)],
  },
  {
    unitId: '1-2-3', term: '10 만들기',
    def: '더해서 10이 넘을 때는 **10을 먼저 만들면** 쉬워요. 한 수를 **가르고**, 10이 되게 **모아요**.',
    example: ex(7, '+', 5),
    panels: [
      { title: '1. 두 수 보기', visual: { kind: 'dots', groups: [{ n: 7, tone: 'a' }, { n: 5, tone: 'b' }] }, caption: '7과 5' },
      { title: '2. 가르고 모아 10', visual: { kind: 'dots', groups: [{ n: 7, tone: 'a', box: true }, { n: 3, tone: 'b', box: true }, { n: 2, tone: 'b' }] }, caption: '5를 3과 2로 가르고 7과 3을 모으면 10' },
      { title: '3. 10과 2', visual: { kind: 'expr', text: '10 + 2 = 12' }, caption: '10에 남은 2를 더해요' },
    ],
    caution: { text: '가른 두 수를 다시 모으면 원래 수가 되어야 해요.', wrong: '7 + 5 = 15', wrongWhy: '7 + 3 + 5로 계산했어요. 3을 떼어 놓고 5를 그대로 더했어요', right: '7 + 3 + 2 = 12', rightWhy: '3 + 2 = 5인지 확인!' },
    checks: [ex(8, '+', 6), ex(9, '+', 4), ex(6, '+', 7)],
  },
  {
    unitId: '1-2-4', term: '10에서 빼기',
    def: '십몇에서 빼는데 낱개끼리 뺄 수 없으면, 십몇을 **10과 몇으로 갈라** **10에서 먼저 빼요**.',
    example: ex(13, '-', 8),
    panels: [
      { title: '1. 10과 3으로', visual: { kind: 'dots', groups: [{ n: 10, tone: 'a', box: true }, { n: 3, tone: 'b' }] }, caption: '13은 10과 3' },
      { title: '2. 10에서 8 빼기', visual: { kind: 'dots', groups: [{ n: 8, tone: 'x', box: true }, { n: 2, tone: 'a', box: true }, { n: 3, tone: 'b' }] }, caption: '10에서 8을 빼면 2' },
      { title: '3. 남은 수 모으기', visual: { kind: 'dots', groups: [{ n: 2, tone: 'a' }, { n: 3, tone: 'b' }] }, caption: '2와 3을 모으면 5' },
    ],
    caution: { text: '낱개끼리 거꾸로 빼면 안 돼요.', wrong: '13 − 8 = 15', wrongWhy: '8 − 3을 거꾸로 뺐어요', right: '13 − 8 = 5', rightWhy: '10 − 8 = 2, 2 + 3 = 5' },
    checks: [ex(12, '-', 7), ex(15, '-', 9), ex(14, '-', 6)],
  },
  // ───────────── 2학년 1학기 ─────────────
  {
    unitId: '2-1-0', term: '받아올림',
    def: '**일의 자리**끼리 더해서 **10이 되거나 넘으면**, 그 10을 **십의 자리로 1만큼 올려 보내요.**',
    example: ex(38, '+', 25),
    panels: [
      { title: '1. 수 모형으로 나타내기', visual: { kind: 'blocks', items: [{ t: 3, o: 8, tone: 'a' }, { t: 2, o: 5, tone: 'b' }] }, caption: '38: 십 모형 3, 일 모형 8 / 25: 십 모형 2, 일 모형 5' },
      { title: '2. 가르고 모아서 10 만들기', visual: { kind: 'dots', groups: [{ n: 8, tone: 'a', box: true }, { n: 2, tone: 'b', box: true }, { n: 3, tone: 'b' }] }, caption: '25를 2와 23으로 갈라요. 일 모형 8과 2를 모으면 10, 그래서 38 + 2 = 40' },
      { title: '3. 10은 십 모형으로 올리기', visual: { kind: 'blocks', items: [{ t: 3, o: 0, tone: 'a' }, { t: 1, o: 0, tone: 'r' }, { t: 2, o: 3, tone: 'b' }] }, caption: '모은 10이 십 모형 1개가 돼요. 40 + 23 = 63' },
    ],
    caution: { text: '가른 두 수를 다시 모으면 원래 수가 되어야 해요. 25를 가를 때 2와 23처럼요.', wrong: '38 + 25 = 65', wrongWhy: '38 + 2 + 25로 계산했어요. 2를 떼어 놓고 25를 그대로 더했어요', right: '38 + 2 + 23 = 63', rightWhy: '2 + 23 = 25 맞는지 확인!' },
    checks: [ex(47, '+', 26), ex(36, '+', 28), ex(19, '+', 45)],
  },
  {
    unitId: '2-1-1', term: '받아내림',
    def: '**일의 자리끼리 뺄 수 없을 때**는 십의 자리에서 10을 빌려와요. 빼는 수를 **갈라서 몇십을 먼저 만들면** 머릿속으로도 쉽게 뺄 수 있어요.',
    example: ex(52, '-', 17),
    panels: [
      { title: '1. 52 보기', visual: { kind: 'blocks', items: [{ t: 5, o: 2, tone: 'a' }] }, caption: '십 모형 5, 일 모형 2. 일 모형 2에서 7은 뺄 수 없어요' },
      { title: '2. 2를 먼저 빼기', visual: { kind: 'blocks', items: [{ t: 5, o: 0, tone: 'a' }, { t: 0, o: 2, tone: 'x' }] }, caption: '17을 2와 15로 갈라 2를 빼면 50' },
      { title: '3. 15 빼기', visual: { kind: 'blocks', items: [{ t: 3, o: 5, tone: 'a' }, { t: 1, o: 5, tone: 'x' }] }, caption: '50 − 15 = 35' },
    ],
    caution: { text: '일의 자리에서 큰 수에서 작은 수를 거꾸로 빼면 틀려요.', wrong: '52 − 17 = 45', wrongWhy: '7 − 2를 거꾸로 뺐어요', right: '52 − 17 = 35', rightWhy: '52 − 2 − 15 = 50 − 15' },
    checks: [ex(43, '-', 18), ex(61, '-', 25), ex(74, '-', 39)],
  },
  // ───────────── 2학년 2학기 ─────────────
  {
    unitId: '2-2-0', term: '하나 더',
    def: '곱셈구구는 한 묶음씩 늘어나요. **바로 앞 곱에 한 묶음을 더하면** 다음 곱이 돼요.',
    example: ex(4, '×', 6),
    panels: [
      { title: '1. 4씩 6묶음', visual: { kind: 'array', rows: 6, cols: 4 }, caption: '4 × 6은 4씩 6묶음' },
      { title: '2. 5묶음은 알아요', visual: { kind: 'array', rows: 6, cols: 4, splitRow: 5 }, caption: '4 × 5 = 20' },
      { title: '3. 한 묶음 더', visual: { kind: 'expr', text: '20 + 4 = 24' }, caption: '남은 한 묶음 4를 더해요' },
    ],
    caution: { text: '곱하기를 더하기로 하면 안 돼요.', wrong: '4 × 6 = 10', wrongWhy: '4 + 6을 했어요', right: '4 × 6 = 24', rightWhy: '4씩 6묶음' },
    checks: [ex(3, '×', 7), ex(5, '×', 6), ex(2, '×', 9)],
  },
  {
    unitId: '2-2-1', term: '아는 단으로 가르기',
    def: '큰 단은 **5단과 작은 단으로 갈라** 곱한 다음 더하면, 외우지 못한 곱도 구할 수 있어요.',
    example: ex(7, '×', 6),
    panels: [
      { title: '1. 7씩 6묶음', visual: { kind: 'array', rows: 6, cols: 7 }, caption: '7 × 6은 7씩 6묶음' },
      { title: '2. 7을 5와 2로', visual: { kind: 'array', rows: 6, cols: 7, splitCol: 5 }, caption: '5 × 6 = 30, 2 × 6 = 12' },
      { title: '3. 두 곱 더하기', visual: { kind: 'expr', text: '30 + 12 = 42' }, caption: '그래서 7 × 6 = 42' },
    ],
    caution: { text: '가른 두 곱을 모두 더해야 해요.', wrong: '7 × 6 = 32', wrongWhy: '5 × 6에 2만 더했어요', right: '7 × 6 = 42', rightWhy: '30 + 2 × 6 = 30 + 12' },
    checks: [ex(8, '×', 7), ex(6, '×', 9), ex(9, '×', 4)],
  },
  {
    unitId: '2-2-2', term: '곱셈구구 총정리',
    def: '모르는 곱이 나오면 **순서를 바꾸거나**, **아는 단으로 갈라서** 구해요. 곱하는 순서를 바꿔도 답은 같아요.',
    example: ex(6, '×', 8),
    panels: [
      { title: '1. 6씩 8묶음', visual: { kind: 'array', rows: 8, cols: 6 }, caption: '6 × 8은 6씩 8묶음' },
      { title: '2. 6을 5와 1로', visual: { kind: 'array', rows: 8, cols: 6, splitCol: 5 }, caption: '5 × 8 = 40, 1 × 8 = 8' },
      { title: '3. 두 곱 더하기', visual: { kind: 'expr', text: '40 + 8 = 48' }, caption: '그래서 6 × 8 = 48' },
    ],
    caution: { text: '이웃한 곱과 헷갈리기 쉬워요.', wrong: '6 × 8 = 42', wrongWhy: '6 × 7과 헷갈렸어요', right: '6 × 8 = 48', rightWhy: '6 × 7 = 42보다 6 커요' },
    checks: [ex(7, '×', 8), ex(6, '×', 6), ex(8, '×', 9)],
  },
  // ───────────── 3학년 1학기 ─────────────
  {
    unitId: '2-1-2', term: '자리별로 더하기',
    def: '세 자리 수는 **백, 십, 일의 자리**로 나눠 자리끼리 더한 다음 모두 합쳐요.',
    example: ex(245, '+', 138),
    panels: [
      { title: '1. 두 수 보기', visual: { kind: 'blocks', items: [{ h: 2, t: 4, o: 5, tone: 'a' }, { h: 1, t: 3, o: 8, tone: 'b' }] }, caption: '245와 138' },
      { title: '2. 백끼리, 십끼리', visual: { kind: 'blocks', items: [{ h: 3, t: 7, o: 0, tone: 'a' }] }, caption: '200 + 100 = 300, 40 + 30 = 70' },
      { title: '3. 일끼리, 모두 합치기', visual: { kind: 'expr', text: '300 + 70 + 13 = 383' }, caption: '5 + 8 = 13을 더해요' },
    ],
    caution: { text: '일의 자리가 10을 넘으면 십의 자리로 올려야 해요.', wrong: '245 + 138 = 373', wrongWhy: '13에서 10을 올리지 않았어요', right: '245 + 138 = 383', rightWhy: '300 + 70 + 13' },
    checks: [ex(326, '+', 158), ex(417, '+', 265), ex(253, '+', 129)],
  },
  {
    unitId: '2-1-3', term: '차례로 빼기',
    def: '빼는 수를 **백, 십, 일로 갈라서** 하나씩 차례로 빼면, 받아내림도 머릿속으로 쉽게 할 수 있어요.',
    example: ex(542, '-', 128),
    panels: [
      { title: '1. 542 보기', visual: { kind: 'blocks', items: [{ h: 5, t: 4, o: 2, tone: 'a' }] }, caption: '128을 100, 20, 8로 갈라요' },
      { title: '2. 100, 20 빼기', visual: { kind: 'blocks', items: [{ h: 4, t: 2, o: 2, tone: 'a' }, { h: 1, t: 2, o: 0, tone: 'x' }] }, caption: '542 − 100 − 20 = 422' },
      { title: '3. 8 빼기', visual: { kind: 'expr', text: '422 − 8 = 414' }, caption: '마지막으로 8을 빼요' },
    ],
    caution: { text: '자리마다 큰 수에서 작은 수를 거꾸로 빼면 틀려요.', wrong: '542 − 128 = 426', wrongWhy: '일의 자리에서 8 − 2를 했어요', right: '542 − 128 = 414', rightWhy: '422 − 8 = 414' },
    checks: [ex(631, '-', 215), ex(752, '-', 326), ex(483, '-', 157)],
  },
  {
    unitId: '3-1-0', term: '몇백 만들기',
    def: '**몇백에 가까운 수**가 있으면, 다른 수를 갈라 **몇백을 먼저 만들어요.** 받아올림이 여러 번 있어도 쉬워져요.',
    example: ex(398, '+', 245),
    panels: [
      { title: '1. 두 수 보기', visual: { kind: 'blocks', items: [{ h: 3, t: 9, o: 8, tone: 'a' }, { h: 2, t: 4, o: 5, tone: 'b' }] }, caption: '398은 400보다 2 작아요' },
      { title: '2. 가르고 모아 400', visual: { kind: 'expr', text: '398 + 2 = 400' }, caption: '245를 2와 243으로 갈라요' },
      { title: '3. 남은 수 더하기', visual: { kind: 'expr', text: '400 + 243 = 643' }, caption: '400에 243을 더해요' },
    ],
    caution: { text: '가른 두 수를 다시 모으면 원래 수가 되어야 해요.', wrong: '398 + 245 = 645', wrongWhy: '398 + 2 + 245로 계산했어요. 2를 떼어 놓고 245를 그대로 더했어요', right: '398 + 2 + 243 = 643', rightWhy: '2 + 243 = 245 확인!' },
    checks: [ex(297, '+', 156), ex(485, '+', 239), ex(596, '+', 347)],
  },
  {
    unitId: '3-1-1', term: '여러 번 받아내림',
    def: '받아내림이 여러 번 있을 때도 **빼는 수를 갈라 차례로** 빼면 실수가 줄어요.',
    example: ex(503, '-', 268),
    panels: [
      { title: '1. 503 보기', visual: { kind: 'blocks', items: [{ h: 5, t: 0, o: 3, tone: 'a' }] }, caption: '268을 200, 60, 8로 갈라요' },
      { title: '2. 200 빼기', visual: { kind: 'blocks', items: [{ h: 3, t: 0, o: 3, tone: 'a' }, { h: 2, t: 0, o: 0, tone: 'x' }] }, caption: '503 − 200 = 303' },
      { title: '3. 60, 8 빼기', visual: { kind: 'expr', text: '303 − 60 − 8 = 235' }, caption: '303 − 60 = 243, 243 − 8 = 235' },
    ],
    caution: { text: '자리마다 큰 수에서 작은 수를 빼면 틀려요.', wrong: '503 − 268 = 365', wrongWhy: '8 − 3, 6 − 0, 5 − 2처럼 거꾸로 뺐어요', right: '503 − 268 = 235', rightWhy: '차례로 빼기' },
    checks: [ex(712, '-', 385), ex(604, '-', 257), ex(821, '-', 476)],
  },
  {
    unitId: '3-1-2', term: '나눗셈과 곱셈',
    def: '나눗셈은 **곱셈을 거꾸로** 생각하면 쉬워요. 42 ÷ 6은 **6 × □ = 42**에서 □를 찾는 거예요.',
    example: ex(42, '÷', 6),
    panels: [
      { title: '1. 6개씩 묶기', visual: { kind: 'array', rows: 7, cols: 6 }, caption: '42개를 6개씩 묶어요' },
      { title: '2. 몇 묶음?', visual: { kind: 'expr', text: '6 × □ = 42' }, caption: '6단에서 42를 찾아요' },
      { title: '3. 몫', visual: { kind: 'expr', text: '6 × 7 = 42 → 42 ÷ 6 = 7' }, caption: '7묶음이에요' },
    ],
    caution: { text: '곱이 나누어지는 수를 넘으면 안 돼요.', wrong: '42 ÷ 6 = 8', wrongWhy: '6 × 8 = 48은 42보다 커요', right: '42 ÷ 6 = 7', rightWhy: '6 × 7 = 42' },
    checks: [ex(35, '÷', 5), ex(48, '÷', 8), ex(27, '÷', 3)],
  },
  {
    unitId: '3-1-3', term: '가르기로 곱하기',
    def: '두 자리 수를 **몇십과 몇으로 갈라** 각각 곱한 다음 더해요.',
    example: ex(23, '×', 4),
    panels: [
      { title: '1. 23이 4묶음', visual: { kind: 'expr', text: '23 × 4' }, caption: '23을 4번 더한 것과 같아요' },
      { title: '2. 20과 3으로', visual: { kind: 'area', h: '4', parts: [{ w: 20, label: '20 × 4', value: '80' }, { w: 6, label: '3 × 4', value: '12' }] }, caption: '20 × 4와 3 × 4로 나눠요' },
      { title: '3. 두 곱 더하기', visual: { kind: 'expr', text: '80 + 12 = 92' }, caption: '그래서 23 × 4 = 92' },
    ],
    caution: { text: '두 곱을 이어 쓰지 말고 더해야 해요.', wrong: '23 × 4 = 812', wrongWhy: '80과 12를 이어 썼어요', right: '23 × 4 = 92', rightWhy: '80 + 12 = 92' },
    checks: [ex(34, '×', 3), ex(16, '×', 5), ex(27, '×', 4)],
  },
  // ───────────── 3학년 2학기 ─────────────
  {
    unitId: '3-2-0', term: '두 자리 수끼리 곱하기',
    def: '곱하는 수를 **몇십과 몇으로 갈라** 각각 곱한 다음 더해요.',
    example: ex(24, '×', 13),
    panels: [
      { title: '1. 24가 13묶음', visual: { kind: 'expr', text: '24 × 13' }, caption: '13을 10과 3으로 갈라요' },
      { title: '2. 나눠서 곱하기', visual: { kind: 'area', h: '24', parts: [{ w: 20, label: '24 × 10', value: '240' }, { w: 8, label: '24 × 3', value: '72' }] }, caption: '24 × 10 = 240, 24 × 3 = 72' },
      { title: '3. 두 곱 더하기', visual: { kind: 'expr', text: '240 + 72 = 312' }, caption: '그래서 24 × 13 = 312' },
    ],
    caution: { text: '십의 자리 수를 곱할 때는 10을 곱하는 거예요.', wrong: '24 × 13 = 96', wrongWhy: '24 × 10을 24 × 1로 계산했어요', right: '24 × 13 = 312', rightWhy: '240 + 72' },
    checks: [ex(32, '×', 12), ex(15, '×', 14), ex(21, '×', 23)],
  },
  {
    unitId: '3-2-1', term: '나머지',
    def: '똑같이 나누고 **남는 수**가 나머지예요. 나머지는 항상 **나누는 수보다 작아요.**',
    example: ex(29, '÷', 4, '7 … 1'),
    panels: [
      { title: '1. 4개씩 묶기', visual: { kind: 'expr', text: '29 ÷ 4' }, caption: '29개를 4개씩 묶어요' },
      { title: '2. 7묶음과 1개', visual: { kind: 'array', rows: 7, cols: 4, extra: 1 }, caption: '4 × 7 = 28, 1개가 남아요' },
      { title: '3. 남은 수가 나머지', visual: { kind: 'expr', text: '29 − 28 = 1' }, caption: '몫 7, 나머지 1 → 29 ÷ 4 = 7 … 1' },
    ],
    caution: { text: '나머지가 나누는 수보다 크면 한 묶음을 더 만들 수 있어요.', wrong: '29 ÷ 4 = 6 … 5', wrongWhy: '나머지 5가 4보다 커요', right: '29 ÷ 4 = 7 … 1', rightWhy: '나머지 1은 4보다 작아요' },
    checks: [ex(23, '÷', 5, '4 … 3'), ex(38, '÷', 6, '6 … 2'), ex(17, '÷', 3, '5 … 2')],
  },

  // ───────────── 4학년 1학기 ─────────────
  {
    unitId: '4-1-0', term: '자리별로 더하기',
    def: '네 자리 수도 **천, 백, 십, 일의 자리**로 나눠 같은 자리끼리 계산해요. 자리마다 계산한 다음 **모두 더하면** 돼요.',
    example: ex(3465, '+', 2378),
    panels: [
      { title: '1. 자리별로 쓰기', visual: { kind: 'placeTable', heads: ['천', '백', '십', '일'], rows: [{ cells: ['3', '4', '6', '5'], tone: 'a' }, { cells: ['2', '3', '7', '8'], tone: 'b', sym: '+' }] }, caption: '3465와 2378을 자리에 맞춰 써요' },
      { title: '2. 같은 자리끼리', visual: { kind: 'expr', text: '5000 + 700 + 130 + 13' }, caption: '천끼리 5000, 백끼리 700, 십끼리 130, 일끼리 13' },
      { title: '3. 모두 더하기', visual: { kind: 'expr', text: '5000 + 700 + 130 + 13 = 5843' }, caption: '자리별로 구한 네 수를 더하면 5843' },
    ],
    caution: { text: '같은 자리끼리 더해서 10이 넘으면 윗자리로 올려야 해요.', wrong: '3465 + 2378 = 5733', wrongWhy: '일의 자리 13, 십의 자리 13에서 1을 올리지 않았어요', right: '3465 + 2378 = 5843', rightWhy: '5000 + 700 + 130 + 13' },
    checks: [ex(2146, '+', 3517), ex(4728, '+', 1395), ex(5604, '+', 2589)],
  },
  {
    unitId: '4-1-1', term: '가르기로 곱하기',
    def: '두 자리 수를 **몇십과 몇으로 갈라** 각각 곱한 다음 더해요. 세 자리 수가 되어도 방법은 같아요.',
    example: ex(243, '×', 26),
    panels: [
      { title: '1. 26을 가르기', visual: { kind: 'expr', text: '26 = 20 + 6' }, caption: '26을 20과 6으로 갈라요' },
      { title: '2. 나눠서 곱하기', visual: { kind: 'area', h: '243', parts: [{ w: 20, label: '243 × 20', value: '4860' }, { w: 6, label: '243 × 6', value: '1458' }] }, caption: '243 × 20 = 4860, 243 × 6 = 1458' },
      { title: '3. 두 곱 더하기', visual: { kind: 'expr', text: '4860 + 1458 = 6318' }, caption: '그래서 243 × 26 = 6318' },
    ],
    caution: { text: '십의 자리 숫자를 곱할 때는 몇십을 곱하는 거예요.', wrong: '243 × 26 = 1944', wrongWhy: '243 × 20을 243 × 2 = 486으로 계산했어요', right: '243 × 26 = 6318', rightWhy: '4860 + 1458' },
    checks: [ex(125, '×', 32), ex(214, '×', 43), ex(312, '×', 25)],
  },
  {
    unitId: '4-1-2', term: '몇십으로 바꿔 몫 찾기',
    def: '두 자리 수로 나눌 때는 나누는 수를 **가까운 몇십**으로 바꿔 생각해요. 몇십 단에서 **넘지 않는 가장 큰 곱**을 찾으면 몫이 보여요. 곱해 보고 **크거나 작으면 고쳐요.**',
    example: ex(258, '÷', 43),
    panels: [
      { title: '1. 43을 40으로', visual: { kind: 'expr', text: '43 → 40' }, caption: '43은 40과 가까워요' },
      { title: '2. 40단에서 찾기', visual: { kind: 'steps', items: [{ text: '40 × 5 = 200' }, { text: '40 × 6 = 240', tag: 'hl' }, { text: '258', tag: 'mark' }, { text: '40 × 7 = 280', tag: 'dim' }] }, caption: '258을 넘지 않는 가장 큰 곱은 240 (280은 넘어요). 몫은 6쯤' },
      { title: '3. 43으로 확인', visual: { kind: 'expr', text: '43 × 6 = 258' }, caption: '딱 맞아요! 258 ÷ 43 = 6' },
    ],
    caution: { text: '찾은 몫을 나누는 수에 곱해 보고, 남는 수가 나누는 수보다 작은지 꼭 확인해요.', wrong: '252 ÷ 36 = 6 … 36', wrongWhy: '40 × 6 = 240에서 6을 그대로 썼는데, 남은 36이 나누는 수 36과 같아요', right: '252 ÷ 36 = 7', rightWhy: '36 × 7 = 252, 몫을 1 늘려요' },
    checks: [ex(224, '÷', 32), ex(192, '÷', 24), ex(185, '÷', 37)],
  },
  // ───────────── 4학년 2학기 ─────────────
  {
    unitId: '4-2-0', term: '같은 자리끼리',
    def: '소수도 자연수처럼 **같은 자리끼리** 더하고 빼요. 자릿수가 다르면 **1.5 = 1.50**처럼 끝에 0을 붙여 자리를 맞춰요.',
    example: ex(1.5, '+', 0.37, '1.87'),
    panels: [
      { title: '1. 0을 붙여 자리 맞추기', visual: { kind: 'placeTable', heads: ['일', '.', '소수\n첫째', '소수\n둘째'], rows: [{ cells: ['1', '.', '5', '0'], tone: 'a', faint: [3] }, { cells: ['0', '.', '3', '7'], tone: 'b', sym: '+' }] }, caption: '1.5 = 1.50, 소수점끼리 맞춰 써요' },
      { title: '2. 같은 자리끼리', visual: { kind: 'expr', text: '1 + 0.8 + 0.07' }, caption: '일의 자리 1, 소수 첫째 자리 0.5 + 0.3 = 0.8, 소수 둘째 자리 0 + 0.07 = 0.07' },
      { title: '3. 모두 더하기', visual: { kind: 'expr', text: '1 + 0.8 + 0.07 = 1.87' }, caption: '자리별로 구한 세 수를 더하면 1.87' },
    ],
    caution: { text: '끝자리끼리 맞추면 안 되고, 소수점끼리 맞춰야 해요.', wrong: '1.5 + 0.37 = 0.52', wrongWhy: '1.5의 5와 0.37의 7을 끝자리끼리 맞춰 더했어요', right: '1.5 + 0.37 = 1.87', rightWhy: '1.5 = 1.50, 소수점끼리 맞춰요' },
    checks: [ex(2.4, '+', 0.85, '3.25'), ex(0.7, '+', 1.46, '2.16'), ex(3.16, '+', 1.7, '4.86')],
  },
  {
    unitId: '4-2-1', term: '분모가 같은 분수',
    def: '분모가 같으면 **분모는 그대로** 두고 분자끼리 계산해요. 대분수는 **자연수끼리, 분수끼리** 따로 계산하고, 분수가 1보다 커지면 자연수로 올려요.',
    example: exf('2 3/5', '+', '1 4/5', '4 2/5'),
    panels: [
      { title: '1. 막대로 보기', visual: { kind: 'fracBar', items: [{ w: 2, n: 3, d: 5, tone: 'a' }, { w: 1, n: 4, d: 5, tone: 'b' }] }, caption: '2 3/5와 1 4/5' },
      { title: '2. 자연수끼리, 분수끼리', visual: { kind: 'fracSplit', d: 5, wholes: ['a', 'a', 'b'], pieces: ['a', 'a', 'a', 'b', 'b', 'b', 'b'] }, caption: '막대 3개, 조각 7개 → 3 + 7/5' },
      { title: '3. 조각 5개로 막대 하나', visual: { kind: 'fracBar', items: [{ w: 3, n: 0, d: 5, tone: 'a' }, { w: 1, n: 2, d: 5, tone: 'r' }] }, caption: '조각 5개가 모여 막대 1개, 그래서 4 2/5' },
    ],
    caution: { text: '분모끼리 더하면 안 돼요. 1/5이 몇 개인지만 세요.', wrong: '3/5 + 4/5 = 7/10', wrongWhy: '분모 5와 5까지 더했어요', right: '3/5 + 4/5 = 7/5', rightWhy: '1/5이 7개, 분모는 그대로' },
    checks: [exf('1 2/7', '+', '3 6/7', '5 1/7'), exf('4 1/6', '-', '1 5/6', '2 2/6'), exf('3 4/9', '+', '2 3/9', '5 7/9')],
  },

  // ───────────── 5학년 1학기 ─────────────
  {
    unitId: '5-1-1', term: '계산 순서', strip: 'mix',
    def: '여러 계산이 섞여 있으면 **정해진 순서**대로 계산해요. 한 줄에 **하나씩만** 계산하면 틀리지 않아요.',
    example: exm('27 + 12 × 3 - 45', '18'),
    panels: [
      { title: '1. 순서 정하기', visual: { kind: 'mixMarks', e: '27 + 12 × 3 - 45' }, caption: '×가 ①번, 남은 +, −는 앞에서부터 ②, ③번' },
      { title: '2. ① 12 × 3', visual: { kind: 'expr', text: '27 + 36 - 45' }, caption: '12 × 3 = 36을 먼저 계산했어요. 다음은 ② 27 + 36' },
      { title: '3. ② 27 + 36, ③ 63 − 45', visual: { kind: 'expr', text: '63 - 45 = 18' }, caption: '27 + 36 = 63, 63 − 45 = 18' },
    ],
    caution: { text: '앞에서부터만 계산하면 ×, ÷의 순서를 놓쳐요.', wrong: '27 + 12 × 3 - 45 = 72', wrongWhy: '27 + 12 = 39를 먼저 해서 39 × 3 − 45로 계산했어요', right: '27 + 36 - 45 = 18', rightWhy: '12 × 3을 먼저 해요' },
    checks: [exm('(18 + 6) ÷ 4 + 5', '11'), exm('40 - 6 × 5 + 2', '12'), exm('8 × (9 - 4) - 15', '25')],
  },
  {
    unitId: '5-1-0', term: '최대공약수와 최소공배수',
    def: '두 수의 약수를 **각각 모두 쓰고**, 두 목록에 함께 있는 수(**공약수**) 중 가장 큰 수가 **최대공약수**예요. 배수를 각각 써서 처음 함께 나오는 수는 **최소공배수**예요.',
    example: exq(12, 'gcd', 18, '6'),
    panels: [
      { title: '1. 12의 약수', visual: { kind: 'chips', rows: [{ items: ['1', '2', '3', '4', '6', '12'].map(t => ({ text: t })) }] }, caption: '12를 나누어떨어지게 하는 수' },
      { title: '2. 18의 약수', visual: { kind: 'chips', rows: [{ items: ['1', '2', '3', '6', '9', '18'].map(t => ({ text: t })) }] }, caption: '18을 나누어떨어지게 하는 수' },
      { title: '3. 둘 다 있는 수 찾기', visual: { kind: 'chips', rows: [{ label: '12', items: ['1', '2', '3', '4', '6', '12'].map(t => ({ text: t, tag: (t === '6' ? 'hl' : ['1', '2', '3'].includes(t) ? 'ring' : undefined) as 'hl' | 'ring' | undefined })) }, { label: '18', items: ['1', '2', '3', '6', '9', '18'].map(t => ({ text: t, tag: (t === '6' ? 'hl' : ['1', '2', '3'].includes(t) ? 'ring' : undefined) as 'hl' | 'ring' | undefined })) }] }, caption: '공약수 1, 2, 3, 6 중 가장 큰 6' },
    ],
    caution: { text: '최대공약수는 두 수보다 클 수 없어요. 크게 나왔다면 최소공배수를 구한 거예요.', wrong: '12와 18의 최대공약수: 36', wrongWhy: '최소공배수를 구했어요', right: '12와 18의 최대공약수: 6', rightWhy: '12 = 6 × 2, 18 = 6 × 3' },
    checks: [exq(16, 'gcd', 24, '8'), exq(15, 'gcd', 25, '5'), exq(18, 'gcd', 27, '9')],
  },
  {
    unitId: '5-1-2', term: '약분과 기약분수',
    def: '분자와 분모를 **같은 수로 나누어** 간단하게 하는 것이 약분이에요. 크기는 그대로예요. 1 말고 더 나눌 수 없는 분수가 **기약분수**예요.',
    example: exr('12/18', '2/3'),
    panels: [
      { title: '1. 12/18', visual: { kind: 'fracBar', items: [{ w: 0, n: 12, d: 18, tone: 'a' }] }, caption: '18칸 중 12칸. 12와 18은 둘 다 2로 나눠져요' },
      { title: '2. 분자, 분모를 2로 나누기', visual: { kind: 'fracOp', from: [12, 18], op: '÷', k: 2, to: [6, 9], bar: true }, caption: '12 ÷ 2 = 6, 18 ÷ 2 = 9 → 6/9 (칠한 길이는 그대로)' },
      { title: '3. 분자, 분모를 3으로 나누기', visual: { kind: 'fracOp', from: [6, 9], op: '÷', k: 3, to: [2, 3], bar: true }, caption: '6 ÷ 3 = 2, 9 ÷ 3 = 3 → 2/3, 더 나눌 수 없어요' },
    ],
    caution: { text: '분자와 분모는 꼭 같은 수로 나눠야 해요.', wrong: '12/18 = 2/6', wrongWhy: '분자는 6으로, 분모는 3으로 나눴어요', right: '12/18 = 2/3', rightWhy: '분자, 분모를 모두 6으로 나눠요' },
    checks: [exr('8/12', '2/3'), exr('15/25', '3/5'), exr('1 6/9', '1 2/3')],
  },
  {
    unitId: '5-1-3', term: '통분',
    def: '분모가 다르면 조각 크기가 달라서 바로 더할 수 없어요. 분모의 **최소공배수로 분모를 같게(통분)** 한 다음, **분모가 같은 분수처럼** 계산하고 약분해요.',
    example: exf('5/6', '+', '1/4', '1 1/12'),
    panels: [
      { title: '1. 조각 크기가 달라요', visual: { kind: 'fracBar', items: [{ w: 0, n: 5, d: 6, tone: 'a' }, { w: 0, n: 1, d: 4, tone: 'b' }] }, caption: '5/6과 1/4' },
      { title: '2. 12조각으로 같게', visual: { kind: 'fracBar', items: [{ w: 0, n: 10, d: 12, tone: 'a' }, { w: 0, n: 3, d: 12, tone: 'b' }] }, caption: '5/6 = 10/12, 1/4 = 3/12' },
      { title: '3. 조각끼리 더하기', visual: { kind: 'fracBar', items: [{ w: 1, n: 1, d: 12, tone: 'a' }] }, caption: '13/12 = 1 1/12' },
    ],
    caution: { text: '분자끼리, 분모끼리 더하면 안 돼요. 먼저 분모를 같게 해요.', wrong: '5/6 + 1/4 = 6/10', wrongWhy: '분자끼리, 분모끼리 더했어요', right: '5/6 + 1/4 = 10/12 + 3/12', rightWhy: '분모를 12로 같게 해요' },
    checks: [exf('1/2', '+', '1/3', '5/6'), exf('3/4', '-', '1/6', '7/12'), exf('2 1/3', '+', '1 1/2', '3 5/6')],
  },
  // ───────────── 5학년 2학기 ─────────────
  {
    unitId: '5-2-0', term: '분수의 곱셈',
    def: '2/3 × 3/4은 **3/4의 2/3**만큼이에요. 분수끼리 곱할 때는 **분자끼리, 분모끼리** 곱하고 약분해요. 자연수는 분자에만 곱하고, 대분수는 **가분수로 바꿔서** 곱해요.',
    example: exf('2/3', '×', '3/4', '1/2'),
    panels: [
      { title: '1. 세로로 4칸, 3칸 칠하기', visual: { kind: 'fracArea', rows: 3, cols: 4, colsOn: 3 }, caption: '전체의 3/4' },
      { title: '2. 가로로 3줄, 2줄 겹치기', visual: { kind: 'fracArea', rows: 3, cols: 4, colsOn: 3, rowsOn: 2 }, caption: '전체 칸 4 × 3 = 12 (분모끼리), 겹친 칸 3 × 2 = 6 (분자끼리) → 6/12' },
      { title: '3. 약분하기', visual: { kind: 'expr', text: '6/12 = 1/2' }, caption: '6과 12를 6으로 나눠요' },
    ],
    caution: { text: '대분수는 자연수 부분까지 함께 곱해야 해요. 가분수로 바꾸면 안전해요.', wrong: '1 1/2 × 1/3 = 1 1/6', wrongWhy: '자연수 1은 그대로 두고 분수끼리만 곱했어요', right: '1 1/2 × 1/3 = 3/2 × 1/3 = 1/2', rightWhy: '대분수를 가분수로 바꿔요' },
    checks: [exf('4/9', '×', '3', '1 1/3'), exf('3/5', '×', '5/6', '1/2'), exf('1 1/3', '×', '3/4', '1')],
  },
  {
    unitId: '5-2-1', term: '소수의 곱셈',
    def: '소수를 **분수로 바꿔** 곱해 보면, 10분의 몇 × 10분의 몇 = **100분의 몇**이 돼요. 100분의 몇은 소수 두 자리예요. 그래서 소수점 아래 자릿수를 **더한 만큼** 소수점을 찍어요.',
    example: ex(1.2, '×', 0.6, '0.72'),
    panels: [
      { title: '1. 분수로 바꾸기', visual: { kind: 'expr', text: '12/10 × 6/10' }, caption: '1.2 = 12/10, 0.6 = 6/10 (소수 한 자리는 10분의 몇)' },
      { title: '2. 분자끼리, 분모끼리', visual: { kind: 'expr', text: '12/10 × 6/10 = 72/100' }, caption: '12 × 6 = 72, 10 × 10 = 100' },
      { title: '3. 소수로 바꾸기', visual: { kind: 'expr', text: '72/100 = 0.72' }, caption: '100분의 몇은 소수 두 자리 → 한 자리 + 한 자리 = 두 자리' },
    ],
    caution: { text: '소수점 아래 자릿수는 두 수의 자릿수를 더해요.', wrong: '1.2 × 0.6 = 7.2', wrongWhy: '10분의 72로 계산했어요. 10 × 10 = 100이에요', right: '1.2 × 0.6 = 0.72', rightWhy: '100분의 72 = 0.72' },
    checks: [ex(2.3, '×', 4, '9.2'), ex(0.8, '×', 1.5, '1.2'), ex(3.25, '×', 6, '19.5')],
  },
];

export const NOTE_BY_UNIT: Record<string, ConceptNoteData> = Object.fromEntries(CONCEPT_NOTES.map(n => [n.unitId, n]));
export const hasConceptNote = (unitId?: string) => !!unitId && !!NOTE_BY_UNIT[unitId];
