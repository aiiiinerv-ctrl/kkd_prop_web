#!/bin/bash
set -a; source .env.hosting-panel; set +a
curl -s -u "${HOSTING_PANEL_USERNAME}:${HOSTING_PANEL_PASSWORD}" \
  --data-urlencode "action=edit" \
  --data-urlencode "path=kkd-app-production/tmp" \
  --data-urlencode "filename=restart.txt" \
  --data-urlencode "text=" \
  "${HOSTING_PANEL_URL}/CMD_FILE_MANAGER" -w "HTTP %{http_code}\n"
