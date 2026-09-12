import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const communicationChecksTable = pgTable("communication_checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  location: text("location"),
  targetRole: text("target_role"),
  experienceLevel: text("experience_level"),
  anonymousId: text("anonymous_id"),
  answersJson: text("answers_json").notNull(),
  feedbackJson: text("feedback_json").notNull(),
  overallScore: integer("overall_score"),
  communicationScore: integer("communication_score"),
  confidenceScore: integer("confidence_score"),
  clarityScore: integer("clarity_score"),
  durationSeconds: integer("duration_seconds"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunicationCheckSchema = createInsertSchema(communicationChecksTable).omit({
  id: true,
  completedAt: true,
  createdAt: true,
});
export type InsertCommunicationCheck = z.infer<typeof insertCommunicationCheckSchema>;
export type CommunicationCheck = typeof communicationChecksTable.$inferSelect;