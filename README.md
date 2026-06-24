# Modded Random OneBlock

A modded Minecraft **skyblock** server modpack where players start on template-based islands and progress through varied modded content over time.

## Overview

**Modded Random OneBlock** combines content and mechanics from a wide variety of modded Minecraft modpacks into one cohesive playthrough. Instead of locking players into a single pack's progression, the pack rotates and blends themes, tech trees, magic systems, and dimensions as islands grow and unlock new phases.

### Core systems

| Role | Mod | Notes |
|------|-----|-------|
| Skyblock islands | **Haven Skyblock Builder** (`haven_skyblock_builder`) | World preset, island templates, teams, visits, spawn island |
| Quest book & progression | **FTB Quests** (`ftbquests`) | In-game quest book; chapters, tasks, and rewards |
| FTB support | FTB Library, FTB Teams, FTB Chunks, FTB Essentials | Shared FTB infrastructure (claims, teams, utilities) |
| Pack scripting | **KubeJS** | Recipes, integrations, phase logic, custom events |

## Target Versions

| Component | Version |
|-----------|---------|
| Minecraft | 26.1.2 |
| NeoForge | 26.1.2.76 |

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

**Current setup:** `classic_island` with `additional_sand_island` offset at `0,0,-75`; spawn offset `1,1,-3` facing west.

**Player flow:** spawn island → `/havensb island create <template> <name>` → team island at configured distance. In-game UI: `J`.

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

## Customization (KubeJS)

Scripts in `kubejs/` will drive:

- Integration between mods from different pack styles
- Recipe changes, item tweaks, and event hooks
- Pack-specific phases and unlock conditions tied to FTB Quests progression

## Local Development

This repo is linked to the CurseForge instance used for playtesting:

**Instance path:** `/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block`

The following folders are symlinked from the instance into this repo — edit them here and changes apply immediately in-game:

| Repo folder | Instance symlink |
|-------------|------------------|
| `kubejs/` | `…/Modded Randon One Block/kubejs` |
| `config/` | `…/Modded Randon One Block/config` |

If the symlinks are ever broken (e.g. after reinstalling the instance), run:

```bash
./link-instance.sh
```

Mods, saves, logs, and other runtime data stay in the CurseForge instance folder and are not tracked in git.

## Installed mods (playtest instance)

AppleSkin, Clumps, Cooking for Blockheads, FTB Chunks, FTB Essentials, FTB Library, FTB Quests, FTB Teams, Haven Skyblock Builder, Jade, JourneyMap, JEI, Just Enough Resources, KubeJS, Mouse Tweaks, Refined Storage (+ JEI integration), Rhino, Sophisticated Backpacks/Core/Storage.

## Status

Early planning — island templates and Haven config are in place; FTB Quest chapters, phase design, and KubeJS scripts are still to be defined.
