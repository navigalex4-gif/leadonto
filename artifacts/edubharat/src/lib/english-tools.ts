import {
  SpellCheck, PenLine, BookOpen, Volume2, GraduationCap, Briefcase,
} from "lucide-react";

/** The six English practice tools shown on the Tools Pro page. */
export const MODES = [
  { value: "grammar", label: "Grammar Fix", icon: SpellCheck, desc: "Correct grammar with clear explanations" },
  { value: "write", label: "Write Better", icon: PenLine, desc: "Polish your writing to sound professional" },
  { value: "vocab", label: "Vocabulary", icon: BookOpen, desc: "Learn new words in your language" },
  { value: "pronounce", label: "Pronunciation", icon: Volume2, desc: "Practice English pronunciation" },
  { value: "lesson", label: "Daily Lesson", icon: GraduationCap, desc: "Structured lesson for your level" },
  { value: "interview_english", label: "Interview English", icon: Briefcase, desc: "Professional phrases for interviews" },
] as const;
export type Mode = typeof MODES[number]["value"];

/** Remove markdown so the TTS engine reads clean, natural speech. */
export function stripMarkdownForSpeech(text: string) {
  return formatGeneratedText(text)
    .replace(/^\s*[•·]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Turn model output into clean, readable text for the UI.
 *
 * Models sometimes ignore the plain-text instruction and return Markdown.
 * Showing the syntax makes lessons and tool results feel unfinished, so keep
 * one normalizer for every generated-text surface.
 */
export function formatGeneratedText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/^\s*\|[-:| ]+\|\s*$/gm, "")
    .replace(/^\s*\|/gm, "")
    .replace(/\|\s*$/gm, "")
    .replace(/[#*_]+/g, "")
    .replace(/\s+$/gm, "")
    .trim();
}

/** Map the extended englishLevel field ("Beginner (A1)" etc.) to a simple UI level. */
export function mapEnglishLevel(raw: string): string {
  const l = raw.toLowerCase();
  if (l.startsWith("adv") || l.includes("c1") || l.includes("c2")) return "Advanced";
  if (l.startsWith("int") || l.startsWith("upp") || l.includes("b1") || l.includes("b2")) return "Intermediate";
  return "Beginner";
}
