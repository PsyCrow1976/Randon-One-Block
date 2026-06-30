# Randon One Block — Requirements & Session Handoff

**Read this file first** at the start of a new session (human or AI) to understand what the project is, what must keep working, what is required next, and which technical constraints must not be broken.

**Last playtest-verified:** 2026-06-30 — `oneblock_island` create, auto setbelow, mod pool gating + quest unlocks, custom `kubejs` compression blocks, `/randomblock pools` commands. Treat this flow as the regression baseline.

Also read [`README.md`](README.md) for player-facing docs and quick start.

---

## For AI agents — start here

1. **Project:** NeoForge skyblock modpack with a KubeJS “Random One Block” on **`oneblock_island`** Haven templates (~2100+ weighted blocks from the full registry).
2. **Status:** Random One Block + `oneblock_island` spawn + auto setbelow + quest book are **confirmed working** (playtest 2026-06-24). Do not regress without re-running the end-to-end checklist in README.
3. **Before editing mechanics:** Read `kubejs/server_scripts/random_one_block.js` and the **KubeJS / Rhino constraints** section below.
4. **Before adding custom blocks/recipes:** Read [`howtocustomblocks.md`](howtocustomblocks.md) (startup vs server scripts, assets, datapack recipes, pool gating).
5. **After changes:** User runs `/reload` in CurseForge; verify `logs/kubejs/server.log` for pool size, test picks, and break logs.
6. **Repo is source of truth** — `kubejs/` and `config/` symlink into the CurseForge instance via `./link-instance.sh`.
7. **Scope:** Prefer small diffs. Do not refactor working patterns. Do not commit generated pool dumps unless asked.

---

## Project summary

**Randon One Block** is a NeoForge skyblock pack repo. Players start on Haven Skyblock islands and progress via FTB Quests. The signature mechanic is a **random block generator** on the center dirt of the **`oneblock_island`** template: mining it replaces it with a weighted random block from the full modpack block registry (~2100+ eligible blocks). Each team island can use the same layout; `island_template_mode` detects the pyramid pattern without per-island config.

| Item | Value |
|------|-------|
| Repo | `/home/christer/repo/Randon-One-Block` (GitHub: `PsyCrow1976/Randon-One-Block`) |
| Playtest instance | `/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block` |
| Minecraft | 26.1.2 |
| NeoForge | 26.1.2.76 |
| KubeJS | 26.1.2-8.0.3 |
| Symlinks | `kubejs/` and `config/` in instance → repo (`./link-instance.sh`) |

---

## Core requirements (must keep working)

### Random One Block mechanic

1. **Active position** stored in `kubejs/config/random_one_block.json` → `active_block` (last registered; overwritten per auto setbelow).
2. **Auto setbelow** after `oneblock_island` create — `ServerEvents.tick` watcher polls every 5 ticks; when Haven reports `team=yes` + `template=oneblock_island`, waits `auto_setbelow_delay_ticks` (default `40`) for teleport/spawn to finish, then registers the block under player feet via `playerStandingBlock()` + `auto_setbelow_y_offset` (default `0`). Same coords as manual `/randomblock setbelow`. Manual command still works.
3. **`island_template_mode`** — mining pyramid center dirt (dirt on bedrock, grass ring on base layer) works on **any** matching island, not only `active_block`.
4. When a player **mines** a matching block → after 1 tick, place a **new random block** from the weighted pool.
5. **Falling blocks** (sand/gravel) → schedule restore of `initial_block` when cell becomes air; bedrock foundation must remain.
6. Pool = all registered blocks minus blacklist, air, and fluids; weights from config (`default_weight`, `weight_overrides`).
7. **`/reload`** and **`/randomblock reload`** must not break commands or pool building.
8. Pool must contain **many unique block IDs** (expect ~2100+), not a single repeated id.
9. Mining must produce **varied** block ids with **varying** `roll=` values in logs.
10. **Every block break** at the active position must log the weighted pick as `roll=X/Y` (see **Block-break diagnostic log** below). Do not remove or simplify this line.

