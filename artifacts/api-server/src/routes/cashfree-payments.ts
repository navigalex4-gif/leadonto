import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db, cashfreePaymentsTable, usersTable } from "@workspace/db";
import { requireAuth } from "./profile.js";
import { grantCreditsTx } from "../lib/credits.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();
const MIN_PURCHASE = 49;
const MAX_PURCHASE = 100_000;
const CASHFREE_API_VERSION = "2025-01-01";
const CREDIT_RETURN_URL = "https://leadonto.com/credits";

type CashfreeConfig = { appId: string; secretKey: string; baseUrl: string; environment: "sandbox" | "production" };
type CashfreeOrder = { order_id?: string; payment_session_id?: string; order_status?: string };

function getConfig(): CashfreeConfig | null {
  // Replit accepts secret names with either underscores or spaces. Support
  // both so a correctly stored credential is never silently ignored.
  const appId = process.env["CASHFREE_APP_ID"] ?? process.env["CASHFREE APP ID"];
  const secretKey = process.env["CASHFREE_SECRET_KEY"] ?? process.env["CASHFREE SECRET KEY"];
  if (!appId || !secretKey) return null;
  // This is the live Lead Onto site. Sandbox remains available by setting
  // CASHFREE_ENVIRONMENT=sandbox explicitly during provider testing.
  const environment = process.env["CASHFREE_ENVIRONMENT"] === "sandbox" ? "sandbox" : "production";
  return {
    appId,
    secretKey,
    environment,
    baseUrl: environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
  };
}

function headers(config: CashfreeConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": config.appId,
    "x-client-secret": config.secretKey,
  };
}

function orderId(): string {
  return `lo_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

async function cashfreeFetch<T>(config: CashfreeConfig, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: { ...headers(config), ...(init.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({})) as T & { message?: string };
  if (!response.ok) {
    throw new Error(`Cashfree ${response.status}: ${data.message ?? "request failed"}`);
  }
  return data;
}

function parsedCredits(value: unknown): number | null {
  const credits = Math.floor(Number(value));
  return Number.isFinite(credits) && credits >= MIN_PURCHASE && credits <= MAX_PURCHASE ? credits : null;
}

function verifyWebhook(req: Request, config: CashfreeConfig): boolean {
  const signature = req.header("x-webhook-signature");
  const timestamp = req.header("x-webhook-timestamp");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!signature || !timestamp || !rawBody) return false;
  const expected = crypto.createHmac("sha256", config.secretKey)
    .update(timestamp)
    .update(rawBody)
    .digest("base64");
  const received = Buffer.from(signature);
  const generated = Buffer.from(expected);
  return received.length === generated.length && crypto.timingSafeEqual(received, generated);
}

function webhookOrder(payload: Record<string, unknown>): { orderId?: string; paymentId?: string; status?: string; method?: string } {
  const data = payload.data as Record<string, unknown> | undefined;
  const order = data?.order as Record<string, unknown> | undefined;
  const payment = data?.payment as Record<string, unknown> | undefined;
  return {
    orderId: typeof order?.order_id === "string" ? order.order_id : undefined,
    paymentId: payment?.cf_payment_id != null ? String(payment.cf_payment_id) : undefined,
    status: typeof payment?.payment_status === "string" ? payment.payment_status : undefined,
    method: typeof payment?.payment_group === "string" ? payment.payment_group : undefined,
  };
}

async function applySuccessfulPayment(order: CashfreePaymentLike, paymentId: string | null, providerStatus: string, method: string | null) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(cashfreePaymentsTable)
      .set({
        status: "paid",
        cfPaymentId: paymentId ?? order.cfPaymentId,
        providerStatus,
        paymentMethod: method ?? order.paymentMethod,
        paidAt: order.paidAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(cashfreePaymentsTable.orderId, order.orderId), ne(cashfreePaymentsTable.status, "paid")))
      .returning();
    if (!updated) return { already: true, balance: null };
    const grant = await grantCreditsTx(tx, {
      userId: updated.userId,
      amount: updated.credits,
      type: "purchase",
      description: `Cashfree top-up — ₹${updated.amountInr}`,
      reference: `cashfree:${updated.orderId}`,
    });
    if (!grant.ok && !grant.already) throw new Error("CASHFREE_GRANT_FAILED");
    return { already: grant.already, balance: grant.balance };
  });
}

type CashfreePaymentLike = {
  orderId: string;
  cfPaymentId: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;
};

async function reconcileOrder(orderIdValue: string, userId: number, config: CashfreeConfig) {
  const [local] = await db.select().from(cashfreePaymentsTable)
    .where(and(eq(cashfreePaymentsTable.orderId, orderIdValue), eq(cashfreePaymentsTable.userId, userId))).limit(1);
  if (!local) return { kind: "not_found" as const };
  const remote = await cashfreeFetch<CashfreeOrder>(config, `/orders/${encodeURIComponent(orderIdValue)}`, { method: "GET" });
  const status = (remote.order_status ?? "UNKNOWN").toUpperCase();
  if (status === "PAID") {
    const result = await applySuccessfulPayment(local, null, status, null);
    return { kind: "paid" as const, credits: local.credits, ...result };
  }
  const mapped = status === "EXPIRED" ? "expired" : status === "CANCELLED" ? "cancelled" : status === "FAILED" ? "failed" : "pending";
  await db.update(cashfreePaymentsTable).set({ status: mapped, providerStatus: status, updatedAt: new Date() })
    .where(and(eq(cashfreePaymentsTable.orderId, orderIdValue), eq(cashfreePaymentsTable.userId, userId), ne(cashfreePaymentsTable.status, "paid")));
  return { kind: mapped as "pending" | "failed" | "cancelled" | "expired", credits: local.credits };
}

router.post("/credits/cashfree/order", requireAuth, async (req: Request, res: Response) => {
  const config = getConfig();
  if (!config) {
    res.status(503).json({ error: "Cashfree payments are not configured yet." });
    return;
  }
  const credits = parsedCredits((req.body as { credits?: unknown }).credits);
  if (credits === null) {
    res.status(400).json({ error: `Choose between ${MIN_PURCHASE} and ${MAX_PURCHASE} credits` });
    return;
  }
  const userId = req.session.userId!;
  const [user] = await db.select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const id = orderId();
  await db.insert(cashfreePaymentsTable).values({ userId, orderId: id, credits, amountInr: credits, status: "pending" });
  try {
    const remote = await cashfreeFetch<CashfreeOrder>(config, "/orders", {
      method: "POST",
      body: JSON.stringify({
        order_id: id,
        order_amount: credits,
        order_currency: "INR",
        customer_details: {
          customer_id: `leadonto_${userId}`,
          customer_name: user.name || "Lead Onto learner",
          customer_email: user.email,
          customer_phone: "9999999999",
        },
        order_note: `Lead Onto credit top-up (${credits} credits)`,
        order_meta: {
          // Always return to the same canonical credits page after checkout.
          return_url: `${CREDIT_RETURN_URL}?cashfreeOrder=${encodeURIComponent(id)}`,
          notify_url: `https://leadonto.com/api/credits/cashfree/webhook`,
        },
      }),
    });
    if (!remote.payment_session_id) throw new Error("Cashfree did not return a payment session");
    res.json({ ok: true, orderId: id, paymentSessionId: remote.payment_session_id, mode: config.environment, credits });
  } catch (err) {
    await db.update(cashfreePaymentsTable).set({ status: "failed", providerStatus: "CREATE_FAILED", updatedAt: new Date() }).where(eq(cashfreePaymentsTable.orderId, id));
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message, userId }, "Cashfree order creation failed");
    const domainRejected = /whitelist|enabled or approved|merchant\.cashfree\.com/i.test(message);
    res.status(502).json({
      error: domainRejected
        ? "Cashfree has not approved leadonto.com yet. Add leadonto.com to the Cashfree checkout whitelist, then try again."
        : "Could not start payment. Please try again.",
    });
  }
});

