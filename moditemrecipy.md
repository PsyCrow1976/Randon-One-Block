# Mod & item list — how to regenerate

This guide explains how to rebuild the browsable **mod + item** HTML list for **Randon One Block**.

## Quick start

From the repo root, after your CurseForge instance has the mods you want listed:

```bash
./generate-moditemlist.sh
```

Open the result in a browser:

```text
file:///…/Randon-One-Block/modlist.html
```

To refresh the mod snapshot (`modlist.json`) from the instance **and** rebuild the HTML in one step:

```bash
./generate-moditemlist.sh --update-mods
```

## What gets generated

| Output | Purpose |
|--------|---------|
| [`modlist.html`](modlist.html) | Human-readable page with **Mods** and **Items & Blocks** tabs |
| [`modlist-items.json`](modlist-items.json) | Machine-readable item cache (names, types, craftability, descriptions) |

The HTML uses this row format:

**Modpack · Item · Item Type · Description**

For pack items, extra columns include **Mod**, **Craftable / Uncraftable**, and registry **ID**.

## Prerequisites

1. **Python 3** on your PATH (`python3`).
2. A **CurseForge instance** with the modpack installed (default playtest path below).
3. [`modlist.json`](modlist.json) — the mod name/version list. Create or refresh it with [`update-modlist.sh`](update-modlist.sh) if you added, removed, or updated mods.

Default instance (override with `MODLIST_INSTANCE`):

```text
/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block
```

## The shell script

[`generate-moditemlist.sh`](generate-moditemlist.sh) is the one command to run.

```bash
./generate-moditemlist.sh              # generate HTML + JSON
./generate-moditemlist.sh --update-mods  # update modlist.json, then generate
./generate-moditemlist.sh --help
```

Custom instance path:

```bash
MODLIST_INSTANCE="/path/to/your/instance" ./generate-moditemlist.sh
```

## What the generator reads

The Python pipeline lives under [`scripts/`](scripts/):

| Script | Role |
|--------|------|
| [`scripts/generate-modlist-html.py`](scripts/generate-modlist-html.py) | Builds `modlist.html` and writes `modlist-items.json` |
| [`scripts/modpack_items.py`](scripts/modpack_items.py) | Extracts items/blocks from installed mod JARs |

### Mod tab (81 mods)

- Source: [`modlist.json`](modlist.json)
- **Item type** and **description** for each mod: hand-maintained map in `generate-modlist-html.py` (`MOD_META`)
- When you add a new mod to the pack, run `./update-modlist.sh`, then add a `MOD_META` entry if you want a custom category/description (otherwise it falls back to generic text)

### Items & Blocks tab (~4k+ entries)

Extracted automatically from:

1. **Mod JAR `en_us.json` lang files** — display names for `item.*` and `block.*` keys
2. **Mod JAR `data/<namespace>/recipe/` files** — marks outputs as **Craftable**
3. **KubeJS pack data** — [`kubejs/assets/kubejs/lang/`](kubejs/assets/kubejs/lang/) and [`kubejs/data/`](kubejs/data/) recipes (e.g. custom blocks)
4. **Tooltip/description keys** in lang files (`.desc`, `.description`, `.tooltip.*`) when present

**Craftable** means the item appears as the result of at least one recipe file (crafting, smelting, sieve, and other recipe types in mod data). **Uncraftable** items may still be obtained via drops, machines, quests, or world generation.

### What is *not* included

- Vanilla Minecraft items (only mod-added content from installed JARs + KubeJS)
- Items with no English lang entry in mod files (rare hidden/internal entries)

## Manual / advanced usage

Equivalent to the shell script, without `--update-mods`:

```bash
./update-modlist.sh    # optional — refresh modlist.json from instance
python3 scripts/generate-modlist-html.py
```

With a custom instance:

```bash
MODLIST_INSTANCE="/path/to/instance" python3 scripts/generate-modlist-html.py --instance "/path/to/instance"
```

## Typical workflow after changing the pack

1. Add, remove, or update mods in the CurseForge instance.
2. Run:

   ```bash
   ./generate-moditemlist.sh --update-mods
   ```

3. Open `modlist.html` and spot-check the **Mods** tab and a few **Items & Blocks** filters.
4. If you added a **new mod**, add its category/description to `MOD_META` in `scripts/generate-modlist-html.py`.
5. Commit outputs you want in git (optional): `modlist.html`, `modlist-items.json`, and `modlist.json` if refreshed.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `mods folder not found` | Set `MODLIST_INSTANCE` to your CurseForge instance directory (the folder that contains `mods/`) |
| `missing modlist.json` | Run `./update-modlist.sh` or `./generate-moditemlist.sh --update-mods` |
| New mod shows generic description | Add an entry to `MOD_META` in `scripts/generate-modlist-html.py` |
| KubeJS custom item wrong craftability | Ensure recipes live under `kubejs/data/.../recipes/` and use a `result.id` with the item id |
| Item count dropped after mod update | Confirm the instance `mods/` folder still has all JARs; re-run the generator |

## Related files

- [`modlist.md`](modlist.md) — simple mod name/version table
- [`update-modlist.sh`](update-modlist.sh) — refresh `modlist.json` / `modlist.md` only
- [`README.md`](README.md) — full pack documentation