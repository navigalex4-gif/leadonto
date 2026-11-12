import { createHmac } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "./profile.js";
import { isAdminSession } from "../lib/guards.js";
import {
  getBalance,
  getRecentTransactions,
  spendCredits,
  INTERVIEW_BLOCK_COST,
  INTERVIEW_MAX_BLOCKS,
  interviewBlockSeconds,
  LIVE_BLOCK_COST,
  LIVE_BLOCK_SECONDS,
} from "../lib/credits.js";
const router: IRouter = Router();
// Admin smoke tests must be able to exercise metered products without mutating
// the admin's real credit ledger. The server still returns a finite number so
// existing client balance components remain compatible.
const ADMIN_UNLIMITED_BALANCE = 999999;

function nextMeterId(req: Request, kind: "interview" | "live"): string {
  const generationKey = kind === "interview" ? "interviewGeneration" : "liveGeneration";
  const generation = (req.session[generationKey] ?? 0) + 1;
  req.session[generationKey] = generation;
  const secret = process.env["SESSION_SECRET"] ?? "leadonto-development-session-secret";
  return createHmac("sha256", secret)
    .update(`${kind}:${req.sessionID}:${req.session.userId}:${generation}`)
    .digest("hex")
    .slice(0, 32);
}

// GET /api/credits/balance — public; guests receive authenticated:false.
router.get("/credits/balance", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) {
    res.json({ authenticated: false, balance: null });
    return;
  }
  if (isAdminSession(req)) {
    res.json({ authenticated: true, balance: ADMIN_UNLIMITED_BALANCE, unlimited: true });
    return;
  }
  const balance = await getBalance(userId);
  res.json({ authenticated: true, balance });
});

// GET /api/credits/transactions — recent ledger for the signed-in user.
router.get("/credits/transactions", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const transactions = await getRecentTransactions(userId, 50);
  res.json({ transactions });
});

// Interviews are metered by completed usage: 1 credit per completed block.
// No upfront debit is made; the meter
// lives in the server session (req.session.interview) — authoritative and not
// forgeable by the client. `interview.id` is a server-minted token used as the
// idempotent ledger reference for every block, so a full session costs at most
// INTERVIEW_MAX_BLOCKS credits no matter how (or how often) the client calls.
// POST /api/credits/interview/charge { durationMinutes } — starts the meter; block 1 is charged only after completion.
router.post("/credits/interview/charge", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const durationMinutes = Number((req.body as { durationMinutes?: number }).durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    res.status(400).json({ error: "durationMinutes required" });
    return;
  }
  const active = req.session.interview;
  if (active && Date.now() < active.expiresAt) {
    res.status(409).json({ error: "interview_in_progress" });
    return;
  }
  const balance = isAdminSession(req) ? ADMIN_UNLIMITED_BALANCE : await getBalance(userId);
  if (balance < INTERVIEW_BLOCK_COST) {
    res.status(402).json({ error: "insufficient_credits", balance, required: INTERVIEW_BLOCK_COST });
    return;
  }
  const id = nextMeterId(req, "interview");
  const now = Date.now();
  const blockSeconds = interviewBlockSeconds(durationMinutes);
  const expiresAt = now + blockSeconds * 1000 * INTERVIEW_MAX_BLOCKS + 5 * 60_000;
  // No upfront debit. Block 1 is charged only after the student completes it.
  req.session.interview = { id, blocksCharged: 0, startedAt: now, expiresAt };
  res.json({
    ok: true,
    interviewId: id,
    balance,
    charged: 0,
    blocksCharged: 0,
    startedAt: now,
    blockSeconds,
    maxBlocks: INTERVIEW_MAX_BLOCKS,
  });
});

// POST /api/credits/interview/tick { block } — charges 1 credit for the next
// completed block (1..INTERVIEW_MAX_BLOCKS). Charges are idempotent per (interview id,
// block): mutate() serialises on the user row and dedups by (type, reference), so
// concurrent or retried ticks for the same block charge at most once. Combined
// with the capped block range this hard-guarantees a full session costs at most
// INTERVIEW_MAX_BLOCKS credits.
router.post("/credits/interview/tick", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const meter = req.session.interview;
  if (!meter) {
    res.status(409).json({ error: "no_active_interview" });
    return;
  }
  const body = req.body as { block?: number; interviewId?: string };
  // The tab must present the token it received from /charge. If it doesn't match
  // the active meter, this tab's interview has been superseded (e.g. another tab
  // started one, or the meter was ended) — refuse so its ticks can never bill
  // against a different interview's block references.
  if (body.interviewId !== meter.id) {
    res.status(409).json({ error: "interview_superseded" });
    return;
  }
  const block = Number(body.block);
  if (!Number.isInteger(block) || block < 1 || block > INTERVIEW_MAX_BLOCKS) {
    res.status(400).json({ error: "invalid_block" });
    return;
  }
  // The client only ever advances one block at a time — reject skips. Re-requesting
  // an already-paid block is allowed and becomes a no-op via idempotency below.
  if (block > meter.blocksCharged + 1) {
    res.status(409).json({ error: "block_out_of_order", expected: meter.blocksCharged + 1 });
    return;
  }
  const result = isAdminSession(req)
    ? { ok: true, balance: ADMIN_UNLIMITED_BALANCE, already: true }
    : await spendCredits({
    userId,
    amount: INTERVIEW_BLOCK_COST,
    type: "spend_interview",
    description: `Interview (block ${block})`,
    reference: `interview:${meter.id}:${block}`,
    idempotent: true,
      });
  if (!result.ok) {
    res.status(402).json({ error: "insufficient_credits", balance: result.balance, required: INTERVIEW_BLOCK_COST });
    return;
  }
  if (block > meter.blocksCharged) {
    req.session.interview = { ...meter, blocksCharged: block };
  }
  res.json({ ok: true, balance: result.balance, charged: result.already ? 0 : INTERVIEW_BLOCK_COST });
});

