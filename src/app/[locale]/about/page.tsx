import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { PageBanner } from "@/components/site/page-banner";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { StatsRow } from "@/components/site/stats-row";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { resolveAboutLucideIcon } from "@/lib/about/lucide-icons";
import { getAboutContent, getPublishedTestimonials, getSiteStats } from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "about", "/about");
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const usePages = PAGE_REGISTRY.about.contentRollout === "pages";
  const [{ projectCount, closedLeadCount }, aboutContent, allPublished] = await Promise.all([
    getSiteStats(),
    getAboutContent(locale),
    getPublishedTestimonials(locale),
  ]);

  const hasRow = Boolean(aboutContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const c = aboutContent;

  const CREDENTIALS = [
    {
      icon: resolveAboutLucideIcon(c?.credRegisteredIcon, "credRegisteredIcon"),
      title: pick(c?.credRegisteredTitle, "credRegisteredTitle"),
      desc: pick(c?.credRegisteredDesc, "credRegisteredDesc"),
    },
    {
      icon: resolveAboutLucideIcon(c?.credEngineerIcon, "credEngineerIcon"),
      title: pick(c?.credEngineerTitle, "credEngineerTitle"),
      desc: pick(c?.credEngineerDesc, "credEngineerDesc"),
    },
    {
      icon: resolveAboutLucideIcon(c?.credExperienceIcon, "credExperienceIcon"),
      title: pick(c?.credExperienceTitle, "credExperienceTitle"),
      desc: pick(c?.credExperienceDesc, "credExperienceDesc"),
    },
  ];

  const TEAM = [
    {
      icon: resolveAboutLucideIcon(c?.teamDesignIcon, "teamDesignIcon"),
      title: pick(c?.teamDesignTitle, "teamDesignTitle"),
      desc: pick(c?.teamDesignDesc, "teamDesignDesc"),
    },
    {
      icon: resolveAboutLucideIcon(c?.teamInstallIcon, "teamInstallIcon"),
      title: pick(c?.teamInstallTitle, "teamInstallTitle"),
      desc: pick(c?.teamInstallDesc, "teamInstallDesc"),
    },
    {
      icon: resolveAboutLucideIcon(c?.teamSupportIcon, "teamSupportIcon"),
      title: pick(c?.teamSupportTitle, "teamSupportTitle"),
      desc: pick(c?.teamSupportDesc, "teamSupportDesc"),
    },
  ];

  const showCredentials = c?.showCredentials !== false;
  const showTeam = c?.showTeam !== false;
  const showStats = c?.showStats !== false;
  const showTestimonials = c?.showTestimonials !== false;
  const showGlobalCta = c?.showGlobalCta !== false;

  const credSectionTitle =
    usePages && !hasRow ? "" : c?.credSectionTitle || "";
  const credSectionDesc = c?.credSectionDesc || undefined;

  const featuredIds = c?.featuredTestimonialIds ?? [];
  const testimonialsForAbout =
    featuredIds.length > 0
      ? featuredIds
          .map((id) => allPublished.find((item) => item.id === id))
          .filter((item): item is (typeof allPublished)[number] => Boolean(item))
      : allPublished;

  return (
    <main>
      <PageBanner pageSlug="about" />
      <section className="bg-gradient-to-b from-[#fff5e6] to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            title={pick(c?.title, "title")}
            subtitle={pick(c?.intro, "intro")}
            headingClassName="font-extrabold tracking-[-0.01em]"
          />
        </div>
      </section>

      {showCredentials && (
        <section className="bg-muted/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            {credSectionTitle ? (
              <SectionHeading
                title={credSectionTitle}
                subtitle={credSectionDesc}
                headingClassName="font-extrabold tracking-[-0.01em]"
              />
            ) : null}
            <div className="grid gap-7 md:grid-cols-3">
              {CREDENTIALS.map((cred, i) => (
                <Reveal key={`${cred.title}-${i}`} delay={i * 100}>
                  <div className="h-full rounded-xl border border-border/70 bg-card p-7 text-center shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-orange/10">
                      <cred.icon className="size-8 text-brand-orange" />
                    </div>
                    <h3 className="mt-5 font-bold text-primary">{cred.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{cred.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {showTeam && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            title={pick(c?.teamTitle, "teamTitle")}
            subtitle={pick(c?.teamDesc, "teamDesc")}
            headingClassName="font-extrabold tracking-[-0.01em]"
          />
          <div className="grid gap-7 md:grid-cols-3">
            {TEAM.map((member, i) => (
              <Reveal key={`${member.title}-${i}`} delay={i * 100}>
                <div className="h-full rounded-xl border border-border/70 bg-card p-7 text-center shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-gold/15">
                    <member.icon className="size-8 text-brand-gold" />
                  </div>
                  <h3 className="mt-5 font-bold text-primary">{member.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{member.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {showStats && (
        <StatsRow
          overrides={{
            statsProjectsValue: projectCount > 0 ? String(projectCount) : null,
            statsCustomersValue: closedLeadCount > 0 ? String(closedLeadCount) : null,
            statsYearsValue: null,
            statsEngineersValue: null,
          }}
          labelOverrides={{
            statsProjects: c?.statsProjectsLabel || undefined,
            statsYears: c?.statsYearsLabel || undefined,
            statsEngineers: c?.statsEngineersLabel || undefined,
            statsCustomers: c?.statsCustomersLabel || undefined,
          }}
        />
      )}

      {showTestimonials && (
        <TestimonialsSection
          items={testimonialsForAbout}
          title={c?.testimonialsTitle || undefined}
          subtitle={c?.testimonialsSubtitle || undefined}
        />
      )}

      {showGlobalCta && <CtaBanner />}
    </main>
  );
}
