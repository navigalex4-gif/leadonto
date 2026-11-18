import { Link } from "wouter";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cloud,
  Database,
  FileText,
  Headphones,
  Laptop,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import { PageMeta } from "@/components/page-meta";

const BACK_OFFICE_SERVICES = [
  {
    icon: Wallet,
    title: "Bookkeeping & Reconciliation Support",
    description: "Organise transaction records, maintain bookkeeping inputs and reconcile agreed bank, card or ledger accounts.",
    includes: ["Transaction categorisation and record upkeep", "Bank and ledger reconciliation schedules", "Unmatched-item and missing-document reports"],
  },
  {
    icon: Receipt,
    title: "Billing, Invoicing & Receivables",
    description: "Keep routine billing administration, invoice registers and due-date follow-ups organised.",
    includes: ["Sales and purchase invoice registers", "Invoice preparation from approved source data", "Receivables ageing and payment reminder trackers"],
  },
  {
    icon: Users,
    title: "HR & Payroll Administration",
    description: "Support recurring people-operations administration and prepare clean inputs for authorised payroll review.",
    includes: ["Employee records and onboarding checklists", "Attendance, leave and payroll-input collation", "Monthly HR administration summaries"],
  },
  {
    icon: Database,
    title: "Data Processing & Reporting",
    description: "Turn recurring data-entry and spreadsheet work into a consistent, reviewable process.",
    includes: ["Spreadsheet updates and agreed data checks", "CRM and business-system record maintenance", "Recurring operational reports and data clean-up"],
  },
  {
    icon: FileText,
    title: "Document & Administrative Support",
    description: "Handle defined document and office-administration tasks so internal teams can focus on core work.",
    includes: ["Document naming, indexing and digital filing", "Meeting schedules, action logs and coordination", "Routine administrative task queues and SOPs"],
  },
] as const;

const IT_SERVICES = [
  {
    icon: Headphones,
    title: "IT Helpdesk & User Support",
    description: "Provide a structured first point of contact for day-to-day workplace technology issues.",
    includes: ["Helpdesk intake, prioritisation and ticket tracking", "Remote troubleshooting for agreed devices and applications", "User onboarding, offboarding and IT asset records"],
  },
  {
    icon: Laptop,
    title: "Website & Business Application Development",
    description: "Design and build practical websites, portals and focused business applications to an agreed specification.",
    includes: ["Responsive business websites and landing pages", "Internal portals and workflow-focused applications", "Functional testing, launch checklists and handover"],
  },
  {
    icon: Cloud,
    title: "Cloud, Email & Infrastructure",
    description: "Set up and organise the core cloud services used by a small or growing business.",
    includes: ["Business email, domains, DNS and hosting setup", "Cloud workspace and user-access configuration", "Backup configuration and infrastructure documentation"],
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description: "Reduce repetitive manual work with defined automations for recurring business processes.",
    includes: ["Process mapping and automation suitability review", "Form, approval, notification and reporting workflows", "Exception handling, testing and team handover"],
  },
  {
    icon: Building2,
    title: "Systems Integration & Reporting",
    description: "Connect approved business applications and reduce duplicated work across disconnected tools.",
    includes: ["API and SaaS integration scoping", "Data mapping and agreed system-to-system handoffs", "Operational dashboards and integration documentation"],
  },
] as const;

