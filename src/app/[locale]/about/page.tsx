import { Award, BadgeCheck, Building2, Headset, PencilRuler, Wrench } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { pageMetadata } from "@/lib/seo";

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

  const CREDENTIALS = [
    { icon: Building2, title: t("credRegisteredTitle"), desc: t("credRegisteredDesc") },
    { icon: BadgeCheck, title: t("credEngineerTitle"), desc: t("credEngineerDesc") },
    { icon: Award, title: t("credExperienceTitle"), desc: t("credExperienceDesc") },
  ];

  const TEAM = [
    { icon: PencilRuler, title: t("teamDesignTitle"), desc: t("teamDesignDesc") },
    { icon: Wrench, title: t("teamInstallTitle"), desc: t("teamInstallDesc") },
    { icon: Headset, title: t("teamSupportTitle"), desc: t("teamSupportDesc") },
  ];

  return (
    <main>
      <section className="bg-gradient-to-b from-[#fff5e6] to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            title={t("title")}
            subtitle={t("intro")}
            headingClassName="font-extrabold tracking-[-0.01em]"
          />
        </div>
      </section>

      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-7 md:grid-cols-3">
            {CREDENTIALS.map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <div className="h-full rounded-xl border border-border/70 bg-card p-7 text-center shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-orange/10">
                    <c.icon className="size-8 text-brand-orange" />
                  </div>
                  <h3 className="mt-5 font-bold text-primary">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("teamTitle")}
          subtitle={t("teamDesc")}
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

      <TestimonialsSection />

      <CtaBanner />
    </main>
  );
}
