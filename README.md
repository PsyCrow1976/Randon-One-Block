# Randon One Block

A modded Minecraft **skyblock** server modpack where players start on template-based islands and progress through varied modded content over time.

**Heavily inspired by [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock)** — the core idea of mining one block and receiving a random modpack block comes directly from that pack. Randon One Block is a separate project (different mod list, Haven Skyblock islands, FTB Quests, and its own KubeJS scripts), but Chaos OneBlock is the main reference for the random-block skyblock loop.

## Overview

**Randon One Block** combines content and mechanics from many modded Minecraft modpacks into one playthrough. The pack blends tech, magic, storage, and farming mods on Haven Skyblock islands, with **FTB Quests** for progression and a **KubeJS random block generator** as the central resource mechanic — adapted from the approach used in [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock).

### Core systems

| Role | Mod | Notes |
|------|-----|-------|
| Skyblock islands | **Haven Skyblock Builder** (`haven_skyblock_builder`) | World preset, island templates, teams, visits, spawn island |
| Quest book & progression | **FTB Quests** (`ftbquests`) | In-game quest book; chapters, tasks, and rewards |
| FTB support | FTB Library, FTB Teams, FTB Chunks, FTB Essentials | Shared FTB infrastructure (claims, teams, utilities) |
| Pack scripting | **KubeJS** (`kubejs` 8.0.3) | Random One Block mechanic, future recipes/integrations |

### Inspired by Chaos OneBlock

| | |
|--|--|
| **Source pack** | [Chaos OneBlock on CurseForge](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock) |
| **What we took from it** | One-block skyblock loop: mine a single block → random modded block appears in its place |
| **What is different here** | Haven Skyblock team islands, weighted block pool, collision filter (full cubes only), FTB Quest book, auto `setbelow` on island create, and this repo’s own mod selection |

If you enjoy this pack, play the original too — [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock) is where the random-block oneblock concept clicked for this project.

**What's new?** See [`CHANGELOG.md`](CHANGELOG.md) for release notes in plain language.

**Publishing to CurseForge?** See [`branding/`](branding/) for avatar, summary, description, export checklist, and project metadata.

**Continuing development?** Read [`requirements.md`](requirements.md) for session handoff, technical constraints, and what is left to build.

## Target versions

| Component | Version |
|-----------|---------|
| Minecraft | 26.1.2 |
| NeoForge | 26.1.2.76 |
| KubeJS | 26.1.2-8.0.3 |

## Quick start (Random One Block)

1. Create or join a Haven skyblock world (`haven_skyblock_builder:skyblock_world`).
2. Create a team island with the one-block template:
   ```text
   /havensb island create oneblock_island My Island
   ```
3. You spawn on the **oneblock** pyramid; KubeJS auto-registers the random block at the dirt under your feet (~2 s after create; see `auto_setbelow_delay_ticks`).
4. Mine that center dirt — a random modpack block replaces it on the next tick. Keep mining for more rolls.
5. You receive the **FTB Quest book** in hotbar slot 0 on first login / island setup.

Run `/randomblock info` to see the registered random block (coordinates + block id). The pool has ~2100+ blocks. After config edits, run `/randomblock reload`.

### End-to-end playtest (confirmed 2026-06-24)

| Step | Expected result |
|------|-----------------|
| `/havensb island create oneblock_island …` | Spawn on center dirt; ~2 s later auto setbelow registers feet block |
| `logs/kubejs/server.log` | `[RandomOneBlock] Auto setbelow after island spawn at … (player_feet, template=oneblock_island)` |
| `/randomblock info` | Active coords match dirt under feet (e.g. overworld `-8191 71 1`, `minecraft:dirt`) |
| Mine center dirt | Varied blocks; each break logs `(pool=N, roll=X/Y)` with changing `roll` |
| First login | FTB Quest book in hotbar slot 0 |

Example success lines from a confirmed session:

