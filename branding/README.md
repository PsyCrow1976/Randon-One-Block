# CurseForge branding

Copy-paste assets and metadata for publishing **Randon One Block** on CurseForge.

**Positioning:** experimental **AI-assisted** modpack (Grok Composer 2.5 fast) on Minecraft 26.1.2 — random center block skyblock, AI-written quests, custom Uncrafting Table mod. Inspired by [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock).

| File | Use on CurseForge |
|------|-------------------|
| [`summary.txt`](summary.txt) | Project **Summary** (one line) |
| [`description.md`](description.md) | Project **Description** (Markdown tab) |
| [`curseforge-profile.md`](curseforge-profile.md) | Name, categories, license, tags, links |
| [`project-metadata.json`](project-metadata.json) | Machine-readable pack identity (version, tags) |
| [`export-checklist.md`](export-checklist.md) | Verify zip + upload steps |
| [`logo/logo.svg`](logo/logo.svg) | Source art — export **400×400 PNG** for avatar |
| [`screenshots/`](screenshots/) | In-game screenshots for the gallery |
| [`../scripts/publish-curseforge.sh`](../scripts/publish-curseforge.sh) | Build zip, push metadata, upload file (API) |

## Live project

| Field | Value |
|-------|-------|
| Project ID | `1591048` |
| Authors dashboard | https://authors.curseforge.com/#/projects/1591048/ |
| General settings | https://authors.curseforge.com/#/projects/1591048/general — name **Randon One Block**, slug **randon-one-block** |
| Public page (after approval) | https://www.curseforge.com/minecraft/modpacks/randon-one-block |

## Publish a release (recommended)

1. Finish playtesting on the CurseForge instance (`Modded Randon One Block`).
2. Run `./update-modlist.sh` so [`modlist.md`](../modlist.md) matches the instance.
3. Export [`logo/logo.svg`](logo/logo.svg) to **400×400 PNG** if the avatar changed (see [`logo/README.md`](logo/README.md)).
4. Create a token at [CurseForge API Tokens](https://www.curseforge.com/account/api-tokens) — pass via env only, never commit.
5. From repo root:

```bash
CF_API_TOKEN='your-token' CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
```

The script:

- Builds `dist/Randon-One-Block-<version>.zip` from instance mod IDs + repo `config/` and `kubejs/`
- Pushes summary, description, source/issues links, and license via `update-project`
- Uploads the zip via `upload-file` (beta release, MC 26.1.2 + NeoForge)

Optional env: `CF_VERSION`, `CF_RELEASE_TYPE` (`alpha` / `beta` / `release`), `CF_SKIP_UPLOAD=1` (zip only), `CF_SKIP_METADATA=1`.

## Manual steps (Authors UI)

The upload API **cannot** set logo, categories, or delete files. After each publish:

- [ ] Upload **logo** under General if not already set (`branding/logo/logo.png`)
- [ ] Confirm **categories**: Skyblock (main), Quests, Adventure, Multiplayer
- [ ] Remove any accidental test uploads under **Files**
- [ ] Add gallery images from [`screenshots/`](screenshots/) when ready
- [ ] Submit for review / release when satisfied
- [ ] **Revoke** the API token after publishing

## Pack identity

| Field | Value |
|-------|-------|
| Display name | Randon One Block |
| Name note | Typo for “Random” when creating the GitHub repo — explained in [`description.md`](description.md) |
| Minecraft | 26.1.2 |
| Mod loader | NeoForge 26.1.2.76 |
| Mod count | 73 (see [`modlist.md`](../modlist.md)) |
| Source repo | https://github.com/PsyCrow1976/Randon-One-Block |