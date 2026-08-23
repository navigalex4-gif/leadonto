import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Coins, Sparkles, Check, Loader2, Mic, MessageCircle, GraduationCap,
  LogIn, ShieldCheck, Infinity as InfinityIcon, Clock, CheckCircle2,
  XCircle, ArrowLeft, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { track, trackFunnel, trackGoogleAdsPurchase } from "@/lib/analytics";
import { PageMeta } from "@/components/page-meta";
import {
  useCredits, createCashfreeOrder, getCashfreeStatus, fetchTransactions,
  refreshCredits, CREDIT_MIN_PURCHASE, CREDIT_QUICK_PICKS, type CreditTx,
} from "@/lib/use-credits";
import { useContent } from "@/lib/use-content";

type Stage = "pick" | "pending" | "paid" | "failed";

const TX_LABEL: Record<string, string> = {
  signup_grant: "Welcome bonus", purchase: "Top-up", spend_interview: "Interview",
  spend_live: "Live conversation", refund: "Refund", adjustment: "Adjustment",
};

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function loadCashfree(mode: "sandbox" | "production" = "sandbox"): Promise<(args: { paymentSessionId: string; redirectTarget: "_self" | "_modal" }) => Promise<unknown>> {
  const existing = (window as Window & { Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: (args: { paymentSessionId: string; redirectTarget: "_self" | "_modal" }) => Promise<unknown> } }).Cashfree;
  if (existing) return Promise.resolve((args) => existing({ mode }).checkout(args));
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => {
      const cashfree = (window as Window & { Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: (args: { paymentSessionId: string; redirectTarget: "_self" | "_modal" }) => Promise<unknown> } }).Cashfree;
      if (!cashfree) reject(new Error("Cashfree checkout could not load"));
      else resolve((args) => cashfree({ mode }).checkout(args));
    };
    script.onerror = () => reject(new Error("Cashfree checkout could not load"));
    document.head.appendChild(script);
  });
}

