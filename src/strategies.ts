/**
 * 풀이법 엔진
 *
 * 문제 숫자를 받아 "식 이어 쓰기" 풀이를 계산한다. 개념노트와 힌트가 같은 엔진을 쓴다.
 *  - 모든 숫자는 코드가 계산 → AI 계산 실수 없음, Gemini 키 없이도 동작
 *  - 줄 0 = 문제, 마지막 줄 = 답. 힌트는 답 줄을 빼고 보여준다
 *  - note는 존댓말("~요"로 끝나게). 힌트는 끝의 "요"만 떼어 반말로 쓴다
 */

/** f: 분수 조각 (빈칸이면 자연수·분자가 빈칸, 분모는 보임) */
import { decPlaces, toScaled, decText, gcd, lcm } from './frac';

export interface Seg { t: string; hl?: 'B' | 'O' | 'P'; blank?: boolean; f?: { w?: string; n: string; d: string }; blankD?: boolean }
export interface Line { segs: Seg[]; note: string; noEq?: boolean }
/** fa/fb: 분수(대분수·자연수 포함) 문제의 두 수. 소수 문제는 a, b에 소수 */
export interface P { a: number; b: number; op: string; ans?: string; fa?: string; fb?: string; e?: string }

export interface Strategy {
  id: string;
  name: string;
  sub: string;           // 짧은 부제
  when: string;          // 언제 쓰면 좋은지 (존댓말 한 줄)
  render?: 'column' | 'mulcol';   // 개념노트에서 세로셈 그림으로 그림 (mulcol: 곱셈 부분곱 세로셈)
  /** 대표 풀이와 같은 계산을 다른 모양(세로)으로 쓴 것 → "다른 방법"이 아니라 "세로로 쓰면"으로 보여줌 */
  same?: boolean;
  /** 세로셈 그림에 쓸 정수 문제와 소수 자릿수 (소수 세로셈) */
  colOf?(p: P): { p: P; dp: number; dpa: number; dpb: number };
  applies(p: P): boolean;
  lines(p: P): Line[];
  intro(p: P): string;   // 힌트 첫 줄 (반말)
  hint?(p: P): string[]; // 힌트 단계 (기본: 답 줄을 뺀 이어 쓰기)
}

// ─────────────────────────────────────────────
// 한국어 조사: 숫자를 한자어로 읽었을 때 받침 기준
// ─────────────────────────────────────────────
function hasBatchim(n: number | string): boolean {
  // 분수는 분자를 마지막에 읽는다 ("3/4" → 4분의 3)
  const fm = String(n).match(/(\d+)\/\d+\s*$/);
  if (fm) n = fm[1];
  const s = String(n).replace(/[^0-9]/g, '');
  if (!s) return false;
  const last = Number(s[s.length - 1]);
  if (last === 0) return true;                 // 십·백·천·만·영 모두 받침
  return [1, 3, 6, 7, 8].includes(last);       // 일 삼 육 칠 팔
}
function rieul(n: number | string): boolean {  // ㄹ 받침: 일, 칠, 팔
  const fm = String(n).match(/(\d+)\/\d+\s*$/);
  if (fm) n = fm[1];
  const s = String(n).replace(/[^0-9]/g, '');
  const last = Number(s[s.length - 1]);
  return [1, 7, 8].includes(last) && last !== 0;
}
export { hasBatchim };
export const j = {
  은: (n: number | string) => `${n}${hasBatchim(n) ? '은' : '는'}`,
  이: (n: number | string) => `${n}${hasBatchim(n) ? '이' : '가'}`,
  을: (n: number | string) => `${n}${hasBatchim(n) ? '을' : '를'}`,
  과: (n: number | string) => `${n}${hasBatchim(n) ? '과' : '와'}`,
  으로: (n: number | string) => `${n}${hasBatchim(n) && !rieul(n) ? '으로' : '로'}`,
};

// ─────────────────────────────────────────────
// 작은 도우미
// ─────────────────────────────────────────────
const s = (t: string | number, hl?: 'B' | 'O' | 'P', blank?: boolean): Seg => ({ t: String(t), hl, blank });
const ones = (n: number) => n % 10;
const tensDigit = (n: number) => Math.floor(n / 10) % 10;
const floorTo = (n: number, u: number) => Math.floor(n / u) * u;
const ceilTo = (n: number, u: number) => Math.ceil(n / u) * u;
const isAdd = (p: P) => p.op === '+';
const isSub = (p: P) => p.op === '-';
const isMul = (p: P) => p.op === '×';
const isDiv = (p: P) => p.op === '÷';
const hasRemainder = (p: P) => isDiv(p) && (p.a % p.b !== 0 || String(p.ans || '').includes('…'));
const placeName = (i: number) => ['일', '십', '백', '천', '만'][i] + '의 자리';

/** 줄의 식만 문자열로 */
export function lineText(l: Line): string { return l.segs.map(x => x.t).join('').replace(/\s+/g, ' ').trim(); }
/** 존댓말 note → 반말 */
export function banmal(t: string): string {
  return t.replace(/이에요(?=[.!?]?$)/, '이야').replace(/예요(?=[.!?]?$)/, '야').replace(/요(?=[.!?]?$)/, '');
}

// ─────────────────────────────────────────────
// 풀이법들
// ─────────────────────────────────────────────

/** 모으기 (9까지 덧셈) */
const pwAdd: Strategy = {
  id: 'pwAdd', name: '모으기', sub: '두 수를 하나로', when: '작은 수끼리 더할 때 좋아요',
  applies: p => isAdd(p) && p.a + p.b <= 10,
  lines: p => [
    { segs: [s(`${p.a} + ${p.b}`)], note: '두 수를 모아요' },
    { segs: [s(p.a + p.b, 'B', true)], note: `${j.과(p.a)} ${j.을(p.b)} 모으면 ${j.이(p.a + p.b)} 돼요` },
  ],
  intro: p => `${j.과(p.a)} ${j.을(p.b)} 하나로 모아 보자!`,
  hint: p => [`${p.a}개와 ${p.b}개를 손가락이나 그림으로 모아 봐`, `모두 몇 개일까?`],
};

/** 이어 세기 (큰 수부터) */
const countOn: Strategy = {
  id: 'countOn', name: '이어 세기', sub: '큰 수부터 세기', when: '더하는 수가 작을 때 빨라요',
  applies: p => isAdd(p) && Math.min(p.a, p.b) <= 9 && p.a + p.b <= 20,
  lines: p => {
    const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
    const seq = Array.from({ length: small }, (_, i) => big + i + 1);
    const out: Line[] = [{ segs: [s(`${p.a} + ${p.b}`)], note: `큰 수 ${j.을(big)} 먼저 생각해요` }];
    out.push({ segs: [s(`${big} → `), ...seq.map((v, i) => s(i < seq.length - 1 ? `${v} → ` : `${v}`, i === seq.length - 1 ? 'B' : undefined, i === seq.length - 1))], note: `${big}에서 ${small}번 이어 세요`, noEq: true });
    out.push({ segs: [s(big + small, 'B', true)], note: `마지막에 센 수가 답이에요` });
    return out;
  },
  intro: p => `큰 수 ${Math.max(p.a, p.b)}부터 이어 세어 보자!`,
  hint: p => {
    const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
    return [`${big}에서 시작해서 손가락으로 ${small}번 이어 세어 봐`, `마지막에 센 수는 얼마일까?`];
  },
};

/** 같은 수 더하기 (비슷한 두 수) */
const doubles: Strategy = {
  id: 'doubles', name: '같은 수 더하기', sub: '쌍둥이 수 이용', when: '두 수가 1~2만큼 차이 날 때 좋아요',
  applies: p => isAdd(p) && p.a !== p.b && Math.abs(p.a - p.b) <= 2 && Math.max(p.a, p.b) <= 9,
  lines: () => [],
  intro: () => '',
};
doubles.lines = p => {
  const m = Math.min(p.a, p.b), d = Math.abs(p.a - p.b);
  return [
    { segs: [s(`${p.a} + ${p.b}`)], note: `${j.은(Math.max(p.a, p.b))} ${m}보다 ${d} 커요` },
    { segs: [s(`${m} + ${m}`, 'B'), s(` + ${d}`, 'O')], note: `같은 수끼리 먼저 더하고, ${j.을(d)} 더 더해요` },
    { segs: [s(m * 2, 'B', true), s(` + ${d}`)], note: `${m} + ${m} = ${m * 2}` },
    { segs: [s(p.a + p.b, 'B', true)], note: `${j.을(d)} 더해요` },
  ];
};
doubles.intro = p => { const m = Math.min(p.a, p.b); return `${m} + ${m}${hasBatchim(m) ? '을' : '를'} 먼저 생각해 보자!`; };

/** 가르기 (9까지 뺄셈) */
const pwSub: Strategy = {
  id: 'pwSub', name: '가르기', sub: '전체를 두 수로', when: '작은 수에서 뺄 때 좋아요',
  applies: p => isSub(p) && p.a <= 10,
  lines: p => [
    { segs: [s(`${p.a} − ${p.b}`)], note: `${j.을(p.a)} ${j.과(p.b)} 나머지로 갈라요` },
    { segs: [s(`${p.a} = ${p.b} + `), s(p.a - p.b, 'O', true)], note: `${j.은(p.a)} ${j.과(p.b)} ${j.으로(p.a - p.b)} 가를 수 있어요`, noEq: true },
    { segs: [s(p.a - p.b, 'B', true)], note: `${j.을(p.b)} 빼면 ${p.a - p.b}만 남아요` },
  ],
  intro: p => `${j.을(p.a)} ${j.과(p.b)} 몇으로 가를 수 있을까?`,
  hint: p => [`${p.a} = ${p.b} + □`, `□에 들어갈 수는 얼마일까?`],
};

/** 거꾸로 세기 */
const countBack: Strategy = {
  id: 'countBack', name: '거꾸로 세기', sub: '하나씩 거꾸로', when: '빼는 수가 작을 때 좋아요',
  applies: p => isSub(p) && p.b <= 5 && p.a <= 20,
  lines: p => {
    const seq = Array.from({ length: p.b }, (_, i) => p.a - i - 1);
    return [
      { segs: [s(`${p.a} − ${p.b}`)], note: `${p.a}에서 ${p.b}번 거꾸로 세요` },
      { segs: [s(`${p.a} → `), ...seq.map((v, i) => s(i < seq.length - 1 ? `${v} → ` : `${v}`, i === seq.length - 1 ? 'B' : undefined, i === seq.length - 1))], note: '한 번에 하나씩', noEq: true },
      { segs: [s(p.a - p.b, 'B', true)], note: '마지막에 센 수가 답이에요' },
    ];
  },
  intro: p => `${p.a}에서 ${p.b}번 거꾸로 세어 보자!`,
  hint: p => [`${p.a}에서 시작해서 ${p.b}번 거꾸로 세어 봐`, `마지막에 센 수는 얼마일까?`],
};

/** 덧셈으로 생각하기 */
const addThink: Strategy = {
  id: 'addThink', name: '덧셈으로 생각하기', sub: '□ 채우기', when: '빼는 수와 답이 가까울 때 좋아요',
  applies: p => isSub(p) && p.a <= 20,
  lines: p => [
    { segs: [s(`${p.a} − ${p.b}`)], note: `${j.이(p.b)} 얼마가 더 있으면 ${p.a}일까요?` },
    { segs: [s(`${p.b} + `), s(p.a - p.b, 'O', true), s(` = ${p.a}`)], note: `빈칸을 찾아요`, noEq: true },
    { segs: [s(p.a - p.b, 'B', true)], note: '빈칸의 수가 답이에요' },
  ],
  intro: p => `${p.b} + □ = ${j.으로(p.a)} 바꿔 보자!`,
  hint: p => [`${p.b} + □ = ${p.a}`, `□에 들어갈 수는 얼마일까?`],
};

/** 묶음끼리, 낱개끼리 (받아올림·내림 없음) */
const placeAddSub: Strategy = {
  id: 'place', name: '자리끼리 계산', sub: '십끼리, 일끼리', when: '받아올림이 없을 때 가장 쉬워요',
  applies: p => (isAdd(p) && ones(p.a) + ones(p.b) < 10 || isSub(p) && ones(p.a) >= ones(p.b)) && Math.max(p.a, p.b) >= 10 && Math.max(p.a, p.b) < 100,
  lines: p => {
    const ta = floorTo(p.a, 10), tb = floorTo(p.b, 10), oa = ones(p.a), ob = ones(p.b);
    const T = isAdd(p) ? ta + tb : ta - tb, O = isAdd(p) ? oa + ob : oa - ob;
    const sym = isAdd(p) ? '+' : '−';
    return [
      { segs: [s(`${p.a} ${sym} ${p.b}`)], note: '십의 자리와 일의 자리로 나눠요' },
      { segs: [s(T, 'B', true), s(' + '), s(O, 'O', true)], note: `십끼리 ${ta} ${sym} ${tb} = ${T}, 일끼리 ${oa} ${sym} ${ob} = ${O}` },
      { segs: [s(T + O, 'B', true)], note: '두 수를 합쳐요' },
    ];
  },
  intro: p => `십은 십끼리, 일은 일끼리 계산해 보자!`,
  hint: p => {
    const sym = isAdd(p) ? '+' : '−';
    return [`십끼리: ${floorTo(p.a, 10)} ${sym} ${floorTo(p.b, 10)}`, `일끼리: ${ones(p.a)} ${sym} ${ones(p.b)}`, `두 결과를 합치면 얼마일까?`];
  },
};

