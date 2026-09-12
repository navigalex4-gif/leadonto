import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  dailySpeakingChallengesTable,
  speakingAssessmentsTable,
  speakingWeaknessesTable,
} from "@workspace/db";
import { and, desc, eq, gte } from "drizzle-orm";
import { requireAuth } from "./profile.js";

const router: IRouter = Router();
const SKILLS = ["pronunciation", "grammar", "vocabulary", "fluency", "sentenceFormation"] as const;
type Skill = typeof SKILLS[number];
const MISSIONS = [
  ["Workplace meeting", "Explain a project update and ask for one decision."],
  ["Interview", "Answer: Tell me about a time you solved a difficult problem."],
  ["Presentation", "Give a 60-second introduction to a topic you know well."],
  ["Negotiation", "Politely negotiate a deadline while offering an alternative."],
  ["Customer conversation", "Handle a customer concern and close with a helpful next step."],
] as const;

function dateKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function parseJson(value: string | null | undefined): Record<string, number> {
  try { return JSON.parse(value ?? "{}") as Record<string, number>; } catch { return {}; }
}
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

async function getOrCreateChallenge(userId: number, weaknesses: Array<typeof speakingWeaknessesTable.$inferSelect>) {
  const today = dateKey();
  const existing = await db.select().from(dailySpeakingChallengesTable)
    .where(and(eq(dailySpeakingChallengesTable.userId, userId), eq(dailySpeakingChallengesTable.challengeDate, today)))
    .limit(1);
  if (existing[0]) return existing[0];

  const due = weaknesses.filter(w => new Date(w.nextRetestAt) <= new Date())
    .sort((a, b) => a.latestScore - b.latestScore)[0];
  const focusSkill = due?.skill ?? weaknesses.sort((a, b) => a.latestScore - b.latestScore)[0]?.skill ?? "fluency";
  const index = (userId + new Date().getUTCDate()) % MISSIONS.length;
  const [missionType, basePrompt] = MISSIONS[index];
  const title = due ? `Retest your ${focusSkill.replace(/([A-Z])/g, " $1").toLowerCase()}` : "Your five-minute speaking practice";
  const prompt = due
    ? `${basePrompt} Focus especially on ${focusSkill.replace(/([A-Z])/g, " $1").toLowerCase()}. Speak for 60–90 seconds.`
    : `${basePrompt} Speak for 60–90 seconds, then listen back and repeat one sentence more clearly.`;
  const inserted = await db.insert(dailySpeakingChallengesTable).values({
    userId, challengeDate: today, title, missionType, focusSkill, prompt, retest: due ? 1 : 0,
  }).returning();
  return inserted[0];
}

router.get("/retention/dashboard", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  try {
    const assessments = await db.select().from(speakingAssessmentsTable)
      .where(eq(speakingAssessmentsTable.userId, userId))
      .orderBy(desc(speakingAssessmentsTable.createdAt)).limit(100);
    const weaknesses = await db.select().from(speakingWeaknessesTable)
      .where(eq(speakingWeaknessesTable.userId, userId));
    const challenge = await getOrCreateChallenge(userId, weaknesses);
    const scores = assessments.map(a => a.score);
    const recent = assessments.filter(a => new Date(a.createdAt).getTime() >= Date.now() - 7 * 86400000);
    const prior = assessments.filter(a => {
      const age = Date.now() - new Date(a.createdAt).getTime();
      return age >= 7 * 86400000 && age < 14 * 86400000;
    });
    const average = (items: typeof assessments) => items.length ? Math.round(items.reduce((s, a) => s + a.score, 0) / items.length) : 0;
    const recentAvg = average(recent);
    const priorAvg = average(prior);
    const improvement = priorAvg ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0;
    const skillAverages = Object.fromEntries(SKILLS.map(skill => {
      const values = assessments.flatMap(a => {
        const value = parseJson(a.dimensions)[skill];
        return typeof value === "number" ? [value] : [];
      });
      return [skill, values.length ? Math.round(values.reduce((x, y) => x + y, 0) / values.length) : 0];
    }));
    const withScores = Object.entries(skillAverages).filter(([, value]) => value > 0).sort((a, b) => a[1] - b[1]);
    const demonstrated = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;
    const level = demonstrated >= 88 ? "Confident" : demonstrated >= 75 ? "Independent" : demonstrated >= 60 ? "Developing" : demonstrated >= 45 ? "Foundation" : "Starter";

    const activeDates = new Set(assessments.map(a => dateKey(new Date(a.createdAt))));
    let streak = 0; let recoveryUsed = false;
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - offset);
      if (activeDates.has(dateKey(d))) { streak++; continue; }
      if (!recoveryUsed && offset > 0) { recoveryUsed = true; continue; }
      break;
    }
    res.json({
      challenge, streak, recoveryUsed, recoveryAvailable: !recoveryUsed,
      level, demonstratedScore: demonstrated, assessmentCount: assessments.length,
      strongestSkill: withScores.at(-1)?.[0] ?? null, weakestSkill: withScores[0]?.[0] ?? null,
      skillAverages, weeklyAverage: recentAvg, weeklyImprovement: improvement,
      retestPriority: weaknesses.filter(w => new Date(w.nextRetestAt) <= new Date()).sort((a, b) => a.latestScore - b.latestScore).slice(0, 3),
      recentAssessments: assessments.slice(0, 8),
    });
  } catch (err) {
    req.log.error({ err }, "Retention dashboard error");
    res.status(500).json({ error: "Failed to load speaking progress" });
  }
});

