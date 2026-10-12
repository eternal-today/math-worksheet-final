/**
 * 개념노트 내용 (1단계: 1~3학년 사칙연산 22개 단원)
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
  | { kind: 'expr'; text: string };

export interface Panel { title: string; visual: Visual; caption: string }
export interface Example { a: number; b: number; op: string; ans: string }
export interface ConceptNoteData {
  unitId: string;
  term: string;
  def: string;
  example: Example;
  panels: Panel[];
  caution: { text: string; wrong: string; wrongWhy: string; right: string; rightWhy: string };
  checks: Example[];
}

const ex = (a: number, op: string, b: number, ans?: string): Example => ({
  a, b, op,
  ans: ans ?? String(op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b),
});

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
      { title: '2. 가르고 모아서 10 만들기', visual: { kind: 'dots', groups: [{ n: 8, tone: 'a', box: true }, { n: 2, tone: 'b', box: true }, { n: 3, tone: 'b' }] }, caption: '일의 자리 5를 2와 3으로 가르고, 8과 2를 모으면 10!' },
      { title: '3. 10은 십의 자리로 올리기', visual: { kind: 'blocks', items: [{ t: 5, o: 0, tone: 'a' }, { t: 1, o: 0, tone: 'r' }, { t: 0, o: 3, tone: 'b' }] }, caption: '십의 자리 3 + 2 + 1 = 6, 일의 자리 3 → 63' },
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
      { title: '3. 몫과 나머지', visual: { kind: 'expr', text: '29 ÷ 4 = 7 … 1' }, caption: '몫 7, 나머지 1' },
    ],
    caution: { text: '나머지가 나누는 수보다 크면 한 묶음을 더 만들 수 있어요.', wrong: '29 ÷ 4 = 6 … 5', wrongWhy: '나머지 5가 4보다 커요', right: '29 ÷ 4 = 7 … 1', rightWhy: '나머지 1은 4보다 작아요' },
    checks: [ex(23, '÷', 5, '4 … 3'), ex(38, '÷', 6, '6 … 2'), ex(17, '÷', 3, '5 … 2')],
  },
];

export const NOTE_BY_UNIT: Record<string, ConceptNoteData> = Object.fromEntries(CONCEPT_NOTES.map(n => [n.unitId, n]));
export const hasConceptNote = (unitId?: string) => !!unitId && !!NOTE_BY_UNIT[unitId];
