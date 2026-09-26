import { UNITS } from './constants';

/* ────────────────────────────────────────────────────────────
   수학 문제 생성 엔진 (재설계 v2)

   설계 원칙:
   1. 재귀 없음. "후보 생성 → 검증 → 실패 시 재시도"의 유한 루프만 사용.
   2. 유형(op)별로 generate/validate를 한 곳(GENERATORS)에 모음.
      새 유형·제약은 여기에 항목 하나만 추가하면 됨 (App/엔진 수정 불필요).
   3. constants(단원 데이터)는 "무엇을" 낼지, 이 파일은 "어떻게" 낼지만 담당.
   4. 세션 내 무중복은 makeProblems가 책임 (생성기는 문제 하나만 알면 됨).
   ──────────────────────────────────────────────────────────── */

// ── 기본 유틸 ──
export function ri(a: number, b: number): number {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
/** 소수 부동소수점 오차 제거: 소수 첫째 자리로 반올림 고정 */
function fx1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── 생성 결과 타입 (엔진 내부용) ──
export interface GenProblem {
  expr: string;
  a?: number;
  b?: number;
  op: string;
  ans: string;
}

interface Unit {
  id: string; grade: number; sem: number; name: string; ops: string[];
  min: number; max: number; maxR: number;
  bMin?: number; bMax?: number; qMin?: number; qMax?: number;
  noCarry?: boolean; withCarry?: boolean; noBorrow?: boolean; withBorrow?: boolean;
}

/** 난이도(1~3)에 따라 상한을 축소. Easy=0.4, Normal=0.75, Hard=1.0 */
function scaledHi(unit: Unit, diff: number): number {
  const scale = diff === 1 ? 0.4 : diff === 2 ? 0.75 : 1;
  let hi = Math.max(unit.min, Math.floor(unit.max * scale));
  // 1학년 Easy는 특별히 더 쉽게 (기존 동작 유지)
  if (unit.grade === 1 && diff === 1) hi = Math.min(hi, 15);
  return hi;
}

/* ────────────────────────────────────────────────────────────
   유형별 생성기.
   각 generate는 후보 GenProblem을 반환하거나, 만들 수 없으면 null.
   makeProblem이 유효한 결과가 나올 때까지 유한 횟수 재호출한다.
   제약 위반(받아올림 규칙 등)도 여기서 null 반환으로 표현 → 재귀 대신 재시도.
   ──────────────────────────────────────────────────────────── */
type Generator = (unit: Unit, diff: number) => GenProblem | null;

const GENERATORS: Record<string, Generator> = {
  // 덧셈 / 뺄셈 (받아올림·받아내림 제약 포함)
  "+": (unit, diff) => genAddSub(unit, diff, "+"),
  "-": (unit, diff) => genAddSub(unit, diff, "-"),

  // 곱셈: bMin/bMax가 있으면 두 번째 인수를 그 범위로 (자릿수 보장)
  "×": (unit, diff) => {
    const hi = scaledHi(unit, diff);
    const a = ri(unit.min, hi);
    const b = unit.bMin != null && unit.bMax != null
      ? ri(unit.bMin, unit.bMax)
      : ri(unit.min, hi);
    const ans = a * b;
    if (ans > unit.maxR) return null;
    return { expr: `${a} × ${b}`, a, b, op: "×", ans: String(ans) };
  },

  // 나눗셈 (나누어떨어짐): qMin/qMax가 있으면 몫을 그 범위로
  "÷": (unit, diff) => {
    const hi = scaledHi(unit, diff);
    const b = ri(Math.max(2, unit.min), hi);
    const q = unit.qMin != null && unit.qMax != null
      ? ri(unit.qMin, unit.qMax)
      : ri(2, 9);
    const a = b * q;
    if (a > unit.maxR) return null;
    return { expr: `${a} ÷ ${b}`, a, b, op: "÷", ans: String(q) };
  },

  // 나머지 있는 나눗셈: 나머지는 1..b-1 (0 제외 → "5 … 0" 채점버그 원천 차단)
  "÷r": (unit) => {
    const b = ri(2, 9);
    if (b < 2) return null;
    const q = ri(1, 9);
    const r = ri(1, b - 1);   // ★ 나머지 0 제외
    const a = b * q + r;
    return { expr: `${a} ÷ ${b}`, a, b, op: "÷", ans: `${q} … ${r}` };
  },

  // 소수 덧셈·뺄셈 (한 자리 소수)
  "+d": (unit) => genDecAddSub(unit, "+"),
  "-d": (unit) => genDecAddSub(unit, "-"),

  // 소수 × 정수
  "×d": (unit) => {
    const a = fx1(ri(1, unit.max) / 10);   // 0.1 ~ max/10
    const b = ri(2, 9);
    const ans = fx1(a * b);
    if (ans > unit.maxR) return null;
    // 정수형 결과(5.0)는 소수 학습 의미가 옅어 제외
    if (Number.isInteger(ans)) return null;
    return { expr: `${a.toFixed(1)} × ${b}`, a, b, op: "×", ans: ans.toFixed(1) };
  },

  // 정수 ÷ 정수 = 소수 (몫이 한 자리 소수)
  "÷d": (unit) => {
    const b = ri(2, 9);
    const q = fx1(ri(1, unit.max) / 10);
    if (Number.isInteger(q)) return null;
    const a = fx1(q * b);
    // a가 깔끔한 형태여야 함 (a ÷ b = q 가 정확히 떨어지게)
    if (fx1(a / b) !== q) return null;
    return { expr: `${a.toFixed(1)} ÷ ${b}`, a, b, op: "÷", ans: q.toFixed(1) };
  },

  // 분수 곱셈
  "×f": (unit) => {
    const n1 = ri(1, unit.max), d1 = ri(2, 9);
    const n2 = ri(1, unit.max), d2 = ri(2, 9);
    const an = n1 * n2, ad = d1 * d2, g = gcd(an, ad);
    const ans = ad === g ? String(an / g) : `${an / g}/${ad / g}`;
    return { expr: `${n1}/${d1} × ${n2}/${d2}`, op: "×", ans };
  },

  // 분수 나눗셈
  "÷f": (unit) => {
    const n1 = ri(1, unit.max), d1 = ri(2, 9);
    const n2 = ri(1, unit.max), d2 = ri(2, 9);
    if (n2 === 0) return null;
    const an = n1 * d2, ad = d1 * n2, g = gcd(an, ad);
    if (ad === 0) return null;
    const ans = ad === g ? String(an / g) : `${an / g}/${ad / g}`;
    return { expr: `${n1}/${d1} ÷ ${n2}/${d2}`, op: "÷", ans };
  },

  // 동분모 분수 덧셈·뺄셈 (진분수 보장, 결과 0 제외)
  "+f": (unit) => genFracAddSub("+"),
  "-f": (unit) => genFracAddSub("-"),

  // 비 간단히 / 비례
  "ratio": (unit, diff) => {
    const hi = scaledHi(unit, diff);
    const a = ri(unit.min, hi), b = ri(unit.min, hi);
    if (a === 0 || b === 0) return null;
    const g = gcd(a, b);
    // 이미 기약이면 (간단히 할 게 없으면) 학습 의미가 옅어 제외
    if (g === 1) return null;
    return { expr: `${a} : ${b} 를 간단히`, op: ":", ans: `${a / g} : ${b / g}` };
  },

  // 혼합 계산 (곱셈 먼저)
  "mix": () => {
    const a = ri(1, 30), b = ri(2, 9), c = ri(1, 10);
    return { expr: `${a} + ${b} × ${c}`, op: "mix", ans: String(a + b * c) };
  },
};

// ── 덧셈/뺄셈 생성기 (받아올림·내림 제약 반영) ──
function genAddSub(unit: Unit, diff: number, sym: "+" | "-"): GenProblem | null {
  const hi = scaledHi(unit, diff);
  let a = ri(unit.min, hi);
  let b = ri(unit.min, hi);
  if (sym === "-" && a < b) { const t = a; a = b; b = t; }

  const aOne = a % 10, bOne = b % 10;

  // 자릿수 제약 검증 (위반 시 null → 재시도)
  if (sym === "+") {
    if (unit.noCarry && aOne + bOne >= 10) return null;
    if (unit.withCarry && aOne + bOne < 10) return null;
  } else {
    if (unit.noBorrow && aOne < bOne) return null;
    if (unit.withBorrow && aOne >= bOne) return null;
  }

  const ans = sym === "+" ? a + b : a - b;
  if (ans < 0 || ans > unit.maxR) return null;
  return { expr: `${a} ${sym} ${b}`, a, b, op: sym, ans: String(ans) };
}

// ── 소수 덧셈/뺄셈 생성기 ──
function genDecAddSub(unit: Unit, sym: "+" | "-"): GenProblem | null {
  let a = fx1(ri(1, 99) / 10);
  let b = fx1(ri(1, 99) / 10);
  if (sym === "-" && a < b) { const t = a; a = b; b = t; }   // 음수 방지
  const ans = sym === "+" ? fx1(a + b) : fx1(a - b);
  if (ans < 0 || ans > unit.maxR) return null;
  if (sym === "-" && ans === 0) return null;                 // 0 결과 제외
  return { expr: `${a.toFixed(1)} ${sym} ${b.toFixed(1)}`, a, b, op: sym, ans: ans.toFixed(1) };
}

// ── 동분모 분수 덧셈/뺄셈 생성기 ──
function genFracAddSub(sym: "+" | "-"): GenProblem | null {
  const d = ri(2, 9);
  const n1 = ri(1, d - 1);
  const n2 = ri(1, sym === "+" ? d - n1 : n1);   // +는 합이 진분수, -는 n2<=n1
  const ansN = sym === "+" ? n1 + n2 : n1 - n2;
  if (ansN <= 0) return null;                    // 결과 0 이하 제외
  // 기약분수로 약분
  const g = gcd(ansN, d);
  const rn = ansN / g, rd = d / g;
  const ans = rd === 1 ? String(rn) : `${rn}/${rd}`;
  return { expr: `${n1}/${d} ${sym} ${n2}/${d}`, op: sym, ans };
}

/* ────────────────────────────────────────────────────────────
   makeProblem: 한 문제 생성.
   generate를 최대 MAX_TRIES회 호출, 유효한 첫 결과 반환.
   전부 실패하면 fallback(간단한 덧셈)으로 안전하게 대체 → 앱은 절대 멈추지 않음.
   ──────────────────────────────────────────────────────────── */
const MAX_TRIES = 60;

export function makeProblem(unit: Unit, diff: number): GenProblem {
  const op = unit.ops[ri(0, unit.ops.length - 1)];
  const gen = GENERATORS[op];
  if (gen) {
    for (let i = 0; i < MAX_TRIES; i++) {
      const p = gen(unit, diff);
      if (p) return p;
    }
  }
  // fallback: 절대 실패하지 않는 안전한 문제
  const a = ri(1, 9), b = ri(1, 9);
  return { expr: `${a} + ${b}`, a, b, op: "+", ans: String(a + b) };
}

/* ────────────────────────────────────────────────────────────
   makeProblems: 세션 문제 묶음 생성 + 세션 내 무중복.
   - 이미 나온 expr은 건너뛴다 (같은 문제 연속/반복 방지).
   - 유형별 조합이 count보다 적을 수 있으므로(곱셈구구 등),
     전체 재시도 상한(count * OVERSHOOT)에 도달하면 중복을 허용해 채운다.
   ──────────────────────────────────────────────────────────── */
const OVERSHOOT = 40;

export function makeProblems(unitIds: string[], diff: number, count: number): any[] {
  const sel = (UNITS as Unit[]).filter(u => unitIds.includes(u.id));
  if (!sel.length) return [];

  const result: any[] = [];
  const seen = new Set<string>();
  const maxAttempts = count * OVERSHOOT;
  let attempts = 0;

  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    const u = sel[ri(0, sel.length - 1)];
    const p = makeProblem(u, diff);
    if (seen.has(p.expr)) continue;          // 무중복
    seen.add(p.expr);
    result.push({ ...p, unitName: u.name });
  }

  // 풀이가 소진돼 무중복으로 다 못 채운 경우: 중복 허용해 나머지 채움
  while (result.length < count) {
    const u = sel[ri(0, sel.length - 1)];
    const p = makeProblem(u, diff);
    result.push({ ...p, unitName: u.name });
  }

  return result;
}
