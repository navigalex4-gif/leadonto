import { Link, useLocation } from "wouter";
import { CreditCard, Users, FileText, BriefcaseIcon, Building2, Activity, Mail, Timer, BarChart3 } from "lucide-react";

const TABS = [
  { href: "/admin-payments", label: "Payments", icon: CreditCard },
  { href: "/admin-users", label: "Users", icon: Users },
  { href: "/admin-interviews", label: "Interviews", icon: BriefcaseIcon },
  { href: "/admin-communication-checks", label: "90-sec Checks", icon: Timer },
  { href: "/admin-b2b", label: "B2B", icon: Building2 },
  { href: "/admin-content", label: "Content", icon: FileText },
  { href: "/admin-resumes", label: "Resume", icon: FileText },
  { href: "/admin-activity", label: "Activity", icon: Activity },
  { href: "/admin-funnel", label: "Funnel", icon: BarChart3 },
  { href: "/admin-email", label: "Email", icon: Mail },
];

/** Shared tab bar shown across the admin pages. */
export function AdminNav() {
  const [location] = useLocation();
  return (
    <aside className="mb-6 lg:mb-0 lg:w-48 lg:shrink-0">
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border pb-1 lg:sticky lg:top-4 lg:flex-col lg:items-stretch lg:overflow-x-visible lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-2 lg:pb-2 lg:shadow-sm lg:max-h-[calc(100vh-7rem)]" aria-label="Admin sections">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href === "/admin-payments" && location === "/admin");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors lg:border-b-0 lg:border-l-2 lg:-ml-2 ${
              active
                ? "border-primary text-primary lg:bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-secondary lg:hover:bg-muted"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
      </nav>
    </aside>
  );
}
