# Changelog

User-friendly summary of what changed in **Modded Random OneBlock**. Technical details live in [`README.md`](README.md) and [`requirements.md`](requirements.md).

The format is simple: newest release first, plain language, no mod jargon unless it helps.

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