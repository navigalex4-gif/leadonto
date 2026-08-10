/**
 * B2B company authentication routes.
 * Companies log in with email + password (PBKDF2-SHA256, no external dependency).
 * Session key is b2bCompanyId (separate from student userId).
 */
import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db, b2bCompaniesTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { geolocateIp } from "../lib/geo.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Password helpers ──────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN     = 64;
const PBKDF2_DIGEST     = "sha512";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Keep the user's formatting for display, but compare phone numbers by digits. */
function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  const normalized =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) :
    digits.length === 11 && digits.startsWith("0") ? digits.slice(1) :
    digits;
  return /^[6-9]\d{9}$/.test(normalized) && !/^(\d)\1{9}$/.test(normalized)
    ? normalized
    : "";
}

function isValidPhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value) && !/^(\d)\1{9}$/.test(value);
}

function passwordRequirementsMessage(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter";
  if (!/\d/.test(password)) return "Password must include at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character";
  return null;
}

function validWebsite(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = hashPassword(password, salt);
  // constant-time compare
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

// ── IP helper (mirrors auth.ts) ───────────────────────────────────────────────

function clientIp(req: Request): string | null {
  const cf = (req.headers["cf-connecting-ip"] as string | undefined)?.trim();
  if (cf) return cf;
  const realIp = (req.headers["x-real-ip"] as string | undefined)?.trim();
  if (realIp) return realIp;
  const xff = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return xff || req.ip || null;
}

async function recordB2BLogin(companyId: number, req: Request): Promise<void> {
  try {
    const ip = clientIp(req);
    await db
      .update(b2bCompaniesTable)
      .set({
        lastLoginIp: ip,
        lastLoginAt: new Date(),
      })
      .where(eq(b2bCompaniesTable.id, companyId));

    const loc = await geolocateIp(ip);
    if (loc) {
      await db
        .update(b2bCompaniesTable)
        .set({ lastLoginLocation: loc })
        .where(eq(b2bCompaniesTable.id, companyId));
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message, companyId }, "recordB2BLogin failed");
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/b2b/auth/register
 * { name, email, password, phone?, industry?, website? }
 */
router.post("/b2b/auth/register", async (req: Request, res: Response) => {
  const { name, email, password, phone, industry, website } = req.body as {
    name?: string; email?: string; password?: string;
    phone?: string; industry?: string; website?: string;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Company name, email, and password are required" });
    return;
  }
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: "Enter a valid email address" });
    return;
  }
  const passwordError = passwordRequirementsMessage(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const normalizedPhone = phone?.trim() ? normalizePhone(phone) : "";
  if (phone?.trim() && !isValidPhone(normalizedPhone)) {
    res.status(400).json({ error: "Enter a valid Indian mobile number with 10 digits" });
    return;
  }
  const normalizedWebsite = website?.trim() || "";
  if (!validWebsite(normalizedWebsite)) {
    res.status(400).json({ error: "Website must start with http:// or https://" });
    return;
  }

  try {
    const existing = await db
      .select({ id: b2bCompaniesTable.id })
      .from(b2bCompaniesTable)
      .where(eq(b2bCompaniesTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    if (normalizedPhone) {
      const phoneExists = await db
        .select({ id: b2bCompaniesTable.id })
        .from(b2bCompaniesTable)
        .where(sql`right(regexp_replace(coalesce(${b2bCompaniesTable.phone}, ''), '[^0-9]', '', 'g'), 10) = ${normalizedPhone}`)
        .limit(1);
      if (phoneExists.length > 0) {
        res.status(409).json({ error: "An account with this mobile number already exists" });
        return;
      }
    }

    const salt         = crypto.randomBytes(32).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const ip           = clientIp(req);

    const isAnonymous = Boolean(req.body.isAnonymous);

    const [company] = await db
      .insert(b2bCompaniesTable)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        passwordSalt: salt,
        phone: normalizedPhone || null,
        industry: industry?.trim() || null,
        website: normalizedWebsite || null,
        isAnonymous,
        signupIp: ip,
      })
      .returning();

    // Geo-tag in background
    if (ip) {
      void geolocateIp(ip).then((loc) => {
        if (loc && company) {
          void db
            .update(b2bCompaniesTable)
            .set({ signupLocation: loc })
            .where(eq(b2bCompaniesTable.id, company.id));
        }
      });
    }

    req.session.b2bCompanyId    = company!.id;
    req.session.b2bCompanyEmail = company!.email;
    req.session.b2bCompanyName  = company!.name;
    // B2B login is a separate portal — clear any student/admin session
    delete req.session.isAdmin;
    delete req.session.userId;
    delete req.session.userEmail;
    delete req.session.userName;

    res.json({
      success: true,
      company: { id: company!.id, name: company!.name, email: company!.email, credits: 0 },
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "B2B register error");
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/**
 * POST /api/b2b/auth/login
 * { email, password }
 */
router.post("/b2b/auth/login", async (req: Request, res: Response) => {
  const identifier = (req.body?.identifier ?? req.body?.email) as string | undefined;
  const password = req.body?.password as string | undefined;
  if (!identifier?.trim() || !password) {
    res.status(400).json({ error: "Email or mobile number and password are required" });
    return;
  }
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizeEmail(normalizedIdentifier);
  const normalizedPhone = normalizePhone(normalizedIdentifier);

  try {
    const lookupConditions = [eq(b2bCompaniesTable.email, normalizedEmail)];
     const phoneDigits = normalizedPhone;
    if (isValidPhone(normalizedPhone)) {
      lookupConditions.push(
         sql`right(regexp_replace(coalesce(${b2bCompaniesTable.phone}, ''), '[^0-9]', '', 'g'), 10) = ${phoneDigits}`,
      );
    }

    const [company] = await db
      .select()
      .from(b2bCompaniesTable)
      .where(or(...lookupConditions))
      .limit(1);

    if (!company || !verifyPassword(password, company.passwordSalt, company.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    req.session.b2bCompanyId    = company.id;
    req.session.b2bCompanyEmail = company.email;
    req.session.b2bCompanyName  = company.name;
    // B2B login — clear any student/admin session
    delete req.session.isAdmin;
    delete req.session.userId;
    delete req.session.userEmail;
    delete req.session.userName;

    void recordB2BLogin(company.id, req);

    res.json({
      success: true,
      company: {
        id: company.id, name: company.name, email: company.email,
        credits: company.credits, industry: company.industry,
      },
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "B2B login error");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/** GET /api/b2b/auth/me */
router.get("/b2b/auth/me", async (req: Request, res: Response) => {
  if (!req.session.b2bCompanyId) {
    res.json({ company: null });
    return;
  }
  try {
    const [company] = await db
      .select({
        id: b2bCompaniesTable.id,
        name: b2bCompaniesTable.name,
        email: b2bCompaniesTable.email,
        credits: b2bCompaniesTable.credits,
        phone: b2bCompaniesTable.phone,
        industry: b2bCompaniesTable.industry,
        website: b2bCompaniesTable.website,
        createdAt: b2bCompaniesTable.createdAt,
      })
      .from(b2bCompaniesTable)
      .where(eq(b2bCompaniesTable.id, req.session.b2bCompanyId))
      .limit(1);
    if (!company) { res.json({ company: null }); return; }
    res.json({ company });
  } catch {
    res.json({ company: null });
  }
});

/** PUT /api/b2b/auth/profile — update non-sensitive company basics. */
router.put("/b2b/auth/profile", async (req: Request, res: Response) => {
  const companyId = req.session.b2bCompanyId;
  if (!companyId) {
    res.status(401).json({ error: "B2B sign-in required" });
    return;
  }

  const { name, phone, industry, website } = req.body as {
    name?: string; phone?: string; industry?: string; website?: string;
  };
  const normalizedName = name?.trim() ?? "";
  if (!normalizedName) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }
  if (normalizedName.length > 120) {
    res.status(400).json({ error: "Company name must be 120 characters or fewer" });
    return;
  }

  const hasPhone = typeof phone === "string" && phone.trim().length > 0;
  const normalizedPhone = hasPhone ? normalizePhone(phone) : "";
  if (hasPhone && !isValidPhone(normalizedPhone)) {
    res.status(400).json({ error: "Enter a valid Indian mobile number with 10 digits" });
    return;
  }
  const normalizedWebsite = website?.trim() ?? "";
  if (!validWebsite(normalizedWebsite)) {
    res.status(400).json({ error: "Website must start with http:// or https://" });
    return;
  }

  try {
    if (normalizedPhone) {
      const phoneExists = await db
        .select({ id: b2bCompaniesTable.id })
        .from(b2bCompaniesTable)
        .where(sql`right(regexp_replace(coalesce(${b2bCompaniesTable.phone}, ''), '[^0-9]', '', 'g'), 10) = ${normalizedPhone}`)
        .limit(2);
      if (phoneExists.some((row) => row.id !== companyId)) {
        res.status(409).json({ error: "That mobile number is already linked to another account" });
        return;
      }
    }

    const [company] = await db
      .update(b2bCompaniesTable)
      .set({
        name: normalizedName,
        phone: normalizedPhone || null,
        industry: industry?.trim() || null,
        website: normalizedWebsite || null,
        updatedAt: new Date(),
      })
      .where(eq(b2bCompaniesTable.id, companyId))
      .returning({
        id: b2bCompaniesTable.id,
        name: b2bCompaniesTable.name,
        email: b2bCompaniesTable.email,
        credits: b2bCompaniesTable.credits,
        phone: b2bCompaniesTable.phone,
        industry: b2bCompaniesTable.industry,
        website: b2bCompaniesTable.website,
        createdAt: b2bCompaniesTable.createdAt,
      });
    if (!company) {
      res.status(404).json({ error: "Company account not found" });
      return;
    }
    req.session.b2bCompanyName = company.name;
    res.json({ success: true, company });
  } catch (err) {
    logger.error({ err: (err as Error).message, companyId }, "B2B profile update error");
    res.status(500).json({ error: "Could not update company information" });
  }
});

/** POST /api/b2b/auth/password — change password after verifying the current one. */
router.post("/b2b/auth/password", async (req: Request, res: Response) => {
  const companyId = req.session.b2bCompanyId;
  if (!companyId) {
    res.status(401).json({ error: "B2B sign-in required" });
    return;
  }
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string; newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required" });
    return;
  }
  const passwordError = passwordRequirementsMessage(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: "New password must be different from your current password" });
    return;
  }

  try {
    const [company] = await db
      .select({
        passwordHash: b2bCompaniesTable.passwordHash,
        passwordSalt: b2bCompaniesTable.passwordSalt,
      })
      .from(b2bCompaniesTable)
      .where(eq(b2bCompaniesTable.id, companyId))
      .limit(1);
    if (!company || !verifyPassword(currentPassword, company.passwordSalt, company.passwordHash)) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const salt = crypto.randomBytes(32).toString("hex");
    await db
      .update(b2bCompaniesTable)
      .set({
        passwordHash: hashPassword(newPassword, salt),
        passwordSalt: salt,
        updatedAt: new Date(),
      })
      .where(eq(b2bCompaniesTable.id, companyId));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err: (err as Error).message, companyId }, "B2B password update error");
    res.status(500).json({ error: "Could not update password" });
  }
});

/** POST /api/b2b/auth/logout */
router.post("/b2b/auth/logout", (req: Request, res: Response) => {
  delete req.session.b2bCompanyId;
  delete req.session.b2bCompanyEmail;
  delete req.session.b2bCompanyName;
  res.json({ success: true });
});

export default router;
