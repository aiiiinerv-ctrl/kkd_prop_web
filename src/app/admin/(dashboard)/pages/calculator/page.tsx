import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";
import { resolveSizeTable } from "@/lib/calculator-size-table";
import { rowToCalculatorParams } from "@/lib/calculator-config";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CalculatorAdminShell } from "./calculator-admin-shell";
import type { SizeTableHistoryItem } from "./calculator-size-table-card";

export default async function PagesCalculatorPage() {
  const session = await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  if (!canManageContent(session.user.role)) return null;

  const canMutateProperties = canManageSiteSettings(session.user.role);
  const canManageConfig = session.user.role === "ADMIN";

  const [pageRow, pageSeo, configRow, bannerData] = await Promise.all([
    prisma.calculatorPageContent.findUnique({ where: { key: "calculator" } }),
    canMutateProperties
      ? prisma.pageSeo.findUnique({ where: { key: "calculator" } })
      : Promise.resolve(null),
    canManageConfig
      ? prisma.calculatorConfig.findFirst()
      : Promise.resolve(null),
    getPageBannerAdmin("calculator"),
  ]);

  const params = configRow
    ? rowToCalculatorParams(configRow)
    : CALCULATOR_DEFAULTS;

  // Size table card data (S6) — only fetched when the config tab itself is
  // visible (ADMIN only, `canManageConfig`). `activeImport` resolves the
  // uploader name for the "ยืนยันใช้เมื่อ" summary line; `history` selects
  // `rows` only to compute a count server-side, never sending the JSON blob
  // to the client (admin UI spec §9.6 / task guardrail).
  const [activeImport, historyRows] = canManageConfig
    ? await Promise.all([
        configRow?.sizeTableImportId
          ? prisma.calculatorImport.findUnique({
              where: { id: configRow.sizeTableImportId },
              select: { fileName: true, uploadedBy: { select: { name: true } } },
            })
          : Promise.resolve(null),
        prisma.calculatorImport.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            fileName: true,
            createdAt: true,
            rows: true,
            warnings: true,
            uploadedBy: { select: { name: true } },
          },
        }),
      ])
    : [null, []];

  const history: SizeTableHistoryItem[] = historyRows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    createdAt: row.createdAt.toISOString(),
    uploadedByName: row.uploadedBy.name,
    rowCount: Array.isArray(row.rows) ? row.rows.length : 0,
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
  }));

  const { table: activeTable, source: sizeTableSource } = resolveSizeTable(
    configRow?.sizeTable ?? null
  );

  return (
    <CalculatorAdminShell
      key={`${pageRow?.version ?? 0}-${pageSeo?.version ?? 0}`}
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
              annualSavingMonthsMultiplier: params.annualSavingMonthsMultiplier,
              minBill: params.minBill,
              maxBill: params.maxBill,
              stepBill: params.stepBill,
              activeTable,
            }
          : null
      }
      sizeTableData={
        canManageConfig
          ? {
              source: sizeTableSource,
              activeTable,
              activeImportId: configRow?.sizeTableImportId ?? null,
              activeFileName: activeImport?.fileName ?? null,
              activeUploadedByName: activeImport?.uploadedBy.name ?? null,
              configVersion: configRow?.version ?? 1,
              configUpdatedAt: (configRow?.updatedAt ?? new Date()).toISOString(),
              history,
            }
          : null
      }
      bannerData={bannerData}
    />
  );
}
