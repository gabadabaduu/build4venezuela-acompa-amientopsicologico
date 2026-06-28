#!/usr/bin/env bash
set -euo pipefail

# Usage: scaffold.sh <description>
# Creates a new research document from the template with metadata filled in.
# Example: scaffold.sh authentication-flow
# Output: thoughts/research/2025-02-25-authentication-flow.md

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"

DESCRIPTION="${1:?Usage: scaffold.sh <description>}"

DATE=$(date '+%Y-%m-%d')
DATETIME_ISO=$(date '+%Y-%m-%dT%H:%M:%S%z')
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
REPO_NAME=$(basename "$REPO_ROOT")

FILENAME="${DATE}-${DESCRIPTION}.md"
OUTPUT_DIR="${REPO_ROOT}/thoughts/research"
OUTPUT_PATH="${OUTPUT_DIR}/${FILENAME}"

mkdir -p "$OUTPUT_DIR"

# Read template and replace metadata placeholders
sed \
  -e "s|\[Current date and time with timezone in ISO format\]|${DATETIME_ISO}|g" \
  -e "s|\[Current date and time with timezone\]|${DATETIME_ISO}|g" \
  -e "s|\[Current commit hash\]|${GIT_COMMIT}|g" \
  -e "s|\[Current branch name\]|${GIT_BRANCH}|g" \
  -e "s|\[Repository name\]|${REPO_NAME}|g" \
  -e "s|\[Current date in YYYY-MM-DD format\]|${DATE}|g" \
  "${SKILL_DIR}/templates/research-template.md" > "$OUTPUT_PATH"

echo "FILE: ${OUTPUT_PATH}"
