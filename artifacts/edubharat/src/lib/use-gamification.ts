import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Gamification engine for English Guru — XP, levels, badges, celebrations.
 *
 * Design goals:
 *  - every learner action pays out XP immediately (visible progress loop),
 *  - levels get further apart so the bar always moves but never feels fake,
 *  - badges reward the behaviours we want repeated (daily streaks, speaking
 *    minutes, vocabulary collection),
 *  - everything persists locally and works for guests; logged-in progress is
 *    already mirrored server-side through useProgress.track().
 */

export type XpEvent =
  | "message"        // learner sent a message / spoke a phrase      (+10)
  | "live_start"     // started a live voice session                (+15)
  | "live_minute"    // each full minute in live conversation       (+5)
  | "word_learned"   // opened a Word Power card and marked learned (+8)
  | "word_of_day"    // opened the word-of-the-day card             (+5)
  | "comm_check"     // completed the 90-second Communication Check (+30)
  | "interview_complete" // finished a mock interview, got a report (+50)
  | "interview_star" // scored 80+ in a mock interview              (+40)
  | "tool_use"       // generated with a Tools Pro tool             (+10)
  | "resume_analysis"// completed an AI resume analysis             (+25)
  | "job_saved"      // saved a job from Rozgar Samachar            (+5)
  | "daily_goal";    // hit the daily XP goal                       (+40 bonus)

export const XP_VALUES: Record<XpEvent, number> = {
  message: 10,
  live_start: 15,
  live_minute: 5,
  word_learned: 8,
  word_of_day: 5,
  comm_check: 30,
  interview_complete: 50,
  interview_star: 40,
  tool_use: 10,
  resume_analysis: 25,
  job_saved: 5,
  daily_goal: 40,
};

export const DAILY_GOAL_XP = 60;

const KEY = "edubharat_gamification_v1";

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: "mic" | "chat" | "flame" | "book" | "star" | "trophy";
}

export const BADGES: Badge[] = [
  { id: "first-words", title: "First Words", description: "Sent your first message to your AI teacher", icon: "chat" },
  { id: "chatter-10", title: "Getting Talkative", description: "10 messages exchanged", icon: "chat" },
  { id: "chatter-50", title: "Chatterbox", description: "50 messages exchanged", icon: "chat" },
  { id: "voice-5", title: "Finding Your Voice", description: "5 minutes of live speaking", icon: "mic" },
  { id: "voice-30", title: "Confident Speaker", description: "30 minutes of live speaking", icon: "mic" },
  { id: "word-10", title: "Word Collector", description: "Learned 10 Word Power words", icon: "book" },
  { id: "word-25", title: "Vocabulary Builder", description: "Learned 25 Word Power words", icon: "book" },
  { id: "comm-check", title: "Know Thyself", description: "Completed the 90-second Communication Check", icon: "star" },
  { id: "interview-1", title: "First Interview", description: "Completed a full mock interview", icon: "trophy" },
  { id: "interview-80", title: "Interview Star", description: "Scored 80+ in a mock interview", icon: "trophy" },
  { id: "tool-explorer", title: "Tool Explorer", description: "Used 4 different Tools Pro tools", icon: "star" },
  { id: "resume-ready", title: "Resume Ready", description: "Got your AI resume analysis", icon: "star" },
  { id: "job-hunter", title: "Job Hunter", description: "Saved 5 jobs from Rozgar Samachar", icon: "flame" },
  { id: "all-rounder", title: "All-Rounder", description: "Used all 6 LeadOnto products", icon: "trophy" },
  { id: "streak-3", title: "3-Day Streak", description: "Practised 3 days in a row", icon: "flame" },
  { id: "streak-7", title: "Week Warrior", description: "Practised 7 days in a row", icon: "flame" },
  { id: "level-5", title: "Rising Star", description: "Reached Level 5", icon: "star" },
  { id: "level-10", title: "English Achiever", description: "Reached Level 10", icon: "trophy" },
];

interface GamificationState {
  xp: number;
  messages: number;
  liveSeconds: number;
  wordsLearned: string[];   // word bank keys already collected
  badges: string[];         // unlocked badge ids
  lastActiveDate: string;   // YYYY-MM-DD
  dailyXp: number;          // XP earned today
  dailyGoalDate: string;    // date daily bonus was last paid
  toolsUsed: string[];      // distinct Tools Pro modes used
  productsUsed: string[];   // distinct products engaged
  jobsSaved: number;        // lifetime saved jobs
  interviewsCompleted: number;
  bestInterviewScore: number;
  commChecksDone: number;
  resumesAnalysed: number;
}

const DEFAULT_STATE: GamificationState = {
  xp: 0,
  messages: 0,
  liveSeconds: 0,
  wordsLearned: [],
  badges: [],
  lastActiveDate: "",
  dailyXp: 0,
  dailyGoalDate: "",
  toolsUsed: [],
  productsUsed: [],
  jobsSaved: 0,
  interviewsCompleted: 0,
  bestInterviewScore: 0,
  commChecksDone: 0,
  resumesAnalysed: 0,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): GamificationState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<GamificationState>;
    const state = { ...DEFAULT_STATE, ...parsed };
    if (state.lastActiveDate !== today()) state.dailyXp = 0;
    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function persist(state: GamificationState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

/** XP needed to go from level L to L+1 — gentle quadratic growth. */
export function xpForLevel(level: number): number {
  return 80 + (level - 1) * 60;
}

export function levelFromXp(xp: number): { level: number; intoLevel: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, intoLevel: remaining, needed: xpForLevel(level) };
}

export interface Celebration {
  kind: "level_up" | "badge" | "daily_goal";
  title: string;
  subtitle: string;
}

