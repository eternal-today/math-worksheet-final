import { GoogleGenAI } from "@google/genai";

// 안정 버전 모델명 (gemini-3-flash-preview 는 불안정/존재하지 않아 오류의 원인이었음)
export const GEMINI_MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeminiCallOptions {
  apiKey: string;
  prompt: string;
  imageBase64?: string;      // 사진 채점용 (base64, 헤더 제외)
  imageMime?: string;        // 예: "image/jpeg"
  jsonMode?: boolean;        // JSON 응답 강제
  maxRetries?: number;       // 기본 3회
  thinkingBudget?: number;   // 기본 0 (속도 최적화, thinking 블록 방지)
}

/**
 * Gemini 호출 + 지수 백오프 재시도.
 * 일시적 네트워크 오류, 429(quota), 503(overloaded) 등에 자동 재시도.
 */
export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const {
    apiKey,
    prompt,
    imageBase64,
    imageMime = "image/jpeg",
    jsonMode = false,
    maxRetries = 3,
    thinkingBudget = 0,
  } = opts;

  if (!apiKey) throw new Error("API 키가 없습니다.");

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } });
  }

  const requestConfig: any = {
    thinkingConfig: { thinkingBudget },
  };
  if (jsonMode) requestConfig.responseMimeType = "application/json";

  let lastErr: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ parts }],
        config: requestConfig,
      });
      const text = res.text;
      if (!text || !text.trim()) throw new Error("빈 응답");
      return text;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      // 재시도 불가능한 오류는 즉시 중단 (잘못된 키 등)
      const isRetryable =
        /429|503|500|overload|quota|rate|timeout|network|fetch|deadline|unavailable|빈 응답/i.test(msg);
      if (!isRetryable || attempt === maxRetries) break;
      // 지수 백오프: 0.8s, 1.6s, 3.2s (+ 지터)
      const delay = 800 * Math.pow(2, attempt) + Math.random() * 300;
      await sleep(delay);
    }
  }
  throw lastErr || new Error("Gemini 호출 실패");
}

/**
 * 텍스트에서 JSON을 안전하게 추출/파싱.
 * 3단계 fallback: 코드블록 제거 → 중괄호 추출 → 직접 파싱.
 */
export function safeParseJSON<T = any>(text: string): T | null {
  if (!text) return null;

  // 1) 마크다운 코드블록 제거
  let cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2) 첫 { 부터 마지막 } 까지 추출
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = cleaned.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }

  // 3) 배열 형태 추출
  const fa = cleaned.indexOf("[");
  const la = cleaned.lastIndexOf("]");
  if (fa !== -1 && la !== -1 && la > fa) {
    try {
      return JSON.parse(cleaned.slice(fa, la + 1));
    } catch {}
  }

  return null;
}