router.get("/retention/weaknesses", requireAuth, async (req: Request, res: Response) => {
  const weaknesses = await db.select().from(speakingWeaknessesTable)
    .where(eq(speakingWeaknessesTable.userId, req.session.userId!));
  res.json({ weaknesses: weaknesses.sort((a, b) => a.latestScore - b.latestScore) });
});

router.get("/retention/report", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const since = new Date(Date.now() - 7 * 86400000);
  const assessments = await db.select().from(speakingAssessmentsTable)
    .where(and(eq(speakingAssessmentsTable.userId, userId), gte(speakingAssessmentsTable.createdAt, since)))
    .orderBy(desc(speakingAssessmentsTable.createdAt));
  const average = assessments.length ? Math.round(assessments.reduce((sum, item) => sum + item.score, 0) / assessments.length) : 0;
  res.json({
    period: { start: since.toISOString(), end: new Date().toISOString() },
    sessions: assessments.length,
    averageScore: average,
    bestScore: assessments.length ? Math.max(...assessments.map(a => a.score)) : 0,
    focus: "Speak for five minutes on your daily mission, then repeat one answer with clearer sentences.",
    assessments,
  });
});

router.post("/retention/assessments", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const { source, score, dimensions, transcript, challengeId } = req.body as {
    source?: string; score?: number; dimensions?: Partial<Record<Skill, number>>; transcript?: string; challengeId?: string;
  };
  if (!source || typeof score !== "number" || !dimensions) { res.status(400).json({ error: "source, score, and dimensions are required" }); return; }
  const safeDimensions = Object.fromEntries(SKILLS.map(skill => [skill, clamp(Number(dimensions[skill] ?? score))]));
  try {
    const assessment = (await db.insert(speakingAssessmentsTable).values({
      userId, source, score: clamp(score), dimensions: JSON.stringify(safeDimensions), transcript: transcript?.slice(0, 5000), challengeId,
    }).returning())[0];
    for (const skill of SKILLS) {
      const skillScore = safeDimensions[skill];
      const current = (await db.select().from(speakingWeaknessesTable)
        .where(and(eq(speakingWeaknessesTable.userId, userId), eq(speakingWeaknessesTable.skill, skill))).limit(1))[0];
      if (skillScore < 70) {
        const nextRetestAt = new Date(Date.now() + (skillScore < 50 ? 86400000 : 3 * 86400000));
        if (current) await db.update(speakingWeaknessesTable).set({
          latestScore: skillScore, occurrenceCount: current.occurrenceCount + 1,
          confidence: Math.min(100, current.confidence + 10), lastSeenAt: new Date(), nextRetestAt, updatedAt: new Date(),
        }).where(eq(speakingWeaknessesTable.id, current.id));
        else await db.insert(speakingWeaknessesTable).values({ userId, skill, latestScore: skillScore, nextRetestAt });
      } else if (current) {
        await db.update(speakingWeaknessesTable).set({ latestScore: skillScore, improvedAt: new Date(), updatedAt: new Date() }).where(eq(speakingWeaknessesTable.id, current.id));
      }
    }
    if (challengeId) await db.update(dailySpeakingChallengesTable).set({ status: "completed", score: clamp(score), completedAt: new Date() })
      .where(and(eq(dailySpeakingChallengesTable.id, Number(challengeId)), eq(dailySpeakingChallengesTable.userId, userId)));
    res.json({ assessment });
  } catch (err) {
    req.log.error({ err }, "Retention assessment error");
    res.status(500).json({ error: "Failed to save speaking assessment" });
  }
});

router.post("/retention/challenges/:id/start", requireAuth, async (req: Request, res: Response) => {
  try {
    const updated = await db.update(dailySpeakingChallengesTable).set({ status: "started" })
      .where(and(eq(dailySpeakingChallengesTable.id, Number(req.params.id)), eq(dailySpeakingChallengesTable.userId, req.session.userId!))).returning();
    res.json({ challenge: updated[0] });
  } catch { res.status(500).json({ error: "Failed to start challenge" }); }
});

export default router;