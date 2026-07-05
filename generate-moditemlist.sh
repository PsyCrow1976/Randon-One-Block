#!/usr/bin/env bash
# Build modlist.html and modlist-items.json from the CurseForge playtest instance.
#
# Usage:
#   ./generate-moditemlist.sh                 # generate HTML + JSON from instance mods
#   ./generate-moditemlist.sh --update-mods   # refresh modlist.json first, then generate
#
# Optional env:
#   MODLIST_INSTANCE — CurseForge instance path (same as update-modlist.sh)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE="${MODLIST_INSTANCE:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"
UPDATE_MODS=0

for arg in "$@"; do
  case "$arg" in
    --update-mods) UPDATE_MODS=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
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

if [[ "$UPDATE_MODS" -eq 1 ]]; then
  echo "refreshing modlist.json from instance..."
  MODLIST_INSTANCE="$INSTANCE" "$REPO/update-modlist.sh"
fi

if [[ ! -f "$REPO/modlist.json" ]]; then
  echo "error: missing $REPO/modlist.json" >&2
  echo "run: ./update-modlist.sh   or   ./generate-moditemlist.sh --update-mods" >&2
  exit 1
fi

echo "generating mod + item HTML from: $INSTANCE/mods"
MODLIST_INSTANCE="$INSTANCE" python3 "$REPO/scripts/generate-modlist-html.py" --instance "$INSTANCE"

echo
echo "done:"
echo "  open:  file://$REPO/modlist.html"
echo "  json:  $REPO/modlist-items.json"
echo "  docs:  $REPO/moditemrecipy.md"