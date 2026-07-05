# Changelog

User-friendly summary of what changed in **Randon One Block**. Technical details live in [`README.md`](README.md) and [`requirements.md`](requirements.md).

The format is simple: newest release first, plain language, no mod jargon unless it helps.

**Versioning:** **`1.0.4.x`** — patch bumps during development; milestone **`1.0.4.0`** = ProjectE quest book + pool unlocks (CurseForge). **`1.0.4.1`** = browsable mod + item catalog (HTML). **`1.0.4.2`** = recipe-based FTB quest chapters + generator docs. **`1.0.4.3`** = manual quest-line layout for Cooking for Blockheads and Baubly Slots. Previous milestone **`1.0.3.0`** = team Randon Mined counter. Track **`1.0.3.x`** — quest chapters, ProjectE, mod-pool catalog. **`1.0.2.0`** = Ex Deorum quest book.

---

## [1.0.4.3] — 2026-07-05

### FTB Quests — manual progression (2 chapters)

Finished in the quest book editor: dependency lines, grid layout, and chapter titles synced from in-game saves.

- **Cooking for Blockheads** — Kitchen progression wired (fridge, oven, cow jar, spice rack, cooking tables, and related craft line). Trimmed from the generated flat grid to a focused chapter layout with dependency chains.
- **Baubly Slots** (Baubley Heart Canisters) — Curios heart-canister line laid out with tier dependencies (`dependency_requirement: one_completed` where needed), hearts → canisters → blade/relic rewards.

### Quest book metadata

- **`chapter.json5`** — Tab title **Baubly Slots** for the BHC chapter; Cooking for Blockheads chapter id/lang key updated after in-game editor save.

Other generator mod chapters (Ender IO, Refined Storage, Mystical Agriculture, etc.) remain standalone until linked manually.

---

## [1.0.4.2] — 2026-07-05

### FTB Quests — 13 new mod chapters (2,505 quests)

Recipe-based quest tabs for every craftable output from installed mod data. Each quest is **standalone** (no dependency links — wire progression manually). Funny titles, detailed `quest_desc`, item obtain task, 10 XP reward.

| Chapter | Quests |
|---------|--------|
| Ender IO | 864 |
| Mystical Agriculture | 713 |
| Refined Storage | 380 |
| Farming for Blockheads | 71 |
| Cooking for Blockheads | 153 |
| Powah | 133 |
| Dark Utilities | 56 |
| Baubley Heart Canisters | 31 |
| BBL Utility | 32 |
| Mystical Agradditions | 43 |
| Construction Sticks | 11 |
| Mystical Agriculture Tiered Crystals | 11 |
| Mystical Automation | 7 |

### Generators & docs

- **`generate-ftb-quests.sh`** — Regenerate quest chapter + lang files from CurseForge instance mod JARs; runs stale-instance cleanup first.
- **`scripts/generate_ftb_mod_quests.py`** — Python generator (`MODLIST_INSTANCE` / `--instance` supported).
- **`moditemrecipy.md`** — Expanded pack generator guide: mod/item HTML **and** FTB quests, plus stale-instance troubleshooting.
- **`generate-moditemlist.sh`** — Now runs stale-instance cleanup before building HTML.
- **`scripts/clean-stale-instance-config.sh`** — Symlink checks (`config/`, `kubejs/`), `mods/` jar count, removes `random_one_block_mod_pools_debug.txt` and other stray instance-root pack configs.
- **`link-instance.sh`** — Respects `MODLIST_INSTANCE`; cleans target instance after linking.
- **`howtoquest.md`** — Link to bulk quest regeneration workflow.

---

## [1.0.4.1] — 2026-07-05

### Mod & item catalog

