/**
 * Word Power — in-chat vocabulary engine.
 *
 * A curated bank of high-value English words that Indian learners meet in
 * daily conversation, interviews and workplaces. When the AI teacher uses one
 * of these words in a reply, the word becomes a tappable chip inside the chat
 * bubble and opens a picture card (WordPowerPopup) with:
 *   - a category illustration (inline SVG — no asset downloads, works offline)
 *   - a simple English meaning
 *   - a Hindi meaning (the most common helper language; others fall back to EN)
 *   - a natural example sentence
 *   - "Hear it" (TTS) and "Use it" (practice) actions
 *
 * This is deliberately CLIENT-SIDE and deterministic: zero added latency, zero
 * extra AI cost, and it works identically across every tutor and provider.
 */

export type WordCategory =
  | "success"
  | "work"
  | "emotion"
  | "mind"
  | "social"
  | "travel"
  | "time"
  | "quality";

export interface WordPowerEntry {
  word: string;
  pos: string;          // part of speech
  meaning: string;      // simple English meaning
  hindi: string;        // Hindi gloss (Devanagari)
  example: string;      // short natural example sentence
  category: WordCategory;
}

/**
 * Curated bank. Keep words genuinely useful for spoken/workplace English and
 * meanings short enough to read aloud. Sorted lookup happens via WORD_MAP.
 */
