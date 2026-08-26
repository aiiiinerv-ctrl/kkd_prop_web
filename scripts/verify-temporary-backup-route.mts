import assert from "node:assert/strict";
import { createPagesCmsBackupHandler } from "../src/app/api/operations/pages-cms-backup/route.js";

const handler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: false,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: true,
  }),
  createBackup: async () => {
    throw new Error("disabled route must not invoke backup");
  },
});

const response = await handler(
  new Request("http://localhost/api/operations/pages-cms-backup", {
    method: "POST",
    headers: {
      "x-kkd-backup-secret": "test-secret-that-is-long-enough-for-the-contract",
    },
  })
);

assert.equal(response.status, 404);
assert.deepEqual(await response.json(), { error: "not_found" });

console.log("TEMP_BACKUP_ROUTE_DISABLED=PASS");

let unauthorizedBackupCalled = false;
const secretHandler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: true,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: true,
  }),
  createBackup: async () => {
    unauthorizedBackupCalled = true;
    throw new Error("unauthorized route must not invoke backup");
  },
});

for (const suppliedSecret of [undefined, "wrong-secret-of-the-same-public-length-value"]) {
  const headers = new Headers();
  if (suppliedSecret) headers.set("x-kkd-backup-secret", suppliedSecret);
  const unauthorizedResponse = await secretHandler(
    new Request("http://localhost/api/operations/pages-cms-backup", {
      method: "POST",
      headers,
    })
  );
  assert.equal(unauthorizedResponse.status, 404);
  assert.deepEqual(await unauthorizedResponse.json(), { error: "not_found" });
}
assert.equal(unauthorizedBackupCalled, false);

console.log("TEMP_BACKUP_ROUTE_SECRET_GUARD=PASS");

let unquiescedBackupCalled = false;
const unquiescedHandler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: true,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: false,
  }),
  createBackup: async () => {
    unquiescedBackupCalled = true;
    throw new Error("unquiesced route must not invoke backup");
  },
});
const unquiescedResponse = await unquiescedHandler(
  new Request("http://localhost/api/operations/pages-cms-backup", {
    method: "POST",
    headers: {
      "x-kkd-backup-secret": "test-secret-that-is-long-enough-for-the-contract",
    },
  })
);
assert.equal(unquiescedResponse.status, 409);
assert.deepEqual(await unquiescedResponse.json(), { error: "writes_not_quiesced" });
assert.equal(unquiescedBackupCalled, false);

console.log("TEMP_BACKUP_ROUTE_QUIESCENCE_GUARD=PASS");

const successfulHandler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: true,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: true,
  }),
  createBackup: async () => ({
    snapshot: "2026-08-26T12-34-56",
    databaseSqlSha256: "a".repeat(64),
    schemaSha256: "b".repeat(64),
    sourceTransactional: false,
    writesQuiesced: true,
    rowCounts: { Lead: 7, AdminUser: 2 },
    privateStorageCopied: true,
    databaseBytes: 1234,
    privateStorageBytes: 5678,
    totalBytes: 6912,
    prunedCount: 0,
  }),
});
const successfulResponse = await successfulHandler(
  new Request("http://localhost/api/operations/pages-cms-backup", {
    method: "POST",
    headers: {
      "x-kkd-backup-secret": "test-secret-that-is-long-enough-for-the-contract",
    },
  })
);
assert.equal(successfulResponse.status, 200);
assert.deepEqual(await successfulResponse.json(), {
  ok: true,
  snapshot: "2026-08-26T12-34-56",
  databaseSqlSha256: "a".repeat(64),
  schemaSha256: "b".repeat(64),
  sourceTransactional: false,
  writesQuiesced: true,
  rowCounts: { Lead: 7, AdminUser: 2 },
  privateStorageCopied: true,
  databaseBytes: 1234,
  privateStorageBytes: 5678,
  totalBytes: 6912,
  prunedCount: 0,
});

console.log("TEMP_BACKUP_ROUTE_SUCCESS_RESPONSE=PASS");

const failingHandler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: true,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: true,
  }),
  createBackup: async () => {
    const error = new Error("sensitive /home/operator/backups path");
    Object.assign(error, { code: "EACCES" });
    throw error;
  },
});
const failingResponse = await failingHandler(
  new Request("http://localhost/api/operations/pages-cms-backup", {
    method: "POST",
    headers: {
      "x-kkd-backup-secret": "test-secret-that-is-long-enough-for-the-contract",
    },
  })
);
assert.equal(failingResponse.status, 500);
const failingBody = await failingResponse.json();
assert.deepEqual(failingBody, { error: "backup_failed", code: "EACCES" });
assert.equal(JSON.stringify(failingBody).includes("/home/operator"), false);

console.log("TEMP_BACKUP_ROUTE_FAILURE_SANITIZATION=PASS");

const concurrentHandler = createPagesCmsBackupHandler({
  readConfig: () => ({
    enabled: true,
    secret: "test-secret-that-is-long-enough-for-the-contract",
    writesQuiesced: true,
  }),
  createBackup: async () => {
    throw Object.assign(new Error("lock path must stay private"), {
      code: "BACKUP_IN_PROGRESS",
    });
  },
});
const concurrentResponse = await concurrentHandler(
  new Request("http://localhost/api/operations/pages-cms-backup", {
    method: "POST",
    headers: {
      "x-kkd-backup-secret": "test-secret-that-is-long-enough-for-the-contract",
    },
  })
);
assert.equal(concurrentResponse.status, 409);
assert.deepEqual(await concurrentResponse.json(), {
  error: "backup_in_progress",
  code: "BACKUP_IN_PROGRESS",
});

console.log("TEMP_BACKUP_ROUTE_CONCURRENCY_RESPONSE=PASS");
