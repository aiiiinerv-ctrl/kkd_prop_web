"use server";

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { resolveSizeTable, sizeTableSchema, type SizeRow } from "@/lib/calculator-size-table";
import { calculatorConfigAuditView, rowToCalculatorParams } from "@/lib/calculator-config";
import {
  BRAND_FORBIDDEN_CHARS,
  hybridTableSchema,
  MAX_HYBRID_BRANDS,
  MAX_HYBRID_ROWS,
  type HybridRow,
} from "@/lib/calculator-hybrid";
import {
  diffHybridTables,
  diffSizeTables,
  importCalculatorWorkbook,
  sortIssuesByRow,
  type HybridTableDiff,
  toManualLocation,
  type SizeTableDiff,
  type TableIssue,
} from "@/lib/calculator-import";
import { validateOnGridTable } from "@/lib/calculator-import/validate-on-grid";
import { validateHybridTable } from "@/lib/calculator-import/validate-hybrid";
import { z } from "zod";
// Type-only re-exports for the S6 admin card (calculator-size-table-card.tsx)
// — erased at compile time, so they don't violate "use server"'s
// every-export-must-be-an-async-function rule (same pattern as
// `type ActionResult` from ./users.ts).
export type {
  HybridTableDiff,
  SizeTableDiff,
  ChangedRow,
  DiffFieldChange,
  DiffFieldName,
  SampleBillDiff,
  SampleBillOutcome,
} from "@/lib/calculator-import";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "./users";

// Server actions for the admin Excel import flow (upload → preview → apply)
// — see docs/plans/calculator-excel-import-sprints.md S5 and
// docs/plans/calculator-excel-import-admin-ui-spec.md §4/§9.6 for the data
// shape the S6 card needs back.

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // mirrors validate-xlsx.ts's own
// guard; checked again here only for the cheap "empty file" case before we
// ever touch storage or the parser.

const calculatorImportEntity = auditedEntity({
  entityType: "CalculatorImport",
  model: (client) => client.calculatorImport,
  // Never store the parsed rows or the storage key in the audit trail — the
  // rows can be re-derived from the file (kept in storage/history) and the
  // key is an internal path, not something an auditor needs to see.
  snapshot: (row) => ({
    id: row.id,
    source: row.source,
    fileName: row.fileName,
    sha256: row.sha256,
    sizeBytes: row.sizeBytes,
    rowCount: Array.isArray(row.rows) ? row.rows.length : 0,
    warningCount: Array.isArray(row.warnings) ? row.warnings.length : 0,
    // Hybrid rows carry per-brand prices — count only.
    hybridRowCount: Array.isArray(row.hybridRows) ? row.hybridRows.length : 0,
  }),
  revalidate: () => ["/admin/pages/calculator"],
});

const calculatorConfigEntity = auditedEntity({
  entityType: "CalculatorConfig",
  model: (client) => client.calculatorConfig,
  // Hybrid rows hold per-brand prices — project to a row count.
  snapshot: calculatorConfigAuditView,
  revalidate: () => [
    "/admin/pages/calculator",
    "/th/calculator",
    "/en/calculator",
  ],
});

/** basename + strip control chars + cap at 120 — matches the
 * `fileName VarChar(120)` column; never used to build the storage key. */
function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  // Control chars plus bidi overrides/isolates (U+202E etc.), which could
  // make a name display deceptively in the admin list and audit log.
  // Also drops every invisible/format char (zero-width, U+2028/2029, BOM, \p{Cf}).
  const stripped = Array.from(base)
    .filter((ch) => !BRAND_FORBIDDEN_CHARS.test(ch) && ch !== "\u2028" && ch !== "\u2029")
    .join("")
    .trim();
  const safe = stripped.length > 0 ? stripped : "import.xlsx";
  return safe.length > 120 ? safe.slice(0, 120) : safe;
}

/** Folds each issue's "→ what to do" line (file/structure-level issues only
 * — row-level issues already embed it in `message`, see messages.ts) into a
 * single display string, sorted so admins can fix a file top to bottom. */
function issuesToMessages(errors: { message: string; action?: string; row?: number }[]): string[] {
  return sortIssuesByRow(
    errors as Parameters<typeof sortIssuesByRow>[0]
  ).map((issue) => (issue.action ? `${issue.message}\n→ ${issue.action}` : issue.message));
}

