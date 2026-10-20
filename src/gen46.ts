/**
 * 4~6학년 문제 생성기 (2022 개정 교과서 단원 기준, 2026-10-20)
 *
 * - 소수는 정수(100배 등)로 계산한 뒤 글자로 바꾼다 → 부동소수점 오차 없음
 * - 분수 답: 4학년은 약분을 아직 배우지 않으므로 약분하지 않은 대분수, 5학년부터 기약분수(대분수)
 *   채점은 값이 같으면 정답 (약분 단원만 기약분수여야 정답, constants의 fracStrict)
 * - q: true 는 "~의 최대공약수"처럼 식 뒤에 "="를 붙이지 않는 문제
 * - fa/fb: 분수(또는 자연수) 문제의 두 수 (풀이 엔진용)
 */
import {
  Frac, gcd, lcm, reduce, toMixed, decText, fracAdd, fracSub, fracMul, fracDiv,
} from './frac';
import { j, mixSteps } from './strategies';

export interface GenProblem46 {
  expr: string; a?: number; b?: number; op: string; ans: string;
  fa?: string; fb?: string; q?: boolean;
}
type Unit = { min: number; max: number; maxR: number; bMin?: number; bMax?: number };
type Gen = (unit: Unit, diff: number) => GenProblem46 | null;

const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]): T => arr[ri(0, arr.length - 1)];
const coin = (p = 0.5) => Math.random() < p;

/** 분수 표기: 가분수 Frac → 대분수 문자열 (reduceIt이면 기약분수로) */
const fr = (f: Frac, reduceIt: boolean) => toMixed(reduceIt ? reduce(f) : f);
/** 대분수 w n/d 를 Frac으로 */
const mixed = (w: number, n: number, d: number): Frac => ({ n: w * d + n, d });
/** 진분수 하나 (기약) */
function properLowest(dMin: number, dMax: number): Frac {
  for (;;) {
    const d = ri(dMin, dMax), n = ri(1, d - 1);
    if (gcd(n, d) === 1) return { n, d };
  }
}
/** 대분수 하나 (분수 부분 기약) */
function mixedLowest(wMax: number, dMin: number, dMax: number): Frac {
  const w = ri(1, wMax), p = properLowest(dMin, dMax);
  return mixed(w, p.n, p.d);
}
/** 받침에 맞춘 조사만 */
const josa = (fn: (n: number | string) => string, n: number | string) => fn(n).slice(String(n).length);
/** 분수 뒤 조사는 분자(마지막에 읽는 수) 기준: "3/4" → "4분의 3" */
const fracJosa = (fn: (n: number | string) => string, txt: string) => {
  const m = txt.match(/(\d+)\/\d+$/);
  return josa(fn, m ? m[1] : txt);
};

// ─────────────────────────────────────────────
// 4학년
// ─────────────────────────────────────────────

/** (세 자리)÷(두 자리): 쉬움 몫 한 자리 · 보통 나머지도 · 어려움 몫 두 자리 */
const div2: Gen = (_u, diff) => {
  const b = ri(11, 99);
  if (b % 10 === 0) return null;
  const q = diff === 3 ? ri(10, 30) : ri(2, 9);
  const r = diff === 1 ? 0 : coin(0.6) ? ri(1, b - 1) : 0;
  const a = b * q + r;
  if (a < 100 || a > 999) return null;
  return { expr: `${a} ÷ ${b}`, a, b, op: '÷', ans: r ? `${q} … ${r}` : String(q) };
};

/** 소수 덧셈·뺄셈: 쉬움 소수 한 자리 · 보통 두 자리 · 어려움 한 자리와 두 자리 섞기 */
function decAddSub(sym: '+' | '-'): Gen {
  return (_u, diff) => {
    // 100배 한 정수로 만든다
    const one = () => { const v = ri(1, 99); return v % 10 === 0 ? null : v * 10; };      // 0.1 ~ 9.9
    const two = (hi = 999) => { const v = ri(1, hi); return v % 10 === 0 ? null : v; };    // 0.01 ~ 9.99
    let A: number | null, B: number | null;
    if (diff === 1) { A = one(); B = one(); }
    else if (diff === 2) { A = two(); B = two(); }
    else if (coin()) { A = one(); B = two(); } else { A = two(1999); B = one(); }
    if (A == null || B == null) return null;
    if (sym === '-' && A < B) [A, B] = [B, A];
    const R = sym === '+' ? A + B : A - B;
    if (R <= 0 || R > 2000) return null;
    const ta = decText(A, 2), tb = decText(B, 2);
    return { expr: `${ta} ${sym} ${tb}`, a: A / 100, b: B / 100, op: sym, ans: decText(R, 2) };
  };
}

