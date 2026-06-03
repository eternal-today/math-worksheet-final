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

/** 규칙 기반 힌트 — LLM 없이 즉시. 연산별 첫 풀이 단계를 콕 집어준다. */
export function localHint(expr: string, op: string, a?: number, b?: number): string {
  if (op === "-" && a !== undefined && b !== undefined) {
    const aOne = a % 10, bOne = b % 10;
    if (aOne < bOne) return `일의 자리 ${aOne}에서 ${bOne}을 뺄 수 없어요. 십의 자리에서 10을 빌려와 ${aOne + 10}−${bOne}=${aOne + 10 - bOne}부터 구해봐요! ✏️`;
    return `일의 자리부터: ${aOne}−${bOne}=${aOne - bOne}. 그다음 십의 자리를 빼면 돼요 👍`;
  }
  if (op === "+" && a !== undefined && b !== undefined) {
    const aOne = a % 10, bOne = b % 10;
    if (aOne + bOne >= 10) return `일의 자리 ${aOne}+${bOne}=${aOne + bOne}, 10이 넘으니 1을 십의 자리로 올려줘요! ✏️`;
    return `일의 자리부터 더해봐요: ${aOne}+${bOne}=${aOne + bOne} 👍`;
  }
  if (op === "×" && a !== undefined && b !== undefined) return `${a}을 ${b}번 더하는 것과 같아요. 구구단 ${b}단을 떠올려봐요! ✏️`;
  if (op === "÷" && a !== undefined && b !== undefined) return `${a} 안에 ${b}이 몇 번 들어가는지 생각해봐요. ${b}단 구구단을 거꾸로! 👍`;
  if (expr.includes("/")) return `분모(아래 숫자)가 같으면 분자(위 숫자)끼리만 계산하면 돼요 ✏️`;
  if (expr.includes(":")) return `두 수를 같은 수로 나눠서 더 작게 만들어봐요 👍`;
  return `천천히 한 자리씩 차근차근 계산해봐요! 💪`;
}
