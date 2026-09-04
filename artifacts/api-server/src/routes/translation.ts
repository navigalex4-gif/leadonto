import { Router, type Request, type Response } from "express";
import { Type } from "@google/genai";
import { z } from "zod";
import { getAI } from "./ai.js";

const router = Router();

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

type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

const TranslationBody = z.object({
  sourceText: z.string().trim().min(1).max(2_000),
  targetLanguage: z.enum(TRANSLATION_LANGUAGES),
  operation: z.enum(["translate", "explain"]).default("translate"),
}).strict();

const SCRIPT_RANGES: Record<TranslationLanguage, RegExp> = {
  English: /[A-Za-z]/u,
  Hindi: /[\u0900-\u097F]/u,
  Marathi: /[\u0900-\u097F]/u,
  Tamil: /[\u0B80-\u0BFF]/u,
  Telugu: /[\u0C00-\u0C7F]/u,
  Bengali: /[\u0980-\u09FF]/u,
  Assamese: /[\u0980-\u09FF]/u,
  Gujarati: /[\u0A80-\u0AFF]/u,
  Kannada: /[\u0C80-\u0CFF]/u,
  Malayalam: /[\u0D00-\u0D7F]/u,
  Punjabi: /[\u0A00-\u0A7F]/u,
  Odia: /[\u0B00-\u0B7F]/u,
  Urdu: /[\u0600-\u06FF]/u,
};

const INDIC_SCRIPT = /[\u0900-\u0D7F\u0600-\u06FF]/u;

export function isValidTranslation(translation: string, language: TranslationLanguage): boolean {
  const value = translation.trim();
  if (!value || !SCRIPT_RANGES[language]) return false;

  const scriptCharacters = [...value].filter((character) => SCRIPT_RANGES[language].test(character)).length;
  if (scriptCharacters < 2) return false;
  if (language === "English") {
    const letterCount = [...value].filter((character) => /\p{L}/u.test(character)).length;
    const latinCount = [...value].filter((character) => /[A-Za-z]/u.test(character)).length;
    return latinCount / Math.max(1, letterCount) >= 0.6;
  }

  const tokens = value.split(/\s+/u).filter(Boolean);
  const scriptTokens = tokens.filter((token) => [...token].some((character) => INDIC_SCRIPT.test(character)));
  const isolatedScriptTokens = scriptTokens.filter((token) => {
    const withoutPunctuation = token.replace(/[.,!?।॥]/gu, "");
    return [...withoutPunctuation].length === 1
      && INDIC_SCRIPT.test(withoutPunctuation);
  });
  if (isolatedScriptTokens.length >= 2) return false;

  const nativeRuns = value.match(/[\u0900-\u0D7F\u0600-\u06FF]+/gu) ?? [];
  const longestRun = Math.max(0, ...nativeRuns.map((run) => [...run].length));
  const whitespaceCount = (value.match(/\s/gu) ?? []).length;
  if (longestRun >= 24 || (longestRun >= 14 && whitespaceCount <= 2)) return false;

  return true;
}

function parseStructuredTranslation(raw: string): string {
  const unwrapped = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed: unknown = JSON.parse(unwrapped);
  if (
    !parsed
    || typeof parsed !== "object"
    || typeof (parsed as { translation?: unknown }).translation !== "string"
  ) {
    throw new Error("Gemini returned an invalid translation shape");
  }
  return (parsed as { translation: string }).translation.trim();
}

async function requestGeminiTranslation(
  req: Request,
  sourceText: string,
  targetLanguage: TranslationLanguage,
  operation: "translate" | "explain",
): Promise<string> {
  const ai = getAI();
  // This is deliberately the only model input for translation: no conversation
  // history, tutor prompt, native-language policy, or coaching instructions.
  const prompt = [
    `Target language: ${targetLanguage}`,
    operation === "explain"
      ? "Explain the meaning of the source text clearly and faithfully in the target language. Explain what the source means; do not answer the source question and do not add a new coaching question."
      : "Translate the source text faithfully and naturally.",
    "Use the target language's standard written script. Do not acknowledge the request, mention these instructions, or invent missing context.",
    "Return JSON with exactly one string field named translation.",
    `Source text: ${JSON.stringify(sourceText)}`,
  ].join("\n");

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
  let lastError: unknown = new Error("Gemini returned no translation");

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens: 256,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translation: { type: Type.STRING },
            },
            required: ["translation"],
          },
          ...(process.env["GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON"]
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      });
      const translation = parseStructuredTranslation(response.text ?? "");
      if (!isValidTranslation(translation, targetLanguage)) {
        throw new Error(`Gemini returned invalid ${targetLanguage} script`);
      }
      return translation;
    } catch (error) {
      lastError = error;
      req.log.warn({ model, error }, "Gemini translation attempt failed");
    }
  }

  throw lastError;
}

router.post("/ai/translate", async (req, res: Response) => {
  const parsed = TranslationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "sourceText and a supported targetLanguage are required" });
    return;
  }

  const { sourceText, targetLanguage, operation } = parsed.data;
  try {
    const translation = await requestGeminiTranslation(req, sourceText, targetLanguage, operation);
    res.json({ translation });
  } catch (error) {
    req.log.error({ error, targetLanguage, operation }, "Gemini language operation failed");
    res.status(502).json({ error: operation === "explain" ? "Explanation unavailable" : "Translation unavailable" });
  }
});

export default router;