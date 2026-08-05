import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, analyticsEventsTable, webVitalsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/guards.js";
import { logger } from "../lib/logger.js";

const eventSchema = z.object({
  anonymousId: z.string().max(64),
  event: z.string().max(64),
  path: z.string().max(512),
  properties: z.record(z.string(), z.unknown()).optional(),
});

const webVitalSchema = z.object({
  anonymousId: z.string().max(64),
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
  path: z.string().max(512),
});

const router: IRouter = Router();

router.post("/analytics/events", async (req, res) => {
  const parse = eventSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }
  const userId = req.user ? (req.user as { id: number }).id : null;
  const { anonymousId, event, path, properties } = parse.data;
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  const ipAddress =
    (req.headers["cf-connecting-ip"] as string | undefined)?.trim() ||
    (req.headers["x-real-ip"] as string | undefined)?.trim() ||
    forwardedIp?.trim() ||
    req.ip ||
    null;
  const userAgent = req.get("user-agent") || null;
  try {
    await db.insert(analyticsEventsTable).values({
      userId,
      anonymousId,
      event,
      path,
      properties: properties ? JSON.stringify(properties) : null,
      ipAddress,
      userAgent,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to insert analytics event");
    res.status(500).json({ error: "Failed to store event" });
  }
});

// Admin activity view — includes anonymous visitors as well as signed-in users.
router.get("/admin/visitor-activity", requireAdmin, async (_req, res) => {
  try {
    const activities = await db
      .select({
        id: analyticsEventsTable.id,
        event: analyticsEventsTable.event,
        path: analyticsEventsTable.path,
        properties: analyticsEventsTable.properties,
        anonymousId: analyticsEventsTable.anonymousId,
        ipAddress: analyticsEventsTable.ipAddress,
        userAgent: analyticsEventsTable.userAgent,
        createdAt: analyticsEventsTable.createdAt,
        userId: analyticsEventsTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(analyticsEventsTable)
      .leftJoin(usersTable, eq(analyticsEventsTable.userId, usersTable.id))
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(2000);
    res.setHeader("Cache-Control", "no-store");
    res.json({ activities });
  } catch (err) {
    logger.error({ err }, "Failed to load visitor activity");
    res.status(500).json({ error: "Failed to load visitor activity" });
  }
});

router.post("/analytics/web-vitals", async (req, res) => {
  const parse = webVitalSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid web vital payload" });
    return;
  }
  const userId = req.user ? (req.user as { id: number }).id : null;
  const { anonymousId, name, value, rating, delta, navigationType, path } = parse.data;
  try {
    await db.insert(webVitalsTable).values({
      userId,
      anonymousId,
      name,
      value: String(value),
      rating,
      delta: delta !== undefined ? String(delta) : null,
      navigationType,
      path,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to insert web vital");
    res.status(500).json({ error: "Failed to store web vital" });
  }
});

export default router;