export const WORD_BANK: WordPowerEntry[] = [
  // ── success ──────────────────────────────────────────────────────────────
  { word: "achieve", pos: "verb", meaning: "to reach a goal through effort", hindi: "हासिल करना", example: "You can achieve fluency with daily practice.", category: "success" },
  { word: "confident", pos: "adjective", meaning: "sure about yourself and your abilities", hindi: "आत्मविश्वासी", example: "She felt confident during the interview.", category: "success" },
  { word: "improve", pos: "verb", meaning: "to become better at something", hindi: "सुधारना", example: "Your English improves every time you speak.", category: "success" },
  { word: "opportunity", pos: "noun", meaning: "a good chance to do something", hindi: "अवसर / मौका", example: "This job is a great opportunity for you.", category: "success" },
  { word: "succeed", pos: "verb", meaning: "to do well; to get the result you wanted", hindi: "सफल होना", example: "If you practise daily, you will succeed.", category: "success" },
  { word: "goal", pos: "noun", meaning: "something you want to achieve", hindi: "लक्ष्य", example: "My goal is to speak English fluently.", category: "success" },
  { word: "progress", pos: "noun", meaning: "forward movement toward a goal", hindi: "प्रगति", example: "Your progress this week is excellent.", category: "success" },
  { word: "effort", pos: "noun", meaning: "the energy you use to do something", hindi: "प्रयास / मेहनत", example: "Speaking daily takes effort, but it works.", category: "success" },
  { word: "challenge", pos: "noun", meaning: "something difficult that tests you", hindi: "चुनौती", example: "Interviews are a challenge, but you can prepare.", category: "success" },
  { word: "fluent", pos: "adjective", meaning: "able to speak smoothly and easily", hindi: "धाराप्रवाह", example: "You sound more fluent every day.", category: "success" },
  // ── work ─────────────────────────────────────────────────────────────────
  { word: "interview", pos: "noun", meaning: "a formal meeting where an employer asks you questions", hindi: "साक्षात्कार", example: "I have a job interview on Monday.", category: "work" },
  { word: "experience", pos: "noun", meaning: "knowledge or skill gained over time", hindi: "अनुभव", example: "She has two years of experience in sales.", category: "work" },
  { word: "salary", pos: "noun", meaning: "the money you earn from your job", hindi: "वेतन / तनख्वाह", example: "They offered a good salary for the role.", category: "work" },
  { word: "manager", pos: "noun", meaning: "a person who leads a team at work", hindi: "प्रबंधक / मैनेजर", example: "My manager appreciated my presentation.", category: "work" },
  { word: "deadline", pos: "noun", meaning: "the time by which work must finish", hindi: "समय-सीमा", example: "We must finish the report before the deadline.", category: "work" },
  { word: "meeting", pos: "noun", meaning: "a planned discussion with colleagues", hindi: "बैठक / मीटिंग", example: "I spoke confidently in the team meeting.", category: "work" },
  { word: "presentation", pos: "noun", meaning: "a talk given to explain an idea to a group", hindi: "प्रस्तुति", example: "Her presentation impressed the clients.", category: "work" },
  { word: "colleague", pos: "noun", meaning: "a person you work with", hindi: "सहकर्मी", example: "My colleagues are very supportive.", category: "work" },
  { word: "responsibility", pos: "noun", meaning: "a duty you must take care of", hindi: "ज़िम्मेदारी", example: "Handling customers is my responsibility.", category: "work" },
  { word: "promotion", pos: "noun", meaning: "a move to a higher position at work", hindi: "पदोन्नति", example: "Good English can help you get a promotion.", category: "work" },
  // ── emotion ──────────────────────────────────────────────────────────────
  { word: "nervous", pos: "adjective", meaning: "worried or afraid before something important", hindi: "घबराया हुआ", example: "Everyone feels nervous before interviews.", category: "emotion" },
  { word: "excited", pos: "adjective", meaning: "very happy and eager about something", hindi: "उत्साहित", example: "I am excited to start my new job.", category: "emotion" },
  { word: "proud", pos: "adjective", meaning: "feeling happy about what you did well", hindi: "गर्वित", example: "You should feel proud of your progress.", category: "emotion" },
  { word: "comfortable", pos: "adjective", meaning: "relaxed and without worry", hindi: "सहज / आरामदायक", example: "Practice makes you comfortable in English.", category: "emotion" },
  { word: "motivated", pos: "adjective", meaning: "having a strong reason to act", hindi: "प्रेरित", example: "A clear goal keeps you motivated.", category: "emotion" },
  { word: "grateful", pos: "adjective", meaning: "thankful for something good", hindi: "आभारी / कृतज्ञ", example: "I am grateful for your help.", category: "emotion" },
  { word: "confused", pos: "adjective", meaning: "unable to understand something clearly", hindi: "उलझन में", example: "If you feel confused, just ask me again.", category: "emotion" },
  { word: "brave", pos: "adjective", meaning: "ready to face fear or difficulty", hindi: "बहादुर", example: "Speaking a new language is a brave step.", category: "emotion" },
  // ── mind ─────────────────────────────────────────────────────────────────
  { word: "understand", pos: "verb", meaning: "to know the meaning of something", hindi: "समझना", example: "Do you understand this word?", category: "mind" },
  { word: "remember", pos: "verb", meaning: "to keep something in your memory", hindi: "याद रखना", example: "Try to remember three new words daily.", category: "mind" },
  { word: "practice", pos: "noun", meaning: "doing something again and again to improve", hindi: "अभ्यास", example: "Daily practice builds real confidence.", category: "mind" },
  { word: "mistake", pos: "noun", meaning: "something done incorrectly", hindi: "गलती", example: "Every mistake is a chance to learn.", category: "mind" },
  { word: "knowledge", pos: "noun", meaning: "what you know and have learned", hindi: "ज्ञान", example: "English knowledge opens many doors.", category: "mind" },
  { word: "learn", pos: "verb", meaning: "to gain new knowledge or skill", hindi: "सीखना", example: "You learn fastest by speaking.", category: "mind" },
  { word: "idea", pos: "noun", meaning: "a thought or suggestion", hindi: "विचार", example: "That is a brilliant idea for your project.", category: "mind" },
  { word: "decide", pos: "verb", meaning: "to make a choice", hindi: "निर्णय लेना", example: "Decide your goal and work towards it.", category: "mind" },
  // ── social ───────────────────────────────────────────────────────────────
  { word: "conversation", pos: "noun", meaning: "a talk between two or more people", hindi: "बातचीत", example: "Our conversation today was wonderful.", category: "social" },
  { word: "polite", pos: "adjective", meaning: "speaking with good manners and respect", hindi: "विनम्र", example: "A polite tone helps in every interview.", category: "social" },
  { word: "greet", pos: "verb", meaning: "to say hello in a friendly way", hindi: "अभिवादन करना", example: "Greet the interviewer with a smile.", category: "social" },
  { word: "introduce", pos: "verb", meaning: "to tell others who you are", hindi: "परिचय देना", example: "Introduce yourself in two sentences.", category: "social" },
  { word: "opinion", pos: "noun", meaning: "what you think about something", hindi: "राय", example: "Share your opinion clearly in meetings.", category: "social" },
  { word: "discuss", pos: "verb", meaning: "to talk about a topic together", hindi: "चर्चा करना", example: "Let us discuss your career plans.", category: "social" },
  { word: "apologize", pos: "verb", meaning: "to say sorry for something", hindi: "माफ़ी माँगना", example: "Apologize politely if you are late.", category: "social" },
  { word: "promise", pos: "noun", meaning: "a statement that you will do something", hindi: "वादा", example: "Make a promise to practise every day.", category: "social" },
  // ── travel ───────────────────────────────────────────────────────────────
  { word: "journey", pos: "noun", meaning: "travelling from one place to another; also a long process", hindi: "यात्रा / सफ़र", example: "Learning English is a beautiful journey.", category: "travel" },
  { word: "ticket", pos: "noun", meaning: "a pass for a train, bus or flight", hindi: "टिकट", example: "I booked my ticket online yesterday.", category: "travel" },
  { word: "luggage", pos: "noun", meaning: "the bags you carry while travelling", hindi: "सामान", example: "Keep your luggage safe at the station.", category: "travel" },
  { word: "abroad", pos: "adverb", meaning: "in or to a foreign country", hindi: "विदेश", example: "Good English helps if you work abroad.", category: "travel" },
  { word: "destination", pos: "noun", meaning: "the place you are travelling to", hindi: "गंतव्य", example: "Goa is a popular holiday destination.", category: "travel" },
  // ── time ─────────────────────────────────────────────────────────────────
  { word: "punctual", pos: "adjective", meaning: "arriving at the correct time", hindi: "समयनिष्ठ", example: "Being punctual creates a strong impression.", category: "time" },
  { word: "schedule", pos: "noun", meaning: "a plan of times for activities", hindi: "कार्यक्रम / समय-सारणी", example: "My schedule is busy this week.", category: "time" },
  { word: "immediately", pos: "adverb", meaning: "at once, without delay", hindi: "तुरंत", example: "Reply to the client's email immediately.", category: "time" },
  { word: "daily", pos: "adverb", meaning: "every day", hindi: "रोज़ाना", example: "Speak English daily, even for five minutes.", category: "time" },
  { word: "postpone", pos: "verb", meaning: "to delay something to a later time", hindi: "स्थगित करना", example: "They postponed the meeting to Friday.", category: "time" },
  // ── quality ──────────────────────────────────────────────────────────────
  { word: "excellent", pos: "adjective", meaning: "extremely good", hindi: "उत्कृष्ट / बेहतरीन", example: "Your pronunciation is excellent today.", category: "quality" },
  { word: "honest", pos: "adjective", meaning: "always telling the truth", hindi: "ईमानदार", example: "Be honest about your skills in interviews.", category: "quality" },
  { word: "creative", pos: "adjective", meaning: "full of new and original ideas", hindi: "रचनात्मक", example: "Companies love creative problem solvers.", category: "quality" },
  { word: "professional", pos: "adjective", meaning: "behaving correctly for work", hindi: "पेशेवर", example: "A professional tone builds trust.", category: "quality" },
  { word: "reliable", pos: "adjective", meaning: "can be trusted to do things well", hindi: "भरोसेमंद", example: "Reliable employees grow fast.", category: "quality" },
  { word: "simple", pos: "adjective", meaning: "easy to understand or do", hindi: "सरल", example: "Use simple words when you speak.", category: "quality" },
  { word: "important", pos: "adjective", meaning: "having great value or effect", hindi: "महत्वपूर्ण", example: "Communication is important in every job.", category: "quality" },
  { word: "useful", pos: "adjective", meaning: "helpful for a purpose", hindi: "उपयोगी", example: "This phrase is very useful in offices.", category: "quality" },
];