/** 분모가 같은 분수: 쉬움 진분수끼리 · 보통 대분수(받아올림·내림 없음) · 어려움 받아올림·내림, (자연수)−(분수) */
function fracSame(sym: '+' | '-'): Gen {
  return (_u, diff) => {
    const d = ri(3, 10);
    let x: Frac, y: Frac;
    if (diff === 1) {
      const n1 = ri(1, d - 1), n2 = ri(1, d - 1);
      if (sym === '-' && n1 <= n2) return null;
      x = { n: n1, d }; y = { n: n2, d };
    } else {
      const w1 = ri(1, 6), w2 = ri(1, 5), n1 = ri(1, d - 1), n2 = ri(1, d - 1);
      const regroup = sym === '+' ? n1 + n2 >= d : n1 < n2;
      if (diff === 2 && regroup) return null;
      if (diff === 3 && !regroup && !(sym === '-' && coin(0.4))) return null;
      if (diff === 3 && sym === '-' && !regroup) {
        // (자연수) − (분수 또는 대분수)
        x = { n: w1 + 1, d: 1 }; y = coin() ? { n: n2, d } : mixed(Math.min(w2, w1), n2, d);
        const Rn = (w1 + 1) * d - y.n;
        if (Rn <= 0) return null;
        const fa = String(w1 + 1), fb = toMixed(y);
        return { expr: `${fa} - ${fb}`, op: '-', ans: toMixed({ n: Rn, d }), fa, fb };
      }
      x = mixed(w1, n1, d); y = mixed(w2, n2, d);
      if (sym === '-' && x.n <= y.n) return null;
    }
    const R = sym === '+' ? x.n + y.n : x.n - y.n;
    const fa = toMixed(x), fb = toMixed(y);
    return { expr: `${fa} ${sym} ${fb}`, op: sym, ans: toMixed({ n: R, d }), fa, fb };
  };
}

// ─────────────────────────────────────────────
// 5학년
// ─────────────────────────────────────────────

