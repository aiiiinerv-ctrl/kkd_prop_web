// File-level guards for the admin Excel import (calculator size table) —
// checked BEFORE the buffer is ever handed to exceljs, per
// docs/plans/calculator-excel-import-sprints.md S2 and research-145 §4.1.
//
// Server-only: reads an in-memory Buffer, never touches the filesystem or a
// database. Never import this from a client component.
import JSZip from "jszip";
import {
  externalLinksWarning,
  fileTooLargeIssue,
  invalidXlsxIssue,
  macroDetectedIssue,
  malformedZipIssue,
} from "./messages";
import type { ImportIssue, ImportWarning } from "./messages";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB, per research-145 §4.1
const MAX_ZIP_ENTRIES = 200;
const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024; // 20 MB
const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0]; // legacy .xls / password-protected xlsx

export type XlsxValidationResult =
  | { ok: true; warnings: ImportWarning[] }
  | { ok: false; errors: ImportIssue[] };

function hasMagic(buf: Buffer, magic: number[]): boolean {
  if (buf.length < magic.length) return false;
  return magic.every((byte, index) => buf[index] === byte);
}

/** Real inflated size of one entry, streamed chunk by chunk and abandoned as
 * soon as it passes `budget` — so a zip bomb costs at most `budget` bytes of
 * work and no chunk is retained. The size fields in the zip headers are NOT
 * used: the file's author controls them, so a bomb can simply lie. Resolves
 * `null` when the budget is exceeded. */
function inflatedSizeWithin(file: JSZip.JSZipObject, budget: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    let total = 0;
    let settled = false;
    const stream = file.nodeStream("nodebuffer");
    stream
      .on("data", (chunk: Buffer) => {
        if (settled) return;
        total += chunk.byteLength;
        if (total > budget) {
          settled = true;
          stream.pause();
          stream.removeAllListeners("data");
          resolve(null);
        }
      })
      .on("error", (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      })
      .on("end", () => {
        if (settled) return;
        settled = true;
        resolve(total);
      })
      .resume();
  });
}

/**
 * Validates an uploaded buffer is a safe, well-formed .xlsx before it is
 * ever loaded by exceljs. Never trusts `fileName`/`file.type` from the
 * browser — only the file's own bytes.
 */
export async function validateXlsxBuffer(buf: Buffer, fileName: string): Promise<XlsxValidationResult> {
  if (!/\.xlsx$/i.test(fileName.trim())) {
    return { ok: false, errors: [invalidXlsxIssue()] };
  }

  if (hasMagic(buf, OLE_MAGIC) || !hasMagic(buf, XLSX_MAGIC)) {
    return { ok: false, errors: [invalidXlsxIssue()] };
  }

  if (buf.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buf.length / (1024 * 1024)).toFixed(1);
    return { ok: false, errors: [fileTooLargeIssue(sizeMb)] };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return { ok: false, errors: [malformedZipIssue()] };
  }

  const entries = Object.values(zip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    return { ok: false, errors: [malformedZipIssue()] };
  }

  const hasVbaProject = entries.some((entry) => entry.name === "xl/vbaProject.bin");
  if (hasVbaProject) {
    return { ok: false, errors: [macroDetectedIssue()] };
  }

  let totalUncompressed = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    let size: number | null;
    try {
      size = await inflatedSizeWithin(entry, MAX_UNCOMPRESSED_BYTES - totalUncompressed);
    } catch {
      return { ok: false, errors: [malformedZipIssue()] };
    }
    if (size === null) {
      return { ok: false, errors: [malformedZipIssue()] };
    }
    totalUncompressed += size;
  }

  // Only now is any entry fully decompressed: the loop above proved every
  // entry (this one included) inflates within the budget.
  const contentTypesEntry = zip.file("[Content_Types].xml");
  if (contentTypesEntry) {
    const contentTypesXml = await contentTypesEntry.async("string");
    if (contentTypesXml.includes("macroEnabled")) {
      return { ok: false, errors: [macroDetectedIssue()] };
    }
  }

  const warnings: ImportWarning[] = [];
  const hasExternalLinks = entries.some((entry) => entry.name.startsWith("xl/externalLinks/"));
  if (hasExternalLinks) {
    warnings.push(externalLinksWarning());
  }

  return { ok: true, warnings };
}
