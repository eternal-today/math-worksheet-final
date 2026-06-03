import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeminiCallOptions {
  apiKey: string;
  prompt: string;
  imageBase64?: string;
  imageMime?: string;
  jsonMode?: boolean;
  maxRetries?: number;
  thinkingBudget?: number;
}

export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const {
    apiKey, prompt, imageBase64, imageMime = "image/jpeg",
    jsonMode = false, maxRetries = 3, thinkingBudget = 0,
  } = opts;
  if (!apiKey) throw new Error("API 키가 없습니다.");

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [{ text: prompt }];
  if (imageBase64) parts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } });

  const requestConfig: any = { thinkingConfig: { thinkingBudget } };
  if (jsonMode) requestConfig.responseMimeType = "application/json";

  let lastErr: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: [{ parts }], config: requestConfig,
      });
      const text = res.text;
      if (!text || !text.trim()) throw new Error("빈 응답");
      return text;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      const isRetryable = /429|503|500|overload|quota|rate|timeout|network|fetch|deadline|unavailable|빈 응답/i.test(msg);
      if (!isRetryable || attempt === maxRetries) break;
      await sleep(800 * Math.pow(2, attempt) + Math.random() * 300);
    }
  }
  throw lastErr || new Error("Gemini 호출 실패");
}

export function safeParseJSON<T = any>(text: string): T | null {
  if (!text) return null;
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const f = cleaned.indexOf("{"), l = cleaned.lastIndexOf("}");
  if (f !== -1 && l !== -1 && l > f) { try { return JSON.parse(cleaned.slice(f, l + 1)); } catch {} }
  const fa = cleaned.indexOf("["), la = cleaned.lastIndexOf("]");
  if (fa !== -1 && la !== -1 && la > fa) { try { return JSON.parse(cleaned.slice(fa, la + 1)); } catch {} }
  return null;
}

/** 규칙 기반 힌트 — LLM 없이 즉시. 답 직전까지 풀이를 보여주되 마지막은 아이 몫으로. */
export function localHint(expr: string, op: string, a?: number, b?: number): string {
  if (op === "-" && a !== undefined && b !== undefined) {
    const bTen = Math.floor(b / 10) * 10, bOne = b % 10;
    if (bOne === 0 && bTen > 0) return `${b}은 딱 몇십이야. ${a}에서 십의 자리만 ${Math.floor(a/10)}−${bTen/10}만큼 줄이면 얼마일까? 👍`;
    if ((a % 10) < bOne) return `${a}에서 먼저 ${bTen}을 빼면 ${a - bTen}, 거기서 ${bOne}을 더 빼면? 직접 해볼래? ✏️`;
    if (bTen > 0) return `${a}에서 ${bTen}을 빼면 ${a - bTen}이야. 거기서 ${bOne}을 빼면 얼마일까? 👍`;
    return `${a}에서 ${bOne}을 빼면 몇이 될까? 손가락으로 세어봐도 좋아 👍`;
  }
  if (op === "+" && a !== undefined && b !== undefined) {
    const aTen = Math.floor(a / 10) * 10, aOne = a % 10;
    const bTen = Math.floor(b / 10) * 10, bOne = b % 10;
    if (aTen + bTen > 0) return `십끼리 더하면 ${aTen + bTen}, 일끼리는 ${aOne}+${bOne}이야. 둘을 합치면 얼마일까? ✏️`;
    return `${aOne}하고 ${bOne}을 더하면 몇이 될까? 직접 세어봐! 👍`;
  }
  if (op === "×" && a !== undefined && b !== undefined) return `${a}을 ${b}번 더하는 거야. 구구단 ${b}단을 떠올려서 직접 말해볼래? ✏️`;
  if (op === "÷" && a !== undefined && b !== undefined) return `${b} 곱하기 얼마가 ${a}이 될까? 거꾸로 생각해봐! 👍`;
  if (expr.includes("/")) return `분모가 같으니 분자끼리만 계산하면 돼. 직접 해볼래? ✏️`;
  if (expr.includes(":")) return `두 수를 같은 수로 나눠서 더 작게 만들어봐 👍`;
  return `차근차근 한 단계씩 풀어볼까? 💪`;
}
