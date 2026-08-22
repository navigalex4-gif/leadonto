import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { db, usersTable, upiPaymentsTable, creditTransactionsTable, interviewSessionsTable, otpsTable, resumeVersionsTable, communicationChecksTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/guards.js";
import { logger } from "../lib/logger.js";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { sendEmail, isEmailConfigured } from "../lib/mailer.js";

const router: IRouter = Router();

/** Parse the numeric :id route param (normalises the string | string[] param type). */
function idParam(req: Request): number {
  const raw = req.params.id;
  return parseInt(Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? ""), 10);
}

// Directory projection — registration details + IP/location + balance, but not
// the heavy resume blobs (those load in the per-user detail view on demand).
const userDirectoryColumns = {
  id: usersTable.id,
  email: usersTable.email,
  name: usersTable.name,
  picture: usersTable.picture,
  authProvider: usersTable.authProvider,
  preferredLanguage: usersTable.preferredLanguage,
  age: usersTable.age,
  education: usersTable.education,
  careerGoal: usersTable.careerGoal,
  location: usersTable.location,
  industryPreference: usersTable.industryPreference,
  gender: usersTable.gender,
  degree: usersTable.degree,
  branch: usersTable.branch,
  graduationYear: usersTable.graduationYear,
  university: usersTable.university,
  preferredRole: usersTable.preferredRole,
  preferredCity: usersTable.preferredCity,
  expectedSalary: usersTable.expectedSalary,
  experienceLevel: usersTable.experienceLevel,
  englishLevel: usersTable.englishLevel,
  credits: usersTable.credits,
  signupIp: usersTable.signupIp,
  signupLocation: usersTable.signupLocation,
  lastLoginIp: usersTable.lastLoginIp,
  lastLoginLocation: usersTable.lastLoginLocation,
  lastLoginAt: usersTable.lastLoginAt,
  createdAt: usersTable.createdAt,
};

// GET /api/admin/users — full user directory (newest first).
router.get("/admin/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await db
      .select(userDirectoryColumns)
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(2000);
    res.setHeader("Cache-Control", "no-store");
    res.json({ users });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin users list failed");
    res.status(500).json({ error: "Could not load users" });
  }
});

// GET /api/admin/users/:id — one user + their purchases and credit ledger.
router.get("/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = idParam(req);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const purchases = await db
      .select()
      .from(upiPaymentsTable)
      .where(eq(upiPaymentsTable.userId, id))
      .orderBy(desc(upiPaymentsTable.createdAt));
    const transactions = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, id))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(200);

    // Parse skills JSON for display convenience.
    let skills: string[] = [];
    if (user.skills) {
      try { skills = JSON.parse(user.skills) as string[]; } catch { skills = []; }
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ user: { ...user, skills }, purchases, transactions });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin user detail failed");
    res.status(500).json({ error: "Could not load user" });
  }
});

// GET /api/admin/resumes — resume version history, newest first.
router.get("/admin/resumes", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const versions = await db
      .select({
        id: resumeVersionsTable.id,
        userId: resumeVersionsTable.userId,
        versionType: resumeVersionsTable.versionType,
        fileName: resumeVersionsTable.fileName,
        targetRole: resumeVersionsTable.targetRole,
        experienceLevel: resumeVersionsTable.experienceLevel,
        hasAnalysis: resumeVersionsTable.resumeAnalysis,
        createdAt: resumeVersionsTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(resumeVersionsTable)
      .leftJoin(usersTable, eq(resumeVersionsTable.userId, usersTable.id))
      .orderBy(desc(resumeVersionsTable.createdAt))
      .limit(2000);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      versions: versions.map((version) => ({
        ...version,
        hasAnalysis: Boolean(version.hasAnalysis),
      })),
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin resume versions list failed");
    res.status(500).json({ error: "Could not load resume versions" });
  }
});

