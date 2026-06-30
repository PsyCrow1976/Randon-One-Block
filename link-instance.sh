#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE="/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block"

link_dir() {
  local name="$1"
  local target="$REPO/$name"
  local link="$INSTANCE/$name"

  if [[ ! -d "$target" ]]; then
    echo "error: missing repo folder: $target" >&2
    exit 1
  fi

  if [[ -L "$link" ]]; then
    echo "already linked: $name -> $(readlink "$link")"
    return
  fi

  if [[ -e "$link" ]]; then
    echo "error: $link exists and is not a symlink — move or remove it first" >&2
    exit 1
  fi

  ln -s "$target" "$link"
  echo "linked: $name -> $target"
}

clean_stale_pack_configs() {
  "$REPO/scripts/clean-stale-instance-config.sh" "$INSTANCE"
}

if [[ ! -d "$INSTANCE" ]]; then
  echo "error: CurseForge instance not found: $INSTANCE" >&2
  exit 1
fi

link_dir kubejs
link_dir config
clean_stale_pack_configs

echo "done — edit pack files in $REPO; CurseForge reads them via symlinks."
echo "      pack config belongs in $REPO/kubejs/config/ only (never the instance root)."