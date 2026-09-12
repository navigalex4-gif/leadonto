import { Router, type IRouter, type Request } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import { db, usersTable, otpsTable } from "@workspace/db";
import { eq, and, gt, sql } from "drizzle-orm";
import { mergeGuestProgress } from "./journey";
import { ensureSignupGrant } from "../lib/credits";
import { geolocateIp } from "../lib/geo";
import { logger } from "../lib/logger";
import { sendEmail, isEmailConfigured } from "../lib/mailer";

declare module "express-session" {
  interface SessionData {
    userId: number;
    userEmail: string;
    userName?: string;
    /** Set to true only by the admin-login route (password-hash verified). Never set by OTP or OAuth. */
    isAdmin?: boolean;
    /** Temporary: guest ID to merge on next successful login (Google OAuth flow) */
    pendingGuestId?: string;
    /** Safe same-origin route to restore after OAuth completes. */
    pendingReturnTo?: string;
    /**
     * Server-authoritative meter for the in-progress mock interview. `id` is a
     * server-minted token (never sent by the client) used as the idempotent ledger
     * reference `interview:<id>:<block>`, so per-block charges are at-most-once and
     * the cap can't be bypassed by a replayed or forged id. Only ONE interview is
     * active per session at a time (a second /charge is rejected while unexpired);
     * `expiresAt` lets an abandoned meter be replaced so the user is never locked out.
     */
    interview?: { id: string; blocksCharged: number; startedAt: number; expiresAt: number };
    /** Monotonic per-session generation used to make parallel interview starts idempotent. */
    interviewGeneration?: number;
    /** Server-authoritative meter for Live Conversation blocks. */
    live?: { id: string; blocksCharged: number; startedAt: number; expiresAt: number };
    /** Monotonic per-session generation used to make parallel live starts idempotent. */
    liveGeneration?: number;
    /** B2B company session — set by /api/b2b/auth/login, never by student login paths. */
    b2bCompanyId?: number;
    b2bCompanyEmail?: string;
    b2bCompanyName?: string;
    /** First guest progress key bound to this browser session. */
    guestProgressId?: string;
  }
}

