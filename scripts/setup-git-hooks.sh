#!/usr/bin/env bash
# git init 이후 한 번 실행. 커밋/푸시 전에 AppleDouble을 지운다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d .git ]; then
  echo "git init 후 다시 실행하세요." >&2
  exit 1
fi

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push scripts/clean-appledouble.sh
echo "core.hooksPath=.githooks"
