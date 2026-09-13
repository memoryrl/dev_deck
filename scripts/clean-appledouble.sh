#!/usr/bin/env bash
# macOS가 exFAT/외장 볼륨에 만드는 AppleDouble(._*)과 .DS_Store를 제거한다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export COPYFILE_DISABLE=1

find . \
  \( -name '._*' -o -name '.DS_Store' \) \
  ! -path './.git/*' \
  ! -path './node_modules/*' \
  ! -path './.next/*' \
  -print \
  -delete