```text
[RandomOneBlock] Auto setbelow after island spawn at -8191 71 1 (player_feet, template=oneblock_island)
[RandomOneBlock] Replaced broken block at -8191 71 1 with minecraft:iron_ore (pool=2102, roll=847/2104)
```

Operators can still run `/randomblock setbelow` manually (same logic as auto — block under feet via `getBlockX/Y/Z`).

## Skyblock (Haven Skyblock Builder)

Worlds must use the **Haven Skyblock** preset:

```text
haven_skyblock_builder:skyblock_world
```

**Key paths in this repo:**

| Path | Purpose |
|------|---------|
| `config/haven_skyblock_builder-common.toml` | Island height, distance, cooldowns, nether skyblock, layers |
| `config/HavenSkyblockBuilder/Templates/` | Main island `.nbt` templates (e.g. `classic_island.nbt`) |
| `config/HavenSkyblockBuilder/AdditionalIslands/` | Extra structures pasted with a template |
| `config/HavenSkyblockBuilder/spawn_island.nbt` | Lobby / spawn island (created once per world) |

**Current setup:**

| Template | Notes |
|----------|-------|
| `classic_island` | `additional_sand_island` at `0,0,-75`; spawn offset `1,1,-3` (west) |
| `oneblock_island` | **Recommended** — 3×3 grass + bedrock/dirt pyramid; spawn `0,1,0` (west); random block auto-setup |

**Player flow:** spawn island → `/havensb island create <template> <name>` → team island at configured distance. In-game UI: `J`.

### `oneblock_island` layout

Small pyramid (structure size 3×2×3):

```text
      [d]        ← dirt (random block), structure y=1
[g][g][g]
[g][b][g]        ← grass 3×3 base, bedrock center, structure y=0
[g][g][g]
```

No starter chests — rewards come from FTB Quests later.

### Haven spawn offsets (important)

Offsets in `island_specific_offsets` are **relative to the template center**, not the structure corner. Haven computes:

```text
spawn = island_base + (size / 2) + offset
```

For `oneblock_island`, center is the dirt block. Offset `0,1,0` places the player in the **air block above** that dirt (validated by Haven before teleport). Wrong offsets fall back to nearby grass via `findNearestValidBlock()`.

Team data is stored per world under `world/serverconfig/HavenSkyblockBuilder/Teams` (not in git).

## Quest book (FTB Quests)

FTB Quests provides the modpack quest book and progression tracking.

**Modpack quest content** (chapters, quests, rewards) belongs in:

```text
config/ftbquests/quests/
```

Quest definitions use **JSON5** (FTB Quests 26.1+). A starter **Getting started** chapter is in `config/ftbquests/quests/`. Edit in-game via the quest editor or edit the `.json5` files in the repo.

**Player progress** is stored per world:

```text
saves/<world>/ftbquests/<player-uuid>.json5
```

Do not commit save/world data; only version-control the quest definitions under `config/ftbquests/`.

Related configs: `config/ftbquests-client.json5`, `config/ftbteams-server.json5`, `config/ftbchunks-world.json5`.

## Core mechanic: Random One Block (KubeJS)

Mining the pack’s **random block** (center dirt on `oneblock_island`) replaces it with a weighted random block from every eligible full-cube block in the modpack. The loop is **heavily inspired by [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock)**; this implementation adds a weighted pool, Haven island integration, and a collision-shape filter so crops, pots, and other partial blocks are not rolled (see `require_full_collision_cube` in config).

| Setting | Location |
|---------|----------|
| Config (weights, blacklist, active position) | `kubejs/config/random_one_block.json` |
| Script | `kubejs/server_scripts/random_one_block.js` |
| Pool debug (when `debug_logging: true`) | `logs/kubejs/server.log` |

### Config flags (`random_one_block.json`)

