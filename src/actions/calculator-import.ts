"use server";

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { resolveSizeTable, sizeTableSchema, type SizeRow } from "@/lib/calculator-size-table";
import {
  diffSizeTables,
  importOnGridSizeTable,
  sortIssuesByRow,
  type SizeTableDiff,
} from "@/lib/calculator-import";
// Type-only re-exports for the S6 admin card (calculator-size-table-card.tsx)
// — erased at compile time, so they don't violate "use server"'s
// every-export-must-be-an-async-function rule (same pattern as
// `type ActionResult` from ./users.ts).
export type {
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
    fileName: row.fileName,
    sha256: row.sha256,
    sizeBytes: row.sizeBytes,
    rowCount: Array.isArray(row.rows) ? row.rows.length : 0,
    warningCount: Array.isArray(row.warnings) ? row.warnings.length : 0,
  }),
  revalidate: () => ["/admin/pages/calculator"],
});

const calculatorConfigEntity = auditedEntity({
  entityType: "CalculatorConfig",
  model: (client) => client.calculatorConfig,
  snapshot: "full",
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
  const stripped = base.replace(/[\x00-\x1f\x7f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
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

export type PreviewResult =
  | {
      ok: true;
      importId: string;
      fileName: string;
      rows: SizeRow[];
      warnings: string[];
      rowsRead: number;
      skippedSheets: string[];
      diff: SizeTableDiff;
      configVersion: number;
      duplicate?: { createdAt: Date; uploadedByName: string };
    }
  | { ok: false; error: string; messages: string[] };

/**
 * Reads + guards + parses an uploaded .xlsx into a draft `CalculatorImport`
 * row. Nothing is persisted (no DB row, no storage file) when the file is
 * rejected. A file whose sha256 was already uploaded returns the existing
 * import instead of creating a duplicate.
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

  // Dedupe BEFORE parsing so a re-upload of a previously-rejected file still
  // gets a fresh parse (only accepted files are ever persisted), but a
  // re-upload of a previously-accepted file skips straight to its draft.
  const duplicateRow = await prisma.calculatorImport.findFirst({
    where: { sha256 },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });
  if (duplicateRow) {
    const storedRows = sizeTableSchema.safeParse(duplicateRow.rows);
    if (!storedRows.success) {
      return { ok: false, error: "ข้อมูลตารางของไฟล์นี้ไม่ถูกต้อง — กรุณาแก้ไฟล์แล้วอัปโหลดใหม่", messages: [] };
    }
    const rows = storedRows.data;
    const { table: currentTable } = resolveSizeTable(existingConfig.sizeTable);
    const packages = await prisma.package.findMany({
      select: { sizeKw: true, isPublished: true },
    });
    const diff = diffSizeTables(currentTable, rows, packages, existingConfig.maxBill);
    return {
      ok: true,
      importId: duplicateRow.id,
      fileName: duplicateRow.fileName,
      rows,
      warnings: Array.isArray(duplicateRow.warnings)
        ? (duplicateRow.warnings as string[])
        : [],
      rowsRead: rows.length,
      skippedSheets: [],
      diff,
      configVersion: existingConfig.version,
      duplicate: {
        createdAt: duplicateRow.createdAt,
        uploadedByName: duplicateRow.uploadedBy.name,
      },
    };
  }

  const parsed = await importOnGridSizeTable(buffer, fileName);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.errors.length === 1
          ? "ใช้ไฟล์นี้ไม่ได้"
          : `ใช้ไฟล์นี้ไม่ได้ — พบปัญหา ${parsed.errors.length} ข้อ`,
      messages: issuesToMessages(parsed.errors),
    };
  }

  const { table: currentTable } = resolveSizeTable(existingConfig.sizeTable);
  const packages = await prisma.package.findMany({
    select: { sizeKw: true, isPublished: true },
  });
  const diff = diffSizeTables(currentTable, parsed.rows, packages, existingConfig.maxBill);

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
      fileName,
      fileKey,
      sha256,
      sizeBytes: buffer.length,
      rows: parsed.rows as unknown as Prisma.InputJsonValue,
      warnings: parsed.warnings.map((w) => w.message) as unknown as Prisma.InputJsonValue,
      uploadedById: session.user.id,
    });

    return {
      ok: true,
      importId: created.id,
      fileName: created.fileName,
      rows: parsed.rows,
      warnings: parsed.warnings.map((w) => w.message),
      rowsRead: parsed.rowsRead,
      skippedSheets: parsed.skippedSheets,
      diff,
      configVersion: existingConfig.version,
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

  if (existing.version !== version) {
    return { ok: false, conflict: true };
  }

  if (existing.sizeTableImportId === importId) {
    return { ok: false, error: "ชุดนี้ใช้อยู่แล้ว" };
  }

  const updated = await calculatorConfigEntity.update(existing.id, {
    sizeTable: parsedRows.data as unknown as Prisma.InputJsonValue,
    sizeTableImportId: importId,
    version: existing.version + 1,
  });
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}
