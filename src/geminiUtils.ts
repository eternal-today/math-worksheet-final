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

/** 규칙 기반 힌트 — LLM 없이 즉시. 개념 1줄 + 단계별 줄바꿈 구조. 답은 아이 몫. */
export function localHint(expr: string, op: string, a?: number, b?: number): string {
  if (op === "-" && a !== undefined && b !== undefined) {
    const bTen = Math.floor(b / 10) * 10, bOne = b % 10;
    if (bOne === 0 && bTen > 0)
      return `빼는 수가 딱 몇십이야 ✏️\n1. 십의 자리끼리: ${Math.floor(a/10)}−${bTen/10}\n2. 일의 자리는 그대로! 그럼 얼마일까?`;
    if ((a % 10) < bOne)
      return `일의 자리가 모자라면 십에서 빌려와 ✏️\n1. ${a}에서 ${bTen}을 먼저 빼 → ${a - bTen}\n2. ${a - bTen}에서 ${bOne}을 빼면?`;
    if (bTen > 0)
      return `큰 수부터 나눠서 빼면 쉬워 ✏️\n1. ${a}에서 ${bTen}을 빼 → ${a - bTen}\n2. ${a - bTen}에서 ${bOne}을 빼면?`;
    return `하나씩 세면서 빼보자 ✏️\n1. ${a}에서 ${bOne}만큼 거꾸로 세어봐\n2. 몇에서 멈출까?`;
  }
  if (op === "+" && a !== undefined && b !== undefined) {
    const aTen = Math.floor(a / 10) * 10, aOne = a % 10;
    const bTen = Math.floor(b / 10) * 10, bOne = b % 10;
    if (aTen + bTen > 0)
      return `십은 십끼리, 일은 일끼리 ✏️\n1. 십끼리: ${aTen}+${bTen} → ${aTen + bTen}\n2. 일끼리: ${aOne}+${bOne}, 둘을 합치면?`;
    return `수를 이어서 세면 돼 ✏️\n1. ${a}에서 시작해\n2. ${b}만큼 이어 세면 얼마일까?`;
  }
  if (op === "×" && a !== undefined && b !== undefined)
    return `곱셈은 같은 수를 여러 번 더하는 거야 ✏️\n1. ${a}을 ${b}번 더한다고 생각해\n2. 구구단 ${b}단으로 말해볼까?`;
  if (op === "÷" && a !== undefined && b !== undefined)
    return `나눗셈은 곱셈을 거꾸로! ✏️\n1. ${b} × □ = ${a}\n2. □에 들어갈 수는 뭘까?`;
  if (expr.includes("/"))
    return `분모가 같으면 분자끼리만 계산해 ✏️\n1. 위의 숫자(분자)끼리 계산해\n2. 분모는 그대로! 답은?`;
  if (expr.includes(":"))
    return `비는 같은 수로 나눠 간단히 해 ✏️\n1. 두 수를 똑같이 나눌 수 있는 수를 찾아\n2. 나누면 어떻게 될까?`;
  return `차근차근 한 단계씩! 💪\n1. 먼저 큰 수부터 처리해\n2. 남은 걸 계산하면?`;
}
