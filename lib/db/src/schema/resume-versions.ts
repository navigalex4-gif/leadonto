import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const resumeVersionsTable = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  versionType: text("version_type").notNull(), // original | previous | improved
  fileName: text("file_name"),
  resumeText: text("resume_text").notNull(),
  resumeAnalysis: text("resume_analysis"),
  targetRole: text("target_role"),
  experienceLevel: text("experience_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResumeVersionSchema = createInsertSchema(resumeVersionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertResumeVersion = z.infer<typeof insertResumeVersionSchema>;
export type ResumeVersion = typeof resumeVersionsTable.$inferSelect;