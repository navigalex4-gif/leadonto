import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, analyticsEventsTable, webVitalsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/guards.js";
import { logger } from "../lib/logger.js";
import { geolocateIp } from "../lib/geo.js";

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
const activityLocationCache = new Map<string, { location: string | null; expiresAt: number }>();
const ACTIVITY_LOCATION_TTL_MS = 30 * 60 * 1000;
const MAX_ACTIVITY_LOCATION_LOOKUPS = 100;

async function resolveActivityLocations(ips: string[]): Promise<Map<string, string | null>> {
  const resolved = new Map<string, string | null>();
  const pending = ips.filter((ip) => {
    const cached = activityLocationCache.get(ip);
    if (cached && cached.expiresAt > Date.now()) {
      resolved.set(ip, cached.location);
      return false;
    }
    return true;
  });
  const lookupIps = pending.slice(0, MAX_ACTIVITY_LOCATION_LOOKUPS);

  let cursor = 0;
  const workerCount = Math.min(8, lookupIps.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < lookupIps.length) {
      const ip = lookupIps[cursor++];
      const location = await geolocateIp(ip);
      activityLocationCache.set(ip, { location, expiresAt: Date.now() + ACTIVITY_LOCATION_TTL_MS });
      resolved.set(ip, location);
    }
  }));
  return resolved;
}

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
        signupLocation: usersTable.signupLocation,
        lastLoginLocation: usersTable.lastLoginLocation,
      })
      .from(analyticsEventsTable)
      .leftJoin(usersTable, eq(analyticsEventsTable.userId, usersTable.id))
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(2000);
    const activityIps = Array.from(new Set(
      activities
        .filter((activity) => !activity.lastLoginLocation && !activity.signupLocation && activity.ipAddress)
        .map((activity) => activity.ipAddress as string),
    ));
    const ipLocations = await resolveActivityLocations(activityIps);
    const enrichedActivities = activities.map(({ signupLocation, lastLoginLocation, ...activity }) => ({
      ...activity,
      location: lastLoginLocation || signupLocation || (activity.ipAddress ? ipLocations.get(activity.ipAddress) ?? null : null),
    }));
    res.setHeader("Cache-Control", "no-store");
    res.json({ activities: enrichedActivities });
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