### Config keys (`random_one_block.json`)

| Key | Purpose |
|-----|---------|
| `mechanic_enabled` | Master switch (`false` was used during spawn testing) |
| `island_template_mode` | Detect pyramid center on any `oneblock_island` |
| `auto_setbelow_on_island_create` | Master switch for tick watcher |
| `auto_setbelow_templates` | e.g. `["oneblock_island"]` |
| `auto_setbelow_y_offset` | Extra Y on auto target (confirmed `0`; use `-1` only if spawn is one block high) |
| `auto_setbelow_delay_ticks` | Ticks after island spawn before auto setbelow (confirmed `40` ≈ 2 s at 20 TPS) |
| `haven_island_distance` | Haven grid spacing (`8192`) for fallback center math |
| `debug_logging` | `false` — pool preview, test picks, auto setbelow trace, watcher startup logs |
| `initial_block` / `foundation_block` | Default `dirt` / `bedrock` |
| `island_center_surround` | Default `minecraft:grass_block` for pattern match |

### `oneblock_island` template

- File: `config/HavenSkyblockBuilder/Templates/oneblock_island.nbt`
- Size: 3×2×3 — grass 3×3 at y=0 (bedrock center), dirt at (1,1,1)
- Haven spawn offset: `oneblock_island=0,1,0,-90` in `haven_skyblock_builder-common.toml`
- Offsets are from **structure center** (Haven `SkyblockUtils.determineSpawnPosition`), not corner — see README
- No starter items; quests later

### Coordinates — Haven vs KubeJS (critical)

| Source | Correct usage |
|--------|----------------|
| `playerStandingBlock()` | **Authoritative** for setbelow/auto: `getBlockX()`, `getBlockY() - 1`, `getBlockZ()` |
| Haven `Team.getHomePosition()` | Spawn teleport only — may differ from mineable dirt Z on grid; do **not** use alone for auto setbelow |
| `BlockPos.getX/Y/Z()` | Call directly in Rhino — never `typeof === 'function'` gate; never `.x/.y/.z` on wrappers |
| `player.persistentData.getBoolean()` | MC 26.1 returns `Optional` — unwrap via `readPersistentBoolean()` |

**Do not** swap Y and Z. A removed `swapYZ()` caused scrambled coords (`1 71 8193` instead of `-8191 71 1`).

**Confirmed playtest coords:** player Y=72, dirt Y=71, X=-8191, Z=1 with `auto_setbelow_y_offset: 0`.

**Confirmed success log (2026-06-24):**

```text
[RandomOneBlock] Auto setbelow after island spawn at -8191 71 1 (player_feet, template=oneblock_island)
```

Auto setbelow must **not** skip registration because stale `active_block` in config matches an old manual test — compare active to **current target**, then call `setActivePosition` at player feet.

### Block-break diagnostic log (must keep)

When a player mines the active random block, `BlockEvents.broken` logs one line per replacement. **This format is intentional** — keep it when editing the script.

```text
[RandomOneBlock] Replaced broken block at <x> <y> <z> with <block_id> (pool=N, roll=X/Y)
```

| Field | Meaning |
|-------|---------|
| `<block_id>` | Block placed on the next tick |
| `pool=N` | Number of **unique** block ids in the weighted pool |
| `roll=X/Y` | Weighted RNG roll used for this pick: `X` is `0` … `Y−1`, `Y` is **total weight** (sum of all entry weights; usually close to `pool` unless overrides add extra weight) |

Implementation (do not remove):

- `pickRandomBlockIdInternal()` sets `STATE._lastRoll` from `randomInt(STATE.totalWeight)`.
- `BlockEvents.broken` logs `roll=${STATE._lastRoll}/${STATE.totalWeight}` alongside `pool=${STATE.pool.length}`.