/** 자연수의 혼합 계산: 쉬움 두 연산 · 보통 괄호 · 어려움 세 연산 */
const MIX_T: Record<number, string[]> = {
  1: ['a + b × c', 'a - b × c', 'a × b + c', 'a + b ÷ c', 'a - b ÷ c', 'a ÷ b + c', 'a × b - c'],
  2: ['(a + b) × c', '(a - b) × c', 'a × (b + c)', '(a + b) ÷ c', 'a ÷ (b - c)', 'a - (b + c)', 'a × (b - c)'],
  3: ['a + b × c - d', '(a + b) × c - d', 'a × b ÷ c + d', '(a - b) ÷ c + d', 'a + (b - c) × d', 'a - b ÷ c × d', 'a × (b + c) ÷ d'],
};
/** 식 계산 (괄호 → ×÷ 왼쪽부터 → +− 왼쪽부터). 나누어떨어지지 않거나 음수가 나오면 null */
export function evalMix(expr: string): number | null {
  const toks = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
  let i = 0;
  const prim = (): number | null => {
    const t = toks[i++];
    if (t === '(') { const v = sum(); i++; return v; }   // 괄호 안이 0 이하면 sum이 null
    return Number(t);
  };
  const prod = (): number | null => {
    let v = prim();
    while (v != null && (toks[i] === '×' || toks[i] === '÷')) {
      const op = toks[i++], w = prim();
      if (w == null) return null;
      if (op === '×') v = v * w;
      else { if (w === 0 || v % w !== 0) return null; v = v / w; }
    }
    return v;
  };
  const sum = (): number | null => {
    let v = prod();
    while (v != null && (toks[i] === '+' || toks[i] === '-')) {
      const op = toks[i++], w = prod();
      if (w == null) return null;
      v = op === '+' ? v + w : v - w;
      if (v <= 0) return null;
    }
    return v;
  };
  return sum();
}
const mixGen: Gen = (_u, diff) => {
  const t = pick(MIX_T[diff] || MIX_T[1]);
  for (let k = 0; k < 400; k++) {
    // 곱하거나 나누는 수는 작게, 더하고 빼는 수는 크게
    const vals: Record<string, number> = {};
    const e = t.replace(/[abcd]/g, (v) => {
      const idx = t.indexOf(v);
      const near = t.slice(Math.max(0, idx - 2), idx + 3);
      const mulish = /[×÷]/.test(near);
      vals[v] = mulish ? ri(2, diff === 1 ? 9 : 12) : ri(2, diff === 3 ? 60 : 40);
      return String(vals[v]);
    });
    const r = evalMix(e);
    if (r == null || r <= 0 || r > 999) continue;
    if (mixSteps(e).some(st => st.v <= 1)) continue;   // 중간값이 1이면 (× 1 같은) 싱거운 문제
    // 나눗셈의 "나누어지는 수"는 곱셈 범위를 넘어도 됨 → 위에서 작게 뽑혀 잘 안 맞으므로 따로 맞춤
    return { expr: e, op: 'mix', ans: String(r) };
  }
  // 나눗셈이 들어간 식은 무작위로 잘 안 맞으므로, 나누어지는 수를 만들어 넣는다
  return mixDivFix(t, diff);
};
function mixDivFix(t: string, diff: number): GenProblem46 | null {
  for (let k = 0; k < 400; k++) {
    const v: Record<string, number> = { a: ri(2, 40), b: ri(2, 12), c: ri(2, 9), d: ri(2, 30) };
    // "x ÷ y" 꼴에서 x를 y의 배수로
    let e = t.replace(/[abcd]/g, (m) => String(v[m]));
    e = e.replace(/(\d+) ÷ (\d+)/g, (_m, x, y) => `${Number(y) * ri(2, diff === 1 ? 9 : 12)} ÷ ${y}`);
    const r = evalMix(e);
    if (r == null || r <= 0 || r > 999) continue;
    if (mixSteps(e).some(st => st.v <= 1)) continue;
    return { expr: e, op: 'mix', ans: String(r) };
  }
  return null;
}

/** 최대공약수 · 최소공배수 */
const gcdGen: Gen = (_u, diff) => {
  const g = ri(2, diff === 1 ? 6 : diff === 2 ? 9 : 15);
  const x = ri(1, diff === 1 ? 5 : 8), y = ri(2, diff === 1 ? 6 : 9);
  if (x === y || gcd(x, y) !== 1) return null;
  if (Math.min(x, y) === 1 && coin(0.8)) return null;   // 작은 수가 바로 답인 경우는 줄인다
  const a = g * Math.min(x, y), b = g * Math.max(x, y);
  if (b > (diff === 1 ? 40 : diff === 2 ? 72 : 120)) return null;
  return { expr: `${j.과(a)} ${b}의 최대공약수`, a, b, op: 'gcd', ans: String(g), q: true };
};
const lcmGen: Gen = (_u, diff) => {
  const a = ri(2, diff === 1 ? 10 : diff === 2 ? 15 : 24), b = ri(2, diff === 1 ? 12 : diff === 2 ? 18 : 30);
  if (a >= b) return null;
  if (b % a === 0 && coin(0.8)) return null;   // 큰 수가 바로 답인 경우는 줄인다
  const L = lcm(a, b);
  if (L === a * b && diff > 1 && coin(0.7)) return null;   // 곱이 바로 답인 경우는 줄인다
  if (L > (diff === 1 ? 60 : diff === 2 ? 120 : 300)) return null;
  return { expr: `${j.과(a)} ${b}의 최소공배수`, a, b, op: 'lcm', ans: String(L), q: true };
};

/** 약분: 기약분수로 나타내기 */
const reduceGen: Gen = (_u, diff) => {
  const p = properLowest(2, diff === 1 ? 6 : 10);
  const k = ri(2, diff === 1 ? 4 : diff === 2 ? 6 : 9);
  const w = diff === 3 && coin() ? ri(1, 4) : 0;
  const txt = `${w ? w + ' ' : ''}${p.n * k}/${p.d * k}`;
  return { expr: `${txt}${fracJosa(j.을, txt)} 기약분수로`, op: 'reduce', ans: toMixed(mixed(w, p.n, p.d)), fa: txt, q: true };
};

