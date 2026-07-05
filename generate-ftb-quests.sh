#!/usr/bin/env bash
# Regenerate FTB Quest chapters from installed mod recipe data.
#
# Usage:
#   ./generate-ftb-quests.sh
#
# Optional env:
#   MODLIST_INSTANCE — CurseForge instance path (same as update-modlist.sh)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE="${MODLIST_INSTANCE:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $arg" >&2
      echo "run: $0 --help" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$INSTANCE/mods" ]]; then
  echo "error: mods folder not found: $INSTANCE/mods" >&2
  echo "set MODLIST_INSTANCE to your CurseForge instance path" >&2
  exit 1
fi

echo "checking instance for stale pack configs and symlink setup..."
MODLIST_INSTANCE="$INSTANCE" "$REPO/scripts/clean-stale-instance-config.sh" "$INSTANCE"

echo "generating FTB quest chapters from: $INSTANCE/mods"
MODLIST_INSTANCE="$INSTANCE" python3 "$REPO/scripts/generate_ftb_mod_quests.py" --instance "$INSTANCE"

echo
echo "done:"
echo "  chapters: $REPO/config/ftbquests/quests/chapters/"
echo "  lang:     $REPO/config/ftbquests/quests/lang/en_us/chapters/"
echo "  in-game:  /ftbquests reload"
echo "  docs:     $REPO/moditemrecipy.md"