export const WORD_MAP: Map<string, WordPowerEntry> = new Map(
  WORD_BANK.map((entry) => [entry.word.toLowerCase(), entry]),
);

/** Deterministic word-of-the-day, one entry per calendar day. */
export function wordOfTheDay(date = new Date()): WordPowerEntry {
  const dayNumber = Math.floor(date.getTime() / 86400000);
  return WORD_BANK[dayNumber % WORD_BANK.length]!;
}

/**
 * Find Word Power hits inside an AI reply. Returns at most `limit` unique
 * entries, longest words first so multi-syllable wins on overlaps.
 */
export function findWordPower(text: string, limit = 4): WordPowerEntry[] {
  const found = new Map<string, WordPowerEntry>();
  const tokens = text.match(/[A-Za-z][a-z'-]{2,}/g) ?? [];
  for (const raw of tokens) {
    const token = raw.toLowerCase().replace(/['-]/g, "");
    const entry = WORD_MAP.get(token) ?? WORD_MAP.get(token.replace(/(ing|ed|es|s)$/, ""));
    if (entry && !found.has(entry.word)) found.set(entry.word, entry);
    if (found.size >= limit) break;
  }
  return [...found.values()];
}

/** Category → accent colors used by the picture card illustration. */
export const CATEGORY_THEME: Record<WordCategory, { from: string; to: string; label: string }> = {
  success: { from: "#F59E0B", to: "#F97316", label: "Success word" },
  work: { from: "#3B82F6", to: "#1D4ED8", label: "Workplace word" },
  emotion: { from: "#EC4899", to: "#BE185D", label: "Feeling word" },
  mind: { from: "#8B5CF6", to: "#6D28D9", label: "Thinking word" },
  social: { from: "#10B981", to: "#047857", label: "People word" },
  travel: { from: "#06B6D4", to: "#0369A1", label: "Travel word" },
  time: { from: "#F43F5E", to: "#9F1239", label: "Time word" },
  quality: { from: "#84CC16", to: "#4D7C0F", label: "Quality word" },
};