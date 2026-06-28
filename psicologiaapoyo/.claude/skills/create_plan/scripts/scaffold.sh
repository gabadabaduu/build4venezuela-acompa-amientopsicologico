#!/usr/bin/env bash
set -euo pipefail

# Usage: scaffold.sh <description>
# Creates a new plan file from the template with today's date.
# Example: scaffold.sh parent-child-tracking
# Output: thoughts/plans/2025-02-25-parent-child-tracking.md

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Project root is the dir containing .claude/ (skills live at .claude/skills/<name>).
# Derive it from the skill location so plans land in THIS project, not an outer git repo.
PROJECT_ROOT="$(cd "${SKILL_DIR}/../../.." && pwd)"

DESCRIPTION="${1:?Usage: scaffold.sh <description>}"

DATE=$(date '+%Y-%m-%d')
FILENAME="${DATE}-${DESCRIPTION}.md"
OUTPUT_DIR="${PROJECT_ROOT}/thoughts/plans"
OUTPUT_PATH="${OUTPUT_DIR}/${FILENAME}"

mkdir -p "$OUTPUT_DIR"
cp "${SKILL_DIR}/templates/plan-template.md" "$OUTPUT_PATH"

echo "FILE: ${OUTPUT_PATH}"
