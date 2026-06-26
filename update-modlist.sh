#!/usr/bin/env bash
# Refresh modlist.json / modlist.md from the CurseForge playtest instance.
# Usage:
#   ./update-modlist.sh              # update lists only
#   ./update-modlist.sh --changelog  # update lists and print CHANGELOG bullets
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTANCE="${MODLIST_INSTANCE:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"
CHANGELOG=0
for arg in "$@"; do
  case "$arg" in
    --changelog) CHANGELOG=1 ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

python3 - "$REPO" "$INSTANCE" "$CHANGELOG" <<'PY'
import json, os, re, sys
from datetime import date

repo, instance, changelog_flag = sys.argv[1:4]
changelog = changelog_flag == "1"
instance_json = os.path.join(instance, "minecraftinstance.json")
mods_dir = os.path.join(instance, "mods")
modlist_json = os.path.join(repo, "modlist.json")
modlist_md = os.path.join(repo, "modlist.md")

MC_VERSION = "26.1.2"
NEOFORGE = "26.1.2.76"

LOADER_PREFIX_RE = re.compile(
    r"^(?:neoforge(?:-mc)?|forge|fabric)-(?:mc)?[\d.]+(?:\+[\d.]+)?-|^mc[\d.]+-|^config-",
    re.I,
)

def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())

def clean_version(raw: str) -> str:
    v = raw
    while True:
        nxt = LOADER_PREFIX_RE.sub("", v, count=1)
        if nxt == v:
            break
        v = nxt
    return v

def version_from_jar(name: str, jar: str) -> str:
    stem = jar[:-4] if jar.endswith(".jar") else jar
    candidates = [
        name,
        name.replace(" ", ""),
        name.replace(" ", "-"),
        slugify(name),
        stem.split("-")[0],
        stem.split("_")[0],
    ]
    for prefix in sorted({c for c in candidates if c}, key=len, reverse=True):
        for sep in ("-", "_"):
            lead = f"{prefix}{sep}"
            if stem.lower().startswith(lead.lower()):
                return clean_version(stem[len(lead):])
    parts = stem.split("-")
    if len(parts) > 1:
        return clean_version("-".join(parts[1:]))
    return stem

def load_previous():
    if not os.path.isfile(modlist_json):
        return {}
    with open(modlist_json) as f:
        data = json.load(f)
    return {m["jar"]: m for m in data.get("mods", [])}

def scan_mods():
    mods = []
    if os.path.isfile(instance_json):
        with open(instance_json) as f:
            data = json.load(f)
        for m in data.get("installedAddons", []):
            jar = m.get("fileNameOnDisk") or ""
            if not jar.endswith(".jar"):
                continue
            name = m.get("name") or jar
            entry = {
                "name": name,
                "version": version_from_jar(name, jar),
                "jar": jar,
            }
            if m.get("addonID"):
                entry["curseforge_id"] = m["addonID"]
            if m.get("webSiteURL"):
                entry["url"] = m["webSiteURL"]
            mods.append(entry)
    elif os.path.isdir(mods_dir):
        for jar in sorted(os.listdir(mods_dir)):
            if not jar.endswith(".jar"):
                continue
            stem = jar[:-4]
            mods.append({"name": stem, "version": stem, "jar": jar})
    else:
        raise SystemExit(f"error: no mods found in {instance}")
    mods.sort(key=lambda x: x["name"].lower())
    return mods

def write_outputs(mods):
    payload = {
        "generated": str(date.today()),
        "minecraft": MC_VERSION,
        "neoforge": NEOFORGE,
        "mod_count": len(mods),
        "mods": mods,
    }
    with open(modlist_json, "w") as f:
        json.dump(payload, f, indent=2)
        f.write("\n")

    lines = [
        "# Mod list",
        "",
        f"**Minecraft:** {MC_VERSION} · **NeoForge:** {NEOFORGE} · **Mods:** {len(mods)}",
        "",
        f"*Last updated: {payload['generated']}*",
        "",
        "Canonical source for installed mods in the CurseForge playtest instance. To refresh after adding, removing, or updating mods, run:",
        "",
        "```bash",
        "./update-modlist.sh",
        "```",
        "",
        "Use `./update-modlist.sh --changelog` to print added/removed/changed mods for pasting into `CHANGELOG.md`.",
        "",
        "| Mod | Version | Jar |",
        "| --- | --- | --- |",
    ]
    for m in mods:
        lines.append(f"| {m['name']} | {m['version']} | `{m['jar']}` |")
    with open(modlist_md, "w") as f:
        f.write("\n".join(lines) + "\n")
    return payload

def diff_mods(previous, current):
    prev_jars = set(previous)
    curr_jars = {m["jar"] for m in current}
    added = [m for m in current if m["jar"] not in prev_jars]
    removed = [previous[j] for j in prev_jars - curr_jars]
    changed = []
    for m in current:
        old = previous.get(m["jar"])
        if old and old.get("version") != m["version"]:
            changed.append((old, m))
    return added, removed, changed

previous = load_previous()
mods = scan_mods()
payload = write_outputs(mods)
added, removed, changed = diff_mods(previous, mods)

print(f"updated modlist ({len(mods)} mods) -> {modlist_json}")

if not previous:
    print("initial modlist created (no previous snapshot to diff)")
elif not (added or removed or changed):
    print("no mod additions, removals, or version changes")
else:
    print(f"changes: +{len(added)} added, -{len(removed)} removed, ~{len(changed)} updated")

if changelog and previous and (added or removed or changed):
    print()
    print("### Mods")
    print()
    for m in sorted(added, key=lambda x: x["name"].lower()):
        print(f"- **Added:** {m['name']} `{m['version']}`")
    for m in sorted(removed, key=lambda x: x["name"].lower()):
        print(f"- **Removed:** {m['name']} `{m['version']}`")
    for old, new in sorted(changed, key=lambda x: x[1]["name"].lower()):
        print(f"- **Updated:** {new['name']} `{old['version']}` → `{new['version']}`")
PY

chmod +x "$REPO/update-modlist.sh" 2>/dev/null || true