export default function BuyCredits() {
  const { balance, authenticated, loaded } = useCredits();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const returnTo = useMemo(() => {
    const value = params.get("returnTo");
    return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
  }, [params]);
  const returnedOrder = params.get("cashfreeOrder");
  const returnedSession = params.get("cashfreeSession");
  const heroTitle = useContent("credits.hero.title", "Lead Onto Credits");
  const heroSubtitle = useContent("credits.hero.subtitle", "1 credit = ₹1. Pay securely with UPI, cards, or net banking. Credits never expire.");
  const [stage, setStage] = useState<Stage>("pick");
  const [amount, setAmount] = useState(10);
  const [orderId, setOrderId] = useState<string | null>(returnedOrder);
  const [orderCredits, setOrderCredits] = useState(amount);
  const [submitting, setSubmitting] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [txns, setTxns] = useState<CreditTx[]>([]);
  const trackedPurchaseRef = useRef<string | null>(null);

  const valid = Number.isFinite(amount) && amount >= CREDIT_MIN_PURCHASE && amount <= 100_000;
  const loginReturnTo = returnTo ?? "/credits";

  useEffect(() => { if (authenticated) void fetchTransactions().then(setTxns); }, [authenticated, balance]);
  useEffect(() => { trackFunnel("payment_page_viewed", { returnTo: returnTo ?? undefined }); }, [returnTo]);
  useEffect(() => {
    // Payment status is polled and the component can rerender several times.
    // Report one Google Ads conversion per server-confirmed order only.
    if (stage !== "paid" || !orderId || trackedPurchaseRef.current === orderId) return;
    if (trackGoogleAdsPurchase(orderId, orderCredits)) trackedPurchaseRef.current = orderId;
  }, [orderCredits, orderId, stage]);

  const reconcile = useCallback(async (id: string) => {
    const result = await getCashfreeStatus(id);
    if (!result) return false;
    if (result.status === "paid") { setStage("paid"); void refreshCredits(); return true; }
    if (["failed", "cancelled", "expired"].includes(result.status)) { setStage("failed"); return true; }
    return false;
  }, []);

  useEffect(() => {
    if (!returnedOrder || returnedSession) return;
    setStage("pending");
    void reconcile(returnedOrder);
  }, [returnedOrder, returnedSession, reconcile]);

  useEffect(() => {
    if (!returnedOrder || !returnedSession) return;
    setOrderId(returnedOrder);
    setStage("pending");
    let cancelled = false;
    void (async () => {
      try {
        const checkout = await loadCashfree("sandbox");
        if (!cancelled) await checkout({ paymentSessionId: returnedSession, redirectTarget: "_self" });
      } catch {
        if (!cancelled) toast({ title: "Checkout could not open", description: "Please return to the app and try again.", variant: "destructive" });
      }
    })();
    return () => { cancelled = true; };
  }, [returnedOrder, returnedSession, toast]);

  useEffect(() => {
    if (stage !== "pending" || !orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const done = await reconcile(orderId);
      if (!done && !cancelled) { setPollCount((n) => n + 1); timer = setTimeout(() => void poll(), 4000); }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [stage, orderId, reconcile]);

  const startCheckout = useCallback(async () => {
    if (!valid) return;
    setSubmitting(true);
    track("payment_started", { amount, method: "cashfree" });
    const result = await createCashfreeOrder(amount);
    if (!result.ok || !result.orderId || !result.paymentSessionId) {
      setSubmitting(false);
      toast({ title: "Could not start payment", description: result.error ?? "Please try again.", variant: "destructive" });
      return;
    }
    setOrderId(result.orderId);
    setOrderCredits(result.credits ?? amount);
    setStage("pending");
    setSubmitting(false);
    try {
      const checkout = await loadCashfree(result.mode ?? "sandbox");
      await checkout({ paymentSessionId: result.paymentSessionId, redirectTarget: "_self" });
    } catch {
      toast({ title: "Checkout could not open", description: "Your order is saved. You can retry from this page.", variant: "destructive" });
      setStage("pending");
    }
  }, [amount, toast, valid]);

  const reset = () => { setStage("pick"); setOrderId(null); setPollCount(0); };
  const uses = useMemo(() => [
    { icon: MessageCircle, title: "Live Conversation", cost: "1 credit / 12 min", note: "5 credits covers 60 minutes" },
    { icon: Mic, title: "Mock Interviews", cost: "Up to 5 credits", note: "Pay only for blocks you enter" },
    { icon: GraduationCap, title: "Everything else", cost: "Free", note: "Lessons, grammar, writing, jobs & news" },
  ], []);

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8">
      <PageMeta title="Buy Credits · Lead Onto" description="Top up Lead Onto credits securely with Cashfree. 1 credit = ₹1. Credits never expire." />
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm"><Coins className="w-8 h-8" /></div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-secondary mb-2">{heroTitle}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">{heroSubtitle}</p>
      </div>
      {loaded && authenticated ? (
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-amber-50 to-white"><CardContent className="py-6 flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-600/80 mb-1">Your balance</p><p className="text-4xl font-display font-extrabold text-secondary flex items-center gap-2"><Coins className="w-7 h-7 text-amber-500" />{balance ?? "…"}<span className="text-lg font-semibold text-muted-foreground">credits</span></p></div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><InfinityIcon className="w-3.5 h-3.5" /> Never expire</span><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Cashfree secured</span></div>
        </CardContent></Card>
      ) : loaded ? (
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-primary/5 to-white"><CardContent className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><div className="flex items-start gap-3"><Sparkles className="w-6 h-6 text-primary shrink-0 mt-0.5" /><div><p className="font-bold text-secondary">Get 20 free credits</p><p className="text-sm text-muted-foreground">Create your free account to claim 20 credits and start practising.</p></div></div><Link href={`/login?returnTo=${encodeURIComponent(loginReturnTo)}`}><Button className="font-bold shrink-0"><LogIn className="w-4 h-4 mr-1.5" />Create free account</Button></Link></CardContent></Card>
      ) : <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
      {loaded && authenticated && stage === "pick" && <Card className="mb-6 border shadow-sm"><CardContent className="py-6">
        <h2 className="font-bold text-secondary mb-4">Choose an amount</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">{CREDIT_QUICK_PICKS.map((c) => <button key={c} onClick={() => setAmount(c)} className={`relative rounded-xl border-2 px-4 py-3 text-left transition-all hover:shadow-sm ${amount === c ? "border-amber-400 bg-amber-50" : "border-border bg-card hover:border-amber-200"}`}><span className="block text-lg font-extrabold text-secondary flex items-center gap-1"><Coins className="w-4 h-4 text-amber-500" />{c}</span><span className="block text-xs text-muted-foreground">₹{c}</span>{c === 99 && <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Popular</span>}</button>)}<div className={`rounded-xl border-2 px-3 py-2 flex flex-col justify-center ${!CREDIT_QUICK_PICKS.includes(amount) ? "border-amber-400 bg-amber-50" : "border-border"}`}><label className="text-[11px] font-semibold text-muted-foreground mb-1">Custom</label><input type="number" min={CREDIT_MIN_PURCHASE} max={100000} value={amount} onChange={(e) => setAmount(Math.floor(Number(e.target.value)))} className="w-full bg-transparent text-lg font-extrabold text-secondary outline-none" /></div></div>
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 mb-5"><span className="text-sm text-muted-foreground">You'll get</span><span className="font-bold text-secondary">{valid ? amount : "—"} credits <span className="text-muted-foreground font-normal">for ₹{valid ? amount : "—"}</span></span></div>
        <Button className="w-full h-12 font-bold text-base bg-amber-500 hover:bg-amber-600 text-white" onClick={() => void startCheckout()} disabled={!valid || submitting}><CreditCard className="w-5 h-5 mr-2" />{submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening secure checkout…</> : `Pay ₹${valid ? amount : "—"} securely`}</Button>
        {!valid && <p className="text-xs text-center text-destructive mt-2">Choose between {CREDIT_MIN_PURCHASE} and 100,000 credits.</p>}
      </CardContent></Card>}
      {stage === "pending" && <Card className="mb-6 border-amber-200 bg-amber-50/60 shadow-sm"><CardContent className="py-8 text-center"><Clock className="w-10 h-10 text-amber-600 animate-pulse mx-auto mb-4" /><h2 className="font-bold text-secondary text-xl mb-2">Confirming your payment</h2><p className="text-sm text-muted-foreground">Cashfree is confirming ₹{orderCredits}. Credits appear automatically after successful confirmation.</p><p className="text-xs text-muted-foreground mt-2">{pollCount ? `Checked ${pollCount} time${pollCount > 1 ? "s" : ""}.` : "Please keep this page open."}</p></CardContent></Card>}
      {stage === "paid" && <Card className="mb-6 border-green-200 bg-green-50/60 shadow-sm"><CardContent className="py-8 text-center"><CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" /><h2 className="font-bold text-secondary text-xl mb-2">Payment successful</h2><p className="text-sm text-muted-foreground mb-6"><strong className="text-secondary">{orderCredits} credits</strong> have been added to your account.</p><div className="flex flex-col sm:flex-row gap-3 justify-center"><Button className="bg-primary hover:bg-primary/90 font-bold" onClick={() => navigate(returnTo ?? "/")}>{returnTo ? "Continue practising" : "Go to dashboard"}</Button><Button variant="outline" onClick={reset}>Buy more credits</Button></div></CardContent></Card>}
      {stage === "failed" && <Card className="mb-6 border-destructive/30 bg-destructive/5 shadow-sm"><CardContent className="py-8 text-center"><XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /><h2 className="font-bold text-secondary text-xl mb-2">Payment not completed</h2><p className="text-sm text-muted-foreground mb-6">No credits were added. You can safely try again.</p><Button variant="outline" onClick={reset}><ArrowLeft className="w-4 h-4 mr-1.5" />Try again</Button></CardContent></Card>}
      {(stage === "pick" || stage === "paid") && <Card className="mb-6 border shadow-sm"><CardContent className="py-6"><h2 className="font-bold text-secondary mb-4">How credits work</h2><div className="space-y-3">{uses.map(({ icon: Icon, title, cost, note }) => <div key={title} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-secondary" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-secondary text-sm">{title}</p><p className="text-xs text-muted-foreground">{note}</p></div><span className="text-sm font-bold shrink-0 text-secondary">{cost}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><InfinityIcon className="w-3.5 h-3.5" /> Credits never expire</span><span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-600" /> No subscription</span><span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Secure Cashfree checkout</span></div></CardContent></Card>}
      {authenticated && txns.length > 0 && (stage === "pick" || stage === "paid") && <Card className="border shadow-sm"><CardContent className="py-6"><h2 className="font-bold text-secondary mb-4">Recent activity</h2><div className="divide-y">{txns.map((tx) => <div key={tx.id} className="flex items-center justify-between py-2.5"><div className="min-w-0"><p className="text-sm font-semibold text-secondary truncate">{tx.description || TX_LABEL[tx.type] || tx.type}</p><p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p></div><div className="text-right shrink-0 ml-3"><span className={`text-sm font-bold ${tx.amount >= 0 ? "text-green-600" : "text-secondary"}`}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span><p className="text-[11px] text-muted-foreground">bal {tx.balanceAfter}</p></div></div>)}</div></CardContent></Card>}
    </div>
  );
}