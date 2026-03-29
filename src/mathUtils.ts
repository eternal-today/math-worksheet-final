import { UNITS } from './constants';

export function ri(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }
export function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

export function makeProblem(unit: any, diff: number): any {
  const scale = diff === 1 ? .4 : diff === 2 ? .75 : 1;
  const hi = Math.max(unit.min, Math.floor(unit.max * scale));
  const op = unit.ops[ri(0, unit.ops.length - 1)];

  // Special handling for Grade 1 - make it easier on Easy
  let currentHi = hi;
  if (unit.grade === 1 && diff === 1) {
    currentHi = Math.min(hi, 15); // Limit to 15 for Grade 1 Easy
  }

  if (op === "×") {
    const a = ri(unit.min, hi), b = ri(unit.min, hi);
    return { expr: `${a} × ${b}`, a, b, op, ans: String(a * b) };
  }
  if (op === "÷") {
    const b = ri(unit.min, hi), q = ri(2, 9);
    return { expr: `${b * q} ÷ ${b}`, a: b * q, b, op, ans: String(q) };
  }
  if (op === "÷r") {
    const b = ri(2, 9), q = ri(1, 9), r = ri(0, b - 1);
    return { expr: `${b * q + r} ÷ ${b}`, a: b * q + r, b, op: "÷", ans: `${q} … ${r}` };
  }
  if (op === "+d" || op === "-d") {
    const a = (ri(1, 99) / 10).toFixed(1), b = (ri(1, 99) / 10).toFixed(1);
    const sym = op === "+d" ? "+" : "-";
    const ans = op === "+d"
      ? (parseFloat(a) + parseFloat(b)).toFixed(1)
      : (Math.abs(parseFloat(a) - parseFloat(b))).toFixed(1);
    return { expr: `${a} ${sym} ${b}`, a: parseFloat(a), b: parseFloat(b), op: sym, ans };
  }
  if (op === "×d") {
    const a = (ri(1, 99) / 10).toFixed(1), b = ri(2, 9);
    return { expr: `${a} × ${b}`, a: parseFloat(a), b, op: "×", ans: (parseFloat(a) * b).toFixed(1) };
  }
  if (op === "÷d") {
    const b = ri(2, 9), q = (ri(1, 99) / 10).toFixed(1);
    return { expr: `${(parseFloat(q) * b).toFixed(1)} ÷ ${b}`, op: "÷", ans: q };
  }
  if (op === "×f" || op === "÷f") {
    const n1 = ri(1, unit.max), d1 = ri(2, 9), n2 = ri(1, unit.max), d2 = ri(2, 9);
    if (op === "×f") {
      const an = n1 * n2, ad = d1 * d2, g = gcd(an, ad);
      return { expr: `${n1}/${d1} × ${n2}/${d2}`, op: "×", ans: ad === g ? String(an / g) : `${an / g}/${ad / g}` };
    }
    const an = n1 * d2, ad = d1 * n2, g = gcd(an, ad);
    return { expr: `${n1}/${d1} ÷ ${n2}/${d2}`, op: "÷", ans: ad === g ? String(an / g) : `${an / g}/${ad / g}` };
  }
  if (op === "+f" || op === "-f") {
    const d = ri(2, 9), n1 = ri(1, d - 1), n2 = ri(1, op === "+f" ? d - n1 : n1);
    const ansN = op === "+f" ? n1 + n2 : n1 - n2;
    return { expr: `${n1}/${d}${op === "+f" ? " + " : " - "}${n2}/${d}`, op: op === "+f" ? "+" : "-", ans: `${ansN}/${d}` };
  }
  if (op === "ratio") {
    const a = ri(unit.min, hi), b = ri(unit.min, hi), g = gcd(a, b);
    return { expr: `${a} : ${b} 를 간단히`, op: ":", ans: `${a / g} : ${b / g}` };
  }
  if (op === "mix") {
    const a = ri(1, 30), b = ri(2, 9), c = ri(1, 10);
    return { expr: `${a} + ${b} × ${c}`, op: "mix", ans: String(a + b * c) };
  }
  
  let a = ri(unit.min, currentHi), b = ri(unit.min, currentHi);
  if (op === "-" && a < b) { let t = a; a = b; b = t; }

  // Check for carry/borrow constraints
  if (unit.noCarry && op === "+") {
    if ((a % 10) + (b % 10) >= 10) return makeProblem(unit, diff);
  }
  if (unit.noBorrow && op === "-") {
    if ((a % 10) < (b % 10)) return makeProblem(unit, diff);
  }
  if (unit.withCarry && op === "+") {
    if ((a % 10) + (b % 10) < 10) return makeProblem(unit, diff);
  }
  if (unit.withBorrow && op === "-") {
    if ((a % 10) >= (b % 10)) return makeProblem(unit, diff);
  }

  const ans = op === "+" ? a + b : a - b;
  if (ans < 0 || ans > unit.maxR) return makeProblem(unit, diff);
  return { expr: `${a} ${op} ${b}`, a, b, op, ans: String(ans) };
}

export function makeProblems(unitIds: string[], diff: number, count: number): any[] {
  const sel = UNITS.filter(u => unitIds.includes(u.id));
  if (!sel.length) return [];
  return Array.from({ length: count }, () => {
    const u = sel[ri(0, sel.length - 1)];
    return { ...makeProblem(u, diff), unitName: u.name };
  });
}