// GET /api/admin/resumes/:id — full resume version content for an expanded admin row.
router.get("/admin/resumes/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = idParam(req);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid resume version id" });
    return;
  }
  try {
    const [version] = await db
      .select({
        id: resumeVersionsTable.id,
        userId: resumeVersionsTable.userId,
        versionType: resumeVersionsTable.versionType,
        fileName: resumeVersionsTable.fileName,
        resumeText: resumeVersionsTable.resumeText,
        resumeAnalysis: resumeVersionsTable.resumeAnalysis,
        targetRole: resumeVersionsTable.targetRole,
        experienceLevel: resumeVersionsTable.experienceLevel,
        createdAt: resumeVersionsTable.createdAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(resumeVersionsTable)
      .leftJoin(usersTable, eq(resumeVersionsTable.userId, usersTable.id))
      .where(eq(resumeVersionsTable.id, id))
      .limit(1);
    if (!version) {
      res.status(404).json({ error: "Resume version not found" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ version });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin resume version detail failed");
    res.status(500).json({ error: "Could not load resume version" });
  }
});

// GET /api/admin/interviews — all interview sessions joined with user data (newest first).
// verdict: overallScore >= 60 → "Selected", else "Not Selected", null score → "Pending"
router.get("/admin/interviews", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        // interview fields
        id: interviewSessionsTable.id,
        role: interviewSessionsTable.role,
        experienceLevel: interviewSessionsTable.experienceLevel,
        interviewType: interviewSessionsTable.interviewType,
        overallScore: interviewSessionsTable.overallScore,
        communicationScore: interviewSessionsTable.communicationScore,
        grammarScore: interviewSessionsTable.grammarScore,
        confidenceScore: interviewSessionsTable.confidenceScore,
        technicalScore: interviewSessionsTable.technicalScore,
        questionsData: interviewSessionsTable.questionsData,
        feedbackJson: interviewSessionsTable.feedbackJson,
        durationSeconds: interviewSessionsTable.durationSeconds,
        completedAt: interviewSessionsTable.completedAt,
        createdAt: interviewSessionsTable.createdAt,
        // user fields
        userId: usersTable.id,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userLocation: usersTable.location,
        signupLocation: usersTable.signupLocation,
        lastLoginLocation: usersTable.lastLoginLocation,
        signupIp: usersTable.signupIp,
        lastLoginIp: usersTable.lastLoginIp,
        preferredCity: usersTable.preferredCity,
        education: usersTable.education,
        degree: usersTable.degree,
        branch: usersTable.branch,
        university: usersTable.university,
      })
      .from(interviewSessionsTable)
      .leftJoin(usersTable, eq(interviewSessionsTable.userId, usersTable.id))
      .orderBy(desc(interviewSessionsTable.createdAt))
      .limit(2000);

    res.setHeader("Cache-Control", "no-store");
    res.json({ interviews: rows });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin interviews list failed");
    res.status(500).json({ error: "Could not load interviews" });
  }
});

// GET /api/admin/communication-checks — homepage CTA candidates and their short scorecards.
router.get("/admin/communication-checks", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const checks = await db
      .select({
        id: communicationChecksTable.id,
        userId: communicationChecksTable.userId,
        name: communicationChecksTable.name,
        email: communicationChecksTable.email,
        phone: communicationChecksTable.phone,
        location: communicationChecksTable.location,
        targetRole: communicationChecksTable.targetRole,
        experienceLevel: communicationChecksTable.experienceLevel,
        overallScore: communicationChecksTable.overallScore,
        communicationScore: communicationChecksTable.communicationScore,
        confidenceScore: communicationChecksTable.confidenceScore,
        clarityScore: communicationChecksTable.clarityScore,
        durationSeconds: communicationChecksTable.durationSeconds,
        feedbackJson: communicationChecksTable.feedbackJson,
        answersJson: communicationChecksTable.answersJson,
        completedAt: communicationChecksTable.completedAt,
        createdAt: communicationChecksTable.createdAt,
        userEmail: usersTable.email,
      })
      .from(communicationChecksTable)
      .leftJoin(usersTable, eq(communicationChecksTable.userId, usersTable.id))
      .orderBy(desc(communicationChecksTable.createdAt))
      .limit(2000);
    res.setHeader("Cache-Control", "no-store");
    res.json({ checks });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin communication checks list failed");
    res.status(500).json({ error: "Could not load communication checks" });
  }
});

