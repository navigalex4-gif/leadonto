export const TRANSLATION_LANGUAGES = [
  "English",
  "Hindi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Assamese",
  "Urdu",
] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

type TranslationPayload = {
  translation?: unknown;
  error?: unknown;
};

/**
 * Translation is intentionally not built on useGeminiStream. It has a
 * non-streaming JSON contract and never sends conversation history/system
 * instructions to the server.
 */
export async function requestTranslation(
  sourceText: string,
  targetLanguage: TranslationLanguage,
): Promise<string> {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const response = await fetch(`${base}/api/ai/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sourceText, targetLanguage }),
    signal: AbortSignal.timeout(8_000),
  });

  const payload = await response.json().catch(() => ({})) as TranslationPayload;
  if (!response.ok || typeof payload.translation !== "string" || !payload.translation.trim()) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Translation unavailable");
  }
  return payload.translation.trim();
}