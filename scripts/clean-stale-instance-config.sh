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
  random_one_block_mod_pools_debug.txt
  random_one_block_pool.json
  random_one_block_pool.txt
)

CANONICAL_INSTANCE="${MODLIST_INSTANCE:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"

check_symlinks() {
  local instance="$1"
  local name
  local link
  local issues=0

  for name in kubejs config; do
    link="$instance/$name"
    if [[ ! -e "$link" ]]; then
      echo "warn — missing $name/ in $instance (run ./link-instance.sh after setting MODLIST_INSTANCE)"
      issues=$((issues + 1))
    elif [[ -L "$link" ]]; then
      echo "ok — $name -> $(readlink "$link")"
    else
      echo "warn — $name/ is a real folder, not a symlink to $REPO/$name"
      echo "      Generators read repo files only when $name is linked. Prefer: ./link-instance.sh"
      issues=$((issues + 1))
    fi
  done

  return "$issues"
}

clean_instance() {
  local instance="$1"
  local removed=0
  local name
  local stale

  if [[ ! -d "$instance" ]]; then
    echo "skip — instance not found: $instance"
    return 0
  fi

  echo "instance: $instance"
  check_symlinks "$instance" || true

  if [[ ! -d "$instance/mods" ]]; then
    echo "warn — mods/ missing; mod/item and quest generators need installed mod JARs here"
  else
    echo "ok — mods/ present ($(find "$instance/mods" -maxdepth 1 -name '*.jar' | wc -l) jars)"
  fi

  for name in "${STALE_FILES[@]}"; do
    stale="$instance/$name"
    if [[ -f "$stale" && ! -L "$stale" ]]; then
      rm -v "$stale"
      removed=$((removed + 1))
    fi
  done

  if [[ "$removed" -eq 0 ]]; then
    echo "ok — no stale instance-root pack configs"
  else
    echo "removed $removed stale file(s)"
  fi
  echo
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

echo "Canonical playtest instance: $CANONICAL_INSTANCE"
echo "Override with MODLIST_INSTANCE=/path/to/instance $0"
echo "Edit pack config in $REPO/kubejs/config/ only."