import { Helmet } from "react-helmet-async";

const DEFAULT = {
  title: "Lead Onto — English for Real Situations & Real Roles",
  description: "Learn what to say in real-life situations, discover the right modern words, get local-language support, and practise interviews tailored to your role.",
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
  const fullTitle = title ? `${title} | Lead Onto` : DEFAULT.title;
  const image = ogImage ?? DEFAULT.ogImage;
  const url = ogUrl
    ? /^https?:\/\//i.test(ogUrl)
      ? ogUrl
      : `${import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}${ogUrl}`
    : undefined;
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
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
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