const router: IRouter = Router();
const otpAttempts = new Map<string, { count: number; resetAt: number }>();
const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function allowOtpAttempt(key: string): boolean {
  const now = Date.now();
  const current = otpAttempts.get(key);
  if (!current || current.resetAt <= now) {
    otpAttempts.set(key, { count: 1, resetAt: now + OTP_ATTEMPT_WINDOW_MS });
    return true;
  }
  if (current.count >= OTP_MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

function clearOtpAttempts(key: string): void {
  otpAttempts.delete(key);
}

/**
 * Extract the real client IP with a priority chain that works on Replit (Cloudflare-fronted):
 *  1. CF-Connecting-IP — Cloudflare's authoritative header, always the real user IP.
 *  2. X-Real-IP       — set by nginx-style proxies as a single trusted value.
 *  3. X-Forwarded-For — leftmost hop, the original client before any proxies.
 *  4. req.ip          — Express's built-in (works when trust proxy is set correctly).
 */
function clientIp(req: Request): string | null {
  const cf = (req.headers["cf-connecting-ip"] as string | undefined)?.trim();
  if (cf) return cf;
  const realIp = (req.headers["x-real-ip"] as string | undefined)?.trim();
  if (realIp) return realIp;
  const xff = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return xff || req.ip || null;
}

/**
 * Record sign-in origin for admin visibility. Writes IP + timestamp immediately and
 * fills in geolocation once resolved. signup* columns are set only the first time
 * (COALESCE); lastLogin* every time. Best-effort — never blocks or fails a login.
 */
async function recordLogin(userId: number, req: Request): Promise<void> {
  try {
    const ip = clientIp(req);
    await db
      .update(usersTable)
      .set({
        lastLoginIp: ip,
        lastLoginAt: new Date(),
        signupIp: sql`COALESCE(${usersTable.signupIp}, ${ip})`,
      })
      .where(eq(usersTable.id, userId));

    const loc = await geolocateIp(ip);
    if (loc) {
      await db
        .update(usersTable)
        .set({
          lastLoginLocation: loc,
          signupLocation: sql`COALESCE(${usersTable.signupLocation}, ${loc})`,
        })
        .where(eq(usersTable.id, userId));
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message, userId }, "recordLogin failed");
  }
}

/**
 * Determine the Google OAuth callback URL.
 *
 * Priority order:
 *  1. GOOGLE_CALLBACK_URL env var — explicit override, most stable for production.
 *  2. REPLIT_DOMAINS — prefer *.replit.app (deployment), then accept *.replit.dev
 *     (dev preview), then any first domain.
 *  3. localhost fallback for pure local dev.
 */
function getCallbackURL(): string {
  // Explicit override always wins
  const explicit = process.env["GOOGLE_CALLBACK_URL"];
  if (explicit) return explicit;

  const raw = process.env["REPLIT_DOMAINS"] ?? "";
  const domains = raw.split(",").map((d) => d.trim()).filter(Boolean);

  const prodDomain =
    domains.find((d) => d.endsWith(".replit.app")) ??
    domains.find((d) => d.endsWith(".replit.dev")) ??
    domains[0];

  return prodDomain
    ? `https://${prodDomain}/api/auth/google/callback`
    : `http://localhost:${process.env["PORT"] ?? 8080}/api/auth/google/callback`;
}

// Log the callback URL once at startup so it's easy to read in workflow logs.
const _startupCallbackURL = getCallbackURL();
console.log(`[auth] Google OAuth callback URL: ${_startupCallbackURL}`);
console.log(`[auth] To fix redirect_uri_mismatch, add this URL to Google Cloud Console`);
console.log(`[auth]   → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs`);
console.log(`[auth] Or set the GOOGLE_CALLBACK_URL secret to lock it to a stable URL.`);

let googleStrategyRegistered = false;

function setupPassport() {
  // Track whether the Google strategy was actually registered. The
  // /auth/google route checks this so a misconfigured deployment redirects
  // the learner to a tracked, recoverable login page instead of a raw 500.
  // Support both underscore and space variants of secret names
  const clientID = process.env["GOOGLE_CLIENT_ID"] ?? process.env["GOOGLE CLIENT ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"] ?? process.env["GOOGLE CLIENT SECRET"];
  if (!clientID || !clientSecret) {
    console.warn("[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login disabled");
    return;
  }
  googleStrategyRegistered = true;

  // Diagnostic: log first 8 chars + length so you can verify this matches
  // the Client ID in Google Cloud Console → APIs & Services → Credentials.
  // "Error 401: invalid_client / OAuth client not found" means this value is wrong.
  console.log(`[auth] Google Client ID (first 8 chars): ${clientID.slice(0, 8)}… (length: ${clientID.length})`);
  console.log(`[auth] Expected format: XXXXXXXXXX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com (72 chars)`);
  if (!clientID.endsWith(".apps.googleusercontent.com")) {
    console.warn("[auth] ⚠️  GOOGLE_CLIENT_ID does not end with .apps.googleusercontent.com — this will cause invalid_client");
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        // callbackURL is set here as a default but we ALSO pass it dynamically
        // in the authenticate() middleware calls below so it always reflects the
        // current environment (useful when the domain changes).
        callbackURL: getCallbackURL(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          const existing = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.googleId, profile.id))
            .limit(1);

          if (existing.length > 0) {
            return done(null, existing[0]);
          }

          const byEmail = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

          if (byEmail.length > 0) {
            const updated = await db
              .update(usersTable)
              .set({ googleId: profile.id, authProvider: "google", picture: profile.photos?.[0]?.value, name: profile.displayName })
              .where(eq(usersTable.id, byEmail[0].id))
              .returning();
            return done(null, updated[0]);
          }

          const inserted = await db
            .insert(usersTable)
            .values({
              email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
              authProvider: "google",
              googleId: profile.id,
            })
            .returning();
          await ensureSignupGrant(inserted[0]!.id, email);
          return done(null, inserted[0]);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => done(null, (user as { id: number }).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      done(null, users[0] ?? null);
    } catch (err) {
      done(err);
    }
  });
}

setupPassport();

/**
 * GET /api/auth/config
 * Returns public configuration info for the login page:
 * - Whether Google OAuth is configured
 * - The exact callback URL that must be registered in Google Console
 * - Whether email (Resend) is configured for OTP sending
 */
