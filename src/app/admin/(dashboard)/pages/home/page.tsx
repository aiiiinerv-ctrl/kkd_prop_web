import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { HomeClient } from "./home-client";

export default async function PagesHomeContentPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) {
    // requireRole already guards this path; extra check for TS completeness
    return null;
  }

  const [home, siteSettings] = await Promise.all([
    prisma.homePageContent.findUnique({
      where: { key: "home" },
      include: { faqItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.siteSettings.findFirst(),
  ]);

  if (!home) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-xl font-bold">เนื้อหาหน้าแรก</h1>
        <p className="rounded-lg border border-border/70 bg-accent px-4 py-3 text-sm text-accent-foreground">
          ยังไม่มีข้อมูลหน้าแรกในฐานข้อมูล — ต้องรัน backfill ของ Sprint H1 ก่อนจึงจะแก้ไขจากที่นี่ได้
        </p>
      </div>
    );
  }

  return (
    <HomeClient
      key={home.version}
      canMutateContact={canManageSiteSettings(session.user.role)}
      home={{
        version: home.version,
        heroKickerTh: home.heroKickerTh ?? "", heroKickerEn: home.heroKickerEn ?? "",
        heroTitleWhiteTh: home.heroTitleWhiteTh ?? "", heroTitleWhiteEn: home.heroTitleWhiteEn ?? "",
        heroTitleGoldTh: home.heroTitleGoldTh ?? "", heroTitleGoldEn: home.heroTitleGoldEn ?? "",
        heroSubtitleTh: home.heroSubtitleTh ?? "", heroSubtitleEn: home.heroSubtitleEn ?? "",
        heroAltTh: home.heroAltTh ?? "", heroAltEn: home.heroAltEn ?? "",
        ctaPrimaryLabelTh: home.ctaPrimaryLabelTh ?? "", ctaPrimaryLabelEn: home.ctaPrimaryLabelEn ?? "",
        ctaSecondaryLabelTh: home.ctaSecondaryLabelTh ?? "", ctaSecondaryLabelEn: home.ctaSecondaryLabelEn ?? "",
        quickContactLabelTh: home.quickContactLabelTh ?? "", quickContactLabelEn: home.quickContactLabelEn ?? "",
        proofLabelTh: home.proofLabelTh ?? "", proofLabelEn: home.proofLabelEn ?? "",
        proofTitleTh: home.proofTitleTh ?? "", proofTitleEn: home.proofTitleEn ?? "",
        proofItem1Th: home.proofItem1Th ?? "", proofItem1En: home.proofItem1En ?? "",
        proofItem2Th: home.proofItem2Th ?? "", proofItem2En: home.proofItem2En ?? "",
        proofItem3Th: home.proofItem3Th ?? "", proofItem3En: home.proofItem3En ?? "",
        feature1LabelTh: home.feature1LabelTh ?? "", feature1LabelEn: home.feature1LabelEn ?? "",
        feature2LabelTh: home.feature2LabelTh ?? "", feature2LabelEn: home.feature2LabelEn ?? "",
        feature3LabelTh: home.feature3LabelTh ?? "", feature3LabelEn: home.feature3LabelEn ?? "",
        feature4LabelTh: home.feature4LabelTh ?? "", feature4LabelEn: home.feature4LabelEn ?? "",
        showLatestWorks: home.showLatestWorks,
        latestWorksHeadingTh: home.latestWorksHeadingTh ?? "", latestWorksHeadingEn: home.latestWorksHeadingEn ?? "",
        metric1LabelTh: home.metric1LabelTh ?? "", metric1LabelEn: home.metric1LabelEn ?? "",
        metric1ValueTh: home.metric1ValueTh ?? "", metric1ValueEn: home.metric1ValueEn ?? "",
        metric2LabelTh: home.metric2LabelTh ?? "", metric2LabelEn: home.metric2LabelEn ?? "",
        metric2ValueTh: home.metric2ValueTh ?? "", metric2ValueEn: home.metric2ValueEn ?? "",
        metric3LabelTh: home.metric3LabelTh ?? "", metric3LabelEn: home.metric3LabelEn ?? "",
        metric3ValueTh: home.metric3ValueTh ?? "", metric3ValueEn: home.metric3ValueEn ?? "",
        viewAllLabelTh: home.viewAllLabelTh ?? "", viewAllLabelEn: home.viewAllLabelEn ?? "",
        showServicesCta: home.showServicesCta,
        servicesCtaBadgeTh: home.servicesCtaBadgeTh ?? "", servicesCtaBadgeEn: home.servicesCtaBadgeEn ?? "",
        servicesCtaTitleTh: home.servicesCtaTitleTh ?? "", servicesCtaTitleEn: home.servicesCtaTitleEn ?? "",
        servicesCtaTextTh: home.servicesCtaTextTh ?? "", servicesCtaTextEn: home.servicesCtaTextEn ?? "",
        servicesCtaLinkLabelTh: home.servicesCtaLinkLabelTh ?? "", servicesCtaLinkLabelEn: home.servicesCtaLinkLabelEn ?? "",
        showFaq: home.showFaq,
        faqBadgeTh: home.faqBadgeTh ?? "", faqBadgeEn: home.faqBadgeEn ?? "",
        faqTitleTh: home.faqTitleTh ?? "", faqTitleEn: home.faqTitleEn ?? "",
        faqIntroTh: home.faqIntroTh ?? "", faqIntroEn: home.faqIntroEn ?? "",
        faqLineButtonLabelTh: home.faqLineButtonLabelTh ?? "", faqLineButtonLabelEn: home.faqLineButtonLabelEn ?? "",
        faqItems: home.faqItems.map((item) => ({
          id: item.id,
          questionTh: item.questionTh,
          questionEn: item.questionEn,
          answerTh: item.answerTh,
          answerEn: item.answerEn,
        })),
      }}
      contact={
        siteSettings
          ? {
              phone: siteSettings.phone ?? "",
              lineUrl: siteSettings.lineUrl ?? "",
              facebookUrl: siteSettings.facebookUrl ?? "",
              email: siteSettings.email ?? "",
              addressTh: siteSettings.addressTh ?? "",
              addressEn: siteSettings.addressEn ?? "",
              hoursTh: siteSettings.hoursTh ?? "",
              hoursEn: siteSettings.hoursEn ?? "",
              mapQuery: siteSettings.mapQuery ?? "",
              instagramUrl: siteSettings.instagramUrl ?? "",
              tiktokUrl: siteSettings.tiktokUrl ?? "",
              youtubeUrl: siteSettings.youtubeUrl ?? "",
              contactTitleTh: siteSettings.contactTitleTh ?? "",
              contactTitleEn: siteSettings.contactTitleEn ?? "",
              contactSubtitleTh: siteSettings.contactSubtitleTh ?? "",
              contactSubtitleEn: siteSettings.contactSubtitleEn ?? "",
            }
          : null
      }
    />
  );
}
