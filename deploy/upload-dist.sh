#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
source .env.hosting-panel
curl -v -T deploy/dist.zip "ftp://${HOSTING_FTP_USERNAME}:${HOSTING_FTP_PASSWORD}@${HOSTING_FTP_HOST}:${HOSTING_FTP_PORT}/kkd-app-production/dist.zip" --globoff
