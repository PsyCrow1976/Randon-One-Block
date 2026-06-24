# Modded Random OneBlock

A modded Minecraft **skyblock** server modpack where players start on template-based islands and progress through varied modded content over time.

## Overview

**Modded Random OneBlock** combines content and mechanics from many modded Minecraft modpacks into one playthrough. The pack blends tech, magic, storage, and farming mods on Haven Skyblock islands, with **FTB Quests** for progression and a **KubeJS random block generator** as the central resource mechanic.

### Core systems

| Role | Mod | Notes |
|------|-----|-------|
| Skyblock islands | **Haven Skyblock Builder** (`haven_skyblock_builder`) | World preset, island templates, teams, visits, spawn island |
| Quest book & progression | **FTB Quests** (`ftbquests`) | In-game quest book; chapters, tasks, and rewards |
| FTB support | FTB Library, FTB Teams, FTB Chunks, FTB Essentials | Shared FTB infrastructure (claims, teams, utilities) |
| Pack scripting | **KubeJS** (`kubejs` 8.0.3) | Random One Block mechanic, future recipes/integrations |

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
3. You spawn on the center **dirt** block (small pyramid island).
4. Mine the center dirt — a random modpack block replaces it on the next tick. Keep mining for more rolls.

Run `/randomblock info` to see your island’s **random block placement** (center dirt coordinates + block id). The pool has ~2100+ blocks. After config edits, run `/randomblock reload`.

**Verified in playtest:** spawn on dirt, mining rolls random blocks, `/randomblock info` shows island center placement (not player feet). Auto-registration runs ~1 s after island create.

Operators can still run `/randomblock setbelow` manually on other layouts.

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

Quest files are `.snbt` (edited in-game via the quest editor, then exported/saved to that folder). This directory does not exist yet — the quest book is empty until chapters are authored.

**Player progress** is stored per world:

```text
saves/<world>/ftbquests/<player-uuid>.json5
```

Do not commit save/world data; only version-control the quest definitions under `config/ftbquests/`.

Related configs: `config/ftbquests-client.json5`, `config/ftbteams-server.json5`, `config/ftbchunks-world.json5`.

## Core mechanic: Random One Block (KubeJS)

Mining the pack’s **random block** (center dirt on `oneblock_island`) replaces it with a weighted random block from every eligible block in the modpack (~2100+ blocks).

| Setting | Location |
|---------|----------|
| Config (weights, blacklist, active position) | `kubejs/config/random_one_block.json` |
| Script | `kubejs/server_scripts/random_one_block.js` |
| Pool dump (generated on reload) | `kubejs/config/random_one_block_pool.json`, `random_one_block_pool.txt` |

### Config flags (`random_one_block.json`)

| Key | Default | Purpose |
|-----|---------|---------|
| `mechanic_enabled` | `true` | Master switch for mining / setbelow |
| `island_template_mode` | `true` | Also match pyramid center dirt on any `oneblock_island` (multi-team) |
| `auto_setbelow_on_island_create` | `true` | Register random block after Haven island create |
| `auto_setbelow_templates` | `["oneblock_island"]` | Templates that trigger auto-setup |
| `initial_block` | `minecraft:dirt` | Block players mine / restored after falling blocks |
| `foundation_block` | `minecraft:bedrock` | Under center dirt in template (not overwritten on register) |

### Flow

1. Player creates `oneblock_island` → you spawn on center dirt; auto-registration runs via Haven team home (`home.y - 1`).
2. Player mines that dirt → a random modpack block appears on the next tick (`roll=X/Y` in server log).
3. Sand/gravel falls → `initial_block` is restored so the player can mine again.
4. Each subsequent mine at the pyramid center (`island_template_mode`) → another random block.

### Commands (operator, permission level 2)

All subcommands use one **`/randomblock`** command (`ServerEvents.basicCommand` + `event.input` — reload-safe).

| Command | What it does |
|---------|----------------|
| `/randomblock` | List subcommands |
| `/randomblock setbelow` | Register the block you stand on (`getOnPos`) as the random block; saves to config |
| `/randomblock set <x> <y> <z>` | Register random block at world coordinates (F3); saves to config |
| `/randomblock info` | Show **random block placement** on your island (center dirt coords + block id), not your feet |
| `/randomblock revert` | Reset registered block to `initial_block` (dirt) |
| `/randomblock reload` | Reload config and rebuild block pool |
| `/randomblock give` | Test: gives 1 apple |

On `oneblock_island` create, setbelow runs automatically (~1 s after `/havensb island create oneblock_island …`).

After editing `random_one_block.json`, run `/randomblock reload` or `/reload`.

**`/randomblock info` example** (island center dirt — independent of where you stand):

