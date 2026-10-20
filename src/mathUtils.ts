import { UNITS } from './constants';
import { GEN46 } from './gen46';

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

// ── 생성 결과 타입 (엔진 내부용) ──
export interface GenProblem {
  expr: string;
  a?: number;
  b?: number;
  op: string;
  ans: string;
  fa?: string;   // 분수 문제의 두 수 (풀이 엔진용)
  fb?: string;
  q?: boolean;   // "~의 최대공약수"처럼 식 뒤에 "="를 붙이지 않는 문제
}

interface Unit {
  id: string; grade: number; sem: number; name: string; ops: string[];
  min: number; max: number; maxR: number;
  bMin?: number; bMax?: number; qMin?: number; qMax?: number;
  noCarry?: boolean; withCarry?: boolean; noBorrow?: boolean; withBorrow?: boolean;
  maxCarry?: number; minCarry?: number;   // 받아올림(내림) 횟수 제한
  keys?: string[]; frac?: boolean; fracStrict?: boolean;
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

  // 받아올림 있는 (몇)+(몇): 두 한 자리 수의 합이 10 이상 (난이도와 무관하게 범위 고정)
  "+1d": () => {
    const a = ri(2, 9), b = ri(2, 9);
    if (a + b < 10) return null;
    return { expr: `${a} + ${b}`, a, b, op: "+", ans: String(a + b) };
  },
  // 받아내림 있는 (십몇)−(몇): 일의 자리에서 뺄 수 없는 경우만
  "-teen": () => {
    const a = ri(11, 18), b = ri(2, 9);
    if (a % 10 >= b) return null;
    return { expr: `${a} - ${b}`, a, b, op: "-", ans: String(a - b) };
  },

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

  // ── 4~6학년 (아래 GEN46에 모음) ──
  ...GEN46,
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

  if (unit.maxCarry != null || unit.minCarry != null) {
    const n = countCarries(a, b, sym);
    if (unit.maxCarry != null && n > unit.maxCarry) return null;
    if (unit.minCarry != null && n < unit.minCarry) return null;
  }

  const ans = sym === "+" ? a + b : a - b;
  if (ans < 0 || ans > unit.maxR) return null;
  return { expr: `${a} ${sym} ${b}`, a, b, op: sym, ans: String(ans) };
}

/** 받아올림(덧셈)·받아내림(뺄셈) 횟수 */
export function countCarries(a: number, b: number, sym: "+" | "-"): number {
  let n = 0, c = 0;
  for (let i = 0; i < 4; i++) {
    const da = Math.floor(a / 10 ** i) % 10, db = Math.floor(b / 10 ** i) % 10;
    if (sym === "+") { c = da + db + c >= 10 ? 1 : 0; }
    else { c = da - c < db ? 1 : 0; }
    n += c;
  }
  return n;
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
    result.push({ ...p, unitName: u.name, unitId: u.id });
  }

  // 풀이가 소진돼 무중복으로 다 못 채운 경우: 중복 허용해 나머지 채움
  while (result.length < count) {
    const u = sel[ri(0, sel.length - 1)];
    const p = makeProblem(u, diff);
    result.push({ ...p, unitName: u.name, unitId: u.id });
  }

  return result;
}
