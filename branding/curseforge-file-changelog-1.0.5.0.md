# Randon One Block 1.0.5.0

**Milestone release** — first finished quest-book pass, Equivox, full quest text, modlist refresh, confirmed random-pool unlocks.

## What’s new (summary of 1.0.4.x → 1.0.5.0)

### Quest book
- **16 chapters · ~888 quests** with dependency chains and layouts from the in-game editor
- Chapters include Getting Started, Good to Know Mods, Storage Options, Ex Deorum, **Equivox**, Iron Furnaces, Animal Pens, Easy Villagers & Piglins, Dank Storage, Cooking for Blockheads, Baubly Slots, BBL, EnderIO, Refined Storage, Powah, Mystical Agriculture
- **Full quest descriptions** (quirky + practical tips) — no more empty “Obtain X.” stubs
- Mystical Agriculture progression expanded; older split Mystical tabs cleaned up

### ProjectE → Equivox
- EMC / Equivalent Exchange content ships as **Equivox** (`equivox-1.0.0.jar`) for copyright reasons
- Quest chapter, item IDs, and random-block pool namespace use `equivox`
- **The Red Rock** (Philosopher’s Stone) on Getting Started **or** the Equivox tab unlocks Equivox blocks in your team’s random pool (**playtest confirmed**)

### Random One Block
- Per-team mod pool gating with quest unlocks:
  - Leather Backpack → Sophisticated Storage
  - Compressed Dirt → Ex Deorum
  - Philosopher’s Stone / The Red Rock → Equivox
- Unlock map documented in pack config for pack authors

### Mods
- **81 mods** on Minecraft **26.1.2** / NeoForge **26.1.2.76**
- ProjectEE replaced by Equivox; library and storage mods updated (Balm, BBL Utility, Cucumber, Farming for Blockheads, Haven Skyblock Builder, JEI, Puzzles Lib, Sophisticated Backpacks / Core / Storage)

### Still included
- Haven skyblock `oneblock_island` + auto random-block setup
- **Randon Mined** team counter overlay
- The Uncrafting Table mod
- AI-assisted pack tooling (modlist HTML catalog, quest generators)

Full history: [CHANGELOG.md on GitHub](https://github.com/PsyCrow1976/Randon-One-Block/blob/main/CHANGELOG.md)