/** Counts of the Hybrid table live today (all 0 when none) — feeds the preview's "replaces" box. */
export type ActiveHybridCounts = { sizes: number; rows: number; brands: number };

export type PreviewResult =
  | {
      ok: true;
      importId: string;
      fileName: string;
      rows: SizeRow[];
      /** Hybrid rows of the file (admin-only; brand prices are visible in the back office). null = no Hybrid sheet (D3). */
      hybridRows: HybridRow[] | null;
      hasHybridSheet: boolean;
      warnings: string[];
      rowsRead: number;
      hybridRowsRead: number;
      skippedSheets: string[];
      diff: SizeTableDiff;
      hybridDiff: HybridTableDiff;
      activeHybridCounts: ActiveHybridCounts;
      configVersion: number;
      activeSource: string | null;
      activeSavedAt: Date | null;
      activeSavedByName: string | null;
      duplicate?: { createdAt: Date; uploadedByName: string };
    }
  | {
      ok: false;
      error: string;
      messages: string[];
      /** Same messages split per sheet for the grouped reject list (D4 — any issue rejects the whole file). */
      groups?: { onGrid: string[]; hybrid: string[] };
    };

/** The Hybrid table stored on the config; anything unreadable counts as "none". */
function readStoredHybrid(value: unknown): HybridRow[] | null {
  if (value === null || value === undefined) return null;
  const parsed = hybridTableSchema.safeParse(value);
  return parsed.success ? (parsed.data as HybridRow[]) : null;
}

function countHybrid(rows: HybridRow[] | null): ActiveHybridCounts {
  if (!rows) return { sizes: 0, rows: 0, brands: 0 };
  return {
    sizes: new Set(rows.map((r) => r.kw)).size,
    rows: rows.length,
    brands: rows[0]?.brandPrices.length ?? 0,
  };
}

/**
 * Reads + guards + parses an uploaded .xlsx (On-grid sheet required, Hybrid
 * sheet optional) into a draft `CalculatorImport` row. Nothing is persisted
 * (no DB row, no storage file) when the file is rejected — any issue on
 * either sheet rejects the whole file (D4). A file whose sha256 was already
 * uploaded returns the existing import instead of creating a duplicate,
 * EXCEPT (Default #3) when that row predates Hybrid support (hybridRows null)
 * and the file now carries a Hybrid sheet: it is parsed again and saved as a
 * new row.
 */
