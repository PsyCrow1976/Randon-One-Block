# Changelog

User-friendly summary of what changed in **Randon One Block**. Technical details live in [`README.md`](README.md) and [`requirements.md`](requirements.md).

The format is simple: newest release first, plain language, no mod jargon unless it helps.

**Versioning:** During development, bump the patch segment for each change (`1.0.0.12`, `1.0.0.13`, …). When the current work track is complete, publish **`1.0.1.0`** to CurseForge. Keep `branding/project-metadata.json` in sync with the newest changelog entry.

---

## [1.0.0.26] — 2026-06-30

### Random One Block

- **`/randomblock poolenable`** — Fixed `NoSuchFileException` when saving team unlocks; files now go to `kubejs/config/random_one_block_unlocks/` with the directory auto-created.
- **Quest unlock map** — Fixed `quest_unlock_map` not registering handlers (`Registered 0` in log); map entries are parsed reliably from JsonIO config.

---

## [1.0.0.25] — 2026-06-30

### Random One Block

- **Quest unlock** — Completing **Leather Backpack** (`1D5A582F52D7CB30`, Storage Options) unlocks `sophisticatedstorage` blocks in the random pool for your team. Replaces the old Good-to-Know Mods GTKM quest mapping.

---

## [1.0.0.24] — 2026-06-30

### Random One Block

- **KubeJS fix** — Starter-exception parsing now handles nested `starter_exceptions.enabled` reliably (Java/JsonIO list types). Removed stale duplicate `random_one_block_mod_pools.json` from the instance root that only had `elevatorid` and overrode your `kubejs/config/` edits. Reload logs loaded starter exceptions.

---

## [1.0.0.23] — 2026-06-30

### Random One Block

- **Starter exceptions** — Added `uncraftingtable` to `starter_exceptions.enabled` so the Uncrafting Table block can roll from day one (1 block in master pool).

---

## [1.0.0.22] — 2026-06-30

### Random One Block

- **`random_one_block_mod_pools.json`** — `starter_exceptions` is now an object with `enabled` (day-one mods) and `mods_with_minable_blocks` (catalog of all 19 mod namespaces in the current master pool). Script accepts the legacy array form for `enabled`.

---

## [1.0.0.21] — 2026-06-30

### Random One Block

- **`/randomblock pools debug complete`** — Lists every mod and all master-pool block ids (with weights) in `logs/kubejs/server.log`. Chat shows the mod overview; use `complete <mod>` to page a mod's blocks in chat.

---

## [1.0.0.20] — 2026-06-30

### Random One Block

- **`/randomblock pools debug`** — Always prints the mod list in chat (paginated, 20 per page) and logs the full report to `logs/kubejs/server.log`. No longer requires `debug_logging` in config.

---

## [1.0.0.19] — 2026-06-30

### Random One Block

- **`/randomblock pools debug`** — Fixed false “enable debug_logging” message: mod-pools script now reads the cloned config (JsonIO returns unmodifiable maps) and reloads config from disk before dumping.

---

## [1.0.0.18] — 2026-06-30

### Random One Block

- **Debug output** — Pool and mod-pool debug no longer write files. With `"debug_logging": true`, `/randomblock pools debug` and pool rebuild dump to **`logs/kubejs/server.log`** instead of `kubejs/config/`.

---

## [1.0.0.17] — 2026-06-30

### Random One Block

- **`/randomblock pools debug`** — JsonIO bare filenames wrote to the **instance root**; dumps now use `config/` so files land in **`kubejs/config/`**. Debug command writes `{}` as a path verification test.

---

## [1.0.0.16] — 2026-06-30

### Random One Block

- **KubeJS fix** — Removed `java.nio.file.Files` (class filter blocked). `/randomblock pools debug` now writes **`random_one_block_mod_pools_debug.json`** via `JsonIO`.

---

## [1.0.0.15] — 2026-06-30

### Random One Block

- **`/randomblock pools debug`** — Writes plain-text report via `Files.writeString` (JsonIO only supports JSON, so `.txt` dumps were silently skipped).

---

## [1.0.0.14] — 2026-06-30

### Random One Block

- **KubeJS fix** — `random_one_block_mod_pools.js` no longer assigns to `global` (fixes `UnsupportedOperationException` on load; mod pool script was 4/5 loaded).

---