| Key | Default | Purpose |
|-----|---------|---------|
| `mechanic_enabled` | `true` | Master switch for mining / setbelow |
| `island_template_mode` | `true` | Also match pyramid center dirt on any `oneblock_island` (multi-team) |
| `auto_setbelow_on_island_create` | `true` | Register random block after Haven island create |
| `auto_setbelow_templates` | `["oneblock_island"]` | Templates that trigger auto-setup |
| `auto_setbelow_y_offset` | `0` | Extra Y added to auto target (use `-1` only if Haven spawn is one block too high) |
| `auto_setbelow_delay_ticks` | `40` | Ticks to wait after island spawn before auto setbelow (~2 s at 20 TPS; lets teleport finish) |
| `haven_island_distance` | `8192` | Haven grid spacing (used for debug / fallback center math) |
| `debug_logging` | `false` | Verbose KubeJS log output (pool preview, auto setbelow trace, watcher startup) |
| `require_full_collision_cube` | `true` | Only full 1×1×1 collision blocks in pool (Chaos OneBlock-style; excludes crops, rails, pots, etc.) |
| `collision_min_aabb_size` | `1` | Minimum collision box size when `require_full_collision_cube` is on |
| `initial_block` | `minecraft:dirt` | Block players mine / restored after falling blocks |
| `foundation_block` | `minecraft:bedrock` | Under center dirt in template (not overwritten on register) |

### Flow

1. Player creates `oneblock_island` → Haven teleports them to the island; a `ServerEvents.tick` watcher detects the team, waits `auto_setbelow_delay_ticks`, then runs the same logic as `/randomblock setbelow` (block under feet + `auto_setbelow_y_offset`).
2. Player mines that dirt → a random modpack block appears on the next tick (`roll=X/Y` in server log).
3. Sand/gravel falls → `initial_block` is restored so the player can mine again.
4. Each subsequent mine at the pyramid center (`island_template_mode`) → another random block.

### Commands (operator, permission level 2)

All subcommands use one **`/randomblock`** command (`ServerEvents.basicCommand` + `event.input` — reload-safe).

| Command | What it does |
|---------|----------------|
| `/randomblock` | List subcommands |
| `/randomblock setbelow` | Register the block under your feet (`getBlockX/Y/Z`, stand Y = feet Y − 1); saves to config |
| `/randomblock set <x> <y> <z>` | Register random block at world coordinates (F3); saves to config |
| `/randomblock info` | Show registered random block coords + block id + pool size |
| `/randomblock revert` | Reset registered block to `initial_block` (dirt) |
| `/randomblock reload` | Reload config, mod-pool config, and rebuild block pool |
| `/randomblock poolenable <mod> <true\|false>` | Enable or disable a mod namespace in **your team’s** effective pool (persisted). Starter exceptions cannot be disabled. Example: `/randomblock poolenable refinedstorage true` |
| `/randomblock pools` | Summary: effective block count, master pool size, mod count, and subcommand help |
| `/randomblock pools list` | Paginated list of mods (status, display name, namespace, block count, ON/OFF). Optional page: `pools list 2` |
| `/randomblock pools debug` | Same as list but 20 mods per page; **full report** always copied to `logs/kubejs/server.log` |
| `/randomblock pools debug <page>` | Paginate the mod overview (page 2 = `pools debug 1`) |
| `/randomblock pools debug quests` | FTB quest completion, unlock readiness, and pool ON/OFF per quest-linked mod (chat + trace in `server.log` when `quest_unlock_trace_log` is on) |
| `/randomblock pools debug complete` | Log **every** master-pool block id (with weights) per mod to `logs/kubejs/server.log` |
| `/randomblock pools debug complete <mod>` | Page one mod’s block ids in chat (e.g. `complete kubejs`, `complete kubejs 1` for page 2) |

### Mod pool gating (what actually rolls)

| Status | Meaning |
|--------|---------|
| `vanilla` | Always on (`minecraft`) |
| `exception` | On from day one (`starter_exceptions.enabled`: elevatorid, kubejs, uncraftingtable) |
| `unlocked` | Your team enabled it via quest or `/randomblock poolenable` |
| `locked` | In the master pool but not in your team’s effective pool yet |