export function useGamification(streakDays: number) {
  const [state, setState] = useState<GamificationState>(loadState);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streakRef = useRef(streakDays);
  useEffect(() => { streakRef.current = streakDays; }, [streakDays]);

  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, []);

  const showCelebration = useCallback((c: Celebration) => {
    setCelebration(c);
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    celebrationTimer.current = setTimeout(() => setCelebration(null), 3600);
  }, []);

  const dismissCelebration = useCallback(() => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration(null);
  }, []);

  const evaluateBadges = useCallback((s: GamificationState, level: number): Badge[] => {
    const earned = new Set(s.badges);
    const fresh: Badge[] = [];
    const unlock = (id: string) => {
      if (earned.has(id)) return;
      const badge = BADGES.find(b => b.id === id);
      if (badge) { earned.add(id); fresh.push(badge); }
    };
    if (s.messages >= 1) unlock("first-words");
    if (s.messages >= 10) unlock("chatter-10");
    if (s.messages >= 50) unlock("chatter-50");
    if (s.liveSeconds >= 300) unlock("voice-5");
    if (s.liveSeconds >= 1800) unlock("voice-30");
    if (s.wordsLearned.length >= 10) unlock("word-10");
    if (s.wordsLearned.length >= 25) unlock("word-25");
    if (s.commChecksDone >= 1) unlock("comm-check");
    if (s.interviewsCompleted >= 1) unlock("interview-1");
    if (s.bestInterviewScore >= 80) unlock("interview-80");
    if (s.toolsUsed.length >= 4) unlock("tool-explorer");
    if (s.resumesAnalysed >= 1) unlock("resume-ready");
    if (s.jobsSaved >= 5) unlock("job-hunter");
    if (s.productsUsed.length >= 6) unlock("all-rounder");
    if (streakRef.current >= 3) unlock("streak-3");
    if (streakRef.current >= 7) unlock("streak-7");
    if (level >= 5) unlock("level-5");
    if (level >= 10) unlock("level-10");
    return fresh;
  }, []);

  const award = useCallback((event: XpEvent, meta?: { word?: string; tool?: string; product?: string; score?: number }) => {
    setState(prev => {
      if (event === "word_learned" && (!meta?.word || prev.wordsLearned.includes(meta.word))) {
        return prev;
      }
      const amount = XP_VALUES[event];
      const before = levelFromXp(prev.xp).level;
      const next: GamificationState = {
        ...prev,
        xp: prev.xp + amount,
        lastActiveDate: today(),
        dailyXp: (prev.lastActiveDate === today() ? prev.dailyXp : 0) + amount,
      };
      if (event === "message") next.messages = prev.messages + 1;
      if (event === "live_minute") next.liveSeconds = prev.liveSeconds + 60;
      if (event === "word_learned" && meta?.word && !prev.wordsLearned.includes(meta.word)) {
        next.wordsLearned = [...prev.wordsLearned, meta.word];
      }
      if (event === "comm_check") next.commChecksDone = prev.commChecksDone + 1;
      if (event === "interview_complete") {
        next.interviewsCompleted = prev.interviewsCompleted + 1;
        if (typeof meta?.score === "number") next.bestInterviewScore = Math.max(prev.bestInterviewScore, meta.score);
      }
      if (event === "interview_star" && typeof meta?.score === "number") {
        next.bestInterviewScore = Math.max(prev.bestInterviewScore, meta.score);
      }
      if (event === "tool_use" && meta?.tool && !prev.toolsUsed.includes(meta.tool)) {
        next.toolsUsed = [...prev.toolsUsed, meta.tool];
      }
      if (event === "resume_analysis") next.resumesAnalysed = prev.resumesAnalysed + 1;
      if (event === "job_saved") next.jobsSaved = prev.jobsSaved + 1;
      if (meta?.product && !prev.productsUsed.includes(meta.product)) {
        next.productsUsed = [...prev.productsUsed, meta.product];
      }
      if (next.dailyXp >= DAILY_GOAL_XP && next.dailyGoalDate !== today()) {
        next.xp += XP_VALUES.daily_goal;
        next.dailyGoalDate = today();
        queueMicrotask(() => showCelebration({
          kind: "daily_goal",
          title: "Daily Goal Complete!",
          subtitle: `+${XP_VALUES.daily_goal} bonus XP — come back tomorrow to grow your streak`,
        }));
      }
      const after = levelFromXp(next.xp).level;
      const freshBadges = evaluateBadges(next, after);
      next.badges = [...new Set([...next.badges, ...freshBadges.map(b => b.id)])];
      persist(next);
      if (after > before) {
        queueMicrotask(() => showCelebration({
          kind: "level_up",
          title: `Level ${after} Reached!`,
          subtitle: "Your English is levelling up — keep the momentum going",
        }));
      } else if (freshBadges.length > 0) {
        const badge = freshBadges[0]!;
        queueMicrotask(() => showCelebration({
          kind: "badge",
          title: `Badge Unlocked: ${badge.title}`,
          subtitle: badge.description,
        }));
      }
      return next;
    });
  }, [evaluateBadges, showCelebration]);

  const { level, intoLevel, needed } = levelFromXp(state.xp);

  return {
    xp: state.xp,
    level,
    levelProgress: needed > 0 ? intoLevel / needed : 0,
    xpIntoLevel: intoLevel,
    xpForNextLevel: needed,
    dailyXp: state.dailyXp,
    dailyGoal: DAILY_GOAL_XP,
    wordsLearned: state.wordsLearned,
    unlockedBadges: BADGES.filter(b => state.badges.includes(b.id)),
    nextBadges: BADGES.filter(b => !state.badges.includes(b.id)),
    celebration,
    dismissCelebration,
    award,
  };
}