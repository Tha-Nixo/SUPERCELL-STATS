#!/usr/bin/env bash
# carry-assets.sh <previous-dist> <new-dist>
#
# A tab opened before a deploy still asks for the old hashed chunks. Copy the
# previous build's own assets/ files into the new build, never overwriting.
# Files the previous build itself carried over are listed in its
# assets/.carried and are skipped, so only one older generation ever lives on.
set -euo pipefail

prev="$1"
new="$2"
[[ -d "$prev/assets" && -d "$new/assets" ]] || exit 0

skip="$prev/assets/.carried"
: > "$new/assets/.carried"
for f in "$prev"/assets/*; do
    [[ -f "$f" ]] || continue
    name="$(basename "$f")"
    if [[ -f "$skip" ]] && grep -qxF -- "$name" "$skip"; then continue; fi
    if [[ ! -e "$new/assets/$name" ]]; then
        cp -- "$f" "$new/assets/$name"
        echo "$name" >> "$new/assets/.carried"
    fi
done
