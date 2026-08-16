import { canManageContent, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AboutClient } from "./about-client";

export default async function ContentAboutPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) {
    // requireRole already guards this path; extra check for TS completeness
    return null;
  }

  const row = await prisma.aboutContent.findFirst();

  return (
    <AboutClient
      data={
        row
          ? {
              titleTh: row.titleTh ?? "",
              titleEn: row.titleEn ?? "",
              introTh: row.introTh ?? "",
              introEn: row.introEn ?? "",
              credRegisteredTitleTh: row.credRegisteredTitleTh ?? "",
              credRegisteredTitleEn: row.credRegisteredTitleEn ?? "",
              credRegisteredDescTh: row.credRegisteredDescTh ?? "",
              credRegisteredDescEn: row.credRegisteredDescEn ?? "",
              credEngineerTitleTh: row.credEngineerTitleTh ?? "",
              credEngineerTitleEn: row.credEngineerTitleEn ?? "",
              credEngineerDescTh: row.credEngineerDescTh ?? "",
              credEngineerDescEn: row.credEngineerDescEn ?? "",
              credExperienceTitleTh: row.credExperienceTitleTh ?? "",
              credExperienceTitleEn: row.credExperienceTitleEn ?? "",
              credExperienceDescTh: row.credExperienceDescTh ?? "",
              credExperienceDescEn: row.credExperienceDescEn ?? "",
              teamTitleTh: row.teamTitleTh ?? "",
              teamTitleEn: row.teamTitleEn ?? "",
              teamDescTh: row.teamDescTh ?? "",
              teamDescEn: row.teamDescEn ?? "",
              teamDesignTitleTh: row.teamDesignTitleTh ?? "",
              teamDesignTitleEn: row.teamDesignTitleEn ?? "",
              teamDesignDescTh: row.teamDesignDescTh ?? "",
              teamDesignDescEn: row.teamDesignDescEn ?? "",
              teamInstallTitleTh: row.teamInstallTitleTh ?? "",
              teamInstallTitleEn: row.teamInstallTitleEn ?? "",
              teamInstallDescTh: row.teamInstallDescTh ?? "",
              teamInstallDescEn: row.teamInstallDescEn ?? "",
              teamSupportTitleTh: row.teamSupportTitleTh ?? "",
              teamSupportTitleEn: row.teamSupportTitleEn ?? "",
              teamSupportDescTh: row.teamSupportDescTh ?? "",
              teamSupportDescEn: row.teamSupportDescEn ?? "",
            }
          : null
      }
    />
  );
}