/** 몇십 뛰어 세기 */
const jumpTens: Strategy = {
  id: 'jump10', name: '몇십 뛰어 세기', sub: '10씩 뛰기', when: '몇십을 더하거나 뺄 때 빨라요',
  applies: p => (isAdd(p) || isSub(p)) && p.b % 10 === 0 && p.b >= 10 && p.b <= 50 && p.a < 100,
  lines: p => {
    const k = p.b / 10, dir = isAdd(p) ? 10 : -10;
    const seq = Array.from({ length: k }, (_, i) => p.a + dir * (i + 1));
    const sym = isAdd(p) ? '+' : '−';
    return [
      { segs: [s(`${p.a} ${sym} ${p.b}`)], note: `${j.은(p.b)} 10이 ${k}개예요` },
      { segs: [s(`${p.a} → `), ...seq.map((v, i) => s(i < seq.length - 1 ? `${v} → ` : `${v}`, i === seq.length - 1 ? 'B' : undefined, i === seq.length - 1))], note: `10씩 ${k}번 ${isAdd(p) ? '뛰어 세요' : '거꾸로 뛰어 세요'}`, noEq: true },
      { segs: [s(isAdd(p) ? p.a + p.b : p.a - p.b, 'B', true)], note: '일의 자리는 그대로예요' },
    ];
  },
  intro: p => `${j.은(p.b)} 10이 ${p.b / 10}개야. 10씩 뛰어 세어 보자!`,
  hint: p => {
    const sym = isAdd(p) ? '+' : '−';
    return [`${p.a}에서 10씩 ${p.b / 10}번 ${isAdd(p) ? '뛰어' : '거꾸로 뛰어'} 세어 봐. 일의 자리는 그대로야`, `${p.a} ${sym} ${j.은(p.b)} 얼마일까?`];
  },
};

/** 가르기와 모으기: 10(몇십·몇백) 만들기 */
function make10At(p: P): { u: number; need: number; rest: number } | null {
  if (!isAdd(p)) return null;
  const u = p.a >= 100 && p.a % 100 >= 80 ? 100 : 10;
  const need = ceilTo(p.a + 1, u) - p.a;               // a를 다음 몇십(몇백)으로 만드는 수
  if (u === 10 && ones(p.a) === 0) return null;
  if (need <= 0 || need >= p.b) return null;   // 가르고 남는 수가 0이면 의미 없음
  if (u === 10 && ones(p.a) + ones(p.b) < 10) return null;   // 받아올림 있을 때만
  return { u, need, rest: p.b - need };
}
const make10: Strategy = {
  id: 'make10', name: '가르기와 모으기', sub: '10 만들기', when: '한 수를 몇십으로 만들 수 있을 때 좋아요',
  applies: p => !!make10At(p),
  lines: p => {
    const m = make10At(p)!;
    const base = p.a + m.need;
    const word = m.u === 100 ? '몇백' : (base === 10 ? '10' : '몇십');
    return [
      { segs: [s(`${p.a} + ${p.b}`)], note: `${j.은(p.a)} ${m.need}만 더하면 ${j.이(base)} 돼요` },
      { segs: [s(`${p.a} + `), s(`${m.need} + `, 'O'), s(m.rest, 'O', true)], note: `${j.을(p.b)} ${j.과(m.need)} ${j.으로(m.rest)} 갈라요` },
      { segs: [s(base, 'B', true), s(` + ${m.rest}`)], note: `${j.과(p.a)} ${j.을(m.need)} 모아 ${word === '10' ? '10' : base}` },
      { segs: [s(p.a + p.b, 'B', true)], note: `${base}에 ${j.을(m.rest)} 더해요` },
    ];
  },
  intro: p => { const m = make10At(p)!; return `${j.은(p.a)} ${m.need}만 더하면 ${j.이(p.a + m.need)} 돼. ${j.을(p.b)} 갈라 보자!`; },
};

/** 10에서 빼기 ((십몇) − (몇)) */
const from10: Strategy = {
  id: 'from10', name: '10에서 빼기', sub: '십몇을 10과 몇으로', when: '십몇에서 한 자리 수를 뺄 때 좋아요',
  applies: p => isSub(p) && p.a > 10 && p.a < 20 && p.b < 10 && ones(p.a) < p.b,
  lines: p => {
    const o = ones(p.a);
    return [
      { segs: [s(`${p.a} − ${p.b}`)], note: `${j.을(p.a)} 10과 ${j.으로(o)} 갈라요` },
      { segs: [s(`10 − ${p.b}`, 'B'), s(` + `), s(o, 'O', true)], note: `10에서 ${j.을(p.b)} 먼저 빼요` },
      { segs: [s(10 - p.b, 'B', true), s(` + ${o}`)], note: `10 − ${p.b} = ${10 - p.b}` },
      { segs: [s(p.a - p.b, 'B', true)], note: `남겨 둔 ${j.을(o)} 더해요` },
    ];
  },
  intro: p => `${j.을(p.a)} 10과 ${j.으로(ones(p.a))} 갈라서 10에서 먼저 빼 보자!`,
};

/** 빼는 수 가르기: 몇십(몇백) 만들기 */
const subSplit: Strategy = {
  id: 'subSplit', name: '빼는 수 가르기', sub: '몇십 만들기', when: '빼는 수를 갈라 몇십을 만들 수 있을 때 좋아요',
  applies: p => isSub(p) && ones(p.a) > 0 && ones(p.a) < ones(p.b) && p.a < 100,
  lines: p => {
    const o = ones(p.a), rest = p.b - o, base = p.a - o;
    return [
      { segs: [s(`${p.a} − ${p.b}`)], note: `${p.a}에서 ${j.을(o)} 빼면 ${j.이(base)} 돼요` },
      { segs: [s(`${p.a} − `), s(`${o} − `, 'O'), s(rest, 'O', true)], note: `${j.을(p.b)} ${j.과(o)} ${j.으로(rest)} 갈라요` },
      { segs: [s(base, 'B', true), s(` − ${rest}`)], note: `${p.a} − ${o} = ${base}` },
      { segs: [s(p.a - p.b, 'B', true)], note: `${base}에서 ${j.을(rest)} 빼요` },
    ];
  },
  intro: p => { const o = ones(p.a); return `${p.a}에서 ${j.을(o)} 먼저 빼면 ${j.이(p.a - o)} 돼. ${j.을(p.b)} 갈라 보자!`; },
};

/** 몇십(몇백)으로 바꾸기 */
function compAt(p: P): { x: 'a' | 'b'; r: number; d: number } | null {
  const pick = (v: number) => {
    if (v >= 100 && v % 100 >= 95) return { r: ceilTo(v, 100), d: ceilTo(v, 100) - v };
    if (v % 10 >= 7) return { r: ceilTo(v, 10), d: ceilTo(v, 10) - v };
    return null;
  };
  if (isAdd(p)) {
    const ca = pick(p.a), cb = pick(p.b);
    if (ca && (!cb || ca.d <= cb.d)) return { x: 'a', ...ca };
    if (cb) return { x: 'b', ...cb };
    return null;
  }
  if (isSub(p)) {
    const cb = pick(p.b);
    if (cb && p.a >= cb.r) return { x: 'b', ...cb };
  }
  return null;
}
const comp: Strategy = {
  id: 'comp', name: '몇십으로 바꾸기', sub: '머리셈', when: '7, 8, 9로 끝나는 수가 있을 때 빨라요',
  applies: p => !!compAt(p),
  lines: p => {
    const c = compAt(p)!;
    if (isAdd(p)) {
      const v = c.x === 'a' ? p.a : p.b, other = c.x === 'a' ? p.b : p.a;
      const mid = c.r + other;
      const e1 = c.x === 'a' ? [s(c.r, 'B'), s(` + ${p.b} `), s(`− ${c.d}`, 'O')] : [s(`${p.a} + `), s(c.r, 'B'), s(` `), s(`− ${c.d}`, 'O')];
      return [
        { segs: [s(`${p.a} + ${p.b}`)], note: `${j.은(v)} ${c.r}보다 ${c.d} 작아요` },
        { segs: e1, note: `${v} 대신 ${j.을(c.r)} 더하고, 더 넣은 ${j.을(c.d)} 빼요` },
        { segs: [s(mid, 'B', true), s(` − ${c.d}`)], note: c.x === 'a' ? `${c.r} + ${other} = ${mid}` : `${p.a} + ${c.r} = ${mid}` },
        { segs: [s(p.a + p.b, 'B', true)], note: `${mid}에서 ${j.을(c.d)} 빼요` },
      ];
    }
    const mid = p.a - c.r;
    return [
      { segs: [s(`${p.a} − ${p.b}`)], note: `${j.은(p.b)} ${c.r}보다 ${c.d} 작아요` },
      { segs: [s(`${p.a} − `), s(c.r, 'B'), s(' '), s(`+ ${c.d}`, 'O')], note: `${p.b} 대신 ${j.을(c.r)} 빼고, 더 뺀 ${j.을(c.d)} 돌려줘요` },
      { segs: [s(mid, 'B', true), s(` + ${c.d}`)], note: `${p.a} − ${c.r} = ${mid}` },
      { segs: [s(p.a - p.b, 'B', true)], note: `${j.을(c.d)} 더해요` },
    ];
  },
  intro: p => { const c = compAt(p)!; const v = c.x === 'a' ? p.a : p.b; return `${j.은(v)} ${c.r}에 가까워. ${j.으로(c.r)} 바꿔서 계산해 보자!`; },
};

/** 자리별로 나눠 더하기 (세 자리) */
const PLACE_KO = ['일', '십', '백', '천'];
const placeAdd3: Strategy = {
  id: 'place3', name: '자리별로 더하기', sub: '자리마다 따로', when: '어떤 세 자리, 네 자리 수든 쓸 수 있어요',
  applies: p => isAdd(p) && p.a >= 100 && Number.isInteger(p.a) && Number.isInteger(p.b),
  lines: p => {
    const n = Math.min(4, String(Math.max(p.a, p.b)).length);
    // 큰 자리부터: 천(4자리일 때) · 백 · 십 · 일
    const parts = Array.from({ length: n }, (_, k) => {
      const i = n - 1 - k, u = 10 ** i;
      const da = i === n - 1 ? Math.floor(p.a / u) : Math.floor(p.a / u) % 10;
      const db = i === n - 1 ? Math.floor(p.b / u) : Math.floor(p.b / u) % 10;
      return { i, v: (da + db) * u };
    });
    const names = parts.map(x => PLACE_KO[x.i]);
    return [
      { segs: [s(`${p.a} + ${p.b}`)], note: `${names.join(', ')}의 자리로 나눠요` },
      { segs: parts.flatMap((x, k) => k ? [s(' + '), s(x.v, 'B', true)] : [s(x.v, 'B', true)]), note: parts.map((x, k) => `${names[k]}끼리 ${x.v}`).join(', ') },
      { segs: [s(p.a + p.b, 'B', true)], note: `${['', '', '두', '세', '네'][n]} 수를 모두 더해요` },
    ];
  },
  intro: p => String(Math.max(p.a, p.b)).length >= 4 ? `천은 천끼리, 백은 백끼리, 십은 십끼리, 일은 일끼리 더해 보자!` : `백은 백끼리, 십은 십끼리, 일은 일끼리 더해 보자!`,
};

/** 빼는 수를 갈라 차례로 빼기 */
const seqSub: Strategy = {
  id: 'seqSub', name: '차례로 빼기', sub: '빼는 수를 자리별로', when: '어떤 뺄셈이든 쓸 수 있어요',
  applies: p => isSub(p) && p.b >= 10 && Number.isInteger(p.a) && Number.isInteger(p.b),
  lines: p => {
    const parts = [floorTo(p.b, 1000), (Math.floor(p.b / 100) % 10) * 100, tensDigit(p.b) * 10, ones(p.b)].filter(v => v > 0);
    const out: Line[] = [{ segs: [s(`${p.a} − ${p.b}`)], note: `${j.을(p.b)} ${parts.slice(0, -1).map(String).concat(j.으로(parts[parts.length - 1])).join(', ')} 갈라요` }];
    out.push({ segs: [s(`${p.a} `), ...parts.map(v => s(`− ${v} `, 'O'))], note: '하나씩 차례로 빼요' });
    let cur = p.a;
    for (let i = 0; i < parts.length; i++) {
      cur -= parts[i];
      const restParts = parts.slice(i + 1);
      if (restParts.length) out.push({ segs: [s(cur, 'B', true), s(' ' + restParts.map(v => `− ${v}`).join(' '))], note: `${cur + parts[i]} − ${parts[i]} = ${cur}` });
    }
    out.push({ segs: [s(p.a - p.b, 'B', true)], note: `마지막으로 ${j.을(parts[parts.length - 1])} 빼요` });
    return out;
  },
  intro: p => `${j.을(p.b)} 자리별로 갈라서 하나씩 빼 보자!`,
};

