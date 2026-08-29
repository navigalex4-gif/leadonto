import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { PageSkeleton } from "@/components/page-skeleton";
import { reportWebVitals } from "@/lib/web-vitals";
import { trackFunnel, trackPageView } from "@/lib/analytics";

const queryClient = new QueryClient();

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const EnglishLanding = lazy(() => import("@/pages/english-landing"));
const EnglishGuru = lazy(() => import("@/pages/english-guru"));
const ToolsPro = lazy(() => import("@/pages/tools-pro"));
const InterviewAce = lazy(() => import("@/pages/interview-ace"));
const RozgarSamachar = lazy(() => import("@/pages/rozgar-samachar"));
const ResumeIntelligence = lazy(() => import("@/pages/resume-intelligence"));
const CommunicationCheck = lazy(() => import("@/pages/communication-check"));
const LearningJourney = lazy(() => import("@/pages/learning-journey"));
const History = lazy(() => import("@/pages/history"));
const Login = lazy(() => import("@/pages/login"));
const Progress = lazy(() => import("@/pages/progress"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const BuyCredits = lazy(() => import("@/pages/buy-credits"));
const Pricing = lazy(() => import("@/pages/pricing"));
const ForColleges = lazy(() => import("@/pages/for-colleges"));
const AdminPayments = lazy(() => import("@/pages/admin-payments"));
const AdminUsers = lazy(() => import("@/pages/admin-users"));
const AdminInterviews = lazy(() => import("@/pages/admin-interviews"));
const AdminCommunicationChecks = lazy(() => import("@/pages/admin-communication-checks"));
const AdminB2B = lazy(() => import("@/pages/admin-b2b"));
const AdminContent = lazy(() => import("@/pages/admin-content"));
const AdminResumes = lazy(() => import("@/pages/admin-resumes"));
const AdminActivity = lazy(() => import("@/pages/admin-activity"));
const AdminEmail = lazy(() => import("@/pages/admin-email"));
const AdminFunnel = lazy(() => import("@/pages/admin-funnel"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
// B2B portal
const B2BLogin = lazy(() => import("@/pages/b2b-login"));
const B2BRegister = lazy(() => import("@/pages/b2b-register"));
const B2BDashboard = lazy(() => import("@/pages/b2b-dashboard"));
const B2BCampaigns = lazy(() => import("@/pages/b2b-campaigns"));
const B2BCampaignNew = lazy(() => import("@/pages/b2b-campaign-new"));
const B2BCampaign = lazy(() => import("@/pages/b2b-campaign"));
const B2BCandidates = lazy(() => import("@/pages/b2b-candidates"));
const B2BCredits = lazy(() => import("@/pages/b2b-credits"));
const B2BInterviewLanding = lazy(() => import("@/pages/b2b-interview-landing"));
const Terms = lazy(() => import("@/pages/terms"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const ShippingRefund = lazy(() => import("@/pages/shipping-refund"));
const AboutUs = lazy(() => import("@/pages/about-us"));
const ContactUs = lazy(() => import("@/pages/contact-us"));

function Analytics() {
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location);
    if (location === "/") trackFunnel("landing_viewed", { placement: "homepage" });
    if (location === "/pricing") trackFunnel("payment_page_viewed", { placement: "pricing_page" });
  }, [location]);
  return null;
}

function RouteMetaPolicy() {
  const [location] = useLocation();
  const noindex = /^(?:\/(?:login|profile|progress|history|credits|admin(?:\/|$)|b2b(?:\/|$)|b2b-interview(?:\/|$)|interview-ace(?:\/|$)|resume-intelligence(?:\/|$)|learning-journey(?:\/|$))|\/english-guru\/(?:app|embed)(?:\/|$))/.test(location);
  return noindex ? <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet> : null;
}

function LegacyEnglishLandingRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/english-guru", { replace: true });
  }, [navigate]);
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#FFFDF9] text-secondary">
      <p className="text-sm text-muted-foreground">Opening English Guru…</p>
    </main>
  );
}

function Router() {
  return (
    <Switch>
      {/* Product routes that keep the compact / no-footer shells they already use */}
      <Route path="/english-guru">
        <Layout>
          <EnglishLanding />
        </Layout>
      </Route>
      <Route path="/lp/speak">
        <LegacyEnglishLandingRedirect />
      </Route>
      <Route path="/english-guru/app">
        <Layout compact showFooter={false}>
          <EnglishGuru />
        </Layout>
      </Route>
      <Route path="/english-guru/embed">
        <EnglishGuru embedded />
      </Route>
      <Route path="/interview-ace">
        <Layout compact showFooter={false}>
          <InterviewAce />
        </Layout>
      </Route>
      <Route path="/rozgar-samachar">
        <Layout compact showFooter={false}>
          <RozgarSamachar />
        </Layout>
      </Route>
      <Route path="/resume-intelligence">
        <Layout compact showFooter={false}>
          <ResumeIntelligence />
        </Layout>
      </Route>
      <Route path="/communication-check">
        <Layout compact showFooter={false}>
          <CommunicationCheck />
        </Layout>
      </Route>
      <Route path="/learning-journey">
        <Layout>
          <LearningJourney />
        </Layout>
      </Route>

      {/* All other routes use the standard Layout with footer + global mobile sticky */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/for-colleges" component={ForColleges} />
            <Route path="/tools-pro" component={ToolsPro} />
            <Route path="/history" component={History} />
            <Route path="/login" component={Login} />
            <Route path="/progress" component={Progress} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/credits" component={BuyCredits} />
            <Route path="/terms" component={Terms} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/shipping-refund" component={ShippingRefund} />
            <Route path="/about-us" component={AboutUs} />
            <Route path="/contact-us" component={ContactUs} />
            <Route path="/admin-login" component={AdminLogin} />
            <Route path="/admin-payments" component={AdminPayments} />
            <Route path="/admin-users" component={AdminUsers} />
            <Route path="/admin-interviews" component={AdminInterviews} />
            <Route path="/admin-communication-checks" component={AdminCommunicationChecks} />
            <Route path="/admin-b2b" component={AdminB2B} />
            <Route path="/admin-content" component={AdminContent} />
            <Route path="/admin-resumes" component={AdminResumes} />
            <Route path="/admin-activity" component={AdminActivity} />
            <Route path="/admin-email" component={AdminEmail} />
             <Route path="/admin-funnel" component={AdminFunnel} />
            <Route path="/admin" component={AdminPayments} />
            {/* B2B portal */}
            <Route path="/b2b/login" component={B2BLogin} />
            <Route path="/b2b/register" component={B2BRegister} />
            <Route path="/b2b/dashboard" component={B2BDashboard} />
            <Route path="/b2b/campaigns" component={B2BCampaigns} />
            <Route path="/b2b/campaign/new" component={B2BCampaignNew} />
            <Route path="/b2b/campaign/:id" component={B2BCampaign} />
            <Route path="/b2b/candidates" component={B2BCandidates} />
            <Route path="/b2b/credits" component={B2BCredits} />
            <Route path="/b2b-interview/:token" component={B2BInterviewLanding} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
            <Analytics />
            <RouteMetaPolicy />
            <Suspense fallback={<PageSkeleton />}>
              <Router />
            </Suspense>
            <Toaster />
          </WouterRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