Config: `kubejs/config/random_one_block_mod_pools.json`. Unlock scope is **per team** (`haven-…` after island create). See [`howtoquest.md`](howtoquest.md) for wiring new quest unlocks.

On `oneblock_island` create, setbelow runs automatically after `auto_setbelow_delay_ticks` (default 40 ticks ≈ 2 s) once the team + template are detected (polls every 5 ticks). Log line:

```text
[RandomOneBlock] Auto setbelow after island spawn at <x> <y> <z> (player_feet, template=oneblock_island)
```

After editing `random_one_block.json`, run `/randomblock reload` or `/reload`.

**`/randomblock info` example:**

```text
Random block placement: minecraft:overworld -8191 71 1 (minecraft:dirt)
Pool: 2172 blocks
Mine this block to roll a random block from the pool
```

### Weights

Documented in `kubejs/config/random_one_block.json`:

- `default_weight: 1` — default for every eligible block.
- `weight_overrides` — per-block weights (e.g. `minecraft:crafting_table: 3` is 3× more likely than weight-1 blocks).
- `blacklist` — blocks never spawned.
- Weight `0` in overrides also excludes a block.

### Verifying the pool

After `/reload` or `/randomblock reload`, check `logs/kubejs/server.log`:

```text
[RandomOneBlock] Block pool ready: 2102 unique blocks, total weight 2104
```