/** 분모가 다른 분수: 쉬움 한 분모가 다른 분모의 배수 · 보통 진분수끼리 · 어려움 대분수 */
function fracDiff(sym: '+' | '-'): Gen {
  return (_u, diff) => {
    let x: Frac, y: Frac;
    if (diff === 1) {
      const d1 = ri(2, 6), k = ri(2, 3);
      x = properLowest(d1, d1); y = properLowest(d1 * k, d1 * k);
      if (coin()) [x, y] = [y, x];
    } else if (diff === 2) {
      x = properLowest(2, 10); y = properLowest(2, 10);
    } else {
      x = mixedLowest(5, 2, 9); y = coin() ? mixedLowest(4, 2, 9) : properLowest(2, 9);
    }
    if (x.d === y.d) return null;
    if (sym === '-' && x.n * y.d <= y.n * x.d) [x, y] = [y, x];
    const R = sym === '+' ? fracAdd(x, y) : fracSub(x, y);
    if (R.n <= 0) return null;
    const fa = toMixed(x), fb = toMixed(y);
    return { expr: `${fa} ${sym} ${fb}`, op: sym, ans: fr(R, true), fa, fb };
  };
}

/** 분수의 곱셈: 쉬움 (분수)×(자연수) · 보통 진분수끼리 · 어려움 대분수 */
const mulFrac: Gen = (_u, diff) => {
  let x: Frac, y: Frac;
  if (diff === 1) { x = properLowest(2, 9); y = { n: ri(2, 9), d: 1 }; if (coin()) [x, y] = [y, x]; }
  else if (diff === 2) { x = properLowest(2, 9); y = properLowest(2, 9); }
  else { x = mixedLowest(3, 2, 7); y = coin() ? { n: ri(2, 6), d: 1 } : coin() ? mixedLowest(2, 2, 7) : properLowest(2, 9); }
  const R = fracMul(x, y);
  if (reduce(R).n > 99 * reduce(R).d) return null;
  const fa = toMixed(x), fb = toMixed(y);
  return { expr: `${fa} × ${fb}`, op: '×', ans: fr(R, true), fa, fb };
};

/** 소수의 곱셈: 쉬움 (소수)×(자연수) · 보통 (소수)×(소수) · 어려움 소수 두 자리 */
const mulDec: Gen = (_u, diff) => {
  let A: number, da: number, B: number, db: number;
  if (diff === 1) { A = ri(2, 99); da = 1; B = ri(2, 9); db = 0; }
  else if (diff === 2) { A = ri(2, 99); da = 1; B = ri(2, 99); db = 1; }
  else { A = ri(101, 999); da = 2; B = coin() ? ri(2, 9) : ri(2, 99); db = B < 10 ? 0 : 1; }
  if (A % 10 === 0 || (db && B % 10 === 0)) return null;
  const R = A * B, dp = da + db;
  if (diff === 1 && R % 10 ** dp === 0) return null;   // 답이 자연수(예: 2.5 × 4)는 줄인다
  const ta = decText(A, da), tb = decText(B, db);
  const swap = diff !== 3 && db === 0 && coin(0.3);     // (자연수)×(소수)도 섞기
  return {
    expr: swap ? `${tb} × ${ta}` : `${ta} × ${tb}`,
    a: swap ? B / 10 ** db : A / 10 ** da, b: swap ? A / 10 ** da : B / 10 ** db,
    op: '×', ans: decText(R, dp),
  };
};

// ─────────────────────────────────────────────
// 6학년
// ─────────────────────────────────────────────

/** (분수)÷(자연수): 쉬움 분자가 나누어떨어짐·(자연수)÷(자연수) · 보통 안 떨어짐 · 어려움 대분수 */
const divFracNat: Gen = (_u, diff) => {
  const k = ri(2, 9);
  let x: Frac;
  if (diff === 1) {
    if (coin(0.35)) {
      const a = ri(1, 9), b = ri(2, 9);
      if (a % b === 0) return null;
      return { expr: `${a} ÷ ${b}`, a, b, op: '÷', ans: fr({ n: a, d: b }, true), fa: String(a), fb: String(b) };
    }
    const d = ri(3, 11), m = ri(1, Math.floor((d - 1) / k));
    if (m < 1) return null;
    x = { n: m * k, d };
  } else if (diff === 2) { x = properLowest(2, 9); if (x.n % k === 0) return null; }
  else x = mixedLowest(3, 2, 7);
  const R = fracDiv(x, { n: k, d: 1 });
  const fa = toMixed(x), fb = String(k);
  return { expr: `${fa} ÷ ${fb}`, op: '÷', ans: fr(R, true), fa, fb };
};