router.get("/auth/config", (_req, res) => {
  const hasGoogleId = !!(process.env["GOOGLE_CLIENT_ID"] ?? process.env["GOOGLE CLIENT ID"]);
  const hasGoogleSecret = !!(process.env["GOOGLE_CLIENT_SECRET"] ?? process.env["GOOGLE CLIENT SECRET"]);
  const emailReady = isEmailConfigured();

  res.json({
    googleConfigured: hasGoogleId && hasGoogleSecret,
    googleCallbackUrl: getCallbackURL(),
    otpEmailConfigured: emailReady,
    // When email isn't configured (e.g. off-Replit dev), the OTP code is returned
    // in the /auth/otp/send response so login still works.
    otpDevMode: !emailReady,
  });
});

// Pass callbackURL dynamically so both dev-preview and production domains work
// without requiring a server restart when REPLIT_DOMAINS changes.
router.get("/auth/google", (req, res, next) => {
  // Guard: if the Google strategy was never registered (missing/invalid env),
  // passport.authenticate("google") throws "Unknown authentication strategy"
  // and the learner lands on a raw 500 with no way back and no tracking.
  // Redirect to the login page with a tracked, user-friendly error instead.
  if (!googleStrategyRegistered) {
    res.redirect("/login?error=google_unavailable");
    return;
  }
  const callbackURL = getCallbackURL();
  // Stash any guest ID so we can merge progress after OAuth completes.
  const guestId = req.query["guestId"] as string | undefined;
  if (guestId) req.session.pendingGuestId = guestId;
  const returnTo = req.query["returnTo"] as string | undefined;
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    req.session.pendingReturnTo = returnTo;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL,
  } as any)(req, res, next);
});

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    const callbackURL = getCallbackURL();
    passport.authenticate("google", {
      failureRedirect: "/login?error=google_failed",
      callbackURL,
    } as any)(req, res, next);
  },
  async (req, res) => {
    if (req.user) {
      const u = req.user as { id: number; email: string; name?: string };
      const pendingGuestId = req.session.pendingGuestId;
      const returnTo = req.session.pendingReturnTo;
      // A successful student identity change gets a fresh session. This clears
      // any prior user's admin/B2B authority and active paid-product meters.
      await regenerateSession(req);
      req.session.userId = u.id;
      req.session.userEmail = u.email;
      req.session.userName = u.name ?? undefined;

      // Merge any guest progress that was saved before login
      if (pendingGuestId) {
        await mergeGuestProgress(pendingGuestId, String(u.id));
      }

      void recordLogin(u.id, req);
      res.redirect(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      return;
    }
    res.redirect("/");
  }
);

