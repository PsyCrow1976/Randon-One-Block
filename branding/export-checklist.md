# Export & publish checklist (CurseForge)

CurseForge modpacks need a **`.zip`** with `manifest.json` at the root and an **`overrides/`** folder. Prefer the repo publish script; use the CurseForge app only as a fallback.

**Project:** [Authors dashboard (1591048)](https://authors.curseforge.com/#/projects/1591048/)

## 1. Prepare the instance

- [ ] Playtest instance: `Modded Randon One Block`
- [ ] Repo symlinks active (`./link-instance.sh`) so `config/` and `kubejs/` are current
- [ ] Run `./update-modlist.sh` in the repo
- [ ] Export logo PNG if changed (see [`logo/README.md`](logo/README.md))

## 2. Publish via script (recommended)

From repo root, with a token from [CurseForge API Tokens](https://www.curseforge.com/account/api-tokens):

```bash
CF_API_TOKEN='your-token' CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
```

The script:

1. Reads mod **projectID** / **fileID** pairs from the instance `minecraftinstance.json`
2. Writes `manifest.json` (NeoForge 26.1.2.76, 72 mods)
3. Zips repo `config/` and `kubejs/` under `overrides/` (excludes `voicechat/`, `*.bak`)
4. Calls `update-project` — summary, description, source, issues, license from `branding/`
5. Calls `upload-file` — beta release with changelog from `CHANGELOG.md`

Output: `dist/Randon-One-Block-<version>.zip` (gitignored).

Optional: `CF_SKIP_UPLOAD=1` (build zip only), `CF_SKIP_METADATA=1`, `CF_RELEASE_TYPE=release`.

## 3. Verify the zip

```bash
unzip -l dist/Randon-One-Block-*.zip | head
```

Confirm:

```
manifest.json          ← mod list with CurseForge project/file IDs
overrides/
  config/                ← pack configs (ftbquests, haven, kubejs config, etc.)
  kubejs/                ← server/client/startup scripts
```

- [ ] `manifest.json` lists **NeoForge** for Minecraft 26.1.2
- [ ] No mod JARs under `overrides/mods/` (mods come from manifest only)
- [ ] `haven_skyblock_builder` templates under `overrides/config/HavenSkyblockBuilder/`

## 4. Manual Authors steps (API cannot do these)

- [ ] **General** → [project settings](https://authors.curseforge.com/#/projects/1591048/general): **Project name** `Randon One Block`, **Slug** `randon-one-block` → Save
- [ ] Upload **logo** — `branding/logo/logo.png` (400×400, export from `logo.svg`)
- [ ] **Categories** — Skyblock (main), Quests, Adventure, Multiplayer
- [ ] Delete stray **test files** under Files (upload token cannot remove files)
- [ ] **Submit for review** when ready

## 5. Fallback — CurseForge app export

If the script is unavailable:

1. Open **Modded Randon One Block** in CurseForge → profile options → **Share Profile** → **Export** `.zip`
2. Include **Config**; do not include saves or logs
3. Upload manually in Authors → **Files**

## 6. After approval

- [ ] Add gallery images from [`screenshots/`](screenshots/)
- [ ] Confirm source URL points to GitHub
- [ ] Keep CurseForge file changelogs in sync with repo [`CHANGELOG.md`](../CHANGELOG.md)