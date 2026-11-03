#!/bin/bash
# Human only. The agent is blocked from running this file.
set -euo pipefail
cd "$(dirname "$0")"

echo "Review the entry, then submit it yourself on the event site."
echo
if [[ -f REVIEW.md ]]; then
  sed -n '1,160p' REVIEW.md
else
  echo "REVIEW.md is missing. The entry is not ready."
  exit 1
fi