/** 세로셈 (덧셈·뺄셈) — 학교에서 배우는 방법 */
export interface ColumnData { top: number[]; bottom: number[]; result: number[]; marks: string[]; sym: string; width: number }
export function columnData(p: P): ColumnData {
  const width = Math.max(String(p.a).length, String(p.b).length, String(isAdd(p) ? p.a + p.b : p.a - p.b).length);
  const dig = (n: number) => String(n).padStart(width, ' ').split('').map(c => (c === ' ' ? -1 : Number(c)));
  const res = isAdd(p) ? p.a + p.b : p.a - p.b;
  const marks: string[] = Array(width).fill('');
  if (isAdd(p)) {
    let carry = 0;
    for (let i = 0; i < width; i++) {
      const da = Math.floor(p.a / 10 ** i) % 10, db = Math.floor(p.b / 10 ** i) % 10;
      const sum = da + db + carry;
      carry = sum >= 10 ? 1 : 0;
      if (carry && i + 1 < width) marks[width - 2 - i] = '1';
    }
  } else {
    let borrow = 0;
    for (let i = 0; i < width; i++) {
      const da = Math.floor(p.a / 10 ** i) % 10, db = Math.floor(p.b / 10 ** i) % 10;
      let top = da - borrow;
      const need = top < db;
      if (need) top += 10;
      if (need || borrow) marks[width - 1 - i] = String(top);
      borrow = need ? 1 : 0;
    }
  }
  return { top: dig(p.a), bottom: dig(p.b), result: dig(res), marks, sym: isAdd(p) ? '+' : '−', width };
}
function columnLines(p: P, nameOf: (i: number) => string, head: Line, last: Line): Line[] {
    const out: Line[] = [head];
    const width = String(Math.max(p.a, p.b)).length;
    let carry = 0, borrow = 0;
    for (let i = 0; i < width; i++) {
      const da = Math.floor(p.a / 10 ** i) % 10, db = Math.floor(p.b / 10 ** i) % 10;
      const nm = nameOf(i);
      if (isAdd(p)) {
        const sum = da + db + carry;
        const expr = `${da} + ${db}${carry ? ' + 1' : ''} = ${sum}`;
        const tail = sum >= 10 && i + 1 < width ? ` → ${sum % 10}${hasBatchim(sum % 10) ? '을' : '를'} 쓰고 1을 올려요` : '';
        out.push({ segs: [s(`${nm}: ${expr}`)], note: tail.replace(' → ', '') || (carry ? '올린 1까지 더해요' : `${nm}끼리 더해요`), noEq: true });
        carry = sum >= 10 ? 1 : 0;
      } else {
        let top = da - borrow;
        let note: string;
        const need = top < db;
        if (borrow && da === 0) note = `0이라서 윗자리에서 10을 빌려와 아랫자리에 1을 빌려주니 9가 남아요`;
        else if (borrow && need) note = `${da}에서 1을 빌려줘서 ${top}, 모자라서 윗자리에서 10을 빌려와요`;
        else if (borrow) note = `${da}에서 1을 빌려줘서 ${top}이 남아요`.replace(/(\d)이 남아요/, (m, d) => `${d}${hasBatchim(d) ? '이' : '가'} 남아요`);
        else if (need) note = `${da}에서 ${j.을(db)} 뺄 수 없어 윗자리에서 10을 빌려와요`;
        else note = `${nm}끼리 빼요`;
        if (need) top += 10;
        out.push({ segs: [s(`${nm}: ${top} − ${db} = ${top - db}`)], note, noEq: true });
        borrow = need ? 1 : 0;
      }
    }
    out.push(last);
    return out;
}
const column: Strategy = {
  id: 'column', name: '세로셈', sub: '자리 맞춰 쓰기', when: '수가 커져도 실수 없이 풀 수 있어요', render: 'column',
  applies: p => (isAdd(p) || isSub(p)) && p.a >= 10 && Number.isInteger(p.a) && Number.isInteger(p.b),
  lines: p => columnLines(p, placeName,
    { segs: [s(`${p.a} ${isAdd(p) ? '+' : '−'} ${p.b}`)], note: '자리를 맞춰 세로로 써요' },
    { segs: [s(isAdd(p) ? p.a + p.b : p.a - p.b, 'B', true)], note: '자리별 결과를 이어 읽어요' }),
  intro: () => `자리를 맞춰 세로로 쓰고, 일의 자리부터 계산해 보자!`,
  hint: p => {
    const all = column.lines(p);
    return [all[1] ? lineText(all[1]) + ` (${banmal(all[1].note)})` : '일의 자리부터 계산해', '나머지 자리도 같은 방법으로 해 봐'];
  },
};

/** 곱셈: 하나 더 (a × b = a × (b−1) + a) */
const mulPlusOne: Strategy = {
  id: 'mulPlusOne', name: '하나 더', sub: '아는 곱에서 한 묶음 더', when: '바로 앞 곱을 알 때 좋아요',
  applies: p => isMul(p) && p.b >= 2 && p.b <= 9 && p.a <= 9,
  lines: p => [
    { segs: [s(`${p.a} × ${p.b}`)], note: `${j.이(p.a)} ${p.b}묶음이에요` },
    { segs: [s(`${p.a} × ${p.b - 1}`, 'B'), s(` + ${p.a}`, 'O')], note: `${p.b - 1}묶음에 한 묶음을 더해요` },
    { segs: [s(p.a * (p.b - 1), 'B', true), s(` + ${p.a}`)], note: `${p.a} × ${p.b - 1} = ${p.a * (p.b - 1)}` },
    { segs: [s(p.a * p.b, 'B', true)], note: `${j.을(p.a)} 더해요` },
  ],
  intro: p => `${p.a} × ${p.b - 1}에 ${j.을(p.a)} 한 번 더 더하면 돼!`,
};

/** 곱셈: 아는 단으로 가르기 (7 × 6 = 5 × 6 + 2 × 6) */
const mulSplit: Strategy = {
  id: 'mulSplit', name: '아는 단으로 가르기', sub: '5단 + 나머지 단', when: '6~9단처럼 큰 단에서 좋아요',
  applies: p => isMul(p) && p.a >= 6 && p.a <= 9 && p.b <= 9,
  lines: p => {
    const r = p.a - 5;
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: `${p.a}단을 5단과 ${r}단으로 갈라요` },
      { segs: [s(`5 × ${p.b}`, 'B'), s(' + '), s(`${r} × ${p.b}`, 'O')], note: `${j.은(p.a)} ${j.과(5)} ${j.으로(r)} 갈라져요` },
      { segs: [s(5 * p.b, 'B', true), s(' + '), s(r * p.b, 'O', true)], note: `5 × ${p.b} = ${5 * p.b}, ${r} × ${p.b} = ${r * p.b}` },
      { segs: [s(p.a * p.b, 'B', true)], note: '두 곱을 더해요' },
    ];
  },
  intro: p => `${p.a}단은 5단과 ${p.a - 5}단을 합친 거야. 갈라서 곱해 보자!`,
};

/** 곱셈: 9단 = 10단 − 1단 */
const mulNine: Strategy = {
  id: 'mulNine', name: '10단에서 빼기', sub: '9단 요령', when: '9단에서 좋아요',
  applies: p => isMul(p) && (p.a === 9 || p.b === 9) && Math.max(p.a, p.b) <= 9,
  lines: p => {
    const o = p.a === 9 ? p.b : p.a;
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: `9는 10보다 1 작아요` },
      { segs: [s(`10 × ${o}`, 'B'), s(` − ${o}`, 'O')], note: `10묶음을 만들고 한 묶음을 빼요` },
      { segs: [s(10 * o, 'B', true), s(` − ${o}`)], note: `10 × ${o} = ${10 * o}` },
      { segs: [s(9 * o, 'B', true)], note: `${j.을(o)} 빼요` },
    ];
  },
  intro: p => { const o = p.a === 9 ? p.b : p.a; return `10 × ${j.을(o)} 먼저 하고 ${j.을(o)} 빼 보자!`; },
};

/** 곱셈: 순서 바꾸기 */
const mulSwap: Strategy = {
  id: 'mulSwap', name: '순서 바꾸기', sub: '곱하는 순서', when: '바꾼 쪽 단이 더 쉬울 때 좋아요',
  applies: p => isMul(p) && p.a !== p.b && p.a <= 9 && p.b <= 9 && p.b < p.a,
  lines: p => [
    { segs: [s(`${p.a} × ${p.b}`)], note: '곱하는 순서를 바꿔도 답은 같아요' },
    { segs: [s(`${p.b} × ${p.a}`, 'B')], note: `${p.b}단에서 찾아요` },
    { segs: [s(p.a * p.b, 'B', true)], note: `${p.b} × ${p.a} = ${p.a * p.b}` },
  ],
  intro: p => `${p.a} × ${j.은(p.b)} ${p.b} × ${j.과(p.a)} 같아!`,
};

/** 곱셈: 뛰어 세기 (같은 수 여러 번 더하기) */
const mulAdd: Strategy = {
  id: 'mulAdd', name: '뛰어 세기', sub: '같은 수 여러 번 더하기', when: '곱셈의 뜻을 떠올릴 때 좋아요',
  applies: p => isMul(p) && p.a <= 9 && p.b <= 9,
  lines: p => {
    const seq = Array.from({ length: p.b }, (_, i) => p.a * (i + 1));
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: `${j.을(p.a)} ${p.b}번 더해요` },
      { segs: seq.map((v, i) => s(i < seq.length - 1 ? `${v} → ` : `${v}`, i === seq.length - 1 ? 'B' : undefined, i === seq.length - 1)), note: `${p.a}씩 뛰어 세요`, noEq: true },
      { segs: [s(p.a * p.b, 'B', true)], note: `${p.b}번 뛰어 센 수가 답이에요` },
    ];
  },
  intro: p => `${p.a}씩 ${p.b}번 뛰어 세어 보자!`,
  hint: p => [`${p.a}씩 ${p.b}번 뛰어 세어 봐`, `마지막 수는 얼마일까?`],
};

/** 곱셈: 가르기 (분배) — 두 자리 × 한 자리, 두 자리 × 두 자리 */
const mulDist: Strategy = {
  id: 'mulDist', name: '가르기', sub: '몇십과 몇으로 갈라 곱하기', when: '두 자리 수 곱셈에 좋아요',
  applies: p => isMul(p) && (p.a >= 10 || p.b >= 10),
  lines: p => {
    const splitB = p.b >= 10;
    const v = splitB ? p.b : p.a, other = splitB ? p.a : p.b;
    const t = floorTo(v, 10), o = ones(v);
    const e1 = splitB ? [s(`${other} × ${t}`, 'B'), s(' + '), s(`${other} × ${o}`, 'O')] : [s(`${t} × ${other}`, 'B'), s(' + '), s(`${o} × ${other}`, 'O')];
    if (o === 0) {
      return [
        { segs: [s(`${p.a} × ${p.b}`)], note: `${j.은(v)} 몇십이에요` },
        { segs: [s(p.a * p.b, 'B', true)], note: `${other} × ${t / 10} = ${other * t / 10}에 0을 붙여요` },
      ];
    }
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: `${j.을(v)} ${j.과(t)} ${j.으로(o)} 갈라요` },
      { segs: e1, note: '갈라서 따로 곱해요' },
      { segs: [s(other * t, 'B', true), s(' + '), s(other * o, 'O', true)], note: `${splitB ? `${other} × ${t}` : `${t} × ${other}`} = ${other * t}, ${splitB ? `${other} × ${o}` : `${o} × ${other}`} = ${other * o}` },
      { segs: [s(p.a * p.b, 'B', true)], note: '두 곱을 더해요' },
    ];
  },
  intro: p => { const v = p.b >= 10 ? p.b : p.a; return `${j.을(v)} ${j.과(floorTo(v, 10))} ${j.으로(ones(v))} 갈라서 곱해 보자!`; },
};