```text
Random block placement: minecraft:overworld -8190 73 1 (minecraft:dirt)
Pool: 2172 blocks
Island: oneblock_island (center dirt, one block below Haven spawn)
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
[RandomOneBlock] Test random picks (8): <should be varied block ids>
```

Full block lists are written to `kubejs/config/random_one_block_pool.txt` (tab-separated) and `.json`. These files are gitignored and regenerated on each pool rebuild.

### Mining log (`roll=X/Y`)

Each time the active block is mined, the server logs the replacement and the weighted random draw:

```text
[RandomOneBlock] Replaced broken block at 12 64 -8 with minecraft:iron_ore (pool=2102, roll=847/2104)
```

- **`pool=2102`** — unique blocks in the pool
- **`roll=847/2104`** — this pick’s roll (`847`) out of total weight (`2104`, the sum of all entry weights)

`roll` should change on every break; a stuck value (e.g. always `roll=0/2104`) means the RNG needs fixing. See [`requirements.md`](requirements.md) — this log line is a required diagnostic and must be kept.

### Coordinates (Haven vs KubeJS)

**Haven** uses standard Minecraft `BlockPos` (`x`, height `y`, `z`). Auto setbelow reads `Team.getHomePosition()` from Haven and registers dirt at `home.y - 1`.

**KubeJS** uses the same coordinate space as Haven for registration (`active_block` / team home). For `setbelow`, use Java `player.getOnPos()` — do **not** swap Y/Z or subtract 1 from `getOnPos()`.

`/randomblock info` reads your island’s **center dirt** from Haven (`team home.y - 1` for `oneblock_island`), or `active_block` in config for other layouts. It does **not** use your current position.

### Troubleshooting

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| Spawn on grass, not dirt | Wrong Haven spawn offset | Use `0,1,0` from **structure center** for `oneblock_island` |
| Info shows player coords instead of dirt | Old script build | `/reload`; info must say `Random block placement:` with `minecraft:dirt` at island center |
| Random block not triggering | `mechanic_enabled: false` or wrong block | `/randomblock info`; mine center dirt on bedrock |
| KubeJS error on `/reload` | Script regression (global state, `System`, top-level `ResourceLocation`) | `logs/kubejs/server.log`; see [`requirements.md`](requirements.md) constraints |
| Commands silent or “unexpected error” after reload | `commandRegistry` instead of `basicCommand` | Script must use `ServerEvents.basicCommand` with `event.input` |
| Always same block (stone, crafting table, dirt) | Pool id extraction or RNG bug | Log should show 2100+ unique blocks and varied `roll=` values |
| `pool=0` or “using dirt” on break | Pool rebuild failed | `server.log` for rebuild errors; run `/randomblock reload` |
| `unique blocks: 1` in log | Registry iteration bug | Id must come from registry key, not block instance |
| Sand/gravel fell, can’t mine again | Gravity recovery | Wait for dirt restore log; bedrock must stay under center |

## Customization (KubeJS)

Planned uses of `kubejs/` beyond Random One Block:

- Integration between mods from different pack styles
- Recipe changes, item tweaks, and event hooks
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

**Workflow:** edit files in repo → `/reload` in game → check `logs/kubejs/server.log` for errors and pool diagnostics.

**Logs:** `<instance>/logs/kubejs/server.log` (KubeJS) and `latest.log` (full game log).

Mods, saves, logs, and jars stay in the CurseForge instance folder (not fully tracked in git).

## Installed mods (playtest instance)

AppleSkin, Clumps, Cooking for Blockheads, Easy Villagers, Farming for Blockheads, FTB Chunks, FTB Essentials, FTB Library, FTB Quests, FTB Teams, GuideME, Haven Skyblock Builder, Jade, JourneyMap, JEI, Just Enough Resources, KubeJS, MATC, Mouse Tweaks, Mystical Agriculture (+ Additions, Automation), Powah, Refined Storage (+ JEI integration), Rhino, Sophisticated Backpacks/Core/Storage, and others.

## Status

| Area | Status |
|------|--------|
| Haven Skyblock templates & config | In repo |
| `oneblock_island` template + Haven spawn | **Confirmed** — spawn on center dirt, offset `0,1,0` from structure center |
| Random One Block (KubeJS) | **Confirmed** — mining, pool (~2100+ blocks), `roll=X/Y` logs, auto setbelow on island create |
| `/randomblock info` | **Confirmed** — shows island center dirt placement via Haven team home (`home.y - 1`) |
| FTB Quest chapters | Not started (`config/ftbquests/quests/` missing) |
| Phase / tier design for random blocks | Not started |
| Broader KubeJS integrations | Planned |