**Why it matters:** `roll=X/Y` shows the random draw against the full weight range — if `X` is always the same (e.g. always `0`) or the same block id appears every break, the RNG or pool is broken.

### Commands (operator, permission level 2)

Use **`ServerEvents.basicCommand('randomblock', ...)`** with **`event.input`** subcommand parsing — not `commandRegistry` (stale closures after `/reload`).

| Command | Purpose |
|---------|---------|
| `/randomblock` | Help |
| `/randomblock setbelow` | Register block under feet (`playerStandingBlock()`); island template left unchanged |
| `/randomblock set <x> <y> <z>` | Set position by coords |
| `/randomblock info` | Registered random block position + block id + pool; feet only if not on block |
| `/randomblock revert` | Reset active block to `initial_block` |
| `/randomblock reload` | Reload `random_one_block.json`, mod-pools config, rebuild master + effective pools |
| `/randomblock poolenable <mod> <true\|false>` | Per-team enable/disable mod namespace (persisted in `random_one_block_team_unlocks.json`). Starter exceptions cannot be disabled. |
| `/randomblock pools` | Effective vs master pool summary + subcommand help |
| `/randomblock pools list [page]` | Paginated mod list: status, display name, namespace, blocks, ON/OFF |
| `/randomblock pools debug [page]` | Mod list (20/page) + full report in `logs/kubejs/server.log` |
| `/randomblock pools debug quests` | FTB quest completed/ready + pool state per `quest_unlock_map` entry |
| `/randomblock pools debug complete` | All master-pool block ids per mod → `server.log` |
| `/randomblock pools debug complete <mod> [page]` | Page one mod’s blocks in chat |

### Config

- **Authoritative config:** `kubejs/config/random_one_block.json`
- **Script:** `kubejs/server_scripts/random_one_block.js`
- After JSON edits: `/randomblock reload` or server restart.

### Pool verification (on every pool rebuild)

Script logs diagnostics (pool dumps are log-only when `debug_logging` is on):

| Output | Path |
|--------|------|
| Pool preview / test picks | `<instance>/logs/kubejs/server.log` (requires `debug_logging: true`) |
| Mod pool debug (`/randomblock pools debug`) | In-game chat list + `<instance>/logs/kubejs/server.log` (always on command) |
| Mod pool complete (`/randomblock pools debug complete`) | Every block id per mod in `logs/kubejs/server.log`; `complete <mod>` pages blocks in chat |
| Always-on lines | `latest.log` — pool ready, break rolls, auto setbelow |

Expect log lines like:

```text
[RandomOneBlock] Block pool ready: 2102 unique blocks, total weight 2104
[RandomOneBlock] Pool preview (first 30): ...
[RandomOneBlock] Test random picks (8): <8 different ids>
[RandomOneBlock] Replaced broken block at ... with <id> (pool=2102, roll=847/2104)
```

**Failure signals:**

- `unique blocks: 1` or all breaks log the same id → pool id extraction bug
- `pool=0` or `using dirt` → pool rebuild failed
- `Test random picks` all identical → RNG bug
- `roll=0/2104` on every break → RNG still broken
- KubeJS chat error on reload → see constraints below

---

## KubeJS / Rhino constraints (do not regress)

These were learned from production debugging; violating them causes reload or command failures.

