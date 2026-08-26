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