## [1.0.0.13] — 2026-06-29

**Mod-pool gating** for the random one-block — vanilla-only default, quest unlocks, per-team persistence (80 mods).

### Mods

- **Added:** FTB XMod Compat `26.1.2.1` (KubeJS ↔ FTB Quests events)

### Random One Block

- **Default pool** — Only **vanilla** blocks at pack start; `starter_exceptions` in config adds early mods (e.g. OpenBlocks Elevator).
- **Per-team unlocks** — Completing mapped FTB Quests unlocks a mod's blocks for the whole Haven team; persisted in `kubejs/data/random_one_block_unlocks/`.
- **Commands** — `/randomblock poolenable`, `pools`, `pools list`, `pools debug`.
- **First quest map** — Sophisticated Storage GTKM quest unlocks `sophisticatedstorage` namespace.

### Scripts

- **`random_one_block_mod_pools.js`** — Namespace catalog, effective pool builder, team persistence.
- **`random_one_block_quest_unlocks.js`** — `FTBQuestsEvents.completed` + login backfill from `quest_unlock_map`.

---

## [1.0.0.12] — 2026-06-29

Post-**1.0.0.11** repo updates (not yet published to CurseForge).

### Documentation

- **`todolist.md`** — Expanded with custom compression recipes (leather block, wool) for the random block pool and tiered progression gating (e.g. Refined Storage unlocks).
- **Versioning policy** — Documented `1.0.0.x` dev bumps → **`1.0.1.0`** milestone release.

### Tooling

- **`scripts/publish-curseforge.sh`** — Fixed CurseForge upload metadata encoding (`--form-string`) so long markdown changelogs upload successfully.

---

## [1.0.0.11] — 2026-06-29

Mod list refresh, quest book updates, and **Storage Options** complete for now (79 mods).

### Mods

- **Added:** Animal Pens `2.4.3`
- **Added:** BBL Utility `26.1.2-2.7.11`
- **Added:** Bookshelf `26.1.2.12`
- **Added:** Dark Utilities `26.1.2.2`
- **Added:** Kotlin for Forge `6.3.0-all`
- **Added:** Nyctography `26.1.2.3`
- **Added:** Pig Pen Cipher `26.1.2.4`
- **Added:** Runelic `26.1.2.3`
- **Added:** Sophisticated Core `26.1.2-1.4.75.2082`
- **Added:** Sophisticated Storage `26.1.2-1.5.84.1898`
- **Added:** The Uncrafting Table `0.0.4`
- **Added:** Time in a Bottle `neoforge-7.1.0`
- **Removed:** BBL Utility `26.1.2-2.7.10`
- **Removed:** Kotlin for Forge `6.2.0-all`
- **Removed:** Sophisticated Core `26.1.2-1.4.74.2074`
- **Removed:** Sophisticated Storage `26.1.2-1.5.83.1896`
- **Removed:** The Uncrafting Table `0.0.3`
- **Removed:** Time in a Bottle `neoforge-7.0.0`

### Quests

- **Getting started** — Crafting table, Uncrafting Table, Flying Items, and Good To Know intro quests; early-game tips and rewards in one chapter.
- **Good to Know Mods** — Sophisticated Storage overview quest (leather backpack reward).
- **Storage Options** — Chapter finished: backpack and storage tiers, upgrade branches, shulker line, and crafting-material rewards.

### Documentation

- **`modlist.md` / `modlist.json`** — Refreshed from the playtest instance (79 mods).

---

## [1.0.0.10] — 2026-06-28

New **Storage Options** quest chapter — Sophisticated Backpacks progression and upgrades.

### Quests

- **Added:** FTB Quests chapter **Storage Options** (`storage_options.json5`) — gated behind Getting Started.
- **Backpack tiers:** Leather → Iron (direct or via optional Copper) → Gold → Diamond → Netherite, laid out left to right.
- **Upgrades:** Upgrade Base from the leather backpack, then **52** optional upgrade quests (pickup, filter, magnet, smelting forks, stack tiers, pump, crafting, tank, infinity, and more) with basic → advanced chains and `one_completed` forks where recipes branch.
- **Layout:** Backpack tier line on top; all upgrade quests flow **left to right** on rows below.

### Documentation

- **`howtoquest.md`** — FTB Quests how-to for this pack (chapter/lang files, dependencies, forks, in-game editor pitfalls).

