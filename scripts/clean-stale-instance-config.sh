#!/usr/bin/env bash
# Remove stray Random One Block config files from the CurseForge instance root.
# Authoritative pack configs live in kubejs/config/ (via repo symlink). Copies at the
# instance root override or shadow the real config when scripts fall back to cwd.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTANCE="${1:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"

STALE_FILES=(
  random_one_block.json
  random_one_block_mod_pools.json
  random_one_block_team_unlocks.json
  random_one_block_mod_pools_debug.json
  random_one_block_pool.json
  random_one_block_pool.txt
)

if [[ ! -d "$INSTANCE" ]]; then
  echo "error: instance not found: $INSTANCE" >&2
  exit 1
fi

removed=0
for name in "${STALE_FILES[@]}"; do
  stale="$INSTANCE/$name"
  if [[ -f "$stale" && ! -L "$stale" ]]; then
    rm -v "$stale"
    removed=$((removed + 1))
  fi
done

if [[ "$removed" -eq 0 ]]; then
  echo "ok — no stale instance-root pack configs in $INSTANCE"
else
  echo "removed $removed stale file(s). Edit pack config in $REPO/kubejs/config/ only."
fi