import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { db, analyticsEventsTable, webVitalsTable, usersTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, like, not, or } from "drizzle-orm";
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
// This is the PC identified in the supplied activity export. Mobile activity
// from the same network remains part of Unique Visitors.
const TARGET_PC_IP = "117.97.191.137";

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

const FUNNEL_STAGES = [
  "landing_viewed",
  "cta_clicked",
  "communication_check_opened",
  "communication_check_started",
  "communication_check_completed",
  "signup_opened",
  "signup_started",
  "otp_requested",
  "otp_verified",
  "account_created",
  "first_session_started",
] as const;

function parseProperties(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function browserFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/Instagram/i.test(userAgent)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "Facebook";
  if (/CriOS/i.test(userAgent)) return "Chrome iOS";
  if (/FxiOS/i.test(userAgent)) return "Firefox iOS";
  if (/Edg/i.test(userAgent)) return "Edge";
  if (/Chrome/i.test(userAgent)) return "Chrome";
  if (/Safari/i.test(userAgent)) return "Safari";
  if (/Firefox/i.test(userAgent)) return "Firefox";
  return "Other";
}

function deviceFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/iPad|Tablet/i.test(userAgent)) return "Tablet";
  if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function isTargetPcActivity(userAgent: string | null, ipAddress: string | null): boolean {
  return ipAddress === TARGET_PC_IP && deviceFromUserAgent(userAgent) === "Desktop";
}

function sourceFrom(properties: Record<string, unknown>, path: string): string {
  const value = properties.utm_source ?? properties.source ?? properties.trafficSource;
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80);
  const match = path.match(/[?&](?:utm_source|source)=([^&]+)/i);
  if (!match) return "Direct / unknown";
  try {
    return decodeURIComponent(match[1]!).slice(0, 80);
  } catch {
    return match[1]!.slice(0, 80);
  }
}

// Funnel summary deliberately uses anonymous IDs rather than user IDs so a
// visitor remains one person across the anonymous → OTP/OAuth transition.
router.get("/admin/funnel", requireAdmin, async (req, res) => {
  try {
    const daysRaw = Number(req.query.days ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(180, Math.round(daysRaw))) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        event: analyticsEventsTable.event,
        path: analyticsEventsTable.path,
        properties: analyticsEventsTable.properties,
        anonymousId: analyticsEventsTable.anonymousId,
        userId: analyticsEventsTable.userId,
        userEmail: usersTable.email,
        userAgent: analyticsEventsTable.userAgent,
        ipAddress: analyticsEventsTable.ipAddress,
        createdAt: analyticsEventsTable.createdAt,
      })
      .from(analyticsEventsTable)
      .leftJoin(usersTable, eq(analyticsEventsTable.userId, usersTable.id))
      .where(gte(analyticsEventsTable.createdAt, since))
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(20000);

    const usable = rows.filter((row) => {
      if (row.path.startsWith("/admin")) return false;
      if (isTargetPcActivity(row.userAgent, row.ipAddress)) return false;
      if (row.userEmail?.toLowerCase() === "admin@edubharat.in") return false;
      const props = parseProperties(row.properties);
      return props.test !== true && props.isTest !== true && props.environment !== "test";
    });
    const unique = (items: typeof usable) => new Set(items.map((row) => row.anonymousId)).size;
    const stageRows = FUNNEL_STAGES.map((stage) => {
      const matching = usable.filter((row) => row.event === `funnel_${stage}`);
      return { stage, events: matching.length, uniqueVisitors: unique(matching) };
    });
    const errors = usable
      .filter((row) => row.event.startsWith("funnel_") && /failed|expired|blocked/.test(row.event.replace("funnel_", "")))
      .reduce<Record<string, number>>((counts, row) => {
        counts[row.event] = (counts[row.event] ?? 0) + 1;
        return counts;
      }, {});
    const breakdown = (key: "browser" | "device" | "source") => {
      const map = new Map<string, Set<string>>();
      for (const row of usable) {
        const props = parseProperties(row.properties);
        const value = key === "browser"
          ? browserFromUserAgent(row.userAgent)
          : key === "device"
            ? deviceFromUserAgent(row.userAgent)
            : sourceFrom(props, row.path);
        if (!map.has(value)) map.set(value, new Set());
        map.get(value)!.add(row.anonymousId);
      }
      return [...map.entries()]
        .map(([label, ids]) => ({ label, uniqueVisitors: ids.size }))
        .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);
    };
    const landing = stageRows[0]?.uniqueVisitors ?? 0;
    res.setHeader("Cache-Control", "no-store");
    res.json({
      days,
      generatedAt: new Date().toISOString(),
      uniqueVisitors: unique(usable),
      stages: stageRows.map((stage) => ({
        ...stage,
        conversionFromLanding: landing ? Math.round((stage.uniqueVisitors / landing) * 1000) / 10 : 0,
      })),
      errors,
      breakdowns: { browser: breakdown("browser"), device: breakdown("device"), source: breakdown("source") },
    });
  } catch (err) {
    logger.error({ err }, "Failed to load funnel summary");
    res.status(500).json({ error: "Could not load funnel summary" });
  }
});

// Admin activity view — includes anonymous visitors as well as signed-in users.
router.get("/admin/visitor-activity", requireAdmin, async (req, res) => {
  try {
    const scope = req.query.scope === "admin" || req.query.scope === "mobile" || req.query.scope === "pc"
      ? req.query.scope
      : "visitor";
    const targetPcFilter = and(
      eq(analyticsEventsTable.ipAddress, TARGET_PC_IP),
      not(like(analyticsEventsTable.userAgent, "%Mobile%")),
      not(like(analyticsEventsTable.userAgent, "%Android%")),
      not(like(analyticsEventsTable.userAgent, "%iPhone%")),
      not(like(analyticsEventsTable.userAgent, "%iPod%")),
      not(like(analyticsEventsTable.userAgent, "%iPad%")),
      not(like(analyticsEventsTable.userAgent, "%Tablet%")),
    )!;
    const scopeFilter = scope === "admin"
      ? or(like(analyticsEventsTable.path, "/admin%"), targetPcFilter)
      : and(not(like(analyticsEventsTable.path, "/admin%")), not(targetPcFilter));
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
      .where(scopeFilter)
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(2000);
    const scopedActivities = scope === "mobile"
      ? activities.filter((activity) => deviceFromUserAgent(activity.userAgent) === "Mobile" || deviceFromUserAgent(activity.userAgent) === "Tablet")
      : scope === "pc"
        ? activities.filter((activity) => isTargetPcActivity(activity.userAgent, activity.ipAddress))
        : activities;
    const activityIps = Array.from(new Set(
      scopedActivities
        .filter((activity) => !activity.lastLoginLocation && !activity.signupLocation && activity.ipAddress)
        .map((activity) => activity.ipAddress as string),
    ));
    const ipLocations = await resolveActivityLocations(activityIps);
    const enrichedActivities = scopedActivities.map(({ signupLocation, lastLoginLocation, ...activity }) => ({
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

router.delete("/admin/visitor-activity", requireAdmin, async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.filter((id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0).slice(0, 500)
    : [];
  if (!ids.length) {
    res.status(400).json({ error: "Choose at least one activity row to delete." });
    return;
  }
  try {
    const deleted = await db
      .delete(analyticsEventsTable)
      .where(and(inArray(analyticsEventsTable.id, ids)));
    res.json({ ok: true, deleted: ids.length });
  } catch (err) {
    logger.error({ err }, "Failed to delete activity events");
    res.status(500).json({ error: "Failed to delete activity rows" });
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
