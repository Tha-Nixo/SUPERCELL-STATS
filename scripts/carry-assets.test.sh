#!/usr/bin/env bash
# Manual check for carry-assets.sh: ./scripts/carry-assets.test.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
mk() { mkdir -p "$t/$1/assets"; shift_dir="$1"; shift; for f in "$@"; do echo "$f" > "$t/$shift_dir/assets/$f"; done; }
mk v1 a-1.js shared.css
mk v2 a-2.js shared.css
mk v3 a-3.js shared.css
bash "$here/carry-assets.sh" "$t/v1" "$t/v2"   # v2 gains a-1.js
bash "$here/carry-assets.sh" "$t/v2" "$t/v3"   # v3 gains a-2.js, not a-1.js
[[ -f $t/v2/assets/a-1.js ]] || { echo "FAIL: v2 lacks a-1.js"; exit 1; }
[[ -f $t/v3/assets/a-2.js ]] || { echo "FAIL: v3 lacks a-2.js"; exit 1; }
[[ ! -e $t/v3/assets/a-1.js ]] || { echo "FAIL: v3 kept two generations"; exit 1; }
[[ "$(cat "$t/v2/assets/shared.css")" == shared.css ]] || { echo "FAIL: overwrote"; exit 1; }
echo "carry-assets: ok"
