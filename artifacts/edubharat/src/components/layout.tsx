import { Link, useLocation } from "wouter";
import { Navbar } from "./navbar";
import { MobileStickyCTA, shouldShowMobileStickyCTA } from "./mobile-sticky-cta";
import { useContent } from "@/lib/use-content";

const PRODUCT_LINKS = [
  { href: "/english-guru", label: "English Guru" },
  { href: "/interview-ace", label: "Mock Interview" },
  { href: "/tools-pro", label: "Tools Pro" },
  { href: "/rozgar-samachar", label: "Rozgar Samachar" },
  { href: "/resume-intelligence", label: "Resume Intelligence" },
  { href: "/communication-check", label: "Communication Check" },
  { href: "/learning-journey", label: "Learning Journey" },
] as const;

const FOR_LINKS = [
  { href: "/for-colleges", label: "For Colleges" },
  { href: "/pricing", label: "Pricing" },
  { href: "/credits", label: "Buy credits" },
] as const;

function Footer() {
  const [, navigate] = useLocation();
  const tagline = useContent(
    "footer.brandStatement",
    "Helping India's next generation know what to say, how to say it, and how to prepare for the opportunities ahead.",
  );
  const contactEmail = useContent("footer.contact.email", "email@leadonto.com");
  const contactPhone = useContent("footer.contact.phone", "8009785785");
  const legalOwner = useContent("legal.owner.name", "LeadOnto.com");

  return (
    <footer className="mt-auto bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              className="mb-3 block font-display text-xl font-bold text-primary transition-opacity hover:opacity-80"
            >
              Lead Onto
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-secondary-foreground/60">{tagline}</p>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground/40">Products</h3>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground/40">For</h3>
            <ul className="space-y-2">
              {FOR_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={(e) => {
                      // Match old behaviour for /credits — always fire a navigate so
                      // wouter can attach ?returnTo params on inner pages.
                      if (href === "/credits") {
                        e.preventDefault();
                        navigate("/credits");
                      }
                    }}
                    className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/b2b/login"
                  className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                >
                  B2B Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary-foreground/40">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about-us" className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  {contactEmail}
                </a>
              </li>
              <li>
                <a href={`tel:+91${contactPhone}`} className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  {contactPhone}
                </a>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-refund" className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary">
                  Shipping &amp; Refund
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-secondary-foreground/10 pt-6 text-xs text-secondary-foreground/40 sm:flex-row">
          <p>© {new Date().getFullYear()} Lead Onto · Legal owner: {legalOwner}. All rights reserved.</p>
          <p>Built for learners across India</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout({
  children,
  compact = false,
  showFooter = true,
}: {
  children: React.ReactNode;
  compact?: boolean;
  showFooter?: boolean;
}) {
  const [location] = useLocation();
  const showMobileCtaSpace = !compact && shouldShowMobileStickyCTA(location);
  return (
    <div className={compact ? "flex h-[100dvh] flex-col overflow-hidden bg-background" : "flex min-h-[100dvh] flex-col"}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        className={
          compact
            ? "flex min-h-0 flex-1 animate-in flex-col overflow-y-auto fade-in duration-300"
            : `flex flex-1 animate-in flex-col fade-in duration-300${showMobileCtaSpace ? " pb-[4.5rem] md:pb-0" : ""}`
        }
      >
        {children}
      </main>
      {showFooter && <Footer />}
      {/* Global mobile sticky CTA — hides itself on product / admin / auth routes */}
      <MobileStickyCTA />
    </div>
  );
}