- **`modlist.html`** — Browsable HTML list with **Mods** and **Items & Blocks** tabs (search, filters, pagination). Format: Modpack · Item · Item Type · Description; items also show mod source, craftable/uncraftable, and registry id.
- **`modlist-items.json`** — Machine-readable cache (~4,300 mod items/blocks) extracted from installed mod JAR lang + recipe data and KubeJS pack recipes.
- **`generate-moditemlist.sh`** — One-command regen from the CurseForge instance (`--update-mods` refreshes `modlist.json` first).
- **`moditemrecipy.md`** — How-to for regenerating the catalog after pack changes.
- **`scripts/generate-modlist-html.py`** / **`scripts/modpack_items.py`** — Generator and item extractor (`MODLIST_INSTANCE` / `--instance` supported).

---

## [1.0.4.0] — 2026-07-04

**Milestone** — **ProjectE**, expanded quest book, and reliable mod-pool unlocks (CurseForge release).

### Highlights

- **81 mods** on Minecraft **26.1.2** / NeoForge **26.1.2.76**
- **ProjectE** (`projecte-1.2.0`) — full quest chapter with dependency tree; Philosopher's Stone in Getting Started unlocks the `projecte` random pool for your island team
- **Six mod quest chapters** added in 1.0.3.x — Iron Furnaces, Animal Pens, Apotheosis, Easy Villagers & Piglins, Dank Storage, and ProjectE
- **Mod pool gating** — catalog expanded for ProjectE, Ender IO, and Easy Ore Generation; KubeJS quest unlocks fixed (config path + handler re-registration after `/reload`)
- **Randon Mined** team counter overlay (from 1.0.3.0) still included

### FTB Quests