/** (소수)÷(자연수): 쉬움 몫이 소수 한 자리 · 보통 두 자리 · 어려움 0을 내려 쓰거나 몫이 1보다 작음 */
const divDecNat: Gen = (_u, diff) => {
  const b = ri(2, 9);
  const Q = diff === 1 ? ri(11, 99) * 10 : ri(11, 999);   // 몫 ×100
  const A = Q * b;                                          // 나누어지는 수 ×100
  if (diff === 1 && (Q % 100 === 0)) return null;
  if (diff === 2 && (Q % 10 === 0 || A % 10 === 0 || Q < 100)) return null;
  if (diff === 3 && !((A % 10 === 0 && Q % 10 !== 0) || Q < 100)) return null;
  if (A % 100 === 0 && diff !== 3) return null;
  return { expr: `${decText(A, 2)} ÷ ${b}`, a: A / 100, b, op: '÷', ans: decText(Q, 2) };
};

/** 비율: 분수·소수·백분율로 */
const rateGen: Gen = (_u, diff) => {
  const kind = diff === 1 ? pick(['분수', '소수']) : pick(['분수', '소수', '백분율']);
  if (kind === '분수') {
    const b = ri(2, diff === 3 ? 30 : 12), a = ri(1, b - 1);
    return { expr: `${a} : ${b}의 비율을 분수로`, a, b, op: 'rate', ans: fr({ n: a, d: b }, true), q: true };
  }
  const b = pick(diff === 3 ? [20, 25, 40, 50, 200, 250, 500] : [2, 4, 5, 10, 20, 25, 50]);
  const a = ri(1, b - 1);
  const pct = (a * 100) / b;
  if (!Number.isInteger(pct * 10)) return null;
  if (kind === '소수') {
    const v = (a * 10000) / b;   // ×10000
    if (!Number.isInteger(v)) return null;
    return { expr: `${a} : ${b}의 비율을 소수로`, a, b, op: 'rate', ans: decText(v, 4), q: true };
  }
  if (!Number.isInteger(pct)) return null;
  return { expr: `${a} : ${b}의 비율을 백분율로`, a, b, op: 'rate', ans: `${pct}%`, q: true };
};

/** 비 간단히 (어려움: 소수·분수의 비) */
const ratioGen: Gen = (_u, diff) => {
  const x = ri(1, 9), y = ri(1, 9);
  if (x === y || gcd(x, y) !== 1) return null;
  if (diff === 3 && coin()) {
    if (coin()) {   // 소수의 비: 0.4 : 1.2
      const k = ri(1, 4), tb = decText(y * k, 1);
      return { expr: `${decText(x * k, 1)} : ${tb}${josa(j.을, tb)} 간단한 자연수의 비로`, op: ':', ans: `${x} : ${y}`, q: true };
    }
    // 분수의 비: 1/x : 1/y → y : x
    if (x < 2 || y < 2) return null;
    return { expr: `1/${x} : 1/${y}${fracJosa(j.을, `1/${y}`)} 간단한 자연수의 비로`, op: ':', ans: `${y} : ${x}`, q: true };
  }
  const k = ri(2, diff === 1 ? 6 : 12);
  const a = x * k, b = y * k;
  return { expr: `${a} : ${b}${josa(j.을, b)} 간단한 자연수의 비로`, a, b, op: ':', ans: `${x} : ${y}`, q: true };
};