// POST /api/credits/interview/end — clears the active interview meter so the next
// interview can start right away. Idempotent; safe to call with no active meter.
router.post("/credits/interview/end", requireAuth, (req: Request, res: Response) => {
  const meter = req.session.interview;
  const { interviewId } = req.body as { interviewId?: string };
  // Normal cleanup supplies the owning interview id. An explicit user action
  // from the setup screen may omit it to clear a stale session meter belonging
  // to this same authenticated session after its tab was closed unexpectedly.
  if (meter && (!interviewId || meter.id === interviewId)) {
    req.session.interview = undefined;
  }
  res.json({ ok: true });
});

// Live Conversation is one credit per 12-minute block. The server session owns
// the block counter so retries and overlapping timer requests cannot create
// duplicate debits.
router.post("/credits/live/start", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const active = req.session.live;
  if (active && Date.now() < active.expiresAt) {
    res.json({ ok: true, balance: isAdminSession(req) ? ADMIN_UNLIMITED_BALANCE : await getBalance(userId), liveId: active.id, startedAt: active.startedAt, blockSeconds: LIVE_BLOCK_SECONDS, charged: 0, blocksCharged: active.blocksCharged });
    return;
  }
  const balance = isAdminSession(req) ? ADMIN_UNLIMITED_BALANCE : await getBalance(userId);
  if (balance < LIVE_BLOCK_COST) {
    res.status(402).json({ error: "insufficient_credits", balance, required: LIVE_BLOCK_COST });
    return;
  }
  const id = nextMeterId(req, "live");
  const now = Date.now();
  // No upfront debit. The first credit is charged only after 12 full minutes.
  req.session.live = {
    id,
    blocksCharged: 0,
    startedAt: now,
    expiresAt: now + 24 * 60 * 60_000,
  };
  res.json({ ok: true, balance, liveId: id, startedAt: now, blockSeconds: LIVE_BLOCK_SECONDS, charged: 0, blocksCharged: 0 });
});

router.post("/credits/live/tick", requireAuth, async (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const meter = req.session.live;
  if (!meter) {
    res.status(409).json({ error: "no_active_live" });
    return;
  }
  const body = req.body as { block?: number; liveId?: string };
  if (body.liveId !== meter.id) {
    res.status(409).json({ error: "live_superseded" });
    return;
  }
  const block = Number(body.block);
  if (!Number.isInteger(block) || block < 1) {
    res.status(400).json({ error: "invalid_block" });
    return;
  }
  if (block > meter.blocksCharged + 1) {
    res.status(409).json({ error: "block_out_of_order", expected: meter.blocksCharged + 1 });
    return;
  }
  const result = isAdminSession(req)
    ? { ok: true, balance: ADMIN_UNLIMITED_BALANCE, already: true }
    : await spendCredits({
    userId,
    amount: LIVE_BLOCK_COST,
    type: "spend_live",
    description: `Live conversation (block ${block} · 12 minutes)`,
    reference: `live:${meter.id}:${block}`,
    idempotent: true,
      });
  if (!result.ok) {
    res.status(402).json({ error: "insufficient_credits", balance: result.balance, required: LIVE_BLOCK_COST });
    return;
  }
  if (block > meter.blocksCharged) req.session.live = { ...meter, blocksCharged: block };
  res.json({ ok: true, balance: result.balance, charged: result.already ? 0 : LIVE_BLOCK_COST, blocksCharged: Math.max(block, meter.blocksCharged), startedAt: meter.startedAt });
});

router.post("/credits/live/end", requireAuth, (req: Request, res: Response) => {
  const meter = req.session.live;
  const { liveId } = req.body as { liveId?: string };
  if (meter && (!liveId || meter.id === liveId)) req.session.live = undefined;
  res.json({ ok: true });
});

// Credits are topped up via UPI — see upi-payments route for checkout flow.

export default router;