function ServiceCard({
  icon: Icon,
  title,
  description,
  includes,
}: {
  icon: (typeof BACK_OFFICE_SERVICES)[number]["icon"] | (typeof IT_SERVICES)[number]["icon"];
  title: string;
  description: string;
  includes: readonly string[];
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold leading-snug text-secondary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <ul className="mt-4 space-y-2 border-t border-border pt-4">
        {includes.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-secondary/80">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function BusinessServices() {
  return (
    <div className="min-w-0 bg-background">
      <PageMeta
        title="Business Services — Back Office & IT Support"
        description="Back-office operations and IT services for growing businesses: bookkeeping support, billing, HR administration, IT helpdesk, websites, cloud setup, automation and integrations."
      />

      <section className="relative isolate overflow-hidden bg-secondary text-secondary-foreground">
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="container mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary-foreground/70">Lead Onto · Business Services</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                Practical back-office and IT support for growing businesses.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-secondary-foreground/75 sm:text-lg">
                Delegate recurring operational work, improve everyday technology and keep your team focused. Start with a defined service scope, clear responsibilities and an agreed delivery plan.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact-us"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  Discuss your requirements <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#service-catalogue"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-secondary-foreground/25 px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary-foreground/10"
                >
                  Explore services
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-4">
                <Wallet className="h-6 w-6 text-primary-foreground/80" />
                <p className="mt-4 text-sm font-bold">Back-office operations</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary-foreground/65">Finance admin, billing, HR and records</p>
              </div>
              <div className="rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/5 p-4">
                <Laptop className="h-6 w-6 text-primary-foreground/80" />
                <p className="mt-4 text-sm font-bold">IT & digital services</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary-foreground/65">Helpdesk, cloud, development and automation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="service-catalogue" className="container mx-auto max-w-6xl space-y-14 px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Service catalogue</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">Choose the support your business needs</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Each engagement is scoped around your workload, systems, access requirements and turnaround expectations. The service list below shows the typical work that can be included.
          </p>
        </div>

        <section aria-labelledby="back-office-heading" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">01 · Operations</span>
              <h2 id="back-office-heading" className="mt-1 text-2xl font-extrabold text-secondary sm:text-3xl">Back Office Support</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Reliable support for routine business administration, finance operations, people records and data workflows.
              </p>
            </div>
            <Link href="/contact-us" className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-bold text-primary hover:underline sm:self-auto">
              Enquire about back-office support <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BACK_OFFICE_SERVICES.map((service) => <ServiceCard key={service.title} {...service} />)}
          </div>
        </section>

        <section aria-labelledby="it-services-heading" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">02 · Technology</span>
              <h2 id="it-services-heading" className="mt-1 text-2xl font-extrabold text-secondary sm:text-3xl">IT & Digital Services</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Practical technology support to maintain workplace systems, build digital tools and connect everyday workflows.
              </p>
            </div>
            <Link href="/contact-us" className="inline-flex min-h-10 items-center gap-2 self-start text-sm font-bold text-primary hover:underline sm:self-auto">
              Enquire about IT services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {IT_SERVICES.map((service) => <ServiceCard key={service.title} {...service} />)}
          </div>
        </section>

        <section className="grid gap-5 rounded-3xl border border-border bg-muted/40 p-5 sm:grid-cols-3 sm:p-7">
          {[
            { number: "01", title: "Discover", text: "Confirm the work, service owner, access needs and expected volumes." },
            { number: "02", title: "Agree the scope", text: "Set service hours, turnaround targets, approval steps and exclusions." },
            { number: "03", title: "Deliver & review", text: "Work through the agreed queue, report exceptions and review performance." },
          ].map((step) => (
            <div key={step.number}>
              <span className="text-xs font-extrabold tracking-widest text-primary">{step.number}</span>
              <h3 className="mt-2 font-bold text-secondary">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-bold text-amber-950">Clear scope and responsibility</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
                Back-office support is administrative and does not replace a qualified accountant, statutory auditor, tax adviser or legal professional. Payroll calculations, statutory filings, payment approvals and handling of client funds require separate written authorisation and appropriately qualified providers. IT services are delivered within agreed systems and support hours; penetration testing, security certification, 24/7 incident response and guaranteed uptime are not included unless separately contracted with qualified specialists.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-secondary p-6 text-secondary-foreground sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Need a tailored support arrangement?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary-foreground/70">Share the tasks, tools and service levels you need. We can define the scope and delivery responsibilities before work starts.</p>
          </div>
          <Link href="/contact-us" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            Contact the team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