Set `"debug_logging": true` in `random_one_block.json` for pool preview, test picks, and auto setbelow trace lines in `logs/kubejs/server.log`. `/randomblock pools debug` lists mods in chat; `/randomblock pools debug complete` logs every block id per mod (use `complete <mod>` to page a mod's blocks in chat).

### Mining log (`roll=X/Y`)

Each time the active block is mined, the server logs the replacement and the weighted random draw:

```text
[RandomOneBlock] Replaced broken block at 12 64 -8 with minecraft:iron_ore (pool=2102, roll=847/2104)
```

- **`pool=2102`** — unique blocks in the pool
- **`roll=847/2104`** — this pick’s roll (`847`) out of total weight (`2104`, the sum of all entry weights)

`roll` should change on every break; a stuck value (e.g. always `roll=0/2104`) means the RNG needs fixing. See [`requirements.md`](requirements.md) — this log line is a required diagnostic and must be kept.

### Coordinates (Haven vs KubeJS)

**Haven** uses standard Minecraft `BlockPos` (`x`, height `y`, `z`). Team home is the **spawn teleport** position, not always the mineable dirt cell.

**KubeJS** auto/manual setbelow uses `playerStandingBlock()`:

- `x` / `z` from `player.getBlockX()` / `getBlockZ()`
- stand block `y` = `player.getBlockY() - 1` (block directly under feet)
- optional `auto_setbelow_y_offset` added for Haven spawn tuning (default `0`)

Do **not** read `BlockPos.x` / `.y` / `.z` on Java wrappers (axes can scramble). Do **not** use removed `swapYZ()`.

Call `BlockPos.getX()` / `getY()` / `getZ()` directly in Rhino.

### Troubleshooting

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| Spawn on grass, not dirt | Wrong Haven spawn offset | Use `0,1,0` from **structure center** for `oneblock_island` |
| Auto setbelow never fires | Old script or no team yet | `/reload`; create island; check log for `Auto setbelow after island spawn` |
| Random block one block too high/low | Haven spawn height | Tune `auto_setbelow_y_offset` in `random_one_block.json` (confirmed: `0`) |
| Mining does nothing | Wrong coords or `mechanic_enabled: false` | `/randomblock info`; mine the registered dirt on bedrock |
| KubeJS error on `/reload` | Script regression (global state, `System`, top-level `ResourceLocation`) | `logs/kubejs/server.log`; see [`requirements.md`](requirements.md) constraints |
| Commands silent or “unexpected error” after reload | `commandRegistry` instead of `basicCommand` | Script must use `ServerEvents.basicCommand` with `event.input` |
| Always same block (stone, crafting table, dirt) | Pool id extraction or RNG bug | Log should show 2100+ unique blocks and varied `roll=` values |
| `pool=0` or “using dirt” on break | Pool rebuild failed | `server.log` for rebuild errors; run `/randomblock reload` |
| `unique blocks: 1` in log | Registry iteration bug | Id must come from registry key, not block instance |
| Sand/gravel fell, can’t mine again | Gravity recovery | Wait for dirt restore log; bedrock must stay under center |

## Custom blocks & compression recipes (KubeJS)

Custom **storage blocks** compress 9 items into one minable block (and decompress back in crafting). They can roll from the random one-block pool when `kubejs` is enabled in the mod pool.

| Block | Compress (3×3) | Decompress |
|-------|------------------|------------|
| Leather Block | leather | 9× leather |
| Sapling Block | oak sapling | 9× oak sapling |
| Carrot Block | carrot | 9× carrot |
| Potato Block | potato | 9× potato |
| Torch Block | torch | 9× torch |

**Developer guide:** [`howtocustomblocks.md`](howtocustomblocks.md) — file layout, KubeJS 8 pitfalls, pool verification.

**Apply changes:** full **restart** after editing `startup_scripts/` or assets; **`/reload`** after recipes or `kubejs/data/`.

## Customization (KubeJS)

Further planned uses of `kubejs/`:

- Integration between mods from different pack styles
- More recipe changes, item tweaks, and event hooks
- Pack-specific phases and unlock conditions tied to FTB Quests progression

## Local development

This repo is linked to the CurseForge playtest instance:

**Instance path:** `/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block`

Symlinked folders (edit in repo → changes apply in-game):

| Repo folder | Instance symlink |
|-------------|------------------|
| `kubejs/` | `…/Modded Randon One Block/kubejs` |
| `config/` | `…/Modded Randon One Block/config` |

Restore symlinks after reinstalling the instance:

```bash
./link-instance.sh
```

`link-instance.sh` also removes **stale pack config files at the instance root** (`random_one_block.json`, `random_one_block_mod_pools.json`, etc.). Authoritative config lives only in **`kubejs/config/`** in the repo. If behaviour looks wrong after edits, run:

```bash
./scripts/clean-stale-instance-config.sh
```

**Workflow:** edit files in repo → `/reload` in game → check `logs/kubejs/server.log` for errors and pool diagnostics.

**Logs:** `<instance>/logs/kubejs/server.log` (KubeJS) and `latest.log` (full game log).

Mods, saves, logs, and jars stay in the CurseForge instance folder (not fully tracked in git). The **mod list** in the repo is the exception — it records which jars are installed and at what version.

## CurseForge branding & release

Pack copy, logo source, and submission steps live in [`branding/`](branding/). The CurseForge page describes this as an **AI-assisted experiment** (Grok Composer 2.5 fast) — random skyblock center block, AI-written quests, custom Uncrafting Table — inspired by [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock).

| Asset | File |
|-------|------|
| One-line summary | [`branding/summary.txt`](branding/summary.txt) |
| Project page (Markdown) | [`branding/description.md`](branding/description.md) |
| Form fields & categories | [`branding/curseforge-profile.md`](branding/curseforge-profile.md) |
| Export & upload steps | [`branding/export-checklist.md`](branding/export-checklist.md) |
| Logo (export 400×400 PNG) | [`branding/logo/logo.svg`](branding/logo/logo.svg) |
| Publish script | [`scripts/publish-curseforge.sh`](scripts/publish-curseforge.sh) |

**Authors dashboard:** [Randon One Block (project 1591048)](https://authors.curseforge.com/#/projects/1591048/)

### Publish a release

1. Playtest and run `./update-modlist.sh` so the instance matches `modlist.json`.
2. Generate a one-time token at [CurseForge API Tokens](https://www.curseforge.com/account/api-tokens) — do not commit it.
3. Build the modpack zip, push project metadata, and upload the file:

```bash
CF_API_TOKEN='your-token' CF_PROJECT_ID=1591048 ./scripts/publish-curseforge.sh
```

Output lands in `dist/Randon-One-Block-<version>.zip` (gitignored). The script reads mod file IDs from the playtest instance `minecraftinstance.json`, bundles repo `config/` and `kubejs/` as overrides, and calls `update-project` plus `upload-file`.

**Manual steps the API cannot do:** upload the **logo** (400×400 PNG from `logo.svg`), set **categories** (Skyblock + Quests/Adventure/Multiplayer), and delete stray test files under **Files**. Revoke the token after publishing.

See [`branding/export-checklist.md`](branding/export-checklist.md) for verification steps and a CurseForge-app export fallback.

## Installed mods & `update-modlist.sh`

The playtest instance mods folder is not version-controlled, but the pack keeps a snapshot of installed mods in the repo:

| File | Purpose |
|------|---------|
| [`modlist.md`](modlist.md) | Human-readable table — mod name, version, jar filename |
| [`modlist.json`](modlist.json) | Machine-readable snapshot used to detect changes on refresh |
| [`update-modlist.sh`](update-modlist.sh) | Script that reads the CurseForge instance and updates both files |

Data is pulled from `minecraftinstance.json` in the playtest instance (falls back to scanning `mods/*.jar` if that file is missing). Mod **names** come from CurseForge metadata; **versions** are parsed from the installed jar filename.

### Refresh the mod list

After you add, remove, or update mods in the CurseForge app, run from the repo root:

```bash
./update-modlist.sh
```

This rewrites `modlist.md` and `modlist.json` and prints a short summary, for example:

```text
updated modlist (47 mods) -> modlist.json
changes: +2 added, -1 removed, ~3 updated
```

If nothing changed since the last snapshot:

```text
no mod additions, removals, or version changes
```

### Changelog bullets

To get markdown lines ready for [`CHANGELOG.md`](CHANGELOG.md):

```bash
./update-modlist.sh --changelog
```

When there are changes, this prints a `### Mods` section with bullets such as:

```text
### Mods

- **Added:** Ex Deorum `4.0`
- **Removed:** Old Mod `1.0.0`
- **Updated:** JEI `29.6.2.38` → `29.6.3.1`
```

Copy those lines into a new release section in `CHANGELOG.md`. The script only **prints** changelog text — it does not edit `CHANGELOG.md` automatically.

### Custom instance path

By default the script uses the standard playtest instance path. To point at a different folder:

```bash
MODLIST_INSTANCE="/path/to/instance" ./update-modlist.sh
```

### Typical workflow

1. Install or update mods in CurseForge (playtest instance).
2. Run `./update-modlist.sh --changelog`.
3. Paste the printed mod bullets into `CHANGELOG.md` under a new version heading.
4. Commit `modlist.md`, `modlist.json`, and `CHANGELOG.md` together.

Current inventory: see [`modlist.md`](modlist.md) (73 mods, Minecraft 26.1.2 / NeoForge 26.1.2.76 as of last refresh).

## Status

**Last playtest-verified:** 2026-06-24 — full `oneblock_island` create → auto setbelow → mining → quest book flow works in the CurseForge instance.

| Area | Status |
|------|--------|
| Haven Skyblock templates & config | In repo |
| `oneblock_island` template + Haven spawn | **Confirmed** — spawn on center dirt, offset `0,1,0` from structure center |
| Random One Block (KubeJS) | **Confirmed** — mining, pool (~2100+ blocks), `roll=X/Y` logs, auto setbelow on island create |
| Auto setbelow (`oneblock_island`) | **Confirmed** — `player_feet`, `auto_setbelow_y_offset: 0`, `auto_setbelow_delay_ticks: 40` |
| FTB Quest starter chapter | **In repo** — `config/ftbquests/quests/` (JSON5, Getting started) |
| Starter quest book (hotbar) | **Confirmed** — `kubejs/server_scripts/starter_items.js` |
| Phase / tier design for random blocks | Not started |
| Broader KubeJS integrations | Planned |