/** 곱셈 세로셈 = 가르기와 같은 계산을 세로로 (부분곱 두 줄 → 더하기) */
export function mulColData(p: P) {
  const splitB = p.b >= 10;
  const v = splitB ? p.b : p.a, other = splitB ? p.a : p.b;
  const t = floorTo(v, 10), o = ones(v);
  const rowO = { label: splitB ? `${other} × ${o}` : `${o} × ${other}`, value: other * o };   // 일의 자리 곱 (주황)
  const rowB = { label: splitB ? `${other} × ${t}` : `${t} × ${other}`, value: other * t };   // 몇십 곱 (파랑)
  return { rows: o ? [rowO, rowB] : [rowB], total: p.a * p.b };
}
const mulColumn: Strategy = {
  id: 'mulColumn', name: '세로로 쓰면', sub: '같은 계산을 세로로', when: '가르기에서 나온 두 곱을 한 줄씩 써서 더해요', render: 'mulcol', same: true,
  applies: p => isMul(p) && (p.a >= 10 || p.b >= 10),
  lines: p => {
    const d = mulColData(p);
    const out: Line[] = [{ segs: [s(`${p.a} × ${p.b}`)], note: '세로로 쓰고 일의 자리 곱부터 써요' }];
    d.rows.forEach((r, i) => out.push({ segs: [s(`${['첫째', '둘째'][i]} 줄: ${r.label} = ${r.value}`)], note: `가르기의 ${r.label}와 같아요`.replace(/(\d)와 같아요$/, (m, x) => `${x}${hasBatchim(x) ? '과' : '와'} 같아요`), noEq: true }));
    if (d.rows.length > 1) out.push({ segs: [s(`${d.rows[0].value} + ${d.rows[1].value}`)], note: '두 줄을 더해요' });
    out.push({ segs: [s(d.total, 'B', true)], note: '가르기로 구한 답과 같아요' });
    return out;
  },
  intro: () => `세로로 쓰고 일의 자리 곱부터 써 보자!`,
};

/** 나눗셈: 곱셈으로 생각하기 */
const divMul: Strategy = {
  id: 'divMul', name: '곱셈으로 생각하기', sub: '□ × 나누는 수', when: '구구단을 알면 가장 빨라요',
  applies: p => isDiv(p) && !hasRemainder(p),
  lines: p => {
    const q = p.a / p.b;
    return [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: `${p.b} 곱하기 몇이 ${p.a}일까요?` },
      { segs: [s(`${p.b} × `), s('□', 'O'), s(` = ${p.a}`)], note: `${p.b}단에서 ${j.을(p.a)} 찾아요`, noEq: true },
      { segs: [s(`${p.b} × `), s(q, 'O', true), s(` = ${p.a}`)], note: `${p.b} × ${q} = ${p.a}`, noEq: true },
      { segs: [s(q, 'B', true)], note: '□에 들어간 수가 몫이에요' },
    ];
  },
  intro: p => `${p.b} × □ = ${j.을(p.a)} 생각해 보자!`,
  hint: p => [`${p.b}단을 처음부터 차례로 떠올려 봐`, `${p.b} × □ = ${p.a}에서 □는 얼마일까?`],
};

/** 나눗셈: 똑같이 덜어내기 */
const divShare: Strategy = {
  id: 'divShare', name: '묶어 덜어내기', sub: '똑같이 나누기', when: '나눗셈의 뜻을 떠올릴 때 좋아요',
  applies: p => isDiv(p) && !hasRemainder(p) && p.a / p.b <= 9,
  lines: p => {
    const q = p.a / p.b;
    const seq = Array.from({ length: q }, (_, i) => p.a - p.b * (i + 1));
    return [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: `${p.a}에서 ${p.b}씩 덜어내요` },
      { segs: [s(`${p.a} → `), ...seq.map((v, i) => s(i < seq.length - 1 ? `${v} → ` : `${v}`))], note: '0이 될 때까지', noEq: true },
      { segs: [s(q, 'B', true)], note: `${q}번 덜어냈어요` },
    ];
  },
  intro: p => `${p.a}에서 ${p.b}씩 몇 번 덜어낼 수 있을까?`,
  hint: p => [`${p.a}에서 ${p.b}씩 빼서 0이 될 때까지 해 봐`, `몇 번 뺐는지 세어 볼까?`],
};

/** 나머지 있는 나눗셈: 넘지 않는 가장 큰 곱 찾기 */
const divRem: Strategy = {
  id: 'divRem', name: '가장 가까운 곱 찾기', sub: '구구단에서 넘지 않는 수', when: '나머지 있는 나눗셈의 기본이에요',
  applies: p => isDiv(p) && hasRemainder(p),
  lines: p => {
    const q = Math.floor(p.a / p.b), r = p.a % p.b;
    return [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: `${p.b}단에서 ${j.을(p.a)} 넘지 않는 가장 큰 수를 찾아요` },
      { segs: [s(`${p.b} × `), s(q, 'O', true), s(` = ${p.b * q}`)], note: `${p.b} × ${q + 1} = ${j.은(p.b * (q + 1))} ${j.을(p.a)} 넘어요`, noEq: true },
      { segs: [s(`${p.a} − ${p.b * q} = `), s(r, 'O', true)], note: '남은 수가 나머지예요', noEq: true },
      { segs: [s(q, 'B', true), s(' … '), s(r, 'B', true)], note: `몫 ${q}, 나머지 ${r}` },
    ];
  },
  intro: p => `${p.b}단에서 ${j.을(p.a)} 넘지 않는 가장 큰 수를 찾아보자!`,
  hint: p => [`${p.b}단을 차례로 떠올리면서 ${j.을(p.a)} 넘지 않는 가장 큰 곱을 찾아`, `그 곱을 빼고 남은 수가 나머지야. 몫과 나머지는 얼마일까?`],
};

/** 세로 나눗셈 (학교) */
const divLong: Strategy = {
  id: 'divLong', name: '세로 나눗셈', sub: '나눗셈 기호로 쓰기', when: '학교에서 배우는 방법이에요',
  applies: p => isDiv(p) && Number.isInteger(p.a) && Number.isInteger(p.b) && (hasRemainder(p) || p.b >= 10),
  lines: p => {
    const q = Math.floor(p.a / p.b), r = p.a % p.b;
    return [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: '나누는 수를 왼쪽, 나누어지는 수를 안쪽에 써요' },
      { segs: [s(`몫 ${q} → ${p.b} × ${q} = ${p.b * q}`)], note: '몫을 위에 쓰고 곱을 아래에 써요', noEq: true },
      { segs: [s(`${p.a} − ${p.b * q} = ${r}`)], note: r ? '빼고 남은 수가 나머지예요' : '남는 수가 없어요', noEq: true },
      { segs: r ? [s(`${q} … ${r}`, 'B', true)] : [s(q, 'B', true)], note: r ? `나머지 ${j.은(r)} ${p.b}보다 작아야 해요` : '나누어떨어져요' },
    ];
  },
  intro: () => `세로로 써서 몫과 나머지를 구해 보자!`,
};


// ─────────────────────────────────────────────
// 4학년: (세 자리)÷(두 자리)
// ─────────────────────────────────────────────

/** 나누는 수를 가까운 몇십으로 바꿔 몫 찾기: 몇십 × □가 넘지 않는 가장 큰 □ */
export function estOf(p: P) {
  const R = Math.round(p.b / 10) * 10 || 10;
  const q0 = Math.max(1, Math.floor(p.a / R));
  let q = q0;
  while (q > 1 && p.b * q > p.a) q--;
  while (p.b * (q + 1) <= p.a) q++;
  return { R, q0, q, r: p.a - p.b * q };
}
const divEst: Strategy = {
  id: 'divEst', name: '몇십으로 바꿔 몫 찾기', sub: '몇십 단에서 찾기', when: '두 자리 수로 나눌 때 몫을 빨리 찾아요',
  applies: p => isDiv(p) && p.b >= 10 && Number.isInteger(p.a),
  lines: p => {
    const e = estOf(p);
    const out: Line[] = [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: `${j.은(p.b)} ${j.과(e.R)} 가까워요. ${e.R} × □가 ${j.을(p.a)} 넘지 않게 찾아요` },
      { segs: [s(`${e.R} × `), s(e.q0, 'O', true), s(` = ${e.R * e.q0}`)], note: `${e.R} × ${e.q0 + 1} = ${j.은(e.R * (e.q0 + 1))} ${j.을(p.a)} 넘어요` },
      { segs: [s(`${p.b} × ${e.q0} = `), s(p.b * e.q0, 'B', true)], note: e.q0 === e.q ? (e.r ? `${j.을(p.a)} 넘지 않아요. 몫은 ${e.q}` : `${j.과(p.a)} 딱 맞아요`) : p.b * e.q0 > p.a ? `${j.을(p.a)} 넘어서 몫을 ${e.q0 - e.q}만큼 줄여요` : `남는 수가 ${p.b}보다 커서 몫을 ${e.q - e.q0}만큼 늘려요` },
    ];
    if (e.q0 !== e.q) out.push({ segs: [s(`${p.b} × ${e.q} = `), s(p.b * e.q, 'B', true)], note: e.r ? `${j.을(p.a)} 넘지 않는 가장 큰 곱이에요` : `${j.과(p.a)} 딱 맞아요` });
    if (e.r) out.push({ segs: [s(`${p.a} − ${p.b * e.q} = `), s(e.r, 'O', true)], note: `남는 수가 나머지예요 (${p.b}보다 작아요)` });
    out.push({ segs: e.r ? [s(e.q, 'B', true), s(' … '), s(e.r, 'B', true)] : [s(e.q, 'B', true)], note: e.r ? `몫 ${e.q}, 나머지 ${e.r}` : `몫은 ${e.q}${hasBatchim(e.q) ? '이에요' : '예요'}` });
    // 위 줄들은 "=" 대신 "→"로 이어 씀 (식의 값이 같지 않으므로)
    return out.map((l, i) => (i === 0 || i === out.length - 1 ? l : { ...l, noEq: true }));
  },
  intro: p => { const R = estOf(p).R; return `${j.을(p.b)} ${j.으로(R)} 바꿔서 ${R}단에서 몫을 찾아보자!`; },
  hint: p => { const R = estOf(p).R; return [`${j.을(p.b)} ${j.으로(R)} 생각하고, ${R} × □가 ${j.을(p.a)} 넘지 않는 가장 큰 □를 찾아봐`, `${p.b} × □도 ${j.을(p.a)} 넘지 않는지 확인해 봐. 몫은 얼마일까?`]; },
};

