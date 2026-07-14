#!/usr/bin/env bash
# PostToolUse hook: fast fail-fast typecheck after editing TS/TSX files under src/.
# Runs `tsc --noEmit` (fast) instead of the full `npm run build` on every edit.
set -euo pipefail

payload="$(cat)"
file_path="$(echo "$payload" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')"

case "$file_path" in
  */src/*.ts|*/src/*.tsx|src/*.ts|src/*.tsx) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../.."

if ! output="$(npx tsc --noEmit --pretty false 2>&1)"; then
  reason="TypeScript errors after editing ${file_path}:
${output}"
  jq -n --arg reason "$reason" '{decision: "block", reason: $reason}'
fi