router.post("/auth/otp/send", async (req, res) => {
  const rawEmail = req.body?.email as string | undefined;
  const email = rawEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const hashed = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    // Invalidate any existing unused OTPs for this email before issuing a new one
    // so only the most-recently issued code is ever valid.
    await db
      .update(otpsTable)
      .set({ used: true })
      .where(and(eq(otpsTable.email, email), eq(otpsTable.used, false)));

    await db.insert(otpsTable).values({ email, code: hashed, expiresAt, used: false });

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#f97316">Lead Onto</h2>
          <p>Your one-time login code is:</p>
          <h1 style="font-size:48px;letter-spacing:8px;color:#1e293b">${code}</h1>
          <p style="color:#64748b">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>`;
    const sent = await sendEmail({ to: email, subject: "Your Lead Onto Login Code", html });
    if (sent.dev && process.env.NODE_ENV !== "production") {
      // Connector not attached in local/off-Replit dev — surface the code so login still works.
      res.json({ success: true, dev: code });
    } else if (sent.ok && !sent.dev) {
      res.json({ success: true });
    } else {
      // Either a real delivery failure, or email is unconfigured in production (which must
      // never happen). Fail closed — never leak the login code in the response.
      req.log.error({ email, unconfigured: !!sent.dev }, "OTP email not delivered");
      res.status(502).json({ error: "Couldn't send your login code. Please try again in a moment." });
    }
  } catch (err) {
    req.log.error({ err }, "OTP send error");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

router.post("/auth/otp/verify", async (req, res) => {
  const rawEmail = req.body?.email as string | undefined;
  const email = rawEmail?.trim().toLowerCase();
  const code = (req.body?.code as string | undefined)?.trim();
  const guestId = req.body?.guestId as string | undefined;
  const normalizedCode = code ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(normalizedCode)) {
    res.status(400).json({ error: "Email and code required" });
    return;
  }

  const attemptKey = `${clientIp(req) ?? "unknown"}:${email}`;
  if (!allowOtpAttempt(attemptKey)) {
    res.status(429).json({ error: "Too many incorrect attempts. Request a new code and try again later." });
    return;
  }

  const hashed = crypto.createHash("sha256").update(normalizedCode).digest("hex");
  const now = new Date();

  try {
    // Atomic: mark the OTP as used in a single UPDATE…RETURNING so concurrent
    // verify requests can't both succeed against the same code.
    const consumed = await db
      .update(otpsTable)
      .set({ used: true })
      .where(
        and(
          eq(otpsTable.email, email),
          eq(otpsTable.code, hashed),
          eq(otpsTable.used, false),
          gt(otpsTable.expiresAt, now)
        )
      )
      .returning();

    if (consumed.length === 0) {
      res.status(400).json({ error: "Invalid or expired code. Please request a new OTP." });
      return;
    }
    clearOtpAttempts(attemptKey);

    let user = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user.length === 0) {
      const inserted = await db.insert(usersTable).values({ email, authProvider: "email" }).returning();
      await ensureSignupGrant(inserted[0]!.id, email);
      user = inserted;
    }

    // A successful student identity change gets a fresh session. This clears
    // any prior user's admin/B2B authority and active paid-product meters.
    await regenerateSession(req);
    req.session.userId = user[0].id;
    req.session.userEmail = user[0].email;
    req.session.userName = user[0].name ?? undefined;

    // Merge any lesson progress the user built up as a guest
    if (guestId) {
      await mergeGuestProgress(guestId, String(user[0].id));
    }

    void recordLogin(user[0].id, req);

    res.json({ success: true, user: { id: user[0].id, email: user[0].email, name: user[0].name } });
  } catch (err) {
    req.log.error({ err }, "OTP verify error");
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    res.json({ user: null });
    return;
  }
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!users.length) { res.json({ user: null }); return; }
    const user = users[0]!;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        preferredLanguage: user.preferredLanguage,
        isAdmin: req.session.isAdmin === true,
      },
    });
  } catch {
    res.json({ user: null });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// POST /api/auth/admin-login — username + password login for admin/local accounts.
// ADMIN_USERNAME is optional (defaults to "admin"). Configure either the
// SHA-256 ADMIN_PASSWORD_HASH or ADMIN_PASSWORD as a Replit secret.
router.post("/auth/admin-login", async (req, res) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    const adminUser = process.env["ADMIN_USERNAME"]?.trim() || "admin";
    const configuredHash = process.env["ADMIN_PASSWORD_HASH"]?.trim();
    const configuredPassword = process.env["ADMIN_PASSWORD"];
    if (!configuredHash && !configuredPassword) {
      res.status(503).json({ error: "Admin login is not configured." });
      return;
    }

    const incoming = crypto.createHash("sha256").update(password ?? "").digest("hex");
    // Prefer the pre-hashed secret when present. ADMIN_PASSWORD is supported
    // for setup convenience, but it is never compared or logged in plaintext.
    const adminHash = configuredHash
      ?? crypto.createHash("sha256").update(configuredPassword ?? "").digest("hex");
    const incomingBuffer = Buffer.from(incoming, "utf8");
    const expectedBuffer = Buffer.from(adminHash, "utf8");
    const passwordMatches = incomingBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(incomingBuffer, expectedBuffer);
    if (!username || username !== adminUser || !passwordMatches) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const adminEmail = "admin@edubharat.in";
    let adminRecords = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (adminRecords.length === 0) {
      const inserted = await db.insert(usersTable).values({
        email: adminEmail,
        name: "Admin",
        authProvider: "local",
      }).returning();
      adminRecords = inserted;
    }

    const user = adminRecords[0]!;
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name ?? undefined;
    req.session.isAdmin = true; // Only set here — after password-hash verification
    // Admin login is a student-side path — clear any B2B session
    delete req.session.b2bCompanyId;
    delete req.session.b2bCompanyEmail;
    delete req.session.b2bCompanyName;

    void recordLogin(user.id, req);

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    req.log?.error?.({ err }, "Admin login error");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

export { setupPassport };
export default router;
