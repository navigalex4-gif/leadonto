import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

/** One normalized evidence record per completed speaking assessment/session. */
export const speakingAssessmentsTable = pgTable("speaking_assessments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  source: text("source").notNull(), // english_guru | interview_ace | communication_check | daily_challenge
  score: integer("score").notNull(),
  dimensions: text("dimensions").notNull(), // JSON: pronunciation, grammar, vocabulary, fluency, sentenceFormation
  transcript: text("transcript"),
  challengeId: text("challenge_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("speaking_assessments_user_created_idx").on(table.userId, table.createdAt),
]);

/** Latest evidence-backed state for each recurring speaking weakness. */
export const speakingWeaknessesTable = pgTable("speaking_weaknesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  skill: text("skill").notNull(),
  latestScore: integer("latest_score").notNull(),
  occurrenceCount: integer("occurrence_count").notNull().default(1),
  confidence: integer("confidence").notNull().default(50),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  nextRetestAt: timestamp("next_retest_at").defaultNow().notNull(),
  improvedAt: timestamp("improved_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("speaking_weaknesses_user_skill_idx").on(table.userId, table.skill),
  index("speaking_weaknesses_retest_idx").on(table.userId, table.nextRetestAt),
]);

/** Idempotent daily challenge state; one challenge per user/date. */
export const dailySpeakingChallengesTable = pgTable("daily_speaking_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  challengeDate: text("challenge_date").notNull(),
  title: text("title").notNull(),
  missionType: text("mission_type").notNull(),
  focusSkill: text("focus_skill").notNull(),
  prompt: text("prompt").notNull(),
  retest: integer("retest").notNull().default(0),
  status: text("status").notNull().default("available"), // available | started | completed
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("daily_speaking_challenges_user_date_idx").on(table.userId, table.challengeDate),
]);

export type SpeakingAssessment = typeof speakingAssessmentsTable.$inferSelect;
export type SpeakingWeakness = typeof speakingWeaknessesTable.$inferSelect;
export type DailySpeakingChallenge = typeof dailySpeakingChallengesTable.$inferSelect;