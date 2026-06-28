# CurseForge project form — copy-paste reference

Honest positioning: **experimental AI-assisted modpack** for Minecraft 26.1.2. Not a handcrafted expert pack — a playable test of how far AI can build skyblock + KubeJS + quests.

## Project links

| Field | Value |
|-------|--------|
| **Project ID** | `1591048` |
| **Authors dashboard** | https://authors.curseforge.com/#/projects/1591048/ |
| **Slug** | `randon-one-block` |
| **Publish script** | [`scripts/publish-curseforge.sh`](../scripts/publish-curseforge.sh) |

```bash
CF_API_TOKEN='your-token' CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
```

Token from [CurseForge API Tokens](https://www.curseforge.com/account/api-tokens). Revoke after use. Logo and categories must be set manually in Authors.

## Main submission page

| Field | Value |
|-------|--------|
| **Game** | Minecraft |
| **Project name** | Randon One Block |
| **Logo** | `branding/logo/logo.png` (400×400, export from `logo.svg`) |
| **Summary** | Paste from [`summary.txt`](summary.txt) |
| **Class** | Modpack |
| **Main category** | Skyblock |
| **Additional categories** | Quests, Adventure, Multiplayer |
| **Allow comments** | Yes |
| **Experimental** | Consider **Beta** release type on first upload |
| **Description editor** | Markdown — paste from [`description.md`](description.md) |
| **License** | MIT (match GitHub) |

## Suggested tags

`skyblock`, `oneblock`, `ai`, `experimental`, `kubejs`, `ftb quests`, `neoforge`, `haven skyblock`, `uncrafting`

## After the project is created

| Section | Value |
|---------|--------|
| **Source** | `https://github.com/PsyCrow1976/Randon-One-Block` |
| **Issues tracker** | `https://github.com/PsyCrow1976/Randon-One-Block/issues` |
| **Images** | Screenshots from `branding/screenshots/` |
| **First file** | `scripts/publish-curseforge.sh` or CurseForge app export — see [`export-checklist.md`](export-checklist.md) |

## Moderation notes

- Description explains the name: **Randon** = typo for **Random** when the GitHub repo was created; kept after rejected titles **Modded Random OneBlock** and **Random Modded One Block**.
- Official project name: **Randon One Block** (not “Random Modded One Block”).
- Description clearly states **AI-assisted development** and credits **Chaos OneBlock**.
- All listed mods have CurseForge IDs in `modlist.json` (no manual overrides/mods folder needed for CF-hosted jars).
- Avatar: simple 3×3 grass island + mystery block (see `logo.svg`).