#!/bin/bash
# Uploads deploy/dist.zip to production over FTP.
#
# Run by a human via the `!` prefix, never by an agent's own tool — see the
# "Non-negotiable rule" in docs/plans/kkd-shared-hosting-redeploy-runbook.md.
# Invoke it as `noglob deploy/upload-dist.sh`: the FTP password contains
# square brackets that zsh would otherwise try to glob-expand.
set -euo pipefail
set -o pipefail
cd "$(dirname "$0")/.."
source .env.hosting-panel

# Credentials go through --user rather than inside the URL, and curl's verbose
# `> PASS ...` line is redacted on the way out. Verbose output is worth keeping
# — it carries the "226 File successfully transferred" line and the byte count
# the runbook asks you to check — but it printed the password in cleartext into
# terminal scrollback and session logs on every deploy until 2026-08-12.
curl -v --globoff \
  --user "${HOSTING_FTP_USERNAME}:${HOSTING_FTP_PASSWORD}" \
  -T deploy/dist.zip \
  "ftp://${HOSTING_FTP_HOST}:${HOSTING_FTP_PORT}/kkd-app-production/dist.zip" 2>&1 \
  | sed -E 's/^(\* *)?(> )?PASS .*/\2PASS [redacted]/'

echo
echo "local size: $(wc -c < deploy/dist.zip) bytes — the '226' line above should report a matching transfer"