| # | Rule |
|---|------|
| 1 | **No `global` for mutable state** — on `/reload`, globals become unmodifiable maps (`UnsupportedOperationException`). Use module-level `const STATE = { ... }`. |
| 2 | **No `ServerEvents.commandRegistry` for gameplay commands** — handlers go stale after `/reload`. Use `ServerEvents.basicCommand` + `event.input` dispatcher. |
| 3 | **No `java.lang.System`** — blocked by KubeJS class filter. Use `Date.now()` for RNG seeds. |
| 4 | **No top-level `ResourceLocation` load** — may fail on MC 26.1. Lazy-load `Identifier` or `ResourceLocation` inside `parseResourceId()` only. |
| 5 | **Registry iteration:** Do not use `keySet().toArray()[i]` (every index returns same key). Use `ArrayList` + `.get(i)` over `registry.keySet()`. Block **id from registry key** (`resourceKeyToId(key)`), not `getKey(block)` on instances. |
| 6 | **No `const`/`let` inside `try` in `rebuildPool`** — causes `redeclaration of var` on reload. Use `var` at function top. |
| 7 | **RNG:** `Math.random()` was unreliable (always `pool[0]`). Use `java.util.Random` with `Date.now() + STATE._pickSeq * 7919`. |
| 8 | **`JsonIO.read` returns unmodifiable maps** — always `cloneConfig()` before mutating (e.g. `active_block`). |
| 9 | **`ServerEvents.loaded` does not re-fire on `/reload`** — also call `reloadAll()` from `ServerEvents.afterRecipes`. |
| 10 | **`console.error` in KubeJS** — single string argument only (use template strings). |
| 11 | **MC 26.1 registry API** — `registry.get()` may return `Optional<Reference>`; use `unwrapRegistryEntry()` and `resolveRegistryBlock()`. |
| 12 | **`resourceKeyToId`** — must handle both `ResourceKey` (`.location()`) and `ResourceLocation` (`.getNamespace()` / `.getPath()`). |
| 13 | **Player position** — `playerStandingBlock()`: `getBlockX/Y/Z()`, stand Y = feet Y − 1; never `swapYZ()`; never `.x/.y/.z` on `BlockPos` wrappers. |
| 14 | **Haven integration** — `TeamManager.getTeamByPlayer()` + `getIslandTemplate()`; auto watcher via `ServerEvents.tick` (GUI create has no `CommandEvent`). |
| 15 | **`persistentData.getBoolean`** — returns `Optional.empty` (truthy in Rhino) when unset; use `readPersistentBoolean()` + `writePersistentBoolean()` + `STATE.autoSetbelowDoneByUuid` session cache. |
| 16 | **No `const`/`let` in `try` on hot paths** — causes `redeclaration of var` on `/reload` (e.g. `starter_items.js` `current`). Use `var` at function top. |
| 17 | **No duplicate top-level `const` across scripts** — shared KubeJS scope; use literals or module-private names per file. |
| 18 | **Auto setbelow level** — use `player.serverLevel()` / `playerServerLevel()` for block reads in tick handler. |
| 19 | **Do not require loaded chunks** for auto target — register at player feet; optional `haven_island_distance` math is fallback only. |
| 20 | **`auto_setbelow_y_offset`** — default `0`; only change if Haven spawn height drifts (was `-1` during debug, reverted). |
| 21 | **`auto_setbelow_delay_ticks`** — default `40`; wait after team detected before setbelow so player lands on dirt. |
| 22 | **`debug_logging`** — default `false`; gate pool preview, auto setbelow trace, watcher startup via `debugLog()`. Keep break log + pool ready + auto setbelow success always on. |
| 23 | **No `/randomblock give`** — removed; do not re-add (test command was unused). |
| 24 | **Mod pool gating** — default pool is **vanilla only** plus `starter_exceptions` in `random_one_block_mod_pools.json`. Other namespaces unlock per **team** via `quest_unlock_map` / `poolenable`. Do not regress to global full-pool picks for gameplay breaks. |
| 25 | **No `global.RandonOneBlockPools`** — cross-script API uses shared-scope `var RandonOneBlockPools` in `random_one_block_mod_pools.js` (same unmodifiable-`global` rule as #1). |
| 26 | **No `java.nio.file.Files`** — blocked by KubeJS class filter. Pool/mod debug output goes to **`logs/kubejs/server.log`** via `debugLog()` / `modPoolsDebugLog()` when `debug_logging: true` — do not write pool dump files. |
| 27 | **Pack config paths** — all Random One Block JSON must load/save via `RandonOneBlockConfigIO` (`random_one_block_config_io.js` → `KubeJSPaths.CONFIG` only). **Never** `JsonIO.read('random_one_block.json')` without the config path (instance-root copies shadow `kubejs/config/`). After linking the instance, run `./link-instance.sh` or `./scripts/clean-stale-instance-config.sh` to delete stray instance-root `random_one_block*.json` / `.txt` files. |
| 28 | **Quest → mod pool unlock** — `quest_unlock_map` uses **quest** hex ids; KubeJS `FTBQuestsEvents.completed` must register on **task** hex ids. Always ship matching `quest_task_fallback` entries. Log must show `Registered N FTB task unlock handler(s)` (N > 0). See [`howtoquest.md`](howtoquest.md) § Random block mod unlocks. |
| 29 | **No NeoForge EventBus for quest unlocks** — do not call `NeoForge.EVENT_BUS.addListener` from KubeJS for FTB quest progress; Rhino overload/`ClassCastException` breaks `/reload`. `FTBQuestsEvent.QuestProgress` is not exposed to KubeJS. |
| 30 | **Quest unlock player UUID** — use `resolvePlayerUuid()` / `player.uuid` / `FTBQuests.getData(player)`; never bare `player.getUUID()` in quest/backfill paths (scheduled callbacks throw on KubeJS `ServerPlayer`). |
| 31 | **Quest unlock timing** — task event may run before quest is marked complete; use `isQuestReadyForUnlock()` (task progress) + delayed retries (1/5/20 ticks) + login backfill. |
| 32 | **Custom KubeJS blocks** — register in `startup_scripts/` only; recipes in `server_scripts/` + `kubejs/data/kubejs/recipes/`; no `.textureAll()` or `ServerEvents.recipes` in startup (KubeJS 8.0.3). Full restart for blocks; `/reload` for recipes. Put `kubejs` in `starter_exceptions.enabled`, **not** in `force_disabled_mods`. See [`howtocustomblocks.md`](howtocustomblocks.md). |

---

## Architecture (Random One Block)

```text
random_one_block.json            → loadConfig / saveConfig (clone before mutate)
random_one_block_mod_pools.json  → starter_exceptions, quest_unlock_map, quest_task_fallback, force_disabled_mods
        ↓
rebuildPool()                      → master pool (all eligible blocks) + masterByMod namespace index
        ↓
buildEffectivePool(scopeId)        → vanilla + starter_exceptions + team quest unlocks
        ↓
BlockEvents.broken                 → pickRandomBlockIdForPlayer(breaker) → scheduleInTicks(1) → set block
                                 → log: effectivePool, scope, mod namespace
        ↓
FTBQuestsEvents.completed(TASK_ID) → script load: quest_unlocks.js (prio 2) after mod_pools.js (prio 3)
                                 → on task complete: if quest ready → enableModForTeam(scope)
                                 → quest_unlock_map keyed by QUEST_ID; handlers keyed by TASK_ID
/randomblock poolenable            → manual/admin team unlock (same persistence)
/randomblock pools debug quests    → FTB completed/ready/pool state
kubejs/config/random_one_block_team_unlocks.json → persisted team unlocks (all scopes)
        ↓
ServerEvents.tick (every 5 ticks) → auto setbelow at player feet
ServerEvents.basicCommand          → randomblock subcommands (reload-safe)
ServerEvents.loaded + afterRecipes → reloadAll(); quest handler retry if Registered 0 at script load
PlayerEvents.loggedIn              → backfill quest unlocks (delayed)
```

Key functions in `random_one_block.js`:

- `rebuildPool()` — builds weighted pool from `BuiltInRegistries.BLOCK`
- `pickRandomBlockId()` / `randomInt()` — weighted pick via `java.util.Random`
- `resolveSource()` / `tell()` / `hasCommandPermission()` — `basicCommand` compatibility
- `dumpPoolReport()` — writes pool files + test picks to log
- `playerStandingBlock()` / `resolveAutoSetbelowTarget()` — auto setbelow at feet + offset
- `registerAutoSetbelowWatcher()` — `ServerEvents.tick` poll + optional debug trace
- `isAutoSetbelowReady()` / `getAutoSetbelowDelayTicks()` — spawn delay before setbelow
- `readPersistentBoolean()` / `markAutoSetbelowDone()` — done flag (Optional-safe)
- `debugLog()` / `isDebugLoggingEnabled()` — gated verbose logging (`debug_logging`)

---

## Bug history (fixed — do not reintroduce)

| Symptom | Root cause | Fix |
|---------|------------|-----|
| Reload `UnsupportedOperationException` | `global.RANDOM_ONE_BLOCK = {...}` | Module `STATE` object |
| Commands fail after `/reload` | `commandRegistry` stale closures | `ServerEvents.basicCommand` |
| Always stone / crafting table | Pool had 1 unique id | `ArrayList.get(i)`, id from key |
| Pool empty → dirt | `entrySet` / `.location()` on wrong types | `resourceKeyToId`, `unwrapRegistryEntry` |
| `defaultBlockState` on Optional | MC 26.1 `registry.get()` returns Optional | `resolveRegistryBlock()` |
| Always `pool[0]` | `Math.random()` always 0 in Rhino | `java.util.Random` + `Date.now()` |
| Reload error on pool dump | `System.nanoTime()` blocked | Removed `System`; use `Date.now()` |
| `ResourceLocation` at script top | Class not found in KubeJS | Lazy load in `parseResourceId()` |
| `redeclaration of var` on reload | `const` inside `try` in `rebuildPool` | `var` at function top |
| Spawn on grass not dirt | Haven offset from corner assumed | Offset `0,1,0` from **structure center** |
| Active vs Standing coords differ | `swapYZ()` + wrong `y-1` on `getOnPos()` | Java `BlockPos` / `getOnPos()` only |
| Random block not on mine | `mechanic_enabled: false` or bad coords | Enable mechanic; verify info lines match |
| Auto setbelow silent | `Optional.empty` truthy on `getBoolean` | `readPersistentBoolean()` + session `autoSetbelowDoneByUuid` |
| Auto setbelow `havenCenter=none` | Chunk unload / block verify at grid offset | Use `player_feet` target, not distant block reads |
| “Already active” spam, wrong coords | Stale `active_block` from old manual test | Match active to target feet; `markAutoSetbelowDone()` once |
| `redeclaration of var current` | `const` in `try` in `starter_items.js` | `var current` at function top |
| Quest book empty | FTB Quests 26.1 needs JSON5 | `config/ftbquests/quests/data.json5` + chapters |
| `globalThis is not defined` | Rhino | Module `STATE` only, no `global` writes |

---

## Implemented vs not implemented

### Implemented

- [x] Haven Skyblock config + island `.nbt` templates in repo
- [x] `oneblock_island` template (grass + bedrock/dirt pyramid)
- [x] Haven spawn offset `0,1,0` for `oneblock_island`
- [x] KubeJS Random One Block script + config
- [x] Auto setbelow on `oneblock_island` create (`ServerEvents.tick`, player feet, `auto_setbelow_y_offset: 0`, `auto_setbelow_delay_ticks: 40`)
- [x] Configurable `debug_logging` (default `false`); `/randomblock give` removed
- [x] FTB Quests starter chapter (JSON5 under `config/ftbquests/quests/`)
- [x] Starter quest book in hotbar (`starter_items.js`)
- [x] Island template mode (pyramid pattern match)
- [x] Gravity block recovery (sand/gravel → restore `initial_block`)
- [x] Coordinate handling aligned with Haven `BlockPos`
- [x] Weighted pool from full block registry (~2102 blocks)
- [x] Operator commands (`basicCommand`, reload-safe)
- [x] Active position persistence in JSON
- [x] Pool dump files + diagnostic logging
- [x] Instance symlink workflow (`link-instance.sh`)
- [x] Custom KubeJS storage blocks + compression recipes (leather, sapling, carrot, potato, torch) — see [`howtocustomblocks.md`](howtocustomblocks.md)

### Not implemented (future work)

- [ ] Additional FTB Quest chapters beyond Getting started
- [ ] OneBlock **phase** design (early game dirt/stone → mid mod blocks → etc.)
- [ ] Quest integration (unlock phases, rewards tied to random block tier)
- [ ] More custom compression blocks (e.g. wool) and broader KubeJS integrations
- [ ] Phase-based pools instead of one global pool

---

## Skyblock & quests (context)

- World preset: `haven_skyblock_builder:skyblock_world`
- Haven config: `config/haven_skyblock_builder-common.toml`
- Templates: `config/HavenSkyblockBuilder/Templates/` (`classic_island.nbt`, `oneblock_island.nbt`), `spawn_island.nbt`
- `oneblock_island` spawn: `island_specific_offsets = [..., "oneblock_island=0,1,0,-90"]`
- FTB Quest definitions: `config/ftbquests/quests/` (**JSON5** for 26.1; starter chapter in repo)
- Per-world progress stays in saves — do not commit

---

## Development workflow

```bash
# Restore symlinks if instance was reinstalled
./link-instance.sh

# Edit in repo; CurseForge instance reads via symlinks
# In game: /reload  or  /randomblock reload
# Logs: <instance>/logs/kubejs/server.log
```

When changing `random_one_block.js`:

1. Edit in repo `kubejs/server_scripts/random_one_block.js`
2. `/reload` in game
3. Confirm **no KubeJS errors** in chat
4. Check `server.log` for pool ready + test picks
5. Break active block several times — ids and `roll=` should vary

---

## End-to-end regression checklist (confirmed 2026-06-24)

Run after any mechanic change:

1. `/havensb island create oneblock_island <name>` — spawn on center dirt
2. Wait ~2 s — `server.log` shows auto setbelow at player feet (`player_feet, template=oneblock_island`)
3. `/randomblock info` — active coords match dirt under feet
4. Mine center dirt 3+ times — different block ids; `roll=` changes each break
5. New player login — FTB Quest book in hotbar slot 0

---

## Success criteria for AI-assisted changes

Before considering Random One Block work complete:

1. `/reload` → no KubeJS script errors
2. All flat commands respond (not silent / “unexpected error”)
3. `server.log` shows **2100+ unique blocks** after reload
4. **Test random picks (8)** shows multiple different block ids
5. Mining active block logs **different** `with <id>` and varying `roll=` values
6. No regression on Haven island create / spawn on center dirt (`oneblock_island`)
7. `/randomblock info` Active and Standing on coords **match** when on center dirt
8. Auto setbelow log after `island create oneblock_island`: `[RandomOneBlock] Auto setbelow after island spawn at ... (player_feet, template=oneblock_island)`
9. `doneFlag` stops watcher after success (no per-tick “already active” spam)
10. `auto_setbelow_y_offset` left at `0` unless Haven spawn height changes
11. `auto_setbelow_delay_ticks` at `40` (or tuned) — setbelow runs after spawn delay, not instantly on team detect
12. With `debug_logging: false`, log shows pool ready + break lines only (no auto setbelow trace spam)

---

## Files to touch for common tasks

| Task | Files |
|------|-------|
| Change weights / blacklist | `kubejs/config/random_one_block.json` |
| Change mechanic / commands | `kubejs/server_scripts/random_one_block.js` |
| Debug pool / mod pools | Set `debug_logging: true`, then `/randomblock reload` or `/randomblock pools debug` — read `logs/kubejs/server.log` |
| Debug quest → mod unlock | `/randomblock pools debug quests`; `quest_unlock_trace_log: true` in mod pools config; on `/reload` confirm `Registered N FTB task unlock handler(s)` (N > 0) |
| Island layout | `config/HavenSkyblockBuilder/`, `config/haven_skyblock_builder-common.toml` |
| Quests | `config/ftbquests/quests/` (create when ready) |
| Team mod unlock persistence | `kubejs/config/random_one_block_team_unlocks.json` (gitignored) |

---

## Open design questions (for pack author)

- ~~Should random blocks be **tiered by FTB Quest chapter** instead of one global pool?~~ **Partially resolved:** mod-namespace gating per team via `random_one_block_mod_pools.json` + FTB Quest unlocks (v1.0.0.13). Expand `quest_unlock_map` as chapters ship.
- Should `initial_block` stay dirt forever or change per phase?
- Which mod blocks should be **blacklisted** or **weighted up/down** for balance?
- ~~Single random block for whole island vs per-player islands?~~ **Resolved:** `island_template_mode` matches pyramid on each island; `active_block` is last registered (info/debug).

---

## Versioning & changelog

| Phase | Version | When |
|-------|---------|------|
| Development | `1.0.0.x` | Bump **one** patch step (`…12` → `…13`) for each meaningful change (quests, KubeJS, configs, docs, tooling). |
| Milestone release | **`1.0.1.0`** | Publish to CurseForge when the current work track is done (todo items, recipes, tier gating, etc.). |

**On every change:**

1. Add a new `## [1.0.0.x] — YYYY-MM-DD` section at the top of [`CHANGELOG.md`](CHANGELOG.md) (below the header).
2. Set `"version"` in [`branding/project-metadata.json`](branding/project-metadata.json) to the same string.
3. Commit changelog + metadata together with the change (or immediately after).
4. Do **not** skip version numbers on CurseForge — merge changelog entries if needed before publish (as with 1.0.0.12 → 1.0.0.11).
5. CurseForge publish stays at **`1.0.1.0`** until the author requests upload; dev versions are git-only until then.

---

## CurseForge publish (branding + API)

| Item | Location |
|------|----------|
| Copy & logo | `branding/` — see [`branding/README.md`](branding/README.md) |
| Project ID | `1591048` — [Authors dashboard](https://authors.curseforge.com/#/projects/1591048/) |
| Publish script | `scripts/publish-curseforge.sh` |
| Checklist | `branding/export-checklist.md` |

**Workflow:** playtest → `./update-modlist.sh` → `CF_API_TOKEN=… ./scripts/publish-curseforge.sh` → upload logo + set categories in Authors → submit for review → revoke token.

The script builds `dist/Randon-One-Block-<version>.zip` from instance `minecraftinstance.json` (mod IDs) plus repo `config/` and `kubejs/`. It pushes `branding/summary.txt`, `branding/description.md`, and links via `update-project`, then uploads via `upload-file`. The API token **cannot** upload logo, set categories, or delete files.

Do **not** commit API tokens. Version string comes from `branding/project-metadata.json` unless `CF_VERSION` is set.

---

## Instructions for AI agents continuing this project

1. Read this file and `README.md`.
2. Read `kubejs/server_scripts/random_one_block.js` before editing mechanics.
3. Respect every item in **KubeJS / Rhino constraints** — they are hard-won fixes, not style preferences.
4. Run `/reload` and inspect `logs/kubejs/server.log` when possible (instance path above).
5. Prefer small, focused diffs; match existing script style (`var` in `rebuildPool`, `basicCommand`, module `STATE`).
6. Do not commit generated pool dumps unless the user asks.
7. User executes in CurseForge; repo is source of truth via symlinks.
8. Do not create markdown files the user did not ask for; these two docs are the canonical handoff pair.
9. **Bump `1.0.0.x`** in `CHANGELOG.md` and `branding/project-metadata.json` for each change; target milestone **`1.0.1.0`** for the next CurseForge release.