---

## [1.0.0.9] — 2026-06-28

Mod list refresh after playtest instance changes (73 mods).

### Mods

- **Added:** BBL Core `26.1.2-12.6.2`
- **Added:** BBL Utility `26.1.2-2.7.10`
- **Added:** Sophisticated Backpacks `26.1.2-3.25.75.1946`
- **Added:** Sophisticated Storage `26.1.2-1.5.83.1896`
- **Added:** The Uncrafting Table `0.0.3`
- **Removed:** FancyMenu `26.1.2`
- **Removed:** Sophisticated Backpacks `26.1.2-3.25.74.1932`
- **Removed:** Sophisticated Storage `26.1.2-1.5.82.1891`
- **Removed:** The Uncrafting Table `0.0.1`

### Documentation

- **`modlist.md` / `modlist.json`** — Refreshed from the playtest instance (73 mods).

---

## [1.0.0.8] — 2026-06-28

CurseForge resubmission rename (Authors naming rules — no “mod/modded” in project title).

### Renamed

- Display name **Randon One Block** (intentional spelling; replaces “Modded Random OneBlock”).
- CurseForge slug target: `randon-one-block`.
- Logo title text, quest book title, branding copy, and publish script manifest name updated to match.

### Documentation

- **`branding/description.md`** — added “Why Randon?” note (repo typo for Random).
- **`README.md`**, **`requirements.md`**, **`branding/`** — all references updated.
- **`scripts/publish-curseforge.sh`** — zip output `dist/Randon-One-Block-<version>.zip`; fixed manifest version and mod list sorting bugs.

### CurseForge

- Project metadata and **1.0.0.8** file uploaded via API (display name **Randon One Block**). Re-upload logo PNG in Authors if needed.
- Rejected title **Random Modded One Block** replaced with **Randon One Block** on Authors (API `update-project`). Target slug: `randon-one-block` (set manually on General — not supported by API).

---

## [1.0.0.7] — 2026-06-28

Mod list refresh after adding and removing mods in the playtest instance (72 mods).

### Mods

- **Added:** Common Network `networking-neoforge-1.0.23-26.1.2`
- **Added:** Fzzy Config `0.7.6+26.1+neoforge`
- **Added:** Jade 🔍 `NeoForge-26.1.8`
- **Added:** Kotlin for Forge `6.2.0-all`
- **Added:** Nirvana Library `2.2.0`
- **Added:** Sophisticated Core `26.1.2-1.4.74.2074`
- **Added:** Sophisticated Storage `26.1.2-1.5.82.1891`
- **Added:** The Uncrafting Table `0.0.1`
- **Removed:** Jade 🔍 `NeoForge-26.1.7`
- **Removed:** Sophisticated Core `26.1.2-1.4.73.2061`
- **Removed:** Sophisticated Storage `26.1.2-1.5.81.1883`

### Documentation

- **`modlist.md` / `modlist.json`** — Refreshed from the playtest instance (72 mods).
- **`branding/`** — CurseForge copy (summary, description, logo SVG, profile fields, export checklist).
- **`scripts/publish-curseforge.sh`** — Build modpack zip from instance + repo overrides; push project metadata and upload via CurseForge API (project `1591048`).
- **`README.md`**, **`branding/README.md`**, **`branding/curseforge-profile.md`**, **`branding/export-checklist.md`** — Publish workflow and Authors dashboard links.

### CurseForge

