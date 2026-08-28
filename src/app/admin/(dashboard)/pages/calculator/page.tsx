import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";
import { rowToCalculatorParams } from "@/lib/calculator-config";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CalculatorAdminShell } from "./calculator-admin-shell";

export default async function PagesCalculatorPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);
  const canManageConfig = session.user.role === "ADMIN";

  const [pageRow, pageSeo, configRow] = await Promise.all([
    prisma.calculatorPageContent.findUnique({ where: { key: "calculator" } }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "calculator" } })
      : Promise.resolve(null),
    canManageConfig
      ? prisma.calculatorConfig.findFirst()
      : Promise.resolve(null),
  ]);

  const params = configRow
    ? rowToCalculatorParams(configRow)
    : CALCULATOR_DEFAULTS;

  return (
    <CalculatorAdminShell
      key={`${pageRow?.version ?? 0}-${pageSeo?.version ?? 0}-${configRow?.version ?? 0}`}
      canManageConfig={canManageConfig}
      canMutateProperties={canMutateProperties}
      pageSeo={
        pageSeo
          ? {
              version: pageSeo.version,
              titleTh: pageSeo.titleTh ?? "",
              titleEn: pageSeo.titleEn ?? "",
              descriptionTh: pageSeo.descriptionTh ?? "",
              descriptionEn: pageSeo.descriptionEn ?? "",
              ogTitleTh: pageSeo.ogTitleTh ?? "",
              ogTitleEn: pageSeo.ogTitleEn ?? "",
              ogDescriptionTh: pageSeo.ogDescriptionTh ?? "",
              ogDescriptionEn: pageSeo.ogDescriptionEn ?? "",
              canonicalPathTh: pageSeo.canonicalPathTh ?? "",
              canonicalPathEn: pageSeo.canonicalPathEn ?? "",
              robotsIndex: pageSeo.robotsIndex,
              robotsFollow: pageSeo.robotsFollow,
              ogImageUrl: pageSeo.ogImageKey ? storage.publicUrl(pageSeo.ogImageKey) : null,
            }
          : null
      }
      pageContent={
        pageRow
          ? {
              version: pageRow.version,
              eyebrowTh: pageRow.eyebrowTh ?? "",
              eyebrowEn: pageRow.eyebrowEn ?? "",
              titleTh: pageRow.titleTh ?? "",
              titleEn: pageRow.titleEn ?? "",
              subtitleTh: pageRow.subtitleTh ?? "",
              subtitleEn: pageRow.subtitleEn ?? "",
              panelTitleTh: pageRow.panelTitleTh ?? "",
              panelTitleEn: pageRow.panelTitleEn ?? "",
              panelIntroTh: pageRow.panelIntroTh ?? "",
              panelIntroEn: pageRow.panelIntroEn ?? "",
              packagesEyebrowTh: pageRow.packagesEyebrowTh ?? "",
              packagesEyebrowEn: pageRow.packagesEyebrowEn ?? "",
              packagesTitleTh: pageRow.packagesTitleTh ?? "",
              packagesTitleEn: pageRow.packagesTitleEn ?? "",
              packagesSubtitleTh: pageRow.packagesSubtitleTh ?? "",
              packagesSubtitleEn: pageRow.packagesSubtitleEn ?? "",
              showPackages: pageRow.showPackages,
            }
          : null
      }
      calculatorConfig={
        canManageConfig
          ? {
              version: configRow?.version ?? 1,
              sunHoursPerDay: params.sunHoursPerDay,
              pricePerKwhThb: params.pricePerKwhThb,
              annualSavingMonthsMultiplier: params.annualSavingMonthsMultiplier,
              params,
            }
          : null
      }
    />
  );
}
