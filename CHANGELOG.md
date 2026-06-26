# Changelog

User-friendly summary of what changed in **Modded Random OneBlock**. Technical details live in [`README.md`](README.md) and [`requirements.md`](requirements.md).

The format is simple: newest release first, plain language, no mod jargon unless it helps.

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