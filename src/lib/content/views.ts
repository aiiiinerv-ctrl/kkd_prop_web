import { pickLocale, pickLocaleList } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";
import type { Seasonal } from "@/lib/packages-seasonal";

/**
 * Row → view-model mappers: the internal seam of the content module. The
 * readers in this directory are thin wrappers around a query plus one of
 * these, so everything worth asserting about how a DB row becomes something a
 * page renders — locale fallback, Json casts, storage URLs — is testable here
 * without a database (see scripts/verify-content.mts).
 *
 * Pages never call these directly; they call the readers.
 */

// Prisma rows are structurally compatible with this; keeping the parameter
// types loose is what lets the mappers be exercised with plain fixtures.
type Row = Record<string, unknown>;

export type PackageView = {
  id: string;
  slug: string;
  name: string;
  suitable: string;
  features: string[];
  priceThb: number;
  sizeKw: number;
  isPopular: boolean;
  seasonal: Seasonal | undefined;
  updatedAt: Date;
};

export function toPackageView(row: Row, locale: string): PackageView {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: pickLocale(row, "name", locale),
    suitable: pickLocale(row, "suitable", locale),
    features: pickLocaleList(row, "features", locale),
    priceThb: Number(row.priceThb),
    sizeKw: Number(row.sizeKw),
    isPopular: Boolean(row.isPopular),
    seasonal: (row.seasonalProduction as Seasonal | null) ?? undefined,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(),
  };
}

export type ServiceView = {
  id: string;
  slug: string;
  kind: string;
  title: string;
  description: string;
  features: string[];
};

export function toServiceView(row: Row, locale: string): ServiceView {
  return {
    id: String(row.id),
    slug: String(row.slug),
    kind: String(row.kind),
    title: pickLocale(row, "title", locale),
    description: pickLocale(row, "description", locale),
    features: pickLocaleList(row, "features", locale),
  };
}

export type ProjectView = {
  id: string;
  title: string;
  description: string;
  province: string;
  systemSizeKw: number;
  category: string;
  imageUrl: string | null;
  imageUrls: string[];
};

export function toProjectView(row: Row, locale: string): ProjectView {
  // imageKeys is a Json column; anything that isn't a list of strings is
  // treated as "no images" rather than trusted into the markup.
  const imageKeys = Array.isArray(row.imageKeys)
    ? row.imageKeys.filter((k): k is string => typeof k === "string")
    : [];
  return {
    id: String(row.id),
    title: pickLocale(row, "title", locale),
    description: pickLocale(row, "description", locale),
    province: String(row.province ?? ""),
    systemSizeKw: Number(row.systemSizeKw),
    category: String(row.category),
    imageUrl: imageKeys[0] ? storage.publicUrl(imageKeys[0]) : null,
    imageUrls: imageKeys.map((key) => storage.publicUrl(key)),
  };
}

export type TestimonialView = {
  id: string;
  customerName: string;
  quote: string;
  role: string | null;
  province: string | null;
  photoUrl: string | null;
};

export function toTestimonialView(row: Row, locale: string): TestimonialView {
  return {
    id: String(row.id),
    customerName: String(row.customerName),
    quote: pickLocale(row, "quote", locale),
    role: (row.role as string | null) || null,
    province: (row.province as string | null) || null,
    photoUrl: row.photoKey ? storage.publicUrl(String(row.photoKey)) : null,
  };
}

export type ChannelView = { id: string; name: string };

export function toChannelView(row: Row, locale: string): ChannelView {
  return { id: String(row.id), name: pickLocale(row, "name", locale) };
}

// ─── Site content view-models ───────────────────────────────────────────────

export type SocialLink = { key: string; url: string };

export type SiteSettingsView = {
  id: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  mapQuery: string | null;
  socialLinks: SocialLink[];
  footerDescription: string | null;
  contactTitle: string | null;
  contactSubtitle: string | null;
  headerCtaLabel: string | null;
  lineUrl: string | null;
  facebookUrl: string | null;
};

export function toSiteSettingsView(row: Row, locale: string): SiteSettingsView {
  const str = (v: unknown) => (v && typeof v === "string" ? v : null);
  const loc = (field: string) => pickLocale(row, field, locale) || null;

  const socialCandidates: SocialLink[] = [
    { key: "line", url: str(row.lineUrl) ?? "" },
    { key: "facebook", url: str(row.facebookUrl) ?? "" },
    { key: "instagram", url: str(row.instagramUrl) ?? "" },
    { key: "tiktok", url: str(row.tiktokUrl) ?? "" },
    { key: "youtube", url: str(row.youtubeUrl) ?? "" },
  ];
  const socialLinks = socialCandidates.filter((s) => s.url !== "");

  return {
    id: String(row.id),
    phone: str(row.phone),
    email: str(row.email),
    address: loc("address"),
    hours: loc("hours"),
    mapQuery: str(row.mapQuery),
    socialLinks,
    footerDescription: loc("footerDescription"),
    contactTitle: loc("contactTitle"),
    contactSubtitle: loc("contactSubtitle"),
    headerCtaLabel: loc("headerCtaLabel"),
    lineUrl: str(row.lineUrl),
    facebookUrl: str(row.facebookUrl),
  };
}

export type PageSeoView = {
  id: string;
  key: string;
  title: string | null;
  description: string | null;
  ogImageKey: string | null;
};

