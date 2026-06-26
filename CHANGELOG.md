# Changelog

User-friendly summary of what changed in **Modded Random OneBlock**. Technical details live in [`README.md`](README.md) and [`requirements.md`](requirements.md).

The format is simple: newest release first, plain language, no mod jargon unless it helps.

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
- **The Basics chapter** — Craft a crafting table (detected when you obtain one); reward is 10 experience.
- **Quest book on join** — The FTB Quest book is placed in your hotbar when you first log in.

### For server owners

- Operator commands under `/randomblock` (info, reload, manual position setup).
- Config file for weights, blacklist, and mechanic toggles: `kubejs/config/random_one_block.json`.