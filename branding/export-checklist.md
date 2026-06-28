# Export checklist (CurseForge app)

CurseForge requires a **`.zip`** with `manifest.json` at the root and an **`overrides/`** folder. Export from the CurseForge desktop app — do not hand-build the mod list unless you know the format.

## 1. Prepare the instance

- [ ] Playtest instance: `Modded Randon One Block`
- [ ] Repo symlinks active (`./link-instance.sh`) so `config/` and `kubejs/` are current
- [ ] Run `./update-modlist.sh` in the repo
- [ ] Remove personal saves you do not want in the export (export should not include `saves/`)

## 2. Export in CurseForge

1. Open the **Modded Randon One Block** profile in CurseForge.
2. Open **profile options** (gear menu).
3. Click **Share Profile** → **Export** as **`.zip`** file.
4. In the export dialog, include:
   - [ ] **Config** (required — quests, Haven, KubeJS config)
   - [ ] **KubeJS** / scripts if listed separately, or ensure they are under config/overrides paths the app uses
   - [ ] Do **not** include saves, logs, or screenshots unless intentional
5. Save the zip locally (e.g. `Modded-Random-OneBlock-1.0.0.7.zip`).

## 3. Verify the zip

Unzip once and confirm:

```
manifest.json          ← mod list with CurseForge project/file IDs
overrides/
  config/                ← pack configs (ftbquests, haven, kubejs config, etc.)
  defaultconfigs/        ← if present
  kubejs/                ← if the exporter placed scripts here (path varies by CF version)
```

- [ ] `manifest.json` lists **NeoForge** for Minecraft 26.1.2
- [ ] No duplicate mod JARs under `overrides/mods/` that are already in `manifest.json` (common rejection reason)
- [ ] `haven_skyblock_builder` template files are present under `overrides/config/HavenSkyblockBuilder/`

## 4. Upload to CurseForge

**Automated (API):** from repo root, with a token from [CurseForge API Tokens](https://www.curseforge.com/account/api-tokens):

```bash
CF_API_TOKEN='your-token' CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
```

This builds `dist/Modded-Random-OneBlock-<version>.zip`, runs `update-project` (summary, description, links, license), and `upload-file`.

**Manual fallback:**

1. Create project using [`curseforge-profile.md`](curseforge-profile.md).
2. **Files** → **Upload file** → select the `.zip`.
3. Set display name and changelog for this version (match [`project-metadata.json`](project-metadata.json)).
4. Submit for review.

**API limits:** logo/avatar and categories must be set in the [Authors dashboard](https://authors.curseforge.com/). The token cannot delete files — remove test uploads manually under **Files**.

## 5. After approval

- [ ] Add gallery images from [`screenshots/`](screenshots/)
- [ ] Pin the GitHub source URL on the project page
- [ ] Post first changelog on CurseForge matching repo `CHANGELOG.md`