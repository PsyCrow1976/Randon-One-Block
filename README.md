# Modded Random OneBlock

A modded Minecraft server modpack built around the OneBlock concept — a single starting block that evolves into many different modded experiences over time.

## Overview

**Modded Random OneBlock** combines content and mechanics from a wide variety of modded Minecraft modpacks into one cohesive playthrough. Instead of locking players into a single pack's progression, the pack rotates and blends themes, tech trees, magic systems, and dimensions as the island grows.

## Target Versions

| Component | Version |
|-----------|---------|
| Minecraft | 26.1.2 |
| NeoForge | 26.1.2.76 |

## Customization

**KubeJS** is the primary tool for pack customization. Scripts will drive:

- Random block and loot progression for the OneBlock island
- Integration between mods from different pack styles
- Recipe changes, item tweaks, and event hooks
- Pack-specific phases and unlock conditions

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

## Status

Early planning — mod list, phase design, and KubeJS scripts are still to be defined.