// ─────────────────────────────────────────────
// 4학년: 소수의 덧셈과 뺄셈
// ─────────────────────────────────────────────
const isDecProb = (p: P) => (isAdd(p) || isSub(p)) && (!Number.isInteger(p.a) || !Number.isInteger(p.b)) && p.fa === undefined;
function decOf(p: P) {
  const dp = Math.max(1, decPlaces(String(p.a)), decPlaces(String(p.b)));
  const A = toScaled(String(p.a), dp), B = toScaled(String(p.b), dp);
  const R = isAdd(p) ? A + B : A - B;
  return { dp, A, B, R, u: dp === 1 ? '0.1' : dp === 2 ? '0.01' : '0.001', sym: isAdd(p) ? '+' : '−' };
}
/** 소수 자릿수를 dp에 맞춰 끝에 0 붙인 글자 (1.5 → 1.50) */
function padDec(x: number, dp: number): string {
  const t = String(x), cur = decPlaces(t);
  if (cur >= dp) return t;
  return (cur === 0 ? t + '.' : t) + '0'.repeat(dp - cur);
}
const DEC_PLACE = ['일의 자리', '소수 첫째 자리', '소수 둘째 자리', '소수 셋째 자리'];
/** 정수(×10^dp) 값을 자리별로: [일 이상, 0.1 자리, 0.01 자리 …] */
function decDigits(V: number, dp: number): number[] {
  const out = [Math.floor(V / 10 ** dp) * 10 ** dp];
  for (let k = dp - 1; k >= 0; k--) out.push((Math.floor(V / 10 ** k) % 10) * 10 ** k);
  return out;
}
/** 0 붙이기 줄 (자릿수가 다를 때만) */
function padLine(p: P, dp: number, sym: string): Line | null {
  const da = decPlaces(String(p.a)), db = decPlaces(String(p.b));
  if (da === dp && db === dp) return null;
  const pa = padDec(p.a, dp), pb = padDec(p.b, dp);
  const who = da < dp ? { x: p.a, t: pa } : { x: p.b, t: pb };
  return {
    segs: [s(pa, da < dp ? 'O' : undefined), s(` ${sym} `), s(pb, db < dp ? 'O' : undefined)],
    note: `${who.x} = ${who.t}. 끝에 0을 붙여 자릿수를 맞춰요`,
  };
}
const decPlace: Strategy = {
  id: 'decPlace', name: '자리별로 더하기', sub: '같은 자리끼리', when: '자연수처럼 같은 자리끼리 더하면 돼요',
  applies: p => isDecProb(p) && isAdd(p),
  lines: p => {
    const d = decOf(p);
    const out: Line[] = [{ segs: [s(`${p.a} + ${p.b}`)], note: '같은 자리끼리 더해요' }];
    const pl = padLine(p, d.dp, '+'); if (pl) out.push(pl);
    const A = decDigits(d.A, d.dp), B = decDigits(d.B, d.dp);
    const parts = A.map((v, i) => ({ i, v: v + B[i] })).filter(x => x.v > 0);
    out.push({
      segs: parts.flatMap((x, k) => k ? [s(' + '), s(decText(x.v, d.dp), 'B', true)] : [s(decText(x.v, d.dp), 'B', true)]),
      note: parts.map(x => `${DEC_PLACE[x.i]}끼리 ${decText(x.v, d.dp)}`).join(', '),
    });
    out.push({ segs: [s(decText(d.R, d.dp), 'B', true)], note: '모두 더해요' });
    return out;
  },
  intro: () => `자연수처럼 같은 자리끼리 더해 보자!`,
};
const decSeqSub: Strategy = {
  id: 'decSeqSub', name: '차례로 빼기', sub: '빼는 수를 자리별로', when: '자연수처럼 빼는 수를 갈라 차례로 빼요',
  applies: p => isDecProb(p) && isSub(p),
  lines: p => {
    const d = decOf(p);
    let parts = decDigits(d.B, d.dp).filter(v => v > 0);
    const pa = padDec(p.a, d.dp);
    if (parts.length === 1) {
      // 한 자리만 빼는데 그 자리에서 뺄 수 없으면: 빼는 수를 갈라 먼저 자연수(몇)로 만들기 (5.2 − 0.8 = 5.2 − 0.2 − 0.6)
      const k = decDigits(d.B, d.dp).findIndex(v => v > 0);
      const have = decDigits(d.A, d.dp)[k];
      if (k > 0 && have > 0 && have < parts[0]) parts = [have, parts[0] - have];
    }
    const out: Line[] = [{ segs: [s(`${p.a} − ${p.b}`)], note: `${j.을(p.b)} ${parts.slice(0, -1).map(v => decText(v, d.dp)).concat(j.으로(decText(parts[parts.length - 1], d.dp))).join(', ')} 갈라요` }];
    const pl = padLine(p, d.dp, '−'); if (pl) out.push(pl);
    out.push({ segs: [s(`${pa} `), ...parts.map(v => s(`− ${decText(v, d.dp)} `, 'O'))], note: '하나씩 차례로 빼요' });
    let cur = d.A;
    for (let i = 0; i < parts.length; i++) {
      const prev = cur; cur -= parts[i];
      const rest = parts.slice(i + 1);
      if (rest.length) out.push({ segs: [s(decText(cur, d.dp), 'B', true), s(' ' + rest.map(v => `− ${decText(v, d.dp)}`).join(' '))], note: `${decText(prev, d.dp)} − ${decText(parts[i], d.dp)} = ${decText(cur, d.dp)}` });
    }
    out.push({ segs: [s(decText(d.R, d.dp), 'B', true)], note: `마지막으로 ${j.을(decText(parts[parts.length - 1], d.dp))} 빼요` });
    return out;
  },
  intro: p => `${j.을(p.b)} 자리별로 갈라서 하나씩 빼 보자!`,
};
const decUnits: Strategy = {
  id: 'decUnits', name: '몇 개인지 세기', sub: '0.1·0.01이 몇 개', when: '소수를 자연수처럼 계산할 수 있어요',
  applies: isDecProb,
  lines: p => {
    const d = decOf(p);
    return [
      { segs: [s(`${p.a} ${d.sym} ${p.b}`)], note: `${d.u}이 몇 개인지로 바꿔요` },
      { segs: [s(`${d.u}이 `), s(d.A, 'B', true), s(`개 ${d.sym} ${d.u}이 `), s(d.B, 'O', true), s('개')], note: `${j.은(p.a)} ${d.u}이 ${d.A}개, ${j.은(p.b)} ${d.u}이 ${d.B}개` },
      { segs: [s(`${d.u}이 `), s(d.R, 'B', true), s('개')], note: `${d.A} ${d.sym} ${d.B} = ${d.R}` },
      { segs: [s(decText(d.R, d.dp), 'B', true)], note: `${d.u}이 ${d.R}개면 ${decText(d.R, d.dp)}` },
    ];
  },
  intro: p => `${decOf(p).u}이 몇 개인지로 바꾸면 자연수처럼 계산할 수 있어!`,
  hint: p => { const d = decOf(p); return [`${j.은(p.a)} ${d.u}이 ${d.A}개, ${j.은(p.b)} ${d.u}이 ${d.B}개야`, `${d.u}이 (${d.A} ${d.sym} ${d.B})개면 얼마일까?`]; },
};
const decName = (dp: number) => (i: number) => i < dp ? `소수 ${['첫째', '둘째', '셋째'][dp - 1 - i]} 자리` : placeName(i - dp);
const decColumn: Strategy = {
  id: 'decColumn', name: '세로셈', sub: '소수점 맞춰 쓰기', when: '소수점끼리 맞추면 자리가 맞아요', render: 'column',
  applies: isDecProb,
  colOf: p => { const d = decOf(p); return { p: { a: d.A, b: d.B, op: p.op }, dp: d.dp, dpa: decPlaces(String(p.a)), dpb: decPlaces(String(p.b)) }; },
  lines: p => {
    const d = decOf(p);
    return columnLines({ a: d.A, b: d.B, op: p.op }, decName(d.dp),
      { segs: [s(`${p.a} ${d.sym} ${p.b}`)], note: '소수점끼리 맞춰 세로로 써요. 빈자리는 0으로 생각해요' },
      { segs: [s(decText(d.R, d.dp), 'B', true)], note: '소수점을 그대로 내려 찍어요' });
  },
  intro: () => `소수점끼리 맞춰 세로로 쓰고, 끝자리부터 계산해 보자!`,
};
const decWhole: Strategy = {
  id: 'decWhole', name: '자연수 부분, 소수 부분', sub: '따로 계산하기', when: '자연수 부분이 있을 때 어림하기도 좋아요',
  applies: p => {
    if (!isDecProb(p)) return false;
    const d = decOf(p), U = 10 ** d.dp;
    if (Math.floor(d.A / U) === 0 && Math.floor(d.B / U) === 0) return false;
    return isAdd(p) || d.A % U >= d.B % U;
  },
  lines: p => {
    const d = decOf(p), U = 10 ** d.dp;
    const ia = Math.floor(d.A / U), ib = Math.floor(d.B / U), fa = d.A % U, fb = d.B % U;
    const I = isAdd(p) ? ia + ib : ia - ib, Fv = isAdd(p) ? fa + fb : fa - fb;
    return [
      { segs: [s(`${p.a} ${d.sym} ${p.b}`)], note: '자연수 부분과 소수 부분으로 나눠요' },
      { segs: [s(`(${ia} ${d.sym} ${ib})`, 'B'), s(' + '), s(`(${decText(fa, d.dp)} ${d.sym} ${decText(fb, d.dp)})`, 'O')], note: '자연수끼리, 소수끼리 계산해요' },
      { segs: [s(I, 'B', true), s(' + '), s(decText(Fv, d.dp), 'O', true)], note: `${ia} ${d.sym} ${ib} = ${I}, ${decText(fa, d.dp)} ${d.sym} ${decText(fb, d.dp)} = ${decText(Fv, d.dp)}` },
      { segs: [s(decText(d.R, d.dp), 'B', true)], note: '두 결과를 더해요' },
    ];
  },
  intro: () => `자연수 부분과 소수 부분을 따로 계산해 보자!`,
};

// ─────────────────────────────────────────────
// 4학년: 분모가 같은 분수의 덧셈과 뺄셈
// ─────────────────────────────────────────────
interface Mx { w: number; n: number; d: number }   // d = 0 이면 자연수
function mx(t?: string): Mx {
  const v = String(t ?? '').trim();
  const m = v.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (m) return { w: m[1] ? Number(m[1]) : 0, n: Number(m[2]), d: Number(m[3]) };
  return { w: Number(v) || 0, n: 0, d: 0 };
}
/** 분수 조각 (빈칸이면 자연수·분자가 빈칸) */
function fs(text: string, hl?: 'B' | 'O', blank?: boolean): Seg {
  const m = text.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  if (!m) return s(text, hl, blank);
  return { t: text, hl, blank, f: { w: m[1], n: m[2], d: m[3] } };
}
/** 대분수 글자: w n/d (0인 부분은 뺌) */
const mxText = (w: number, n: number, d: number) => n === 0 ? String(w) : w === 0 ? `${n}/${d}` : `${w} ${n}/${d}`;
const isFracSame = (p: P) => (isAdd(p) || isSub(p)) && p.fa !== undefined && p.fb !== undefined && (() => {
  const A = mx(p.fa), B = mx(p.fb);
  return !A.d || !B.d || A.d === B.d;
})();
const fd = (p: P) => mx(p.fa).d || mx(p.fb).d;

const unitFrac: Strategy = {
  id: 'unitFrac', name: '단위분수로 세기', sub: '1/□이 몇 개', when: '분모가 같으면 분자만 세면 돼요',
  applies: isFracSame,
  lines: p => {
    const A = mx(p.fa), B = mx(p.fb), d = fd(p);
    const UA = A.w * d + A.n, UB = B.w * d + B.n, R = isAdd(p) ? UA + UB : UA - UB;
    const sym = isAdd(p) ? '+' : '−', u = `1/${d}`;
    const out: Line[] = [
      { segs: [s(`${p.fa} ${sym} ${p.fb}`)], note: `${u}이 몇 개인지 세어요` },
      { segs: [s(`${u}이 `), s(UA, 'B', true), s(`개 ${sym} ${u}이 `), s(UB, 'O', true), s('개')], note: `${j.은(p.fa!)} ${u}이 ${UA}개, ${j.은(p.fb!)} ${u}이 ${UB}개` },
      { segs: [s(`${u}이 `), s(R, 'B', true), s('개')], note: `${UA} ${sym} ${UB} = ${R}` },
    ];
    if (R % d === 0) { out.push({ segs: [s(R / d, 'B', true)], note: `${u}이 ${R}개면 ${R / d}` }); return out; }
    out.push({ segs: [fs(`${R}/${d}`, 'B', true)], note: `${u}이 ${R}개면 ${R}/${d}` });
    if (R > d) out.push({ segs: [fs(mxText(Math.floor(R / d), R % d, d), 'B', true)], note: `가분수 ${j.은(`${R}/${d}`)} 대분수로 바꿔요` });
    return out;
  },
  intro: p => `분모가 같으니까 1/${fd(p)}이 몇 개인지 세어 보자!`,
  hint: p => {
    const A = mx(p.fa), B = mx(p.fb), d = fd(p);
    const UA = A.w * d + A.n, UB = B.w * d + B.n;
    return [`${j.은(p.fa!)} 1/${d}이 ${UA}개, ${j.은(p.fb!)} 1/${d}이 ${UB}개야`, `1/${d}이 모두 몇 개가 될까? 분모는 그대로야`];
  },
};

const wholeFrac: Strategy = {
  id: 'wholeFrac', name: '자연수끼리, 분수끼리', sub: '나눠서 계산하기', when: '대분수가 있을 때 좋아요',
  applies: p => isFracSame(p) && (mx(p.fa).w > 0 || mx(p.fb).w > 0),
  lines: p => {
    const A0 = mx(p.fa), B = mx(p.fb), d = fd(p);
    const sym = isAdd(p) ? '+' : '−';
    const out: Line[] = [{ segs: [s(`${p.fa} ${sym} ${p.fb}`)], note: `자연수는 자연수끼리, 분수는 분수끼리 ${isAdd(p) ? '더해요' : '빼요'}` }];
    let A = { ...A0 };
    if (isSub(p) && A.n < B.n) {
      // 받아내림: 자연수 1을 d/d로
      A = { w: A0.w - 1, n: A0.n + d, d };
      out.push({ segs: [fs(mxText(A.w, A.n, d), 'O'), s(` − ${p.fb}`)], note: A0.n === 0 ? `${j.을(A0.w)} ${j.과(A0.w - 1)} ${j.으로(`${d}/${d}`)} 바꿔요` : `분수끼리 뺄 수 없어서 자연수 1을 ${j.으로(`${d}/${d}`)} 바꿔요` });
    }
    const W = isAdd(p) ? A.w + B.w : A.w - B.w, N = isAdd(p) ? A.n + B.n : A.n - B.n;
    out.push({ segs: [s(`(${A.w} ${sym} ${B.w})`, 'B'), s(' + '), s(`(${A.n}/${d} ${sym} ${B.n}/${d})`, 'O')], note: '자연수 부분과 분수 부분으로 나눠요' });
    out.push({ segs: [s(W, 'B', true), s(' + '), N === 0 ? s(0, 'O', true) : fs(`${N}/${d}`, 'O', true)], note: `자연수끼리 ${W}, 분수끼리 ${N === 0 ? 0 : `${N}/${d}`}` });
    if (N >= d) {
      const extra = Math.floor(N / d), rest = N % d;
      if (rest) out.push({ segs: [s(`${W} + `), fs(mxText(extra, rest, d), 'O', true)], note: `${j.은(`${N}/${d}`)} 1보다 커요. 대분수로 바꿔요` });
      out.push({ segs: [fs(mxText(W + extra, rest, d), 'B', true)], note: '자연수끼리 다시 더해요' });
    } else {
      out.push({ segs: [fs(mxText(W, N, d), 'B', true)], note: '자연수와 분수를 이어 써요' });
    }
    return out;
  },
  intro: () => `자연수는 자연수끼리, 분수는 분수끼리 계산해 보자!`,
  hint: p => {
    const A = mx(p.fa), B = mx(p.fb), d = fd(p);
    if (isSub(p) && A.n === 0) return [`${j.을(A.w)} ${j.과(A.w - 1)} ${j.으로(`${d}/${d}`)} 바꿔 봐`, `자연수끼리, 분수끼리 빼면 얼마일까?`];
    if (isSub(p) && A.n < B.n) return [`${A.n}/${d}에서 ${j.을(`${B.n}/${d}`)} 뺄 수 없어. 자연수 1을 ${j.으로(`${d}/${d}`)} 바꿔 봐`, `자연수끼리, 분수끼리 빼면 얼마일까?`];
    if (isSub(p)) return [`자연수끼리 (${A.w} − ${B.w}), 분수끼리 (${A.n}/${d} − ${B.n}/${d}) 따로 빼 봐`, `두 결과를 이어 쓰면 얼마일까?`];
    return [`자연수끼리 (${A.w} + ${B.w}), 분수끼리 (${A.n}/${d} + ${B.n}/${d}) 따로 더해 봐`, `분수 부분이 1보다 크면 대분수로 바꿔야 해. 답은 얼마일까?`];
  },
};