- Initial project setup on [Authors (1591048)](https://authors.curseforge.com/#/projects/1591048/) — metadata and **1.0.0.7** modpack file uploaded via API.
- Logo centered and enlarged in `branding/logo/logo.svg`; PNG export for avatar upload in Authors UI.

---

## [1.0.0.6] — 2026-06-27

Removed the KubeJS uncrafting table experiment and refreshed the mod list (67 mods).

### Removed

- **Uncrafting Table** — Dropped the KubeJS custom block, config, and scripts. Custom chest GUI layouts are not viable on Minecraft 26.1.2 with the current KubeJS API; the feature is shelved.

### Mods

- **Added:** Baubley Heart Canisters `26.1.2-1.7.3`
- **Added:** Colorful Hearts `26.1.2.0`
- **Added:** Construction Sticks `26.1.2-3.1.3`
- **Added:** Crafting on a stick `1.0`
- **Added:** Curios API `beta.2+26.1.2`
- **Added:** Day Count `1.6.0-NeoForge-mc26.1`
- **Added:** Forgiving Void `26.1.2.1`
- **Added:** GraveStone Mod `neoforge-1.0.37+26.1.2`
- **Added:** Leaves Be Gone `v26.1.0-mc26.1.x-NeoForge`
- **Added:** More Overlays Updated `1.24.4-mc26.1.2-neoforge`
- **Added:** Puzzles Lib `v26.1.11-mc26.1.x-NeoForge`
- **Added:** Simple Voice Chat `neoforge-2.6.20+26.1.2`
- **Added:** Sodium `neoforge-0.8.12+mc26.1.2`
- **Added:** Time in a Bottle `neoforge-7.0.0`
- **Added:** Trade Cycling `neoforge-1.0.21+26.1.2`

### Documentation

- **`modlist.md` / `modlist.json`** — Refreshed from the playtest instance (67 mods).

---

## [1.0.0.5] — 2026-06-26

Random block pool now excludes partial blocks (crops, flowers, rails, pots, etc.).

### Random One Block

- **Collision filter** — Pool build only keeps blocks with a full 1×1×1 collision cube (Chaos OneBlock-style geometry check). Toggle with `require_full_collision_cube` in `kubejs/config/random_one_block.json`.

---

## [1.0.0.4] — 2026-06-26

Five new mods in the playtest instance (52 mods total).

### Mods

- **Added:** Controlling `26.1.2.4`
- **Added:** FancyMenu `26.1.2`
- **Added:** Konkrete `neoforge_1.10.1_MC_26.1.1`
- **Added:** Melody `neoforge_1.0.16_MC_26.1.1`
- **Added:** Searchables `1.0.2`

---

## [1.0.0.3] — 2026-06-26

Mod inventory tracking for the playtest instance.

### Documentation

- **`modlist.md`** — Full list of installed mods with versions (47 mods, Minecraft 26.1.2 / NeoForge 26.1.2.76).
- **`update-modlist.sh`** — Refreshes the list from the CurseForge instance and can print added/removed/updated mods for the changelog.

---

## [1.0.0.2] — 2026-06-26

New mod intro chapter and a Gateways to Eternity starter quest.

### Quests

- **Good to Know Mods chapter** — New chapter directly under *Getting started* for short mod introductions.
- **gateway to eternity** — Checkmark quest explaining Gateways to Eternity; reward is a Gateway of the Emerald Grove Gate Pearl (summons passive farm animals when completed).

---

## [1.0.0.1] — 2026-06-24

Quest book polish and a player-friendly way to reset stuck random blocks.

### Quests

- **The Basics chapter** — New chapter after *Getting started*; craft a crafting table to earn 10 experience.
- **Chapter names fixed** — *Getting started* and *The Basics* now show their proper titles in the quest book (no more “Unnamed”).
- **Cant mine the block?** — Repeatable quest under *Getting started*; claim the reward to reset your random block to dirt when you roll something you cannot break (no operator command needed).
- **Quest text fixes** — Titles and task descriptions display correctly after in-game quest edits.

---

## [1.0.0.0] — 2026-06-24

First playable release.

### Skyblock & islands

- **Spawn island** — New players start on a Haven skyblock lobby island before creating a team island.
- **One-block island template** — Create your island with `oneblock_island`: a small grass pyramid with one dirt block in the center to mine.
- **Spawn on the right block** — You land on the center dirt so mining works immediately.

### Random block generator (v1)

- **Mine one block, get another** — Break the center dirt and a random block from the modpack appears in its place (~2100+ possible blocks).
- **Keep mining** — Every time you break that block, you roll again for a new random block.
- **Automatic setup** — When you create a one-block island, the pack registers your mining block for you (no manual setup needed).

### Quests

- **First quest chapter** — *Getting started* is in the quest book with a welcome quest to complete.
- **Starter reward** — Finish the welcome quest to receive a stone paxel.
- **Quest book on join** — The FTB Quest book is placed in your hotbar when you first log in.

### For server owners

- Operator commands under `/randomblock` (info, reload, manual position setup).
- Config file for weights, blacklist, and mechanic toggles: `kubejs/config/random_one_block.json`.