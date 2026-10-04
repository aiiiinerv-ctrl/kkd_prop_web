import { canManageContent, canManageSiteSettings, requireRole } from "@/lib/auth";
import { getPageBannerAdmin } from "@/lib/admin/page-banner-admin";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";
import { hybridTableSchema, type HybridRow } from "@/lib/calculator-hybrid";
import { resolveSizeTable } from "@/lib/calculator-size-table";
import { rowToCalculatorParams } from "@/lib/calculator-config";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CalculatorAdminShell } from "./calculator-admin-shell";
import type { SizeTableHistoryItem } from "./calculator-version-history";

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

  // Size table tab data (S6, R1-S5) — only fetched for ADMIN
  // (`canManageConfig`). `activeImport` resolves source + saver name for the
  // "in use" summary; `history` selects `rows` only to compute a count
  // server-side, never sending the JSON blob to the client (admin UI spec
  // §9.6 / task guardrail).
  const [activeImport, historyRows] = canManageConfig
    ? await Promise.all([
        configRow?.sizeTableImportId
          ? prisma.calculatorImport.findUnique({
              where: { id: configRow.sizeTableImportId },
              select: { source: true, fileName: true, fileKey: true, uploadedBy: { select: { name: true } } },
            })
          : Promise.resolve(null),
        prisma.calculatorImport.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            source: true,
            fileName: true,
            fileKey: true,
            createdAt: true,
            rows: true,
            hybridRows: true,
            warnings: true,
            uploadedBy: { select: { name: true } },
          },
        }),
      ])
    : [null, []];

  const history: SizeTableHistoryItem[] = historyRows.map((row) => ({
    id: row.id,
    source: row.source === "MANUAL" ? "MANUAL" : "EXCEL",
    fileName: row.fileName,
    hasSourceFile: row.fileKey !== null,
    createdAt: row.createdAt.toISOString(),
    uploadedByName: row.uploadedBy.name,
    onGridCount: Array.isArray(row.rows) ? row.rows.length : 0,
    hybridSizeCount: Array.isArray(row.hybridRows)
      ? new Set((row.hybridRows as { kw: number }[]).map((r) => r.kw)).size
      : 0,
    hybridRowCount: Array.isArray(row.hybridRows) ? row.hybridRows.length : 0,
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
  }));

  // Whole-table warnings in the save-confirm dialog (Package / slider) need the
  // same inputs `previewCalculatorImport` feeds to diffSizeTables.
  const packages = canManageConfig
    ? await prisma.package.findMany({ select: { sizeKw: true, isPublished: true } })
    : [];

  const { table: activeTable, source: sizeTableSource } = resolveSizeTable(
    configRow?.sizeTable ?? null
  );

  // Live Hybrid table for the ADMIN-only tab; unreadable = treated as none.
  const parsedHybrid = canManageConfig ? hybridTableSchema.safeParse(configRow?.hybridSizeTable) : null;
  const activeHybrid: HybridRow[] | null = parsedHybrid?.success ? (parsedHybrid.data as HybridRow[]) : null;

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
              configVersion: configRow?.version ?? 1,
              configUpdatedAt: (configRow?.updatedAt ?? new Date()).toISOString(),
              active: {
                source:
                  sizeTableSource === "default"
                    ? ("default" as const)
                    : activeImport?.source === "MANUAL"
                      ? ("MANUAL" as const)
                      : ("EXCEL" as const),
                versionId: configRow?.sizeTableImportId ?? null,
                fileName: activeImport?.fileName ?? null,
                savedByName: activeImport?.uploadedBy.name ?? null,
                hasSourceFile: activeImport?.fileKey != null,
              },
              onGrid: activeTable,
              hybrid: activeHybrid,
              brands: activeHybrid?.[0]?.brandPrices.map((b) => b.brand) ?? [],
              packages,
              sliderMaxBill: params.maxBill,
              history,
            }
          : null
      }
      bannerData={bannerData}
    />
  );
}
