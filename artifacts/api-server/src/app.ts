import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import router from "./routes";
import { logger } from "./lib/logger";

const PgSession = connectPgSimple(session);

const app: Express = express();
const isProduction = process.env["NODE_ENV"] === "production";
const databaseUrl = process.env["DATABASE_URL"];
const sessionSecret = process.env["SESSION_SECRET"];

if (isProduction && (!databaseUrl || !sessionSecret || sessionSecret.length < 32)) {
  throw new Error("Production requires DATABASE_URL and a SESSION_SECRET with at least 32 characters.");
}

// Behind Replit's proxy — trust X-Forwarded-* so req.ip is the real client IP
// (used for admin visibility) and secure cookies work correctly in production.
app.set("trust proxy", true);
app.disable("x-powered-by");

const configuredOrigins = new Set(
  [
    "https://leadonto.com",
    "https://www.leadonto.com",
    process.env["APP_ORIGIN"],
    process.env["PUBLIC_APP_ORIGIN"],
    ...(process.env["REPLIT_DOMAINS"] ?? "").split(",").map((domain) => {
      const value = domain.trim();
      return value ? (value.startsWith("http") ? value : `https://${value}`) : "";
    }),
  ].filter(Boolean),
);
if (!isProduction) {
  configuredOrigins.add("http://localhost:5173");
  configuredOrigins.add("http://localhost:3000");
  configuredOrigins.add("http://localhost:80");
  configuredOrigins.add("http://localhost");
  configuredOrigins.add("http://127.0.0.1:5173");
  configuredOrigins.add("http://127.0.0.1:3000");
  configuredOrigins.add("http://127.0.0.1:80");
  configuredOrigins.add("http://127.0.0.1");
  for (const domain of [process.env["REPLIT_DEV_DOMAIN"], process.env["REPLIT_EXPO_DEV_DOMAIN"]]) {
    if (domain) {
      configuredOrigins.add(domain.startsWith("http") ? domain : `https://${domain}`);
    }
  }
}

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || configuredOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed"));
  },
  credentials: true,
}));

// Cashfree signs the exact request bytes. Keep a copy before JSON parsing so
// the webhook can verify the signature without re-serialising the payload.
app.use(express.json({
  verify: (req, _res, buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));

const sessionStore = databaseUrl
  ? new PgSession({
      conString: databaseUrl,
      createTableIfMissing: true,
      tableName: "user_sessions",
    })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret ?? "development-only-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env["NODE_ENV"] === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

type RateLimitEntry = { count: number; resetAt: number };
function createRateLimiter(windowMs: number, max: number, keyFor: (req: Request) => string = (req) => req.ip ?? "unknown") {
  const entries = new Map<string, RateLimitEntry>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") {
      next();
      return;
    }
    const now = Date.now();
    const key = keyFor(req);
    const current = entries.get(key);
    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      current.count += 1;
      if (current.count > max) {
        res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
        res.status(429).json({ error: "Too many requests. Please try again shortly." });
        return;
      }
    }
    if (entries.size > 5000) {
      for (const [entryKey, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(entryKey);
      }
    }
    next();
  };
}

const byIpAndEmail = (req: Request) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  // Keep harmless session/config reads and OAuth redirects from sharing a
  // bucket with OTP attempts or other credential-bearing auth requests.
  return `${req.ip ?? "unknown"}:${req.method}:${req.path}:${email}`;
};
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 20, byIpAndEmail);
app.use("/api/auth", (req, res, next) => {
  // These endpoints are read-only or hand off immediately to Google's OAuth
  // flow. The general /api limiter still protects them from request floods,
  // while they must not be blocked by frequent browser session checks.
  const readOrRedirectPath = new Set(["/me", "/config", "/google", "/google/callback"]);
  if (req.method === "GET" && readOrRedirectPath.has(req.path)) {
    next();
    return;
  }
  authRateLimiter(req, res, next);
});
app.use("/api/ai", createRateLimiter(60 * 1000, 60));
app.use("/api/stt", createRateLimiter(60 * 1000, 20));
app.use("/api/tts", createRateLimiter(60 * 1000, 30));
app.use("/api", createRateLimiter(60 * 1000, 240));

app.use("/api", router);

export default app;