// ─────────────────────────────────────────────
// 5학년: 자연수의 혼합 계산
// ─────────────────────────────────────────────
type MixTok = string;
const mixToks = (e: string): MixTok[] => e.replace(/−/g, '-').match(/\d+|[()+\-×÷]/g) || [];
const mixStr = (t: MixTok[]) => t.map(x => (x === '-' ? '−' : x)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
interface MixStep { before: MixTok[]; after: MixTok[]; at: number; l: string; op: string; r: string; v: number; kind: 'paren' | 'muldiv' | 'addsub' }
/** 한 단계씩: 가장 안쪽 괄호 → ×÷ 왼쪽부터 → +− 왼쪽부터 */
export function mixSteps(e: string): MixStep[] {
  let t = mixToks(e);
  const out: MixStep[] = [];
  for (let guard = 0; guard < 20 && t.length > 1; guard++) {
    let lo = 0, hi = t.length, inParen = false;
    const open = t.lastIndexOf('(');
    if (open >= 0) { lo = open + 1; hi = t.indexOf(')', open); inParen = true; }
    let k = -1;
    for (let i = lo; i < hi; i++) if (t[i] === '×' || t[i] === '÷') { k = i; break; }
    const kind: MixStep['kind'] = inParen ? 'paren' : k >= 0 ? 'muldiv' : 'addsub';
    if (k < 0) for (let i = lo; i < hi; i++) if (t[i] === '+' || t[i] === '-') { k = i; break; }
    const l = Number(t[k - 1]), r = Number(t[k + 1]), op = t[k];
    const v = op === '+' ? l + r : op === '-' ? l - r : op === '×' ? l * r : l / r;
    let next = [...t.slice(0, k - 1), String(v), ...t.slice(k + 2)];
    let at = k - 1;
    // 괄호 안이 수 하나만 남으면 괄호를 벗김
    if (inParen && next[at - 1] === '(' && next[at + 1] === ')') { next = [...next.slice(0, at - 1), next[at], ...next.slice(at + 2)]; at -= 1; }
    out.push({ before: t, after: next, at, l: String(l), op: op === '-' ? '−' : op, r: String(r), v, kind });
    t = next;
  }
  return out;
}
const isMix = (p: P) => p.op === 'mix' && !!p.e;
const KIND_WORD = { paren: '① 괄호 안을 먼저', muldiv: '② ×, ÷를 먼저', addsub: '③ +, −는 앞에서부터' };
/** 순서별 색: 괄호 보라(P), ×÷ 파랑(B), +− 주황(O) */
export const MIX_HL = { paren: 'P', muldiv: 'B', addsub: 'O' } as const;
/** 처음 식의 기호마다 몇 번째로 계산하는지와 종류 (개념노트 그림용) */
export function mixMarks(e: string): { tok: string; step?: number; kind?: MixStep['kind'] }[] {
  const toks = mixToks(e);
  let t = toks.map((tok, id) => ({ tok, id }));
  const mark: Record<number, { step: number; kind: MixStep['kind'] }> = {};
  for (let step = 1; step < 20 && t.length > 1; step++) {
    let lo = 0, hi = t.length, inParen = false;
    const open = t.map(x => x.tok).lastIndexOf('(');
    if (open >= 0) { lo = open + 1; hi = t.findIndex((x, i) => i > open && x.tok === ')'); inParen = true; }
    let k = -1;
    for (let i = lo; i < hi; i++) if (t[i].tok === '×' || t[i].tok === '÷') { k = i; break; }
    const kind: MixStep['kind'] = inParen ? 'paren' : k >= 0 ? 'muldiv' : 'addsub';
    if (k < 0) for (let i = lo; i < hi; i++) if (t[i].tok === '+' || t[i].tok === '-') { k = i; break; }
    mark[t[k].id] = { step, kind };
    let next = [...t.slice(0, k - 1), { tok: 'v', id: -1 }, ...t.slice(k + 2)];
    const at = k - 1;
    if (inParen && next[at - 1]?.tok === '(' && next[at + 1]?.tok === ')') next = [...next.slice(0, at - 1), next[at], ...next.slice(at + 2)];
    t = next;
  }
  return toks.map((tok, id) => ({ tok: tok === '-' ? '−' : tok, ...(mark[id] || {}) }));
}
const mixOrder: Strategy = {
  id: 'mixOrder', name: '한 단계씩 계산하기', sub: '괄호 → ×÷ → +−', when: '계산 순서를 지키며 한 번에 하나씩 해요',
  applies: isMix,
  lines: p => {
    const st = mixSteps(p.e!);
    const out: Line[] = [{ segs: [s(mixStr(mixToks(p.e!)))], note: '① 괄호 → ② ×, ÷ → ③ +, − 순서로 한 단계씩 해요' }];
    st.forEach(x => {
      const pre = x.after.slice(0, x.at), post = x.after.slice(x.at + 1);
      const segs: Seg[] = [];
      if (pre.length) segs.push(s(mixStr(pre) + (pre[pre.length - 1] === '(' ? '' : ' ')));
      segs.push(s(x.v, MIX_HL[x.kind], true));
      if (post.length) segs.push(s((post[0] === ')' ? '' : ' ') + mixStr(post)));
      out.push({ segs, note: `${KIND_WORD[x.kind]}: ${x.l} ${x.op} ${x.r} = ${x.v}` });
    });
    return out;
  },
  intro: p => { const st = mixSteps(p.e!); return st[0].kind === 'paren' ? '괄호 안부터 계산해 보자!' : st[0].kind === 'muldiv' ? '×, ÷부터 계산해 보자!' : '앞에서부터 차례로 계산해 보자!'; },
  hint: p => {
    const st = mixSteps(p.e!);
    return [`먼저 ${st[0].l} ${st[0].op} ${st[0].r}부터 계산해 (${KIND_WORD[st[0].kind]})`, `그다음도 괄호 → ×, ÷ → +, − 순서로 한 단계씩 해 봐. 답은 얼마일까?`];
  },
};

// ─────────────────────────────────────────────
// 5학년: 약수와 배수 (최대공약수 · 최소공배수)
// ─────────────────────────────────────────────
const divisorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);
/** 목록이 길면 앞 몇 개와 … 로 줄임 */
const listText = (xs: (number | string)[], max = 12) => (xs.length > max ? [...xs.slice(0, max - 1), '…'] : xs).join(', ');
const gcdList: Strategy = {
  id: 'gcdList', name: '약수를 모두 쓰기', sub: '두 목록에서 공통 찾기', when: '두 수의 약수를 각각 쓰고 둘 다 있는 수를 찾아요',
  applies: p => p.op === 'gcd',
  lines: p => {
    const a = Math.min(p.a, p.b), b = Math.max(p.a, p.b), g = gcd(a, b);
    const da = divisorsOf(a), db = divisorsOf(b), common = da.filter(x => b % x === 0);
    return [
      { segs: [s(`${j.과(a)} ${b}의 최대공약수`)], note: '두 수의 약수를 각각 써요' },
      { segs: [s(`${a}의 약수: ${listText(da)}`)], note: `${j.을(a)} 나누어떨어지게 하는 수`, noEq: true },
      { segs: [s(`${b}의 약수: ${listText(db)}`)], note: `${j.을(b)} 나누어떨어지게 하는 수`, noEq: true },
      { segs: [s(g, 'B', true)], note: `두 목록에 모두 있는 수(공약수) ${common.join(', ')} 중 가장 큰 수` },
    ];
  },
  intro: p => `${Math.min(p.a, p.b)}의 약수와 ${Math.max(p.a, p.b)}의 약수를 각각 써 보자!`,
  hint: p => { const a = Math.min(p.a, p.b), b = Math.max(p.a, p.b); return [`${a}의 약수: ${listText(divisorsOf(a))} / ${b}의 약수: ${listText(divisorsOf(b))}`, `두 목록에 모두 있는 수 중 가장 큰 수는?`]; },
};
const lcmList: Strategy = {
  id: 'lcmList', name: '배수를 차례로 쓰기', sub: '두 목록에서 공통 찾기', when: '두 수의 배수를 각각 쓰고 처음 겹치는 수를 찾아요',
  applies: p => p.op === 'lcm',
  lines: p => {
    const a = Math.min(p.a, p.b), b = Math.max(p.a, p.b), L = lcm(a, b);
    const ma = Array.from({ length: L / a + 1 }, (_, i) => a * (i + 1)), mb = Array.from({ length: L / b + 1 }, (_, i) => b * (i + 1));
    return [
      { segs: [s(`${j.과(a)} ${b}의 최소공배수`)], note: '두 수의 배수를 각각 써요' },
      { segs: [s(`${a}의 배수: ${listText(ma)}, …`)], note: `${a}씩 커져요`, noEq: true },
      { segs: [s(`${b}의 배수: ${listText(mb)}, …`)], note: `${b}씩 커져요`, noEq: true },
      { segs: [s(L, 'B', true)], note: '두 목록에 처음으로 함께 나오는 수(공배수 중 가장 작은 수)' },
    ];
  },
  intro: p => `${Math.min(p.a, p.b)}의 배수와 ${Math.max(p.a, p.b)}의 배수를 차례로 써 보자!`,
  hint: p => { const a = Math.min(p.a, p.b), b = Math.max(p.a, p.b); return [`${a}의 배수: ${a}, ${a * 2}, ${a * 3}… / ${b}의 배수: ${b}, ${b * 2}, ${b * 3}…`, `두 목록에 처음으로 함께 나오는 수는?`]; },
};
/** 공약수로 나누기 (학교): 2) 12 18 → 6 9 */
function ladder(a: number, b: number) {
  const steps: { p: number; x: number; y: number }[] = [];
  let x = a, y = b;
  for (;;) {
    let pr = 0;
    for (let k = 2; k <= Math.min(x, y); k++) if (x % k === 0 && y % k === 0) { pr = k; break; }
    if (!pr) break;
    steps.push({ p: pr, x, y }); x /= pr; y /= pr;
  }
  return { steps, x, y };
}
function ladderLines(p: P, which: 'gcd' | 'lcm'): Line[] {
  const a = Math.min(p.a, p.b), b = Math.max(p.a, p.b);
  const L = ladder(a, b), fs2 = L.steps.map(x => x.p);
  const out: Line[] = [{ segs: [s(`${j.과(a)} ${b}의 ${which === 'gcd' ? '최대공약수' : '최소공배수'}`)], note: '두 수를 함께 나누는 수로 계속 나눠요' }];
  L.steps.forEach(x => out.push({ segs: [s(`${x.p}) ${x.x}  ${x.y} → ${x.x / x.p}  ${x.y / x.p}`)], note: `${j.으로(x.p)} 둘 다 나눠요`, noEq: true }));
  if (which === 'gcd') {
    const g = fs2.reduce((m, v) => m * v, 1);
    if (fs2.length > 1) out.push({ segs: [s(`왼쪽 수끼리 곱하기: ${fs2.join(' × ')} = ${g}`)], note: '나눈 수를 모두 곱해요', noEq: true });
    out.push({ segs: [s(g, 'B', true)], note: fs2.length ? '최대공약수예요' : '공약수가 1뿐이에요' });
  } else {
    const all = [...fs2, L.x, L.y], v = all.reduce((m, x) => m * x, 1);
    out.push({ segs: [s(`ㄴ자로 곱하기: ${all.join(' × ')} = ${v}`)], note: '나눈 수와 마지막 몫을 모두 곱해요', noEq: true });
    out.push({ segs: [s(v, 'B', true)], note: '최소공배수예요' });
  }
  return out;
}
const gcdDivide: Strategy = {
  id: 'gcdDivide', name: '공약수로 나누기', sub: '나눗셈 사다리', when: '학교에서 배우는 방법이에요. 수가 커도 빨라요',
  applies: p => p.op === 'gcd', lines: p => ladderLines(p, 'gcd'), intro: () => '두 수를 함께 나누는 수로 계속 나눠 보자!',
};
const lcmDivide: Strategy = {
  id: 'lcmDivide', name: '공약수로 나누기', sub: '나눗셈 사다리', when: '학교에서 배우는 방법이에요. 수가 커도 빨라요',
  applies: p => p.op === 'lcm', lines: p => ladderLines(p, 'lcm'), intro: () => '두 수를 함께 나누는 수로 계속 나눠 보자!',
};