export async function previewCalculatorImport(formData: FormData): Promise<PreviewResult> {
  const session = await requireRole("ADMIN");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "กรุณาเลือกไฟล์ Excel (.xlsx)", messages: [] };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "ไฟล์ใหญ่เกิน 2 MB", messages: [] };
  }

  const fileName = sanitizeFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const existingConfig = await prisma.calculatorConfig.findFirst();
  if (!existingConfig) {
    return { ok: false, error: "ไม่พบการตั้งค่า", messages: [] };
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Who/when/how the currently-active set was saved — feeds the "replaces the
  // whole set" box in the import panel.
  const activeImport = existingConfig.sizeTableImportId
    ? await prisma.calculatorImport.findUnique({
        where: { id: existingConfig.sizeTableImportId },
        select: { source: true, createdAt: true, uploadedBy: { select: { name: true } } },
      })
    : null;
  const currentHybrid = readStoredHybrid(existingConfig.hybridSizeTable);
  const active = {
    activeSource: activeImport?.source ?? null,
    activeSavedAt: activeImport?.createdAt ?? null,
    activeSavedByName: activeImport?.uploadedBy.name ?? null,
    activeHybridCounts: countHybrid(currentHybrid),
  };
  const multiplier = rowToCalculatorParams(existingConfig).annualSavingMonthsMultiplier;

  const { table: currentTable } = resolveSizeTable(existingConfig.sizeTable);
  const packages = await prisma.package.findMany({
    select: { sizeKw: true, isPublished: true },
  });

  // Dedupe BEFORE parsing so a re-upload of a previously-rejected file still
  // gets a fresh parse (only accepted files are ever persisted), but a
  // re-upload of a previously-accepted file skips straight to its draft.
  const duplicateRow = await prisma.calculatorImport.findFirst({
    where: { sha256, source: "EXCEL" },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });
  // Default #3: a row parsed before Hybrid existed (hybridRows null) must not
  // shadow the same file's Hybrid sheet, so it is only reused after a fresh
  // parse confirms the file has no Hybrid sheet.
  let reusable = duplicateRow && duplicateRow.hybridRows !== null ? duplicateRow : null;

  let parsed: Awaited<ReturnType<typeof importCalculatorWorkbook>> | null = null;
  if (!reusable) {
    parsed = await importCalculatorWorkbook(buffer, fileName);
    if (!parsed.ok) {
      return {
        ok: false,
        error:
          parsed.errors.length === 1
            ? "ใช้ไฟล์นี้ไม่ได้"
            : `ใช้ไฟล์นี้ไม่ได้ — พบปัญหา ${parsed.errors.length} ข้อ`,
        messages: issuesToMessages(parsed.errors),
        groups: {
          onGrid: issuesToMessages(parsed.groups.onGrid),
          hybrid: issuesToMessages(parsed.groups.hybrid),
        },
      };
    }
    if (duplicateRow && !parsed.hasHybridSheet) reusable = duplicateRow;
  }

  if (reusable) {
    const storedRows = sizeTableSchema.safeParse(reusable.rows);
    const storedHybrid =
      reusable.hybridRows === null ? { success: true as const, data: null } : hybridTableSchema.safeParse(reusable.hybridRows);
    if (!storedRows.success || !storedHybrid.success) {
      return { ok: false, error: "ข้อมูลตารางของไฟล์นี้ไม่ถูกต้อง — กรุณาแก้ไฟล์แล้วอัปโหลดใหม่", messages: [] };
    }
    const rows = storedRows.data;
    const hybridRows = storedHybrid.data as HybridRow[] | null;
    return {
      ok: true,
      importId: reusable.id,
      fileName: reusable.fileName ?? fileName,
      rows,
      hybridRows,
      hasHybridSheet: hybridRows !== null,
      warnings: Array.isArray(reusable.warnings) ? (reusable.warnings as string[]) : [],
      rowsRead: rows.length,
      hybridRowsRead: hybridRows?.length ?? 0,
      skippedSheets: [],
      diff: diffSizeTables(currentTable, rows, packages, existingConfig.maxBill),
      hybridDiff: diffHybridTables(currentHybrid, hybridRows, multiplier),
      configVersion: existingConfig.version,
      ...active,
      duplicate: {
        createdAt: reusable.createdAt,
        uploadedByName: reusable.uploadedBy.name,
      },
    };
  }

  if (!parsed || !parsed.ok) throw new Error("unreachable: parse result missing");

  const diff = diffSizeTables(currentTable, parsed.onGrid, packages, existingConfig.maxBill);
  const hybridDiff = diffHybridTables(currentHybrid, parsed.hybrid, multiplier);

  const id = createId();
  const fileKey = `private/calculator-imports/${id}.xlsx`;
  try {
    await storage.put(fileKey, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } catch {
    return { ok: false, error: "อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง", messages: [] };
  }

  try {
    const created = await calculatorImportEntity.create({
      id,
      source: "EXCEL",
      fileName,
      fileKey,
      sha256,
      sizeBytes: buffer.length,
      rows: parsed.onGrid as unknown as Prisma.InputJsonValue,
      // Omitted (SQL NULL) when the workbook has no Hybrid sheet.
      ...(parsed.hybrid ? { hybridRows: parsed.hybrid as unknown as Prisma.InputJsonValue } : {}),
      warnings: parsed.warnings.map((w) => w.message) as unknown as Prisma.InputJsonValue,
      uploadedById: session.user.id,
    });

    return {
      ok: true,
      importId: created.id,
      fileName: created.fileName ?? fileName,
      rows: parsed.onGrid,
      hybridRows: parsed.hybrid,
      hasHybridSheet: parsed.hasHybridSheet,
      warnings: parsed.warnings.map((w) => w.message),
      rowsRead: parsed.rowsRead.onGrid,
      hybridRowsRead: parsed.rowsRead.hybrid,
      skippedSheets: parsed.skippedSheets,
      diff,
      hybridDiff,
      configVersion: existingConfig.version,
      ...active,
    };
  } catch {
    await storage.delete(fileKey).catch(() => undefined);
    return {
      ok: false,
      error: "อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง",
      messages: [],
    };
  }
}

/**
 * Applies a previously-previewed import (or re-applies one from history —
 * the "rollback" action in the UI is the same call with an older
 * `importId`) as the live size table. Re-validates `rows` with
 * `sizeTableSchema` as defense in depth (the draft was already validated at
 * preview time, but the row is untrusted input again by the time it's
 * applied).
 */
export async function applyCalculatorImport({
  importId,
  version,
}: {
  importId: string;
  version: number;
}): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN");

  if (typeof importId !== "string" || importId.length === 0) {
    return { ok: false, error: "ไม่พบไฟล์ที่เลือก" };
  }
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const [imp, existing] = await Promise.all([
    prisma.calculatorImport.findUnique({ where: { id: importId } }),
    prisma.calculatorConfig.findFirst(),
  ]);
  if (!imp) return { ok: false, error: "ไม่พบไฟล์ที่เลือก" };
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const parsedRows = sizeTableSchema.safeParse(imp.rows);
  if (!parsedRows.success) {
    return { ok: false, error: "ข้อมูลตารางไม่ถูกต้อง — กรุณาอัปโหลดไฟล์ใหม่" };
  }

  // Hybrid rows of the same version (null = the version has none -> applying it removes the live Hybrid table).
  const parsedHybrid =
    imp.hybridRows === null ? null : hybridTableSchema.safeParse(imp.hybridRows);
  if (parsedHybrid && !parsedHybrid.success) {
    return { ok: false, error: "ข้อมูลตารางไม่ถูกต้อง — กรุณาอัปโหลดไฟล์ใหม่" };
  }

  if (existing.version !== version) {
    return { ok: false, conflict: true };
  }

  if (existing.sizeTableImportId === importId) {
    return { ok: false, error: "ชุดนี้ใช้อยู่แล้ว" };
  }

  // The version check above is only a fast path; the real guard is the
  // conditional increment inside the write's transaction.
  let updated;
  try {
    updated = await calculatorConfigEntity.updateVersioned(existing.id, version, {
      sizeTable: parsedRows.data as unknown as Prisma.InputJsonValue,
      hybridSizeTable: parsedHybrid?.success
        ? (parsedHybrid.data as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      sizeTableImportId: importId,
    });
  } catch {
    return { ok: false, error: "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if ("conflict" in updated) return { ok: false, conflict: true };

  return { ok: true };
}

const MAX_ON_GRID_ROWS = 200; // Default #11 — the server never trusts the client's row count.

// Shape only (types, finiteness, size cap). Range / ordering rules belong to
// validateOnGridTable so every failure carries a rowIndex/field the editor
// can point at.
const num = z.number().finite();
const savePayloadSchema = z.object({
  onGrid: z
    .array(
      z.object({
        kw: num,
        phases: z.array(z.union([z.literal(1), z.literal(3)])).min(1).max(2),
        sunHours: num,
        days: num,
        pricePerKwh: num,
        panels: num,
        roofM2: num,
        billMin: num,
        billMax: num,
      })
    )
    .min(1)
    .max(MAX_ON_GRID_ROWS),
  // Optional: omitted/null = keep the live Hybrid table as it is.
  hybrid: z
    .array(
      z.object({
        kw: num,
        phase: z.union([z.literal(1), z.literal(3)]),
        batteryKwh: num,
        sunHours: num,
        days: num,
        pricePerKwh: num,
        panels: num,
        roofM2: num,
        billMin: num,
        billMax: num,
        brandPrices: z
          .array(z.object({ brand: z.string().max(50), priceThb: num.nullable() }))
          .min(1)
          .max(MAX_HYBRID_BRANDS),
      })
    )
    .min(1)
    .max(MAX_HYBRID_ROWS)
    .nullish(),
  version: z.number().int().min(1),
});

export type SaveTablesResult =
  | { ok: true; importId: string; version: number }
  | { ok: false; error: string }
  | { ok: false; issues: TableIssue[] }
  | { ok: false; conflict: true };

/**
 * Saves a hand-edited On-grid table as a new `CalculatorImport` (source
 * MANUAL, no file) and applies it immediately (D5: no draft).
 *
 * Hybrid (Default #11): the server never trusts the payload — it can only edit
 * the Hybrid table already live (a payload against a config with none is
 * rejected), and the brand names must equal the live ones, in the same order
 * (renaming a brand is done through Excel). `hybrid` omitted/null keeps the
 * live Hybrid table unchanged; the new MANUAL version carries it so history
 * stays complete.
 *
 * Two audited writes, not one transaction (Default #10): if the config update
 * loses a race, the MANUAL row stays in history as an unused version. The
 * version guard itself is atomic (conditional increment in the update's tx).
 */
export async function saveCalculatorTables(input: {
  onGrid: SizeRow[];
  hybrid?: HybridRow[] | null;
  version: number;
}): Promise<SaveTablesResult> {
  const session = await requireRole("ADMIN");

  const shape = savePayloadSchema.safeParse(input);
  if (!shape.success) {
    return { ok: false, error: "ข้อมูลตารางไม่ถูกต้อง — กรุณาตรวจสอบแล้วลองใหม่" };
  }
  const { onGrid, hybrid, version } = shape.data;

  const validation = validateOnGridTable(onGrid);
  if (validation.issues.length > 0) {
    const kwByRow = onGrid.map((r) => r.kw);
    return {
      ok: false,
      issues: validation.issues.map((issue) => toManualLocation(issue, kwByRow)),
    };
  }

  const existing = await prisma.calculatorConfig.findFirst();
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if (existing.version !== version) return { ok: false, conflict: true };

  const liveHybrid = readStoredHybrid(existing.hybridSizeTable);
  if (!liveHybrid && existing.hybridSizeTable != null) {
    // Never overwrite a stored-but-unreadable Hybrid table with null on save.
    console.error("saveCalculatorTables: stored hybridSizeTable is unreadable — save rejected");
    return {
      ok: false,
      error: "ตาราง Hybrid ที่ใช้อยู่อ่านไม่ได้ — การบันทึกถูกยกเลิกเพื่อไม่ให้ข้อมูลหาย กรุณานำเข้าไฟล์ Excel ใหม่หรือติดต่อผู้ดูแลระบบ",
    };
  }
  let hybridToStore: HybridRow[] | null = liveHybrid;
  if (hybrid) {
    if (!liveHybrid) {
      return { ok: false, error: "ยังไม่มีตาราง Hybrid — นำเข้าผ่านไฟล์ Excel ก่อน" };
    }
    const liveBrands = liveHybrid[0].brandPrices.map((b) => b.brand);
    const sameBrands = hybrid.every(
      (row) =>
        row.brandPrices.length === liveBrands.length &&
        row.brandPrices.every((b, i) => b.brand === liveBrands[i])
    );
    if (!sameBrands) {
      return { ok: false, error: "ชื่อหรือลำดับยี่ห้อไม่ตรงกับชุดที่ใช้อยู่ — แก้ชื่อยี่ห้อผ่านไฟล์ Excel" };
    }
    const hybridValidation = validateHybridTable(hybrid as HybridRow[]);
    if (hybridValidation.issues.length > 0) {
      const kwByHybridRow = hybrid.map((r) => r.kw);
      return {
        ok: false,
        issues: hybridValidation.issues.map((issue) => toManualLocation(issue, kwByHybridRow)),
      };
    }
    hybridToStore = hybridValidation.rows;
  }
  const hybridJson = hybridToStore
    ? (hybridToStore as unknown as Prisma.InputJsonValue)
    : undefined;

  let created;
  try {
    created = await calculatorImportEntity.create({
      source: "MANUAL",
      fileName: null,
      fileKey: null,
      sha256: null,
      sizeBytes: null,
      rows: validation.rows as unknown as Prisma.InputJsonValue,
      ...(hybridJson ? { hybridRows: hybridJson } : {}),
      warnings: validation.warnings.map((w) => w.message) as unknown as Prisma.InputJsonValue,
      uploadedById: session.user.id,
    });
  } catch {
    return { ok: false, error: "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }

  let updated;
  try {
    updated = await calculatorConfigEntity.updateVersioned(existing.id, version, {
      sizeTable: validation.rows as unknown as Prisma.InputJsonValue,
      hybridSizeTable: hybridJson ?? Prisma.JsonNull,
      sizeTableImportId: created.id,
    });
  } catch {
    return { ok: false, error: "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if ("conflict" in updated) return { ok: false, conflict: true };

  return { ok: true, importId: created.id, version: updated.after.version };
}