- **Quest book sync** — Reward text and lang entries refreshed from in-game editor across Getting Started, Storage Options, Ex Deorum, ProjectE, Apotheosis, Iron Furnaces, Animal Pens, Dank Storage, Easy Villagers, and Good to Know Mods
- **ProjectE** — Gated chapter (Philosopher's Stone entry → fuels → machines → matter tiers); *The Red Rock* unlocks ProjectE blocks in the random pool (same KubeJS path as Leather Backpack → Sophisticated Storage)
- **Getting Started** — Philosopher's Stone quest, Crafting Table on a Stick, Uncrafting Table reward line

### Random One Block

- **`random_one_block_mod_pools.json`** — `projecte`, `enderio`, `easyoregeneration` added to `mods_with_minable_blocks`; quest unlock map for ProjectE, Ex Deorum, and Sophisticated Storage
- **Config I/O** — Pack JSON always loads from `kubejs/config/`; stale instance-root copies cleaned via `clean-stale-instance-config.sh`

### Mods (since 1.0.3.0)

- **Added:** ProjectEE `1.2.0`, Easy Ore Generation, Ender IO
- **Removed:** JourneyMap (1.0.3.0), Construction Wand - KOTS (1.0.3.1)
- **Updated:** Balm, BBL Core, Bookshelf, Sophisticated Backpacks, Sophisticated Core, Sophisticated Storage

---

## [1.0.3.10] — 2026-07-04

### FTB Quests

- **Quest rewards sync** — Lang entries and reward labels updated from in-game editor across all quest chapters (Getting Started, Storage Options, Ex Deorum, ProjectE, Apotheosis, Iron Furnaces, Animal Pens, Dank Storage, Easy Villagers, Good to Know Mods). Philosopher's Stone quest rewards trimmed to XP only (pool unlock handled by KubeJS).

---

## [1.0.3.9] — 2026-07-04

### Random One Block

- **ProjectE quest unlock** — Same KubeJS path as Leather Backpack → Sophisticated Storage: `FTBQuestsEvents.completed` on task `6752A8FD5075C68D` unlocks `projecte` for the island team. Removed the FTB command reward (`poolenable` needs a player; command rewards run as console). Fixed handler re-registration after `/reload` so unlock listeners are always re-bound.

---

## [1.0.3.8] — 2026-07-04

### Random One Block

- **Config path fix** — `random_one_block_config_io.js` no longer falls back to instance-root JSON (stale `random_one_block_mod_pools.json` was shadowing `kubejs/config/` and dropped the ProjectE quest unlock). Run `./scripts/clean-stale-instance-config.sh` after linking an instance.
- **ProjectE unlock belt-and-suspenders** — Philosopher's Stone quest also runs `randomblock poolenable projecte true` on completion.

---

## [1.0.3.7] — 2026-07-04

### Random One Block

- **ProjectE pool unlock** — Completing the Getting Started Philosopher's Stone quest (`57BD1D73E42470EF`) enables the `projecte` namespace for the island team via `quest_unlock_map` + `quest_task_fallback`.

### FTB Quests

- **Getting Started** — Philosopher's Stone quest text notes the ProjectE pool unlock on completion.

---

## [1.0.3.6] — 2026-07-04

### Random One Block

- **`random_one_block_mod_pools.json`** — Catalog (`mods_with_minable_blocks`) updated for newly added mods with full-collision mineable blocks: **ProjectE**, **Ender IO**, and **Easy Ore Generation**. Starter `enabled` pool unchanged (`elevatorid`, `kubejs`, `uncraftingtable`).

---

## [1.0.3.5] — 2026-07-04

### FTB Quests

- **ProjectE chapter** — Synced from in-game editor: quest layout repositioned, dependency chains added (Philosopher's Stone entry → fuels → machines → matter tiers), chapter ID updated. Lang file rebuilt to match current quest and task IDs.

---

## [1.0.3.4] — 2026-07-04

### FTB Quests

- **Getting Started** — Philosopher's Stone quest (*The Red Rock*) gated behind the crafting table; points players at the ProjectE chapter.

---

## [1.0.3.3] — 2026-07-04

### FTB Quests

- **ProjectE chapter** — New tab with **106** standalone quests (10 XP each, no dependency links) for every craftable item from `projecte-1.2.0.jar` recipes: fuels, Klein Stars, collectors, condensers, DM/RM tools and armor, rings, lenses, alchemical bags, and more. Informal titles and detailed descriptions per item.

---

## [1.0.3.2] — 2026-07-04

### Mods

- **`modlist.md` / `modlist.json`** — Refreshed from playtest (**81** mods). **Added:** ProjectEE `1.2.0`. **Updated:** Balm, BBL Core, Sophisticated Backpacks, Sophisticated Core.

---

## [1.0.3.1] — 2026-07-03

### FTB Quests

- **Five new mod chapters** — Iron Furnaces, Animal Pens, Apotheosis, Easy Villagers & Piglins, and Dank Storage. Each item in those mods has its own quest (10 XP, no dependency links).
- **Chapter tab titles** — Lang entries synced to in-game chapter IDs so tabs no longer show as "Unnamed".
- **Getting Started** — Crafting Table on a Stick quest and text tweaks from playtest.
- **Ex Deorum / Storage Options** — Quest book synced from in-game editor (layout and lang).

### Mods

- **`modlist.md` / `modlist.json`** — Refreshed from playtest (**80** mods). **Added:** Easy Ore Generation, Ender IO. **Removed:** Construction Wand - KOTS. **Updated:** Bookshelf, Sophisticated Core, Sophisticated Storage.

---

## [1.0.3.0] — 2026-06-30

**Milestone** — team **Randon Mined** counter and overlay (CurseForge release).

### Random One Block

- **Team mine counter** — Tracks how many Randon center blocks your **island team** has mined (shared count, not per-player). Persists in `kubejs/config/random_one_block_team_counters.json`.
- **Randon Mined overlay** — Shows **Randon Mined :** plus your team total above the hotbar (MC 26 `setOverlayMessage`). Toggle with `randon_counter_hud.enabled` in `kubejs/config/random_one_block.json`.
- **`/randomblock counter`** — Prints team scope, mined total, and overlay on/off; refreshes the on-screen count.
- **Config path fix** — Pack JSON resolves under `GAMEDIR/kubejs/config/`; runtime files (`team_unlocks`, `team_counters`, etc.) auto-create on first load.
- **Instance linking** — `link-instance.sh` and `clean-stale-instance-config.sh` remove stray instance-root pack configs from **both** CurseForge instances by default.

### Mods

- **`modlist.md` / `modlist.json`** — Refreshed from the playtest instance (**79** mods). **Removed:** JourneyMap.

---

## [1.0.2.9] — 2026-06-30

### Random One Block

- **Mine counter overlay** — Uses `setOverlayMessage` (the only reliable text path on MC 26 in this pack). Shows **Randon Mined :** plus your team count above the hotbar. Set `randon_counter_hud.enabled` to `false` to hide.

---

## [1.0.2.8] — 2026-06-30

### Random One Block

- **Counter diagnostic startup fix** — Removed `RegisterGuiLayersEvent` from client scripts (mod-bus only); text1..text12 now use game-bus `RenderGui` / overlay APIs so KubeJS client scripts load without bus errors.

---

## [1.0.2.7] — 2026-06-30

### Random One Block

- **Counter diagnostic startup fix** — NeoForge `EventBus.addListener` now uses the explicit 4-argument form so KubeJS/Rhino no longer fails with an ambiguous method error on launch.

---

## [1.0.2.6] — 2026-06-30

### Random One Block

- **Counter text diagnostic** — Client script draws `text1`..`text12` using different MC 26 screen-text APIs (Gui layers, RenderGui events, overlay message, subtitle, F3 debug line) so you can report which label is visible.

---

## [1.0.2.5] — 2026-06-30

### Random One Block

- **Config path fix** — Pack JSON now resolves via `GAMEDIR/kubejs/config/` first (KubeJS 8 `CONFIG` could point at the instance root). Runtime files (`team_unlocks`, `team_counters`, etc.) auto-create on first load instead of warning.

---

## [1.0.2.4] — 2026-06-30

### Random One Block

- **Counter HUD visibility** — Text now uses opaque ARGB white (`0xFFFFFFFF`); MC 26 treated `0xFFFFFF` as fully transparent. HUD registers on the official player-health GUI layer so it draws in the correct pass.

---

## [1.0.2.3] — 2026-06-30

### Random One Block

- **Counter HUD crash fix** — MC 26 NBT `getInt()` returns `Optional`; HUD offsets and count are now coerced to plain integers before rendering.

---

## [1.0.2.2] — 2026-06-30

### Random One Block

- **Counter HUD crash fix** — MC 26 uses `GuiGraphicsExtractor.text()` instead of `drawString()`; entering a world no longer crashes when the Randon counter HUD renders.

---

## [1.0.2.1] — 2026-06-30

### Random One Block

- **Team mine counter** — Tracks how many Randon center blocks your **island team** has mined (shared count, not per-player). Persists in `kubejs/config/random_one_block_team_counters.json`.
- **Counter HUD** — Shows `Randon Counter : <count>` above the health hearts. Configure position or disable in `randon_counter_hud` inside `kubejs/config/random_one_block.json` (`enabled`, `offset_x`, `offset_y`). Run `/randomblock reload` after edits.
- **`/randomblock counter`** — Prints your team scope, mined total, and current HUD settings; refreshes the on-screen counter.

### Instance linking

- **Stale config cleanup** — `link-instance.sh` and `scripts/clean-stale-instance-config.sh` now remove stray instance-root pack configs from **both** CurseForge instances by default (`Modded Randon One Block` and `Randon One Block`).

---

## [1.0.2.0] — 2026-06-30

**Milestone** — initial **Ex Deorum** quest book chapter.

### FTB Quests

- **Ex Deorum** — New quest chapter with **78** item quests covering the full Ex Deorum skyblock loop: compressed blocks, crushing, sieving, ore chunks, mesh and hammer tiers, watering cans, oak barrel/sieve/crucible stations, and mechanical automation.
- **Quest descriptions** — Every quest includes detailed `quest_desc` text (crafting, sieving, and island tips).
- **Random pool unlock** — Completing the **Compressed Dirt** quest unlocks the **Ex Deorum** mod namespace in the random one-block pool for your team.

---

## [1.0.1.5] — 2026-06-30

### FTB Quests

- **Ex Deorum** — Added detailed `quest_desc` text for all **78** quests in the chapter (compression, crushing, sieving, ore chunks, mesh/hammer/watering-can tiers, barrels, and automation). Your existing Compressed Dirt description and progression layout are unchanged.

---

## [1.0.1.4] — 2026-06-30

### Random One Block

- **Config path fix** — Pack JSON now loads from `kubejs/config/` via `KubeJSPaths.DIRECTORY` (KubeJS 8 was resolving `CONFIG` to the instance root). Stale copies at the instance root no longer shadow quest unlock mappings.
- **Quest unlock handlers** — Ex Deorum Compressed Dirt (`5F76BA38891F3B07`) registers alongside Sophisticated Storage; handlers refresh on server load after config reload.

### FTB Quests

- **Ex Deorum chapter title** — `chapter.E8D4F2A1B3C59607.title` added in both `chapter.json5` and `chapters/ex_deorum.json5` so the tab shows **Ex Deorum** instead of Unnamed.

---

## [1.0.1.3] — 2026-06-30

### FTB Quests

- **Ex Deorum** — New quest chapter with **153** item quests grouped by recipe chain (compressed blocks, crushed, sieving outputs, mesh/hammer tiers, porcelain, wood stations, and more). No dependency lines — link progression yourself in the quest editor.
- **Compressed Dirt** quest unlocks the **Ex Deorum** mod namespace in the random one-block pool for your team.

---

## [1.0.1.2] — 2026-06-30

### FTB Quests

- **Getting Started** — New **Random Pools** read quest: explains tiered mod pools (vanilla-heavy start, more mods unlock as you complete quests).
- **Getting Started** — New **Crafting Table on a Stick** quest with description for portable crafting on the island. Quest icons added in chapter layout.

---

## [1.0.1.1] — 2026-06-30

### Random One Block

- **Mining log** — Restored `roll=X/Y` (effective total weight). Added `w=` (picked block weight) and `chance=` (percent from `weight / total_weight`). Fixes misleading logs after mod-pool gating dropped the `/Y` suffix.
- **README** — Expanded weight math: chance formula, 3-block example, and large-pool examples for weights 1 / 3 / 5 / 10.

---

## [1.0.1.0] — 2026-06-30

**CurseForge milestone** — mod-pool gating, quest unlocks, and custom compression blocks for the random one-block loop.

### Random One Block — mod pool gating

- **Tiered pool** — Day one rolls **vanilla** plus **starter exceptions** (`elevatorid`, `kubejs`, `uncraftingtable`). Other mod namespaces unlock **per team** when FTB quests complete or an operator runs `/randomblock poolenable`.
- **Quest unlocks** — Completing quests (e.g. Leather Backpack → Sophisticated Storage) auto-enables the linked mod pool. Task-level FTB handlers, login backfill, and `/randomblock pools debug quests` for troubleshooting.
- **Pool commands** — `/randomblock pools`, `pools list`, `pools debug`, `pools debug complete <mod>`, `pools debug quests`, and `poolenable <mod> true|false`. Full reference in [`README.md`](README.md).

### Custom blocks & recipes (KubeJS)

- **Compression blocks** — Leather, sapling, carrot, potato, and torch blocks: craft 3×3 → 1 block, decompress → 9 items. Minable and in the random pool under namespace `kubejs`.
- **Docs** — [`howtocustomblocks.md`](howtocustomblocks.md) for adding more storage blocks; [`howtoquest.md`](howtoquest.md) for quest → mod unlock wiring.

### Config & stability

- **Authoritative config** — All pack JSON loads/saves via `kubejs/config/` only (`RandonOneBlockConfigIO`). `./link-instance.sh` and `./scripts/clean-stale-instance-config.sh` remove stray instance-root copies that shadowed real config.
- **Weight overrides** — Crafting table, dirt, cobblestone, and uncrafting table tuning in `random_one_block.json`.

### Docs

- Updated **README**, **requirements**, **todolist**, and pool-command tables for mod gating and custom blocks.

---

## [1.0.0.37] — 2026-06-30

### Random One Block

- **Quest unlocks** — Fixed `player.getUUID()` crashes in scheduled backfill (use `player.uuid` / `FTBQuests.getData`). Task fallback merges pack defaults when instance-root config is stale. Retry handler registration on server load if script-load pass registered 0 handlers. Removed stray instance-root `random_one_block_mod_pools.json` (missing `quest_task_fallback` → 0 handlers).

---

## [1.0.0.36] — 2026-06-30

### Random One Block

- **Quest unlock debug** — `quest_unlock_trace_log` writes each task event / unlock attempt to `logs/kubejs/server.log`. `/randomblock pools debug quests` shows FTB completion state in chat. Delayed unlock retries (1/5/20 ticks) fix quest-marked-complete timing after task events.

---

## [1.0.0.35] — 2026-06-30

### Random One Block

- **Quest unlocks** — Removed NeoForge `EventBus.addListener` (Rhino overload errors broke `/reload`). Restored `FTBQuestsEvents.completed` on **task** hex ids per quest (`quest_task_fallback` + live FTB quest file lookup). Unlock runs when the parent quest is complete; login backfill unchanged.

---

## [1.0.0.34] — 2026-06-30

### Random One Block

- **Quest unlocks** — Fixed Rhino `EventBus.addListener` ambiguity by wrapping the QuestProgress handler in `java.util.function.Consumer`. Persistent listener flag is only set after successful registration.

---

## [1.0.0.33] — 2026-06-30

### Random One Block

- **Quest unlocks** — `FTBQuestsEvents.completed` only fires for **task** completion, not **quest** completion. Leather Backpack unlock now listens to NeoForge `FTBQuestsEvent.QuestProgress` (COMPLETED) with quest hex ids from `quest_unlock_map`. Player resolution uses `getPlayer()`, notified/online members, and FTB current player. Listener registers once per world via overworld persistent flag (safe across `/reload`).

---

## [1.0.0.32] — 2026-06-30

### Random One Block

- **Quest unlocks** — FTB `completed` events use `getCurrentPlayer()` (not `event.player`). Quest lookup for backfill uses FTB long ids from hex quest ids. Delayed backfill on login and server load for already-completed quests.

---

## [1.0.0.31] — 2026-06-30

### Random One Block

- **Quest unlocks** — Fixed script load order: `mod_pools.js` priority 3, `quest_unlocks.js` priority 2 (KubeJS loads higher priority first). Fixes `handlers not registered` warning and quest completion not unlocking mods.

---

## [1.0.0.30] — 2026-06-30

### Random One Block

- **Quest pool unlocks** — FTB quest completion now passes `event.server` so Haven team scope resolves correctly. Player-scope unlocks merge into `haven-` / `ftbteam-` scope on login and pool list. Normalized team unlock JSON so `enabled_mods` persists reliably.

---

## [1.0.0.29] — 2026-06-30

### Random One Block

- **`/randomblock poolenable <mod> false`** — Removed extra operator-only gate; disable now uses the same permission as enable. Clearer message when disable fails (starter exception, not unlocked, etc.).

---

## [1.0.0.28] — 2026-06-30

### Random One Block

- **Quest unlocks** — `FTBQuestsEvents.completed` now registers at script load (priority 2, after mod pools). Fixes KubeJS error: handlers cannot be registered from `ServerEvents.loaded`.

---

## [1.0.0.27] — 2026-06-30

### Random One Block

- **KubeJS fix** — Removed `java.io.File` (class filter). Config and team unlocks now read/write via `KubeJSPaths.CONFIG` absolute paths. Single `random_one_block_team_unlocks.json` replaces per-scope files. Fixes empty `quest_unlock_map` when a stale instance-root mod pools copy existed.

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