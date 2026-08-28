#!/bin/bash
set -a; source .env.hosting-panel; set +a
curl -s -u "${HOSTING_PANEL_USERNAME}:${HOSTING_PANEL_PASSWORD}" \
  --data-urlencode "action=extract" \
  --data-urlencode "path=kkd-app-production/dist.zip" \
  --data-urlencode "directory=kkd-app-production" \
  "${HOSTING_PANEL_URL}/CMD_FILE_MANAGER" -w "\nHTTP %{http_code}\n"
