#!/usr/bin/env bash
# Build a CurseForge modpack .zip, push project metadata, and upload the file.
#
# Requires a one-time API token from https://www.curseforge.com/account/api-tokens
# Pass via env (never commit tokens):
#   CF_API_TOKEN=... CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
#
# Optional env:
#   CF_PROJECT_ID   — default 1591048
#   CF_VERSION      — default 1.0.0.7 (also reads branding/project-metadata.json)
#   MODLIST_INSTANCE — playtest instance path
#   CF_RELEASE_TYPE — alpha | beta | release (default beta)
#   CF_SKIP_UPLOAD  — set to 1 to only build the zip
#   CF_SKIP_METADATA — set to 1 to skip update-project
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTANCE="${MODLIST_INSTANCE:-/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block}"
PROJECT_ID="${CF_PROJECT_ID:-1591048}"
TOKEN="${CF_API_TOKEN:-}"
VERSION="${CF_VERSION:-$(python3 -c "import json; print(json.load(open('$REPO/branding/project-metadata.json'))['version'])")}"
RELEASE_TYPE="${CF_RELEASE_TYPE:-beta}"
DIST="$REPO/dist/Randon-One-Block-${VERSION}.zip"

if [[ -z "$TOKEN" && "${CF_SKIP_UPLOAD:-0}" != "1" && "${CF_SKIP_METADATA:-0}" != "1" ]]; then
  echo "error: set CF_API_TOKEN (or CF_SKIP_UPLOAD=1 / CF_SKIP_METADATA=1)" >&2
  exit 1
fi

python3 - "$REPO" "$INSTANCE" "$DIST" "$VERSION" <<'PY'
import json, os, pathlib, shutil, sys, tempfile, zipfile

repo, instance, dist = map(pathlib.Path, sys.argv[1:4])
version = sys.argv[4]
instance_json = instance / "minecraftinstance.json"
if not instance_json.is_file():
    raise SystemExit(f"error: missing {instance_json}")

with open(instance_json) as f:
    inst = json.load(f)

files = [
    {
        "projectID": a["addonID"],
        "fileID": a["installedFile"]["id"],
        "required": True,
    }
    for a in inst.get("installedAddons", [])
    if a.get("addonID") and a.get("installedFile", {}).get("id")
]
files.sort(key=lambda x: (x["projectID"], x["fileID"]))

manifest = {
    "minecraft": {
        "version": "26.1.2",
        "modLoaders": [{"id": "neoforge-26.1.2.76", "primary": True}],
    },
    "manifestType": "minecraftModpack",
    "manifestVersion": 1,
    "name": "Randon One Block",
    "version": version,
    "author": "PsyCrow1976",
    "files": files,
    "overrides": "overrides",
}

build_dir = pathlib.Path(tempfile.mkdtemp(prefix="mrob-export-"))
overrides = build_dir / "overrides"
try:
    for name in ("config", "kubejs"):
        src = repo / name
        dst = overrides / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=shutil.ignore_patterns("*.bak"))

    dc = instance / "defaultconfigs"
    if dc.is_dir() and any(dc.iterdir()):
        shutil.copytree(dc, overrides / "defaultconfigs")

    (build_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    dist.parent.mkdir(parents=True, exist_ok=True)
    if dist.exists():
        dist.unlink()

    exclude_dirs = {"voicechat"}

    with zipfile.ZipFile(dist, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(build_dir / "manifest.json", "manifest.json")
        for root, dirs, names in os.walk(overrides):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for name in names:
                if name.endswith(".bak"):
                    continue
                full = pathlib.Path(root) / name
                zf.write(full, full.relative_to(build_dir).as_posix())
finally:
    shutil.rmtree(build_dir, ignore_errors=True)

print(f"built {dist} ({len(files)} mods, {dist.stat().st_size} bytes)")
PY

if [[ "${CF_SKIP_METADATA:-0}" == "1" ]]; then
  echo "skipped update-project (CF_SKIP_METADATA=1)"
else
  python3 - "$REPO" "$PROJECT_ID" "$TOKEN" <<'PY'
import json, pathlib, subprocess, sys

repo, project_id, token = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
meta = {
    "name": "Randon One Block",
    "summary": (repo / "branding/summary.txt").read_text().strip(),
    "description": (repo / "branding/description.md").read_text(),
    "descriptionType": "markdown",
    "issueTrackerUrl": "https://github.com/PsyCrow1976/Randon-One-Block/issues",
    "sourceUrl": "https://github.com/PsyCrow1976/Randon-One-Block",
    "license": "MIT License",
}
cmd = [
    "curl", "-sS", "-f", "-X", "POST",
    "-H", f"X-Api-Token: {token}",
    "--form-string", f"metadata={json.dumps(meta, ensure_ascii=False)}",
    f"https://minecraft.curseforge.com/api/projects/{project_id}/update-project",
]
out = subprocess.check_output(cmd, text=True)
print("update-project:", out.strip())
PY
fi

if [[ "${CF_SKIP_UPLOAD:-0}" == "1" ]]; then
  echo "skipped upload-file (CF_SKIP_UPLOAD=1)"
  exit 0
fi

CHANGELOG="$(python3 - "$REPO" "$VERSION" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1], "CHANGELOG.md").read_text()
version = sys.argv[2]
lines = text.splitlines()
out = []
capture = False
for line in lines:
    if line.startswith(f"## [{version}]"):
        capture = True
        out.append(line)
        continue
    if capture and line.startswith("## ["):
        break
    if capture and line.strip() == "---":
        continue
    if capture:
        out.append(line)
body = "\n".join(out).strip()
print(body if body else f"## Randon One Block {version}\n\nSee CHANGELOG.md on GitHub.")
PY
)"

python3 - "$DIST" "$PROJECT_ID" "$TOKEN" "$VERSION" "$RELEASE_TYPE" "$CHANGELOG" <<'PY'
import json, pathlib, subprocess, sys

dist, project_id, token, version, release_type, changelog = sys.argv[1:7]
meta = {
    "changelog": changelog,
    "changelogType": "markdown",
    "displayName": f"Randon One Block {version}",
    "releaseType": release_type,
    "gameVersionNames": ["26.1.2", "NeoForge", "Client", "Server"],
}
cmd = [
    "curl", "-sS", "-f", "-X", "POST",
    "-H", f"X-Api-Token: {token}",
    "-F", f"metadata={json.dumps(meta)};type=application/json",
    "-F", f"file=@{dist};type=application/zip",
    f"https://minecraft.curseforge.com/api/projects/{project_id}/upload-file",
]
out = subprocess.check_output(cmd, text=True)
print("upload-file:", out.strip())
PY

echo "Done. Set slug on Authors → General (randon-one-block); upload logo; delete stray test files in Files."