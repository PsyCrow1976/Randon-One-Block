# Custom blocks (KubeJS) — Randon One Block

How to add **minable storage blocks** that compress 9 items into one block and decompress back in crafting. Used so players can get resources from the random one-block pool and craft them back into useful items.

**Working examples:** `kubejs:leather_block`, `kubejs:sapling_block`, `kubejs:carrot_block`, `kubejs:potato_block`, `kubejs:torch_block`.

Pack: **KubeJS 26.1.2-8.0.3**, **Minecraft 26.1**, **NeoForge**.

---

## HARD RULES (do not break)

| Rule | Why |
|------|-----|
| Register blocks in **`kubejs/startup_scripts/`** only | Custom blocks load once at game startup |
| Register recipes in **`kubejs/server_scripts/`** and/or **`kubejs/data/kubejs/recipes/`** | `ServerEvents.recipes` is **invalid** in startup scripts (KubeJS 8 errors) |
| **Do not use `.textureAll()`** on block builders | Removed from `BasicKubeBlock$Builder` in KubeJS 8.0.3 — use manual assets |
| **Do not** guard recipes with `BuiltInRegistries.ITEM.containsKey()` | Fails on MC 26; recipes get skipped silently |
| Put textures/models in **`kubejs/assets/kubejs/`** | Acts as a resource pack; default model path is `kubejs:block/<block_id>` |
| Add **`kubejs`** to `starter_exceptions.enabled` in `random_one_block_mod_pools.json` | Only the **`enabled`** array turns mods on from day one — `mods_with_minable_blocks` is a catalog only |
| **Do not** list `kubejs` in `force_disabled_mods` | Blocks the namespace from the effective pool; `/reload` auto-strips any id that appears in both lists |
| **Full game restart** after changing startup scripts or assets | `/reload` alone does not re-register blocks |
| **`/reload`** after changing server scripts or `kubejs/data/` recipes | Recipes and datapacks reload without restart |

---

## File layout (per block)

```
kubejs/
├── startup_scripts/
│   └── custom_blocks.js              # StartupEvents.registry('block', …)
├── server_scripts/
│   └── custom_recipes.js             # ServerEvents.recipes (optional; datapack is primary)
├── data/kubejs/recipes/
│   ├── <block>_from_<item>.json      # 3×3 shaped compress
│   └── <item>_from_<block>.json      # 9× shapeless decompress
└── assets/kubejs/
    ├── textures/block/<block_id>.png
    ├── models/block/<block_id>.json
    ├── models/item/<block_id>.json
    ├── blockstates/<block_id>.json
    └── lang/en_us.json
```

---

## Step-by-step: add a new storage block

### 1. Register the block (`startup_scripts/custom_blocks.js`)

Add an entry to `CUSTOM_STORAGE_BLOCKS`:

```javascript
{
  id: 'carrot_block',              // becomes kubejs:carrot_block
  displayName: 'Carrot Block',
  mapColor: 'color_orange',        // see KubeJS MapColor list
  soundType: 'crop',               // wool, grass, wood, crop, etc.
  hardness: 0.6,
  mineableTag: 'minecraft:mineable/hoe'
}
```

Optional: `lightLevel: 0.93` for glowing blocks (e.g. torch block).

**Do not** chain `.textureAll()` or `.model()` unless you confirm the method exists in your KubeJS version. Manual assets under `assets/kubejs/` are enough.

### 2. Assets (`kubejs/assets/kubejs/`)

Minimum set per block:

- **Texture:** `textures/block/<block_id>.png` (16×16)
- **Block model:** `models/block/<block_id>.json`

```json
{
  "parent": "minecraft:block/cube_all",
  "textures": { "all": "kubejs:block/<block_id>" }
}
```

- **Item model:** `models/item/<block_id>.json` → `"parent": "kubejs:block/<block_id>"`
- **Blockstate:** `blockstates/<block_id>.json` → `"model": "kubejs:block/<block_id>"`
- **Lang:** add `block.kubejs.<block_id>` and `item.kubejs.<block_id>` in `lang/en_us.json`

### 3. Recipes — datapack (recommended)

**Compress** — `data/kubejs/recipes/<block>_from_<item>.json`:

```json
{
  "type": "minecraft:crafting_shaped",
  "category": "building",
  "pattern": ["CCC", "CCC", "CCC"],
  "key": { "C": "minecraft:carrot" },
  "result": { "id": "kubejs:carrot_block", "count": 1 }
}
```

**Decompress** — `data/kubejs/recipes/<item>_from_<block>.json`:

```json
{
  "type": "minecraft:crafting_shapeless",
  "category": "misc",
  "ingredients": ["kubejs:carrot_block"],
  "result": { "id": "minecraft:carrot", "count": 9 }
}
```

Folder name must be **`recipes`** (plural), not `recipe`.

### 4. Recipes — server script (optional mirror)

Add a row to `CUSTOM_COMPRESSION_RECIPES` in `server_scripts/custom_recipes.js`:

```javascript
{ block: 'kubejs:carrot_block', ingredient: 'minecraft:carrot', key: 'C' }
```

Keep the `try/catch` per block so a script failure does not break `/reload`.

### 5. Random block pool

`kubejs` is already in `starter_exceptions.enabled` in `kubejs/config/random_one_block_mod_pools.json`. New blocks under namespace `kubejs` are picked up automatically on `/randomblock reload` (full 1×1 collision cube).

Verify:

```text
/randomblock pools debug complete kubejs
```

### 6. Apply and test

1. **Restart** the game (startup + assets).
2. Run **`/reload`** (recipes + server scripts).
3. Check `logs/kubejs/server.log` for `Registered custom block kubejs:…` and `Registered compression recipes for kubejs:…`.
4. Craft 3×3 in a table; decompress in crafting or Uncrafting Table.

---

## Pitfalls

| Symptom | Fix |
|---------|-----|
| Block missing in creative / `Item does not exist` in recipes | Full restart; startup script did not run |
| `ServerEvents.recipes` invalid script type STARTUP | Move recipe code to `server_scripts/` |
| `Cannot find function textureAll` | Remove `.textureAll()`; use `assets/kubejs/textures/block/` |
| Recipes skipped, only block registers | Remove broken registry guard; add datapack JSON under `data/kubejs/recipes/` |
| Block in pool but status `locked` | Add `kubejs` to `starter_exceptions.enabled` |
| Status `exception` but **OFF** in pools debug | `kubejs` was in `force_disabled_mods` — run `/reload`; check log for `starter exceptions (enabled): … kubejs` |
| `/randomblock poolenable kubejs true` says cannot enable | Delete stray **`random_one_block_mod_pools.json` at the instance root** (must live in `kubejs/config/` only); then `/reload` |
| Log still shows `kubejs` in `force_disabled_mods` | Stale instance-root config was loaded — run `./scripts/clean-stale-instance-config.sh`; log line is now `force_disabled_mods (effective)` |
| Config edits in repo have no effect | Stray copy at instance root — see [`requirements.md`](requirements.md) constraint **#27**; use `RandonOneBlockConfigIO` / `kubejs/config/` only |
| `kubejs` ON but **0 blocks** | Full restart (register blocks) then `/randomblock reload` to rebuild the master pool |
| Pink/black block texture | Missing PNG or wrong path in model JSON |

---

## Related docs

- [`howtoquest.md`](howtoquest.md) — quest → mod pool unlocks
- [`requirements.md`](requirements.md) — KubeJS / Rhino constraints
- [KubeJS block registry](https://kubejs.com/wiki/tutorials/block-registry)