router.get("/credits/cashfree/status/:orderId", requireAuth, async (req: Request, res: Response) => {
  const config = getConfig();
  if (!config) { res.status(503).json({ error: "Cashfree payments are not configured yet." }); return; }
  const result = await reconcileOrder(String(req.params.orderId), req.session.userId!, config);
  if (result.kind === "not_found") { res.status(404).json({ error: "Payment not found" }); return; }
  res.json({ status: result.kind, credits: result.credits, already: "already" in result ? result.already : false });
});

router.post("/credits/cashfree/webhook", async (req: Request, res: Response) => {
  const config = getConfig();
  if (!config || !verifyWebhook(req, config)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }
  try {
    const info = webhookOrder(req.body as Record<string, unknown>);
    if (!info.orderId || !info.status) { res.status(400).json({ error: "Invalid webhook payload" }); return; }
    const [local] = await db.select().from(cashfreePaymentsTable).where(eq(cashfreePaymentsTable.orderId, info.orderId)).limit(1);
    if (!local) { res.status(404).json({ error: "Order not found" }); return; }
    if (info.status.toUpperCase() === "SUCCESS") {
      await applySuccessfulPayment(local, info.paymentId ?? null, info.status, info.method ?? null);
    } else {
      const mapped = info.status.toUpperCase().includes("EXPIRED") ? "expired" : info.status.toUpperCase().includes("CANCEL") ? "cancelled" : "failed";
      await db.update(cashfreePaymentsTable).set({ status: mapped, providerStatus: info.status, updatedAt: new Date() })
        .where(and(eq(cashfreePaymentsTable.orderId, info.orderId), ne(cashfreePaymentsTable.status, "paid")));
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Cashfree webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;