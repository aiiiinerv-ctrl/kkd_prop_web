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
