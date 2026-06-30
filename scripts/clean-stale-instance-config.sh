#!/usr/bin/env bash
# Remove stray Random One Block config files from CurseForge instance roots.
# Authoritative pack configs live in kubejs/config/ (via repo symlink). Copies at the
# instance root override or shadow the real config when scripts fall back to cwd.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEFAULT_INSTANCES=(
  "/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block"
  "/home/christer/Documents/curseforge/minecraft/Instances/Randon One Block"
)

STALE_FILES=(
  random_one_block.json
  random_one_block_mod_pools.json
  random_one_block_team_unlocks.json
  random_one_block_team_counters.json
  random_one_block_mod_pools_debug.json
  random_one_block_pool.json
  random_one_block_pool.txt
)

clean_instance() {
  local instance="$1"
  local removed=0
  local name
  local stale

  if [[ ! -d "$instance" ]]; then
    echo "skip — instance not found: $instance"
    return 0
  fi

  for name in "${STALE_FILES[@]}"; do
    stale="$instance/$name"
    if [[ -f "$stale" && ! -L "$stale" ]]; then
      rm -v "$stale"
      removed=$((removed + 1))
    fi
  done

  if [[ "$removed" -eq 0 ]]; then
    echo "ok — no stale instance-root pack configs in $instance"
  else
    echo "removed $removed stale file(s) from $instance"
  fi
}

if [[ "$#" -gt 0 ]]; then
  for instance in "$@"; do
    clean_instance "$instance"
  done
else
  for instance in "${DEFAULT_INSTANCES[@]}"; do
    clean_instance "$instance"
  done
fi

echo "Edit pack config in $REPO/kubejs/config/ only."