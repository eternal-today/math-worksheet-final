/**
 * 풀이법 엔진
 *
 * 문제 숫자를 받아 "식 이어 쓰기" 풀이를 계산한다. 개념노트와 힌트가 같은 엔진을 쓴다.
 *  - 모든 숫자는 코드가 계산 → AI 계산 실수 없음, Gemini 키 없이도 동작
 *  - 줄 0 = 문제, 마지막 줄 = 답. 힌트는 답 줄을 빼고 보여준다
 *  - note는 존댓말("~요"로 끝나게). 힌트는 끝의 "요"만 떼어 반말로 쓴다
 */

export interface Seg { t: string; hl?: 'B' | 'O'; blank?: boolean }
export interface Line { segs: Seg[]; note: string; noEq?: boolean }
export interface P { a: number; b: number; op: string; ans?: string }

export interface Strategy {
  id: string;
  name: string;
  sub: string;           // 짧은 부제
  when: string;          // 언제 쓰면 좋은지 (존댓말 한 줄)
  render?: 'column';     // 개념노트에서 세로셈 그림으로 그림
  applies(p: P): boolean;
  lines(p: P): Line[];
  intro(p: P): string;   // 힌트 첫 줄 (반말)
  hint?(p: P): string[]; // 힌트 단계 (기본: 답 줄을 뺀 이어 쓰기)
}

// ─────────────────────────────────────────────
// 한국어 조사: 숫자를 한자어로 읽었을 때 받침 기준
// ─────────────────────────────────────────────
function hasBatchim(n: number | string): boolean {
  const s = String(n).replace(/[^0-9]/g, '');
  if (!s) return false;
  const last = Number(s[s.length - 1]);
  if (last === 0) return true;                 // 십·백·천·만·영 모두 받침
  return [1, 3, 6, 7, 8].includes(last);       // 일 삼 육 칠 팔
}
function rieul(n: number | string): boolean {  // ㄹ 받침: 일, 칠, 팔
  const s = String(n).replace(/[^0-9]/g, '');
  const last = Number(s[s.length - 1]);
  return [1, 7, 8].includes(last) && last !== 0;
}
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
const s = (t: string | number, hl?: 'B' | 'O', blank?: boolean): Seg => ({ t: String(t), hl, blank });
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
const placeAdd3: Strategy = {
  id: 'place3', name: '자리별로 더하기', sub: '백·십·일 따로', when: '어떤 세 자리 수든 쓸 수 있어요',
  applies: p => isAdd(p) && p.a >= 100,
  lines: p => {
    const H = floorTo(p.a, 100) + floorTo(p.b, 100);
    const T = (tensDigit(p.a) + tensDigit(p.b)) * 10;
    const O = ones(p.a) + ones(p.b);
    return [
      { segs: [s(`${p.a} + ${p.b}`)], note: '백, 십, 일의 자리로 나눠요' },
      { segs: [s(H, 'B', true), s(' + '), s(T, 'B', true), s(' + '), s(O, 'B', true)], note: `백끼리 ${H}, 십끼리 ${T}, 일끼리 ${O}` },
      { segs: [s(p.a + p.b, 'B', true)], note: '세 수를 모두 더해요' },
    ];
  },
  intro: () => `백은 백끼리, 십은 십끼리, 일은 일끼리 더해 보자!`,
};