// ---------------------------------------------------------------------------
// Resend domain management (email verification)
// ---------------------------------------------------------------------------

const RESEND_DOMAIN_ID = "0bb8c3cd-c2c7-4791-b2dd-5edf129d2d8b";

// GET /api/admin/resend/domain — fetch current domain + DNS record statuses.
router.get("/admin/resend/domain", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const c = new ReplitConnectors();
    const resp = await c.proxy("resend", `/domains/${RESEND_DOMAIN_ID}`, { method: "GET" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      logger.error({ status: resp.status, txt }, "resend domain fetch failed");
      res.status(502).json({ error: "Resend API error", detail: txt.slice(0, 200) });
      return;
    }
    const data = await resp.json();
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin resend domain error");
    res.status(500).json({ error: "Could not fetch domain status" });
  }
});

// POST /api/admin/resend/domain/verify — trigger Resend to re-check DNS records.
router.post("/admin/resend/domain/verify", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const c = new ReplitConnectors();
    const resp = await c.proxy("resend", `/domains/${RESEND_DOMAIN_ID}/verify`, { method: "POST" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      logger.error({ status: resp.status, txt }, "resend domain verify failed");
      res.status(502).json({ error: "Resend verify error", detail: txt.slice(0, 200) });
      return;
    }
    const data = await resp.json();
    res.setHeader("Cache-Control", "no-store");
    res.json(data);
  } catch (err) {
    logger.error({ err: (err as Error).message }, "admin resend verify error");
    res.status(500).json({ error: "Could not trigger verification" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/resend/test-email
// Send a real OTP email to the specified address so admins can confirm
// end-to-end delivery after DNS verification.  The OTP is written to the
// otps table so the full login flow can be tested too.
// ---------------------------------------------------------------------------
router.post("/admin/resend/test-email", requireAdmin, async (req: Request, res: Response) => {
  const { to } = req.body as { to?: string };
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: "Valid email address required" });
    return;
  }

  if (!isEmailConfigured()) {
    res.status(503).json({
      error: "Resend connector not attached — email cannot be sent in this environment.",
    });
    return;
  }

  try {
    // Generate a fresh OTP (same flow as /auth/otp/send)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any existing unused OTPs for this address
    await db
      .update(otpsTable)
      .set({ used: true })
      .where(and(eq(otpsTable.email, to), eq(otpsTable.used, false)));

    await db.insert(otpsTable).values({ email: to, code: hashed, expiresAt, used: false });

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#f97316">Lead Onto</h2>
      <p>This is a delivery test from your admin panel. Your one-time login code is:</p>
      <h1 style="font-size:48px;letter-spacing:8px;color:#1e293b">${code}</h1>
      <p style="color:#64748b">This code expires in 10 minutes. Do not share it with anyone.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">You're receiving this because you have a Lead Onto account.</p>
    </div>`;

    const sent = await sendEmail({ to, subject: "Lead Onto — Test OTP Delivery", html });

    if (sent.ok && !sent.dev) {
      logger.info({ to }, "admin test email sent");
      res.json({ success: true });
    } else {
      logger.error({ to, sent }, "admin test email failed");
      res.status(502).json({ error: "Email could not be delivered. Check domain verification status." });
    }
  } catch (err) {
    logger.error({ err: (err as Error).message, to }, "admin test email error");
    res.status(500).json({ error: "Unexpected error sending test email." });
  }
});

export default router;