/** 비례식: □ 구하기 */
const propGen: Gen = (_u, diff) => {
  const x = ri(1, 9), y = ri(2, 9), k = ri(2, diff === 1 ? 5 : 12);
  if (x === y) return null;
  const forms = [
    { e: `${x} : ${y} = □ : ${y * k}`, ans: x * k },
    { e: `${x} : ${y} = ${x * k} : □`, ans: y * k },
    { e: `□ : ${y * k} = ${x} : ${y}`, ans: x * k },
    { e: `${x * k} : □ = ${x} : ${y}`, ans: y * k },
  ];
  const f = diff === 1 ? forms[ri(0, 1)] : pick(forms);
  return { expr: f.e, op: 'prop', ans: String(f.ans), q: true };
};

/** 비례배분: 앞의 수 / 뒤의 수 */
const shareGen: Gen = (_u, diff) => {
  const x = ri(1, 9), y = ri(1, 9), k = ri(2, diff === 1 ? 6 : 15);
  if (x === y || gcd(x, y) !== 1) return null;
  const T = (x + y) * k;
  const front = coin();
  return {
    expr: `${T}${josa(j.을, T)} ${x} : ${y}${josa(j.으로, y)} 비례배분할 때 ${front ? '앞' : '뒤'}의 수`,
    op: 'share', a: T, b: front ? x : y, ans: String((front ? x : y) * k), q: true,
  };
};

/** (분수)÷(분수): 쉬움 분모가 같고 나누어떨어짐 · 보통 분모가 같거나 다름 · 어려움 대분수·자연수 */
const divFracFrac: Gen = (_u, diff) => {
  let x: Frac, y: Frac;
  if (diff === 1) {
    const d = ri(4, 13), n2 = ri(1, 4), m = ri(2, 5);
    if (n2 * m >= d) return null;
    x = { n: n2 * m, d }; y = { n: n2, d };
  } else if (diff === 2) {
    if (coin()) { const d = ri(3, 11); x = { n: ri(1, d - 1), d }; y = { n: ri(1, d - 1), d }; }
    else { x = properLowest(2, 9); y = properLowest(2, 9); if (x.d === y.d) return null; }
    if (x.n === y.n && x.d === y.d) return null;
  } else {
    x = coin() ? mixedLowest(3, 2, 7) : { n: ri(2, 9), d: 1 };
    y = coin() ? properLowest(2, 9) : mixedLowest(2, 2, 7);
  }
  const R = fracDiv(x, y);
  const fa = toMixed(x), fb = toMixed(y);
  return { expr: `${fa} ÷ ${fb}`, op: '÷', ans: fr(R, true), fa, fb };
};

/** (소수)÷(소수): 쉬움 소수 한 자리끼리 몫이 자연수 · 보통 두 자리 · 어려움 몫이 소수 */
const divDecDec: Gen = (_u, diff) => {
  if (diff === 1) {
    const B = ri(2, 29), q = ri(2, 9);
    if (B % 10 === 0) return null;
    const A = B * q;   // ×10
    return { expr: `${decText(A, 1)} ÷ ${decText(B, 1)}`, a: A / 10, b: B / 10, op: '÷', ans: String(q) };
  }
  if (diff === 2) {
    const B = ri(11, 99), q = ri(2, 12);
    if (B % 10 === 0) return null;
    const A = B * q;   // ×100
    if (A % 10 === 0 && coin(0.6)) return null;
    return { expr: `${decText(A, 2)} ÷ ${decText(B, 2)}`, a: A / 100, b: B / 100, op: '÷', ans: String(q) };
  }
  const B = ri(11, 49), Q = ri(11, 99);   // 나누는 수 ×10, 몫 ×10
  if (B % 10 === 0 || Q % 10 === 0) return null;
  const A = B * Q;   // ×100
  return { expr: `${decText(A, 2)} ÷ ${decText(B, 1)}`, a: A / 100, b: B / 10, op: '÷', ans: decText(Q, 1) };
};

export const GEN46: Record<string, Gen> = {
  '÷2': div2,
  '+d': decAddSub('+'), '-d': decAddSub('-'),
  '+f': fracSame('+'), '-f': fracSame('-'),
  mix: mixGen, gcd: gcdGen, lcm: lcmGen, reduce: reduceGen,
  '+fd': fracDiff('+'), '-fd': fracDiff('-'),
  '×f': mulFrac, '×d': mulDec,
  '÷f': divFracNat, '÷d': divDecNat, rate: rateGen,
  ratio: ratioGen, prop: propGen, share: shareGen,
  '÷ff': divFracFrac, '÷dd': divDecDec,
};
