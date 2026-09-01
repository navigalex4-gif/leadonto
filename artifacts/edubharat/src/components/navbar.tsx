import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Bookmark,
  LogIn,
  LogOut,
  User,
  BarChart2,
  Menu,
  X,
  BookOpen,
  Mic,
  Newspaper,
  Settings,
  FileText,
  Route,
  Coins,
  Sparkles,
  Shield,
  CreditCard,
  Users as UsersIcon,
  Building2,
  Tag,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { useHistory } from "@/lib/use-history";
import { useAuth } from "@/lib/use-auth";
import { useCredits } from "@/lib/use-credits";
import { Button } from "@/components/ui/button";

/** Every student-facing product stays discoverable from the public navigation. */
const PRODUCT_LINKS = [
  { href: "/english-guru", label: "English Guru", icon: BookOpen },
  { href: "/interview-ace", label: "Interview Ace", icon: Mic },
  { href: "/tools-pro", label: "Tools Pro", icon: Sparkles },
  { href: "/rozgar-samachar", label: "Rozgar Samachar", icon: Newspaper },
  { href: "/resume-intelligence", label: "Resume Intelligence", icon: FileText },
  { href: "/communication-check", label: "Communication Check", icon: MessageCircle },
  { href: "/learning-journey", label: "Learning Journey", icon: Route },
] as const;

const PRIMARY_LINKS = PRODUCT_LINKS.slice(0, 2);

const SECONDARY_LINKS = [
  { href: "/for-colleges", label: "For Colleges", icon: Building2 },
  { href: "/pricing", label: "Pricing", icon: Tag },
] as const;

