#!/bin/bash
# One-time Gate B activation: uploads the locally-prepared, verified
# .htaccess (original + appended maintenance block) to production over FTP.
#
# Run by a human via the `!` prefix, never by an agent's own tool — see the
# "Non-negotiable rule" in docs/plans/kkd-shared-hosting-redeploy-runbook.md.
# Invoke as `noglob deploy/upload-htaccess-gate-b.sh`: the FTP password
# contains square brackets that zsh would otherwise try to glob-expand.
set -euo pipefail
set -o pipefail
cd "$(dirname "$0")/.."
source .env.hosting-panel

LOCAL_FILE="/var/folders/wy/59z_3jx17mg1lrmfndl8cch80000gn/T/kkd-htaccess/htaccess-gateB-appended-2026-08-27T0730Z.txt"
if [ ! -f "$LOCAL_FILE" ]; then
  echo "✗ prepared .htaccess not found at $LOCAL_FILE" >&2
  exit 1
fi

curl -v --globoff \
  --user "${HOSTING_FTP_USERNAME}:${HOSTING_FTP_PASSWORD}" \
  -T "$LOCAL_FILE" \
  "ftp://${HOSTING_FTP_HOST}:${HOSTING_FTP_PORT}/domains/kkdproperty.co.th/public_html/.htaccess" 2>&1 \
  | sed -E 's/^(\* *)?(> )?PASS .*/\2PASS [redacted]/'

echo
echo "local size: $(wc -c < "$LOCAL_FILE") bytes — the '226' line above should report a matching transfer"
echo "Next: re-run 'npx tsx scripts/download-production-htaccess.mts' and confirm all markers OK."