/** 빼는 수를 갈라 차례로 빼기 */
const seqSub: Strategy = {
  id: 'seqSub', name: '차례로 빼기', sub: '빼는 수를 자리별로', when: '어떤 뺄셈이든 쓸 수 있어요',
  applies: p => isSub(p) && p.b >= 10,
  lines: p => {
    const parts = [floorTo(p.b, 100), tensDigit(p.b) * 10, ones(p.b)].filter(v => v > 0);
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
const column: Strategy = {
  id: 'column', name: '세로셈', sub: '자리 맞춰 쓰기', when: '수가 커져도 실수 없이 풀 수 있어요', render: 'column',
  applies: p => (isAdd(p) || isSub(p)) && p.a >= 10,
  lines: p => {
    const out: Line[] = [{ segs: [s(`${p.a} ${isAdd(p) ? '+' : '−'} ${p.b}`)], note: '자리를 맞춰 세로로 써요' }];
    const width = String(Math.max(p.a, p.b)).length;
    let carry = 0, borrow = 0;
    for (let i = 0; i < width; i++) {
      const da = Math.floor(p.a / 10 ** i) % 10, db = Math.floor(p.b / 10 ** i) % 10;
      const nm = placeName(i);
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
    out.push({ segs: [s(isAdd(p) ? p.a + p.b : p.a - p.b, 'B', true)], note: '자리별 결과를 이어 읽어요' });
    return out;
  },
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

/** 곱셈 세로셈 (학교) — 글로 설명 */
const mulColumn: Strategy = {
  id: 'mulColumn', name: '세로셈', sub: '자리 맞춰 곱하기', when: '학교에서 배우는 방법이에요',
  applies: p => isMul(p) && (p.a >= 10 || p.b >= 10),
  lines: p => {
    const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
    const out: Line[] = [{ segs: [s(`${p.a} × ${p.b}`)], note: '세로로 쓰고 일의 자리부터 곱해요' }];
    if (small < 10) {
      const o = ones(big) * small, t = floorTo(big, 10) / 10 * small + Math.floor(o / 10);
      out.push({ segs: [s(`일의 자리: ${ones(big)} × ${small} = ${o}`)], note: o >= 10 ? `${o % 10}${hasBatchim(o % 10) ? '을' : '를'} 쓰고 ${Math.floor(o / 10)}${hasBatchim(Math.floor(o / 10)) ? '을' : '를'} 올려요` : `${o}${hasBatchim(o) ? '을' : '를'} 써요`, noEq: true });
      out.push({ segs: [s(`십의 자리: ${floorTo(big, 10) / 10} × ${small}${o >= 10 ? ` + ${Math.floor(o / 10)}` : ''} = ${t}`)], note: o >= 10 ? '올린 수까지 더해요' : '그대로 써요', noEq: true });
    } else {
      const r1 = big * ones(small), r2 = big * floorTo(small, 10);
      out.push({ segs: [s(`첫째 줄: ${big} × ${ones(small)} = ${r1}`)], note: '일의 자리 수를 곱해요', noEq: true });
      out.push({ segs: [s(`둘째 줄: ${big} × ${floorTo(small, 10)} = ${r2}`)], note: '한 칸 밀어 써요', noEq: true });
      out.push({ segs: [s(`${r1} + ${r2}`)], note: '두 줄을 더해요' });
    }
    out.push({ segs: [s(p.a * p.b, 'B', true)], note: '답이에요' });
    return out;
  },
  intro: () => `세로로 쓰고 일의 자리부터 곱해 보자!`,
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
  applies: p => isDiv(p) && hasRemainder(p),
  lines: p => {
    const q = Math.floor(p.a / p.b), r = p.a % p.b;
    return [
      { segs: [s(`${p.a} ÷ ${p.b}`)], note: '나누는 수를 왼쪽, 나누어지는 수를 안쪽에 써요' },
      { segs: [s(`몫 ${q} → ${p.b} × ${q} = ${p.b * q}`)], note: '몫을 위에 쓰고 곱을 아래에 써요', noEq: true },
      { segs: [s(`${p.a} − ${p.b * q} = ${r}`)], note: '빼고 남은 수가 나머지예요', noEq: true },
      { segs: [s(`${q} … ${r}`, 'B', true)], note: `나머지 ${j.은(r)} ${p.b}보다 작아야 해요` },
    ];
  },
  intro: () => `세로로 써서 몫과 나머지를 구해 보자!`,
};

export const STRATEGIES: Record<string, Strategy> = Object.fromEntries([
  pwAdd, countOn, doubles, pwSub, countBack, addThink, placeAddSub, jumpTens, make10, from10, subSplit,
  comp, placeAdd3, seqSub, column, mulPlusOne, mulSplit, mulNine, mulSwap, mulAdd, mulDist, mulColumn,
  divMul, divShare, divRem, divLong,
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
