import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

const DEFAULT = {
  title: "Lead Onto — Speak with Confidence. Prepare for the Role You Want.",
  description: "Speak with confidence, practise real conversations, and prepare for the role you want with Lead Onto's AI-powered English and interview coaching.",
  ogImage: "https://leadonto.com/opengraph.jpg",
};

export function PageMeta({
  title,
  description,
  ogImage,
  ogUrl,
  canonicalUrl,
  noindex,
}: {
  title: string;
  description: string;
  ogImage?: string;
  ogUrl?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}) {
  const [location] = useLocation();
  const fullTitle = title ? `${title} | Lead Onto` : DEFAULT.title;
  const image = ogImage ?? DEFAULT.ogImage;
  const routePath = location.split("?")[0] || "/";
  const resolvedCanonical = canonicalUrl ?? `https://leadonto.com${routePath === "/" ? "" : routePath}`;
  const url = ogUrl
    ? /^https?:\/\//i.test(ogUrl)
      ? ogUrl
      : `${import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}${ogUrl}`
    : resolvedCanonical;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={image} />
      {url && <meta property="og:url" content={url} />}
      <link rel="canonical" href={resolvedCanonical} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}

export function HomeMeta({ canonicalUrl }: { canonicalUrl?: string }) {
  return (
    <Helmet>
      <title>{DEFAULT.title}</title>
      <meta name="description" content={DEFAULT.description} />
      <meta property="og:title" content={DEFAULT.title} />
      <meta property="og:description" content={DEFAULT.description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={DEFAULT.ogImage} />
      <meta property="og:url" content={canonicalUrl ?? "https://leadonto.com"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={DEFAULT.title} />
      <meta name="twitter:description" content={DEFAULT.description} />
      <meta name="twitter:image" content={DEFAULT.ogImage} />
      <link rel="canonical" href={canonicalUrl ?? "https://leadonto.com"} />
    </Helmet>
  );
}
