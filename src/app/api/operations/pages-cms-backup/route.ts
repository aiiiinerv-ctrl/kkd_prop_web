import { createHash, timingSafeEqual } from "node:crypto";
import { operationalErrorCode } from "../../../../../scripts/lib/operational-output.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BackupRouteConfig = {
  enabled: boolean;
  secret: string;
  writesQuiesced: boolean;
};

export type BackupRouteResult = {
  snapshot: string;
  databaseSqlSha256: string;
  schemaSha256: string;
  sourceTransactional: boolean;
  writesQuiesced: boolean;
  rowCounts: Readonly<Record<string, number>>;
  privateStorageCopied: boolean;
  databaseBytes: number;
  privateStorageBytes: number;
  totalBytes: number;
  prunedCount: number;
};

type BackupRouteDependencies = {
  readConfig: () => BackupRouteConfig;
  createBackup: () => Promise<BackupRouteResult>;
};

const SECRET_HEADER = "x-kkd-backup-secret";

function secretsMatch(expected: string, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function createPagesCmsBackupHandler(dependencies: BackupRouteDependencies) {
  return async function handlePagesCmsBackup(request: Request): Promise<Response> {
    const config = dependencies.readConfig();
    if (!config.enabled || !secretsMatch(config.secret, request.headers.get(SECRET_HEADER))) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    if (!config.writesQuiesced) {
      return Response.json({ error: "writes_not_quiesced" }, { status: 409 });
    }

    try {
      const result = await dependencies.createBackup();
      return Response.json({ ok: true, ...result });
    } catch (error) {
      const code = operationalErrorCode(error);
      if (code === "BACKUP_IN_PROGRESS") {
        return Response.json(
          { error: "backup_in_progress", code },
          { status: 409 }
        );
      }
      return Response.json(
        { error: "backup_failed", code },
        { status: 500 }
      );
    }
  };
}

export const POST = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: process.env.ENABLE_PAGES_CMS_BACKUP_ROUTE === "true",
    secret: process.env.PAGES_CMS_BACKUP_SECRET ?? "",
    writesQuiesced: process.env.BACKUP_WRITES_QUIESCED === "true",
  }),
  createBackup: async () => {
    throw new Error("temporary backup route is not implemented");
  },
});
