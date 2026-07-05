# Pack generators — mod list, items, and FTB quests

How to regenerate **Randon One Block** catalog outputs from your CurseForge playtest instance.

| Generator | Output |
|-----------|--------|
| [`generate-moditemlist.sh`](generate-moditemlist.sh) | `modlist.html`, `modlist-items.json` |
| [`generate-ftb-quests.sh`](generate-ftb-quests.sh) | FTB Quest chapter + lang files under `config/ftbquests/` |

Both scripts run [`scripts/clean-stale-instance-config.sh`](scripts/clean-stale-instance-config.sh) first to fix common instance problems.

---

## Quick start

### Mod + item HTML list

```bash
./generate-moditemlist.sh
```

Open in a browser:

```text
file:///…/Randon-One-Block/modlist.html
```

Refresh mod versions **and** rebuild HTML:

```bash
./generate-moditemlist.sh --update-mods
```

### FTB Quest chapters (recipe-based)

```bash
./generate-ftb-quests.sh
```

Then in-game:

```text
/ftbquests reload
```

Quests are generated **without dependency links** — wire progression manually in the quest editor or JSON5 files.

---

## Prerequisites

1. **Python 3** (`python3`)
2. **CurseForge playtest instance** with mod JARs installed
3. **Symlinked pack folders** — `config/` and `kubejs/` in the instance should point at this repo (see [Stale instances](#stale-instances) below)
4. For the HTML mod tab: [`modlist.json`](modlist.json) (refresh with [`update-modlist.sh`](update-modlist.sh) when mods change)

### Default instance

Override with `MODLIST_INSTANCE` on any command:

```text
/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block
```

```bash
MODLIST_INSTANCE="/path/to/your/instance" ./generate-moditemlist.sh
MODLIST_INSTANCE="/path/to/your/instance" ./generate-ftb-quests.sh
```

---

## Stale instances

Generators read **mod JARs** from `<instance>/mods/`. Quest and KubeJS config must come from the **repo**, not stale copies sitting in the instance root.

### Symptoms

| Symptom | Likely cause |
|---------|----------------|
| Quest unlocks / pool gating wrong after `/reload` | `random_one_block_mod_pools.json` (or similar) copied to **instance root** instead of `kubejs/config/` |
| Edits in repo `config/` not seen in-game | `config/` or `kubejs/` in instance is a **real folder**, not a symlink to the repo |
| Generator finds 0 or fewer mods than expected | Wrong `MODLIST_INSTANCE`, or empty `mods/` folder |
| Old debug dump in instance root | `random_one_block_mod_pools_debug.txt` left behind by `/randomblock pools debug` |

### Fix (recommended order)

**1. Link the repo into the playtest instance** (once per instance):

```bash
./link-instance.sh
```

This symlinks `config/` and `kubejs/` to the repo and runs the stale-file cleaner.

**2. Clean stale instance-root pack files**:

```bash
./scripts/clean-stale-instance-config.sh
```

Or target one instance:

```bash
MODLIST_INSTANCE="/path/to/instance" ./scripts/clean-stale-instance-config.sh "/path/to/instance"
```

Removes stray copies of:

- `random_one_block.json`
- `random_one_block_mod_pools.json`
- `random_one_block_team_unlocks.json`
- `random_one_block_team_counters.json`
- `random_one_block_mod_pools_debug.json` / `.txt`
- `random_one_block_pool.json` / `.txt`

**Authoritative pack config lives only in** [`kubejs/config/`](kubejs/config/) **in this repo.**

**3. Verify before generating**:

```bash
./scripts/clean-stale-instance-config.sh
```

Look for:

- `ok — kubejs -> /home/christer/repo/Randon-One-Block/kubejs`
- `ok — config -> /home/christer/repo/Randon-One-Block/config`
- `ok — mods/ present (81 jars)` (count may vary)
- `ok — no stale instance-root pack configs`

**4. Wrong instance name?** This pack uses **Modded Randon One Block** for development. An older **Randon One Block** install may have copied `config/` and `kubejs/` instead of symlinks — use the Modded instance or re-run `link-instance.sh` after setting `MODLIST_INSTANCE`.

---

## Mod + item HTML (`generate-moditemlist.sh`)

### Shell script

```bash
./generate-moditemlist.sh              # generate HTML + JSON
./generate-moditemlist.sh --update-mods  # refresh modlist.json, then generate
./generate-moditemlist.sh --help
```

### Outputs

| File | Purpose |
|------|---------|
| [`modlist.html`](modlist.html) | **Mods** tab + **Items & Blocks** tab (search, filters, pagination) |
| [`modlist-items.json`](modlist-items.json) | Machine-readable item cache |

Row format: **Modpack · Item · Item Type · Description** (items also show mod, craftability, registry id).

### Python scripts

| Script | Role |
|--------|------|
| [`scripts/generate-modlist-html.py`](scripts/generate-modlist-html.py) | Builds HTML + `modlist-items.json` |
| [`scripts/modpack_items.py`](scripts/modpack_items.py) | Extracts items/blocks from mod JAR lang + recipes |

**Mod tab** — from [`modlist.json`](modlist.json); per-mod type/description in `MOD_META` inside `generate-modlist-html.py`.

**Items tab** — auto-extracted from mod JAR `en_us.json`, `data/<namespace>/recipe/`, and [`kubejs/data/`](kubejs/data/) recipes.

### Manual run

```bash
./update-modlist.sh    # optional
python3 scripts/generate-modlist-html.py --instance "$MODLIST_INSTANCE"
```

---

## FTB Quest chapters (`generate-ftb-quests.sh`)

### Shell script

```bash
./generate-ftb-quests.sh
./generate-ftb-quests.sh --help
```

### What it generates

| Location | Content |
|----------|---------|
| `config/ftbquests/quests/chapters/<name>.json5` | Quest definitions (item tasks, 10 XP, grid layout) |
| `config/ftbquests/quests/lang/en_us/chapters/<name>.json5` | Funny titles + detailed descriptions |
| `config/ftbquests/quests/lang/en_us/chapter.json5` | Chapter tab names (appended) |

### Mods covered (13 chapters)

Ender IO, Cooking for Blockheads, Refined Storage, Powah, Dark Utilities, Baubley Heart Canisters, BBL Utility, Farming for Blockheads, Construction Sticks, Mystical Agriculture, Mystical Agradditions, Mystical Automation, Mystical Agriculture Tiered Crystals.

One quest per **unique recipe output** from each mod's `data/<namespace>/recipe/` files. Market recipes (Farming for Blockheads) only include items for mods installed in the pack.

### Python script

```bash
python3 scripts/generate_ftb_mod_quests.py --instance "$MODLIST_INSTANCE"
```

Source: [`scripts/generate_ftb_mod_quests.py`](scripts/generate_ftb_mod_quests.py)

- **No `dependencies`** — standalone quests; link them yourself
- Regenerating **overwrites** chapter + lang files for those mods
- Edit `CHAPTER_DEFS` in the script to add/remove mod chapters

### After generating

1. `/ftbquests reload` in-game
2. Open quest book — new tabs at order index 10–22
3. Manually add dependency lines / quest layout as desired ([`howtoquest.md`](howtoquest.md))

---

## Typical workflow after pack changes

1. Update mods in the CurseForge instance.
2. Ensure instance is healthy:

   ```bash
   ./link-instance.sh   # if config/kubejs are not symlinked yet
   ./scripts/clean-stale-instance-config.sh
   ```

3. Regenerate what you need:

   ```bash
   ./generate-moditemlist.sh --update-mods   # HTML catalog + modlist.json
   ./generate-ftb-quests.sh                  # quest chapters (if recipes/mods changed)
   ```

4. In-game: `/ftbquests reload` and spot-check a few quests.
5. Commit repo changes you want to keep.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `mods folder not found` | Set `MODLIST_INSTANCE` to the folder that contains `mods/` |
| `missing modlist.json` | Run `./update-modlist.sh` or `./generate-moditemlist.sh --update-mods` |
| `config/ is a real folder, not a symlink` | Run `./link-instance.sh` on the correct instance |
| Pool unlock / quest gating ignores repo edits | Delete stale instance-root JSON (see [Stale instances](#stale-instances)); confirm `kubejs/config/` in repo is authoritative |
| New mod shows generic HTML description | Add `MOD_META` entry in `scripts/generate-modlist-html.py` |
| Quest count lower than expected | Some recipes are gated by `mod_loaded` conditions for mods not in the pack — expected |
| Regenerated quests wiped manual edits | Generator overwrites generated files — back up hand-edited quests before re-running |

---

## Related files

- [`modlist.md`](modlist.md) — simple mod name/version table
- [`update-modlist.sh`](update-modlist.sh) — refresh `modlist.json` / `modlist.md` only
- [`howtoquest.md`](howtoquest.md) — manual FTB Quest editing reference
- [`link-instance.sh`](link-instance.sh) — symlink repo `config/` + `kubejs/` into instance
- [`README.md`](README.md) — full pack documentation