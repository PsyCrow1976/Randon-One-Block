# CurseForge branding

Copy-paste assets and metadata for publishing **Modded Random OneBlock** on CurseForge.

**Positioning:** experimental **AI-assisted** modpack (Grok Composer 2.5 fast) on Minecraft 26.1.2 — random center block skyblock, AI-written quests, custom Uncrafting Table mod. Inspired by [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock).

| File | Use on CurseForge |
|------|-------------------|
| [`summary.txt`](summary.txt) | Project **Summary** (one line) |
| [`description.md`](description.md) | Project **Description** (Markdown tab) |
| [`curseforge-profile.md`](curseforge-profile.md) | Name, categories, license, tags, links |
| [`project-metadata.json`](project-metadata.json) | Machine-readable pack identity (scripts, CI) |
| [`export-checklist.md`](export-checklist.md) | Export `.zip` from the CurseForge app |
| [`logo/logo.svg`](logo/logo.svg) | Source art — export **400×400 PNG** for avatar |
| [`screenshots/`](screenshots/) | In-game screenshots for the gallery |

## Before you submit

1. Finish playtesting on the CurseForge instance (`Modded Randon One Block`).
2. Run `./update-modlist.sh` so `modlist.md` matches the export.
3. Export the profile as a `.zip` (see [`export-checklist.md`](export-checklist.md)).
4. Export [`logo/logo.svg`](logo/logo.svg) to **400×400** PNG (see [`logo/README.md`](logo/README.md)).
5. Add 3–5 screenshots under [`screenshots/`](screenshots/) (island, quest book, random block roll).
6. Create the CurseForge project and paste fields from [`curseforge-profile.md`](curseforge-profile.md).
7. Upload the `.zip` as the first file; set display name to match `project-metadata.json` version.

## Pack identity

| Field | Value |
|-------|-------|
| Display name | Modded Random OneBlock |
| Minecraft | 26.1.2 |
| Mod loader | NeoForge 26.1.2.76 |
| Mod count | 72 (see [`modlist.md`](../modlist.md)) |
| Source repo | https://github.com/PsyCrow1976/Randon-One-Block |