// ─────────────────────────────────────────────
// 5학년: 약분
// ─────────────────────────────────────────────
/** 식이 들어간 분수 조각: (12 ÷ 2)/(18 ÷ 2) */
const fe = (n: string, d: string, hl?: 'B' | 'O', w?: number): Seg => ({ t: `${w ? w + ' ' : ''}(${n})/(${d})`, hl, f: { w: w ? String(w) : undefined, n, d } });
/** 분수 조각 빈칸 (분모까지 빈칸) */
const fsD = (text: string, hl?: 'B' | 'O'): Seg => { const sg = fs(text, hl, true); return sg.f ? { ...sg, blankD: true } : sg; };
const smallestCommon = (x: number, y: number) => { for (let k = 2; k <= Math.min(x, y); k++) if (x % k === 0 && y % k === 0) return k; return 0; };
const reduceStep: Strategy = {
  id: 'reduceStep', name: '차례로 나누기', sub: '같은 수로 나누고 또 나누기', when: '2, 3, 5처럼 쉬운 수부터 나눠요',
  applies: p => p.op === 'reduce' && !!p.fa,
  lines: p => {
    let { w, n, d } = mx(p.fa);
    const out: Line[] = [{ segs: [fs(p.fa!)], note: '분자와 분모를 같은 수로 나눠요' }];
    let first = true;
    for (let k = smallestCommon(n, d); k; k = smallestCommon(n, d)) {
      // 나누는 식은 첫 단계만 보여줌 (다음 식이 앞 빈칸의 답을 드러내지 않게)
      if (first) out.push({ segs: [fe(`${n} ÷ ${k}`, `${d} ÷ ${k}`, 'O', w)], note: `${j.과(n)} ${j.을(d)} 둘 다 ${j.으로(k)} 나눠요` });
      n /= k; d /= k;
      out.push({ segs: [fsD(mxText(w, n, d), 'B')], note: first ? `${n * k} ÷ ${k} = ${n}, ${d * k} ÷ ${k} = ${d}` : `또 ${j.으로(k)} 나눠요: ${n * k} ÷ ${k} = ${n}, ${d * k} ÷ ${k} = ${d}` });
      first = false;
    }
    out[out.length - 1].note += ` → ${j.과(n)} ${j.은(d)} 1 말고 함께 나누는 수가 없어요`;
    return out;
  },
  intro: () => '분자와 분모를 함께 나누는 수로 계속 나눠 보자!',
  hint: p => { const { n, d } = mx(p.fa); const k = smallestCommon(n, d); return [`${j.과(n)} ${j.을(d)} 둘 다 ${j.으로(k)} 나눠 봐`, `더 나눌 수 없을 때까지 나누면 얼마일까?`]; },
};
const reduceGcd: Strategy = {
  id: 'reduceGcd', name: '최대공약수로 한 번에', sub: '한 번에 나누기', when: '최대공약수를 알면 한 번에 끝나요',
  applies: p => p.op === 'reduce' && !!p.fa,
  lines: p => {
    const { w, n, d } = mx(p.fa), g = gcd(n, d);
    return [
      { segs: [fs(p.fa!)], note: `${j.과(n)} ${d}의 최대공약수를 찾아요` },
      { segs: [s(`${j.과(n)} ${d}의 최대공약수: ${g}`)], note: '공약수 중 가장 큰 수', noEq: true },
      { segs: [fe(`${n} ÷ ${g}`, `${d} ÷ ${g}`, 'O', w)], note: `${j.으로(g)} 한 번에 나눠요` },
      { segs: [fsD(mxText(w, n / g, d / g), 'B')], note: '바로 기약분수가 돼요' },
    ];
  },
  intro: () => '최대공약수로 한 번에 나눠 보자!',
};

// ─────────────────────────────────────────────
// 5학년: 분모가 다른 분수의 덧셈과 뺄셈 (통분)
// ─────────────────────────────────────────────
const isFracDiff = (p: P) => (isAdd(p) || isSub(p)) && !!p.fa && !!p.fb && mx(p.fa).d > 0 && mx(p.fb).d > 0 && mx(p.fa).d !== mx(p.fb).d;
/** 마지막 줄이 약분 가능하면 약분 줄을 더함 (5학년부터 기약분수) */
function addReduce(out: Line[]): Line[] {
  const last = out[out.length - 1];
  const t = lineText(last), m = mx(t);
  if (m.d && gcd(m.n, m.d) > 1) {
    const g = gcd(m.n, m.d);
    out.push({ segs: [fsD(mxText(m.w, m.n / g, m.d / g), 'B')], note: `${j.과(m.n)} ${j.을(m.d)} ${j.으로(g)} 약분해요` });
  }
  return out;
}
function lcdLines(p: P, Lfn: (a: number, b: number) => number): Line[] {
  const A = mx(p.fa), B = mx(p.fb), L = Lfn(A.d, B.d), kA = L / A.d, kB = L / B.d;
  const sym = isAdd(p) ? '+' : '−';
  const conv = (X: Mx, k: number) => (k === 1 ? fs(mxText(X.w, X.n, X.d)) : fe(`${X.n} × ${k}`, `${X.d} × ${k}`, undefined, X.w));
  const fa2 = mxText(A.w, A.n * kA, L), fb2 = mxText(B.w, B.n * kB, L);
  const out: Line[] = [
    { segs: [s(`${p.fa} ${sym} ${p.fb}`)], note: Lfn === lcm ? `분모 ${j.과(A.d)} ${B.d}의 최소공배수 ${j.으로(L)} 분모를 같게 해요` : `분모끼리 곱한 ${A.d} × ${B.d} = ${j.으로(L)} 분모를 같게 해요` },
    { segs: [conv(A, kA), s(` ${sym} `), conv(B, kB)], note: '분모와 분자에 같은 수를 곱해요' },
  ];
  const p2: P = { ...p, fa: fa2, fb: fb2 };
  if (A.w || B.w) {
    const rest = wholeFrac.lines(p2);
    rest[0] = { segs: [fs(fa2, 'B', true), s(` ${sym} `), fs(fb2, 'B', true)], note: `${p.fa} = ${fa2}, ${p.fb} = ${fb2}` };
    out.push(...rest);
  } else {
    const N = isAdd(p) ? A.n * kA + B.n * kB : A.n * kA - B.n * kB;
    out.push({ segs: [fs(fa2, 'B', true), s(` ${sym} `), fs(fb2, 'B', true)], note: `${p.fa} = ${fa2}, ${p.fb} = ${fb2}` });
    out.push({ segs: [fs(`${N}/${L}`, 'B', true)], note: `분모가 같으니 분자끼리: ${A.n * kA} ${sym} ${B.n * kB} = ${N}` });
    if (N > L && N % L) out.push({ segs: [fs(mxText(Math.floor(N / L), N % L, L), 'B', true)], note: '가분수를 대분수로 바꿔요' });
    else if (N % L === 0) out.push({ segs: [s(N / L, 'B', true)], note: '자연수가 돼요' });
  }
  return addReduce(out);
}
const lcdFrac: Strategy = {
  id: 'lcdFrac', name: '최소공배수로 통분', sub: '분모를 같게', when: '분모의 최소공배수로 통분하면 수가 작아 편해요',
  applies: isFracDiff, lines: p => lcdLines(p, lcm),
  intro: p => `분모 ${j.과(mx(p.fa).d)} ${mx(p.fb).d}의 최소공배수로 분모를 같게 해 보자!`,
  hint: p => { const A = mx(p.fa), B = mx(p.fb), L = lcm(A.d, B.d); return [`분모 ${j.과(A.d)} ${B.d}의 최소공배수는 ${L}야. 두 분수의 분모를 ${j.으로(L)} 바꿔 봐`, `분모가 같아지면 분자끼리 계산하고, 약분까지 하면 얼마일까?`]; },
};
const prodDen: Strategy = {
  id: 'prodDen', name: '분모의 곱으로 통분', sub: '두 분모를 곱하기', when: '최소공배수를 몰라도 바로 할 수 있어요',
  applies: p => isFracDiff(p) && !mx(p.fa).w && !mx(p.fb).w && mx(p.fa).d * mx(p.fb).d !== lcm(mx(p.fa).d, mx(p.fb).d),
  lines: p => lcdLines(p, (a, b) => a * b),
  intro: () => '두 분모를 곱한 수로 분모를 같게 해 보자!',
};