export function toPageSeoView(row: Row, locale: string): PageSeoView {
  const loc = (field: string) => pickLocale(row, field, locale) || null;
  return {
    id: String(row.id),
    key: String(row.key),
    title: loc("title"),
    description: loc("description"),
    ogImageKey: row.ogImageKey ? String(row.ogImageKey) : null,
  };
}

export type AboutContentView = {
  id: string;
  title: string | null;
  intro: string | null;
  credRegisteredTitle: string | null;
  credRegisteredDesc: string | null;
  credEngineerTitle: string | null;
  credEngineerDesc: string | null;
  credExperienceTitle: string | null;
  credExperienceDesc: string | null;
  teamTitle: string | null;
  teamDesc: string | null;
  teamDesignTitle: string | null;
  teamDesignDesc: string | null;
  teamInstallTitle: string | null;
  teamInstallDesc: string | null;
  teamSupportTitle: string | null;
  teamSupportDesc: string | null;
};

// ─── Home Page Content (Home CMS slice H3) ─────────────────────────────────

export type HomeFaqItemView = {
  id: string;
  question: string;
  answer: string;
};

export function toHomeFaqItemView(row: Row, locale: string): HomeFaqItemView {
  return {
    id: String(row.id),
    question: pickLocale(row, "question", locale),
    answer: pickLocale(row, "answer", locale),
  };
}

export type HomePageContentView = {
  id: string;
  version: number;
  heroKicker: string;
  heroTitleWhite: string;
  heroTitleGold: string;
  heroSubtitle: string;
  heroAlt: string;
  heroImageKey: string | null;
  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;
  quickContactLabel: string;
  proofLabel: string;
  proofTitle: string;
  proofItem1: string;
  proofItem2: string;
  proofItem3: string;
  feature1Label: string;
  feature2Label: string;
  feature3Label: string;
  feature4Label: string;
  showLatestWorks: boolean;
  latestWorksHeading: string;
  metric1Label: string;
  metric1Value: string;
  metric2Label: string;
  metric2Value: string;
  metric3Label: string;
  metric3Value: string;
  viewAllLabel: string;
  showServicesCta: boolean;
  servicesCtaBadge: string;
  servicesCtaTitle: string;
  servicesCtaText: string;
  servicesCtaLinkLabel: string;
  showFaq: boolean;
  faqBadge: string;
  faqTitle: string;
  faqIntro: string;
  faqLineButtonLabel: string;
};

export function toHomePageContentView(row: Row, locale: string): HomePageContentView {
  const loc = (field: string) => pickLocale(row, field, locale);
  return {
    id: String(row.id),
    version: Number(row.version),
    heroKicker: loc("heroKicker"),
    heroTitleWhite: loc("heroTitleWhite"),
    heroTitleGold: loc("heroTitleGold"),
    heroSubtitle: loc("heroSubtitle"),
    heroAlt: loc("heroAlt"),
    heroImageKey: row.heroImageKey ? String(row.heroImageKey) : null,
    ctaPrimaryLabel: loc("ctaPrimaryLabel"),
    ctaSecondaryLabel: loc("ctaSecondaryLabel"),
    quickContactLabel: loc("quickContactLabel"),
    proofLabel: loc("proofLabel"),
    proofTitle: loc("proofTitle"),
    proofItem1: loc("proofItem1"),
    proofItem2: loc("proofItem2"),
    proofItem3: loc("proofItem3"),
    feature1Label: loc("feature1Label"),
    feature2Label: loc("feature2Label"),
    feature3Label: loc("feature3Label"),
    feature4Label: loc("feature4Label"),
    showLatestWorks: Boolean(row.showLatestWorks),
    latestWorksHeading: loc("latestWorksHeading"),
    metric1Label: loc("metric1Label"),
    metric1Value: loc("metric1Value"),
    metric2Label: loc("metric2Label"),
    metric2Value: loc("metric2Value"),
    metric3Label: loc("metric3Label"),
    metric3Value: loc("metric3Value"),
    viewAllLabel: loc("viewAllLabel"),
    showServicesCta: Boolean(row.showServicesCta),
    servicesCtaBadge: loc("servicesCtaBadge"),
    servicesCtaTitle: loc("servicesCtaTitle"),
    servicesCtaText: loc("servicesCtaText"),
    servicesCtaLinkLabel: loc("servicesCtaLinkLabel"),
    showFaq: Boolean(row.showFaq),
    faqBadge: loc("faqBadge"),
    faqTitle: loc("faqTitle"),
    faqIntro: loc("faqIntro"),
    faqLineButtonLabel: loc("faqLineButtonLabel"),
  };
}

export function toAboutContentView(row: Row, locale: string): AboutContentView {
  const loc = (field: string) => pickLocale(row, field, locale) || null;
  return {
    id: String(row.id),
    title: loc("title"),
    intro: loc("intro"),
    credRegisteredTitle: loc("credRegisteredTitle"),
    credRegisteredDesc: loc("credRegisteredDesc"),
    credEngineerTitle: loc("credEngineerTitle"),
    credEngineerDesc: loc("credEngineerDesc"),
    credExperienceTitle: loc("credExperienceTitle"),
    credExperienceDesc: loc("credExperienceDesc"),
    teamTitle: loc("teamTitle"),
    teamDesc: loc("teamDesc"),
    teamDesignTitle: loc("teamDesignTitle"),
    teamDesignDesc: loc("teamDesignDesc"),
    teamInstallTitle: loc("teamInstallTitle"),
    teamInstallDesc: loc("teamInstallDesc"),
    teamSupportTitle: loc("teamSupportTitle"),
    teamSupportDesc: loc("teamSupportDesc"),
  };
}