export function Navbar() {
  const [location] = useLocation();
  const { items } = useHistory();
  const { user, logout } = useAuth();
  const { balance, authenticated, refetch: refetchCredits } = useCredits();
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const productsMenuRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const isB2BRoute = location.startsWith("/b2b");

  useEffect(() => {
    void refetchCredits();
  }, [user?.id, refetchCredits]);
  useEffect(() => {
    setOpen(false);
    setProductsOpen(false);
  }, [location]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const firstFocusable = drawer?.querySelector<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
        .filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [open]);
  useEffect(() => {
    if (!productsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [productsOpen]);

  const isActive = (href: string) => location === href;
  const pathOnly = location.split("?")[0] ?? "/";

  // Interview Ace is a stateful route. From its feedback screen, a second tap
  // on the nav item must deliberately request the setup screen instead of
  // leaving the user on the completed report.
  const linkFor = (href: string) => {
    if (href === "/interview-ace" && pathOnly === "/interview-ace") {
      return "/interview-ace?begin=1";
    }
    return href;
  };

  return (
    <>
      <nav className="leadonto-navbar w-full max-w-full border-b sticky top-0 z-50 overflow-visible">
        <div className="container relative mx-auto flex w-full min-w-0 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-4 h-14 overflow-visible">
          {/* Logo */}
          <Link
            href="/"
            className="font-display font-extrabold text-lg sm:text-xl text-primary tracking-tight shrink-0"
          >
            Lead Onto
          </Link>

          {/* Desktop product navigation */}
          <div className="hidden md:flex items-center gap-1 ml-3">
            {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={linkFor(href)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  pathOnly === href
                    ? "bg-primary/10 text-primary"
                    : "text-secondary/80 hover:bg-muted/60 hover:text-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}

            <div ref={productsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProductsOpen((current) => !current)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  PRODUCT_LINKS.some(({ href }) => pathOnly === href)
                    ? "bg-primary/10 text-primary"
                    : "text-secondary/80 hover:bg-muted/60 hover:text-secondary"
                }`}
                aria-haspopup="menu"
                aria-expanded={productsOpen}
              >
                <Sparkles className="h-3.5 w-3.5" />
                All Products
                <span className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-extrabold tabular-nums">
                  {PRODUCT_LINKS.length}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
              </button>
              {productsOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-2 w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-white p-2 shadow-xl"
                  role="menu"
                  aria-label="All products"
                >
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Product suite</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Every tool for communication and career readiness.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PRODUCT_LINKS.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                          pathOnly === href ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="mx-1 h-4 w-px bg-border" />

            {SECONDARY_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-secondary/80 hover:bg-muted/60 hover:text-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions (desktop) */}
          {!isB2BRoute && (
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                href="/progress"
                title="Progress"
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  isActive("/progress")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                Progress
              </Link>

              <Link
                href="/history"
                title="Saved"
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  isActive("/history")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                Saved
                {items.length > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {items.length > 9 ? "9+" : items.length}
                  </span>
                )}
              </Link>

              {user?.isAdmin && (
                <Link
                  href="/admin"
                  title="Admin Panel"
                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}

              {authenticated && (
                <Link
                  href="/credits"
                  title="Your credits"
                  className="leadonto-credit inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  <Coins className="h-3.5 w-3.5" />
                  {balance ?? "…"}
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-1.5">
                  <Link href="/profile" className="flex items-center gap-1.5 transition-opacity hover:opacity-80">
                    {user.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name ?? user.email}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full border-2 border-primary/20"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <span className="max-w-[96px] truncate text-xs font-medium text-secondary">
                      {user.name ?? user.email}
                    </span>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <Link href={`/login?returnTo=${encodeURIComponent(location)}`}>
                  <Button variant="outline" size="sm" className="leadonto-sign-in h-7 px-3 text-xs font-semibold">
                    <LogIn className="mr-1 h-3.5 w-3.5" />
                    Sign In
                  </Button>
                </Link>
              )}

              <Link
                href="/english-guru"
                className="inline-flex items-center gap-1 rounded-lg bg-[#F97316] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#C2410C]"
              >
                Start Free
              </Link>
            </div>
          )}

          {/* Mobile right side */}
          <div className="flex items-center gap-0.5 ml-auto md:hidden">
            {!isB2BRoute && authenticated && (
              <Link
                href="/credits"
                className="leadonto-credit inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700"
                title="Your credits"
              >
                <Coins className="h-3 w-3" />
                {balance ?? "…"}
              </Link>
            )}
            {!isB2BRoute && !user && (
              <Link
                href={`/login?returnTo=${encodeURIComponent(location)}`}
                className="leadonto-sign-in flex min-h-11 min-w-10 items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Sign in"
                title="Sign in"
              >
                <LogIn className="h-5 w-5 text-secondary" />
              </Link>
            )}
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-navigation-drawer"
            >
              {open ? <X className="h-5 w-5 text-secondary" /> : <Menu className="h-5 w-5 text-secondary" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b px-5">
          <span className="font-display text-lg font-extrabold text-primary">Lead Onto</span>
          <button
            onClick={() => setOpen(false)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 hover:bg-muted"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5 text-secondary" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Products</p>
          {PRODUCT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={linkFor(href)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                pathOnly === href ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {pathOnly === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          ))}

          <div className="mx-3 my-3 h-px bg-border" />
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">For business</p>
          {SECONDARY_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                isActive(href) ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
          <Link
            href="/b2b/login"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              location.startsWith("/b2b") ? "bg-violet-50 text-violet-700" : "text-secondary hover:bg-muted"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            B2B Portal
          </Link>

          {user?.isAdmin && (
            <>
              <div className="mx-3 my-3 h-px bg-border" />
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Panel</p>
              <Link
                href="/admin-payments"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive("/admin-payments") || isActive("/admin")
                    ? "bg-violet-50 text-violet-700"
                    : "text-secondary hover:bg-muted"
                }`}
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                Payments
              </Link>
              <Link
                href="/admin-users"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive("/admin-users") ? "bg-violet-50 text-violet-700" : "text-secondary hover:bg-muted"
                }`}
              >
                <UsersIcon className="h-4 w-4 shrink-0" />
                Users
              </Link>
              <Link
                href="/admin-content"
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive("/admin-content") ? "bg-violet-50 text-violet-700" : "text-secondary hover:bg-muted"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                Content
              </Link>
            </>
          )}

          <div className="mx-3 my-3 h-px bg-border" />
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">My Account</p>

          <Link
            href="/progress"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              isActive("/progress") ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
            }`}
          >
            <BarChart2 className="h-4 w-4 shrink-0" />
            Progress
          </Link>

          <Link
            href="/history"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              isActive("/history") ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
            }`}
          >
            <Bookmark className="h-4 w-4 shrink-0" />
            Saved
            {items.length > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {items.length}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              isActive("/profile") ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            My Profile
          </Link>

          <Link
            href="/credits"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
              isActive("/credits") ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted"
            }`}
          >
            <Coins className="h-4 w-4 shrink-0" />
            Credits
            {authenticated && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                <Coins className="h-3.5 w-3.5" />
                {balance ?? "…"}
              </span>
            )}
          </Link>
        </div>

        <div className="border-t px-4 py-4">
          {isB2BRoute ? (
            <Link href="/" onClick={() => setOpen(false)} className="block">
              <Button variant="outline" className="w-full font-semibold">
                ← Back to Lead Onto
              </Button>
            </Link>
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full border-2 border-primary/20"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-secondary">{user.name ?? "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0 px-3 text-sm font-semibold text-muted-foreground hover:text-destructive"
                onClick={() => {
                  void logout();
                  setOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Link href={`/login?returnTo=${encodeURIComponent(location)}`} className="block">
              <Button className="w-full font-bold">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
