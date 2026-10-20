/**
 * 분수·소수 도우미 (문제 생성, 채점, 화면 표기가 같이 쓴다)
 *
 * 분수 문자열 형식
 *  - "3/4"     진분수·가분수
 *  - "2 1/3"   대분수 (자연수와 분수 사이 공백 하나)
 *  - "5"       자연수
 */

export interface Frac { n: number; d: number }   // 가분수 형태 (n/d), d > 0

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

const FRAC_RE = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/;

/** "2 1/3" → {n:7, d:3}. 자연수도 받는다. 형식이 아니면 null */
export function parseFrac(s: string): Frac | null {
  const t = String(s).trim();
  if (/^\d+$/.test(t)) return { n: Number(t), d: 1 };
  const m = t.match(FRAC_RE);
  if (!m) return null;
  const w = m[1] ? Number(m[1]) : 0, n = Number(m[2]), d = Number(m[3]);
  if (d === 0) return null;
  return { n: w * d + n, d };
}

export function reduce(f: Frac): Frac {
  const g = gcd(f.n, f.d) || 1;
  return { n: f.n / g, d: f.d / g };
}

/** 가분수를 대분수 문자열로 (약분은 하지 않음) */
export function toMixed(f: Frac): string {
  if (f.d === 1) return String(f.n);
  const w = Math.floor(f.n / f.d), r = f.n % f.d;
  if (r === 0) return String(w);
  return w ? `${w} ${r}/${f.d}` : `${r}/${f.d}`;
}
/** 가분수 문자열 (예: 7/3) */
export const toImproperText = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

/** 기약분수인가 (대분수의 분수 부분 기준) */
export function isLowest(s: string): boolean {
  const t = String(s).trim();
  if (/^\d+$/.test(t)) return true;
  const m = t.match(FRAC_RE);
  if (!m) return false;
  return gcd(Number(m[2]), Number(m[3])) === 1;
}

export const fracEq = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;
export const fracAdd = (a: Frac, b: Frac): Frac => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
export const fracSub = (a: Frac, b: Frac): Frac => ({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
export const fracMul = (a: Frac, b: Frac): Frac => ({ n: a.n * b.n, d: a.d * b.d });
export const fracDiv = (a: Frac, b: Frac): Frac => ({ n: a.n * b.d, d: a.d * b.n });

/** 소수 문자열 (끝의 0 없앰). 정수 계산값(scale 자리)에서 만든다: decText(162, 2) → "1.62" */
export function decText(v: number, dp: number): string {
  if (dp === 0) return String(v);
  const neg = v < 0; v = Math.abs(v);
  const sStr = String(v).padStart(dp + 1, '0');
  const int = sStr.slice(0, sStr.length - dp), frac = sStr.slice(sStr.length - dp).replace(/0+$/, '');
  return (neg ? '-' : '') + (frac ? `${int}.${frac}` : int);
}
/** 소수 자릿수 */
export const decPlaces = (s: string | number) => { const t = String(s); const i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
/** 소수를 정수(10^dp 배)로: toScaled("1.5", 2) → 150 */
export function toScaled(s: string | number, dp: number): number {
  const t = String(s);
  const [i, f = ''] = t.split('.');
  return Number(i) * 10 ** dp + Number((f + '0'.repeat(dp)).slice(0, dp) || 0);
}

/**
 * 채점: 정답 문자열과 입력이 같은 답인가
 * - 콤마·공백·% 차이는 무시 (대분수의 공백은 형식으로 읽음)
 * - 숫자는 값으로 비교 (2.50 = 2.5)
 * - 분수는 값으로 비교 (4/6 = 2/3, 7/3 = 2 1/3). strict면 기약분수여야 함
 * - 비(3 : 4), 나머지(5 … 2)는 글자 그대로 비교
 */
export function answersMatch(ans: string, input: string, strict = false): boolean {
  const clean = (x: string) => String(x).replace(/,/g, '').replace(/%/g, '').trim().replace(/\s+/g, ' ');
  const a = clean(ans), b = clean(input);
  if (!b) return false;
  if (a.replace(/\s/g, '') === b.replace(/\s/g, '') && (!strict || isLowest(b))) return true;
  const num = /^-?\d+(\.\d+)?$/;
  if (num.test(a) && num.test(b)) return parseFloat(a) === parseFloat(b);
  const fa = parseFrac(a), fb = parseFrac(b);
  if (fa && fb) return fracEq(fa, fb) && (!strict || isLowest(b));
  return false;
}

/** 표시용 토큰: 글자와 분수를 나눔 ("2 1/3 + 3/4" → [frac, 글자, frac]) */
export type MathTok = { t: 'txt'; v: string } | { t: 'frac'; w?: string; n: string; d: string };
const TOK_RE = /(?:(\d+) )?(\d+|□)\/(\d+|□)/g;
export function mathTokens(s: string): MathTok[] {
  const out: MathTok[] = [];
  let last = 0;
  String(s).replace(TOK_RE, (m, w, n, d, idx: number) => {
    if (idx > last) out.push({ t: 'txt', v: s.slice(last, idx) });
    out.push({ t: 'frac', w, n, d });
    last = idx + m.length;
    return m;
  });
  if (last < s.length) out.push({ t: 'txt', v: s.slice(last) });
  return out;
}
export const hasFrac = (s: string) => /(\d+|□)\/(\d+|□)/.test(String(s));
