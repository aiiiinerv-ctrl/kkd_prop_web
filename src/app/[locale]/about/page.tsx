import { Award, BadgeCheck, Building2, Headset, PencilRuler, Wrench } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { StatsRow } from "@/components/site/stats-row";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { getAboutContent, getSiteStats } from "@/lib/content";
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

  const [{ projectCount, closedLeadCount }, aboutContent] = await Promise.all([
    getSiteStats(),
    getAboutContent(locale),
  ]);

  // DB values take precedence; fall back to messages so the page is never blank.
  const c = aboutContent;

  const CREDENTIALS = [
    {
      icon: Building2,
      title: c?.credRegisteredTitle ?? t("credRegisteredTitle"),
      desc: c?.credRegisteredDesc ?? t("credRegisteredDesc"),
    },
    {
      icon: BadgeCheck,
      title: c?.credEngineerTitle ?? t("credEngineerTitle"),
      desc: c?.credEngineerDesc ?? t("credEngineerDesc"),
    },
    {
      icon: Award,
      title: c?.credExperienceTitle ?? t("credExperienceTitle"),
      desc: c?.credExperienceDesc ?? t("credExperienceDesc"),
    },
  ];

  const TEAM = [
    {
      icon: PencilRuler,
      title: c?.teamDesignTitle ?? t("teamDesignTitle"),
      desc: c?.teamDesignDesc ?? t("teamDesignDesc"),
    },
    {
      icon: Wrench,
      title: c?.teamInstallTitle ?? t("teamInstallTitle"),
      desc: c?.teamInstallDesc ?? t("teamInstallDesc"),
    },
    {
      icon: Headset,
      title: c?.teamSupportTitle ?? t("teamSupportTitle"),
      desc: c?.teamSupportDesc ?? t("teamSupportDesc"),
    },
  ];

  return (
    <main>
      <section className="bg-gradient-to-b from-[#fff5e6] to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            title={c?.title ?? t("title")}
            subtitle={c?.intro ?? t("intro")}
            headingClassName="font-extrabold tracking-[-0.01em]"
          />
        </div>
      </section>

      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-7 md:grid-cols-3">
            {CREDENTIALS.map((cred, i) => (
              <Reveal key={cred.title} delay={i * 100}>
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={c?.teamTitle ?? t("teamTitle")}
          subtitle={c?.teamDesc ?? t("teamDesc")}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />
        <div className="grid gap-7 md:grid-cols-3">
          {TEAM.map((member, i) => (
            <Reveal key={member.title} delay={i * 100}>
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

      <StatsRow
        overrides={{
          statsProjectsValue: projectCount > 0 ? String(projectCount) : null,
          statsCustomersValue: closedLeadCount > 0 ? String(closedLeadCount) : null,
          // No verified source for years in business or licensed engineer
          // headcount yet — hide rather than show a placeholder dash.
          statsYearsValue: null,
          statsEngineersValue: null,
        }}
      />

      <TestimonialsSection />

      <CtaBanner />
    </main>
  );
}