// ─────────────────────────────────────────────
// 5학년: 분수의 곱셈
// ─────────────────────────────────────────────
const isFracMul = (p: P) => isMul(p) && !!p.fa && !!p.fb;
/** 가분수로: 자연수는 k/1이 아니라 그대로 k */
const imp = (X: Mx) => (X.d ? { n: X.w * X.d + X.n, d: X.d } : { n: X.w, d: 1 });
const impText = (X: Mx) => { const f = imp(X); return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`; };
function mulTail(out: Line[], N: number, D: number): Line[] {
  const g = gcd(N, D);
  if (g > 1) out.push({ segs: [D / g === 1 ? s(N / g, 'B', true) : fsD(`${N / g}/${D / g}`, 'B')], note: `${j.과(N)} ${j.을(D)} ${j.으로(g)} 약분해요` });
  const n2 = N / g, d2 = D / g;
  if (d2 > 1 && n2 > d2) out.push({ segs: [fs(mxText(Math.floor(n2 / d2), n2 % d2, d2), 'B', true)], note: '가분수를 대분수로 바꿔요' });
  return out;
}
const fracMul: Strategy = {
  id: 'fracMul', name: '분자끼리, 분모끼리', sub: '곱하고 약분하기', when: '어떤 분수의 곱셈이든 쓸 수 있어요',
  applies: isFracMul,
  lines: p => {
    const A = mx(p.fa), B = mx(p.fb), a = imp(A), b = imp(B);
    const out: Line[] = [{ segs: [s(`${p.fa} × ${p.fb}`)], note: A.w && A.d || B.w && B.d ? '대분수는 가분수로 바꿔요' : '분수의 곱셈이에요' }];
    if ((A.w && A.d) || (B.w && B.d)) out.push({ segs: [fs(impText(A), A.w && A.d ? 'O' : undefined), s(' × '), fs(impText(B), B.w && B.d ? 'O' : undefined)], note: '대분수를 가분수로 바꿨어요' });
    const nT = b.d === 1 ? `${a.n} × ${b.n}` : a.d === 1 ? `${a.n} × ${b.n}` : `${a.n} × ${b.n}`;
    const dT = a.d === 1 ? `${b.d}` : b.d === 1 ? `${a.d}` : `${a.d} × ${b.d}`;
    out.push({ segs: [fe(nT, dT, 'O')], note: a.d === 1 || b.d === 1 ? '자연수는 분자에만 곱해요' : '분자끼리, 분모끼리 곱해요' });
    const N = a.n * b.n, D = a.d * b.d;
    out.push({ segs: [fs(D === 1 ? String(N) : `${N}/${D}`, 'B', true)], note: `${nT} = ${N}${D > 1 && dT.includes('×') ? `, ${dT} = ${D}` : ''}` });
    return mulTail(out, N, D);
  },
  intro: () => '분자끼리, 분모끼리 곱하고 약분해 보자!',
  hint: p => {
    const A = mx(p.fa), B = mx(p.fb), a = imp(A), b = imp(B);
    const mixed = (A.w && A.d) || (B.w && B.d);
    return [`${mixed ? `먼저 대분수를 가분수로 바꾸면 ${impText(A)} × ${impText(B)}. ` : ''}분자끼리 ${a.n} × ${b.n}, 분모끼리 ${a.d} × ${b.d}를 곱해 봐`, `약분까지 하면 얼마일까?`];
  },
};
const fracMulCancel: Strategy = {
  id: 'fracMulCancel', name: '약분 먼저', sub: '곱하기 전에 약분', when: '수가 클 때 계산이 쉬워져요',
  applies: p => {
    if (!isFracMul(p)) return false;
    const a = imp(mx(p.fa)), b = imp(mx(p.fb));
    return gcd(a.n, b.d) > 1 || gcd(b.n, a.d) > 1;
  },
  lines: p => {
    const A = mx(p.fa), B = mx(p.fb), a = imp(A), b = imp(B);
    const g1 = gcd(a.n, b.d), g2 = gcd(b.n, a.d);
    const a2 = { n: a.n / g1, d: a.d / g2 }, b2 = { n: b.n / g2, d: b.d / g1 };
    const t = (f: { n: number; d: number }) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
    const out: Line[] = [{ segs: [s(`${p.fa} × ${p.fb}`)], note: '곱하기 전에 위아래로 약분해요' }];
    if ((A.w && A.d) || (B.w && B.d)) out.push({ segs: [fs(impText(A)), s(' × '), fs(impText(B))], note: '대분수를 가분수로 바꿔요' });
    const why = [g1 > 1 ? `${j.과(a.n)} ${j.을(b.d)} ${j.으로(g1)}` : '', g2 > 1 ? `${j.과(b.n)} ${j.을(a.d)} ${j.으로(g2)}` : ''].filter(Boolean).join(', ');
    out.push({ segs: [fs(t(a2), 'O'), s(' × '), fs(t(b2), 'O')], note: `${why} 약분해요` });
    const N = a2.n * b2.n, D = a2.d * b2.d;
    out.push({ segs: [fs(D === 1 ? String(N) : `${N}/${D}`, 'B', true)], note: '작아진 수끼리 곱해요' });
    return mulTail(out, N, D);
  },
  intro: () => '곱하기 전에 약분부터 해 보자!',
};

// ─────────────────────────────────────────────
// 5학년: 소수의 곱셈
// ─────────────────────────────────────────────
const isDecMul = (p: P) => isMul(p) && !p.fa && (!Number.isInteger(p.a) || !Number.isInteger(p.b));
function decMulOf(p: P) {
  const da = decPlaces(String(p.a)), db = decPlaces(String(p.b));
  const A = toScaled(String(p.a), da), B = toScaled(String(p.b), db);
  return { da, db, A, B, P: A * B, dp: da + db };
}
const decMulInt: Strategy = {
  id: 'decMulInt', name: '자연수처럼 곱하기', sub: '곱하고 소수점 찍기', when: '소수점만 잘 찍으면 자연수 곱셈과 같아요',
  applies: isDecMul,
  lines: p => {
    const d = decMulOf(p);
    const place = (x: number, k: number) => (k ? `${x}는 ${k}자리` : `${x}는 자연수(0자리)`).replace(/^(\S+)는/, (m, v) => `${j.은(v)}`);
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: '소수점을 떼고 자연수처럼 곱해요' },
      { segs: [s(`${d.A} × ${d.B} = `), s(d.P, 'O', true)], note: `${p.a} → ${d.A}${d.db ? `, ${p.b} → ${d.B}` : ''}`, noEq: true },
      { segs: [s(`소수점 아래 자릿수: ${d.da} + ${d.db} = `), s(d.dp, 'O', true)], note: `${place(p.a, d.da)}, ${place(p.b, d.db)}`, noEq: true },
      { segs: [s(decText(d.P, d.dp), 'B', true)], note: (() => { const full = String(d.P).padStart(d.dp + 1, '0'); const t = `${full.slice(0, full.length - d.dp)}.${full.slice(full.length - d.dp)}`; return `${d.P}에서 소수점 아래 ${d.dp}자리 → ${t}${t !== decText(d.P, d.dp) ? ` = ${decText(d.P, d.dp)}` : ''}`; })() },
    ];
  },
  intro: () => '소수점을 떼고 자연수처럼 곱한 다음, 소수점을 찍어 보자!',
  hint: p => { const d = decMulOf(p); return [`소수점을 떼고 ${d.A} × ${d.B}부터 계산해 봐`, `소수점 아래 자릿수는 ${d.da} + ${d.db} = ${d.dp}자리야. 답은 얼마일까?`]; },
};
const decMulFrac: Strategy = {
  id: 'decMulFrac', name: '분수로 바꿔 곱하기', sub: '10분의, 100분의', when: '왜 소수점 아래 자릿수를 더하는지 알 수 있어요',
  applies: isDecMul,
  lines: p => {
    const d = decMulOf(p);
    const Da = 10 ** d.da, Db = 10 ** d.db;
    const fa = d.da ? `${d.A}/${Da}` : String(d.A), fb = d.db ? `${d.B}/${Db}` : String(d.B);
    const word = (k: number) => (k === 1 ? '소수 한 자리는 10분의 몇' : k === 2 ? '소수 두 자리는 100분의 몇' : '자연수는 그대로');
    return [
      { segs: [s(`${p.a} × ${p.b}`)], note: '소수를 분수로 바꿔요' },
      { segs: [fs(fa, 'O'), s(' × '), fs(fb, 'O')], note: `${p.a} = ${fa}${d.db ? `, ${p.b} = ${fb}` : ''} (${word(d.da)})` },
      { segs: [fe(`${d.A} × ${d.B}`, d.db && d.da ? `${Da} × ${Db}` : String(Da * Db))], note: d.db && d.da ? `분자끼리, 분모끼리 곱해요: ${Da} × ${Db} = ${Da * Db}` : '자연수는 분자에만 곱해요' },
      { segs: [fs(`${d.P}/${10 ** d.dp}`, 'B', true)], note: `${d.A} × ${d.B} = ${d.P}` },
      { segs: [s(decText(d.P, d.dp), 'B', true)], note: `${10 ** d.dp}분의 몇은 소수 ${['', '한', '두', '세', '네'][d.dp]} 자리 (${d.da} + ${d.db} = ${d.dp}자리)` },
    ];
  },
  intro: () => '소수를 분수로 바꿔서 곱해 보자!',
  hint: p => { const d = decMulOf(p); return [`${p.a} = ${d.da ? `${d.A}/${10 ** d.da}` : d.A}${d.db ? `, ${p.b} = ${d.B}/${10 ** d.db}` : ''}로 바꿔서 곱해 봐`, `분모가 ${10 ** d.dp}이면 소수 ${d.dp}자리야. 답은 얼마일까?`]; },
};

export const STRATEGIES: Record<string, Strategy> = Object.fromEntries([
  pwAdd, countOn, doubles, pwSub, countBack, addThink, placeAddSub, jumpTens, make10, from10, subSplit,
  comp, placeAdd3, seqSub, column, mulPlusOne, mulSplit, mulNine, mulSwap, mulAdd, mulDist, mulColumn,
  divMul, divShare, divRem, divLong, divEst, decUnits, decColumn, decWhole, decPlace, decSeqSub, unitFrac, wholeFrac,
  mixOrder, gcdList, lcmList, gcdDivide, lcmDivide, reduceStep, reduceGcd, lcdFrac, prodDen, fracMul, fracMulCancel, decMulInt, decMulFrac,
].map(x => [x.id, x]));

// ─────────────────────────────────────────────
// 단원별 풀이 계획: 대표(앞에서부터 처음 맞는 것), 학교 방법, 그 밖의 방법
// ─────────────────────────────────────────────
export interface OpPlan { main: string[]; school?: string; others: string[] }
export const UNIT_PLANS: Record<string, Partial<Record<string, OpPlan>>> = {
  '1-1-0': { '+': { main: ['pwAdd', 'countOn'], school: 'countOn', others: [] }, '-': { main: ['pwSub', 'countBack'], school: 'countBack', others: [] } },
  '1-1-1': { '+': { main: ['countOn', 'pwAdd'], school: 'pwAdd', others: ['doubles'] } },
  '1-1-2': { '-': { main: ['pwSub', 'countBack'], school: 'countBack', others: ['addThink'] } },
  '1-1-3': { '+': { main: ['place', 'countOn'], others: ['countOn'] }, '-': { main: ['place', 'countBack', 'pwSub', 'addThink'], others: ['countBack'] } },
  '1-2-0': { '+': { main: ['jump10', 'place'], others: ['place'] }, '-': { main: ['jump10', 'place'], others: ['place'] } },
  '1-2-1': { '+': { main: ['place'], school: 'column', others: [] } },
  '1-2-2': { '-': { main: ['place'], school: 'column', others: [] } },
  '1-2-3': { '+': { main: ['make10', 'pwAdd'], school: 'countOn', others: ['doubles'] } },
  '1-2-4': { '-': { main: ['from10'], school: 'subSplit', others: ['addThink'] } },
  '2-1-0': { '+': { main: ['make10', 'place'], school: 'column', others: ['comp'] } },
  '2-1-1': { '-': { main: ['subSplit', 'seqSub'], school: 'column', others: ['comp'] } },
  '2-1-2': { '+': { main: ['place3'], school: 'column', others: ['make10'] } },
  '2-1-3': { '-': { main: ['seqSub'], school: 'column', others: ['comp'] } },
  '3-1-0': { '+': { main: ['make10', 'place3'], school: 'column', others: ['place3', 'comp'] } },
  '3-1-1': { '-': { main: ['seqSub'], school: 'column', others: ['comp'] } },
  '2-2-0': { '×': { main: ['mulPlusOne', 'mulAdd'], school: 'mulAdd', others: ['mulSwap'] } },
  '2-2-1': { '×': { main: ['mulSplit', 'mulPlusOne'], school: 'mulAdd', others: ['mulNine', 'mulSwap'] } },
  '2-2-2': { '×': { main: ['mulSplit', 'mulPlusOne', 'mulAdd'], school: 'mulAdd', others: ['mulSwap', 'mulNine'] } },
  '3-1-2': { '÷': { main: ['divMul'], school: 'divShare', others: [] } },
  '3-1-3': { '×': { main: ['mulDist'], school: 'mulColumn', others: [] } },
  '3-2-0': { '×': { main: ['mulDist'], school: 'mulColumn', others: [] } },
  '3-2-1': { '÷': { main: ['divRem'], school: 'divLong', others: [] } },
  // 4학년
  '4-1-0': { '+': { main: ['place3'], school: 'column', others: ['comp'] }, '-': { main: ['seqSub'], school: 'column', others: ['comp'] } },
  '4-1-1': { '×': { main: ['mulDist'], school: 'mulColumn', others: [] } },
  '4-1-2': { '÷': { main: ['divEst'], school: 'divLong', others: [] } },
  '4-2-0': { '+': { main: ['decPlace'], school: 'decColumn', others: ['decUnits'] }, '-': { main: ['decSeqSub'], school: 'decColumn', others: ['decUnits'] } },
  '4-2-1': { '+': { main: ['wholeFrac', 'unitFrac'], others: ['unitFrac'] }, '-': { main: ['wholeFrac', 'unitFrac'], others: ['unitFrac'] } },
  // 5학년
  '5-1-1': { mix: { main: ['mixOrder'], others: [] } },
  '5-1-0': { gcd: { main: ['gcdList'], school: 'gcdDivide', others: [] }, lcm: { main: ['lcmList'], school: 'lcmDivide', others: [] } },
  '5-1-2': { reduce: { main: ['reduceStep'], others: ['reduceGcd'] } },
  '5-1-3': { '+': { main: ['lcdFrac'], others: ['prodDen'] }, '-': { main: ['lcdFrac'], others: ['prodDen'] } },
  '5-2-0': { '×': { main: ['fracMul'], others: ['fracMulCancel'] } },
  '5-2-1': { '×': { main: ['decMulFrac'], others: ['decMulInt'] } },
};

export function planFor(unitId: string, op: string): OpPlan | null {
  const plan = UNIT_PLANS[unitId];
  if (!plan) return null;
  return plan[op] || plan[Object.keys(plan)[0]] || null;
}

/** 문제에 쓸 대표 풀이 (맞는 것이 없으면 null) */
export function mainStrategyFor(unitId: string, p: P): Strategy | null {
  const plan = planFor(unitId, p.op);
  if (!plan) return null;
  for (const id of plan.main) {
    const st = STRATEGIES[id];
    if (st && st.applies(p)) return st;
  }
  return null;
}

/** 규칙 기반 힌트 (힌트 화면 형식: 첫 줄 개념, 이후 "1. …") */
export function strategyHint(unitId: string, p: P): { text: string; strategy: Strategy } | null {
  const st = mainStrategyFor(unitId, p);
  if (!st) return null;
  let steps: string[];
  if (st.hint) steps = st.hint(p);
  else {
    const ls = st.lines(p);
    const mid = ls.slice(1, -1);
    steps = mid.map(l => `${banmal(l.note)}: ${lineText(l)}`);
    const last = mid.length ? lineText(mid[mid.length - 1]) : lineText(ls[0]);
    steps.push(`${last}${hasBatchim(last) ? '은' : '는'} 얼마일까?`);
  }
  return { text: `개념: ${st.intro(p)}\n${steps.map((t, i) => `${i + 1}. ${t}`).join('\n')}`, strategy: st };
}
