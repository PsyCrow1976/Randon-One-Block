# Todo list

## Mods
- [ ] Remove Construction wands mod
## Quest book

- [ ] Add a **quick book section** on getting a **bone block** (and using it) to obtain **seeds** — early-game farming tip for one-block skyblock
- [ ] Add **Gateways to Eternity** quest chapter (full progression beyond the intro quest in *Good to Know Mods*)
- [X] Add **Ex Deorum** quest chapter
- [ ] Add **Construction Wands** intro quest to *Good to Know Mods*
- [x] Add AnimalPens Chapter (Animal Cage unlocks `animal_pen` pool)
- [ ] Add Aphothious Chapter (triggered by Enchanting table)
- [ ] Add Bauble Heart Containers (triggered by getting minirature heart)
- [ ] Add Constructions Sticks in a common chapter (exa good to knwo mods)
- [ ] Add Dank Storage in common chaptr (ex good to know mods)
- [x] Add Easy Villagers/Piglins Chapter (Villager → `easy_villagers` pool; Piglin → `easy_piglins` pool)
- [ ] Add Market in good to know mods
- [x] Add Iron Furnaces Chapter (triggered by Furnace; Iron Furnace unlocks `ironfurnaces` pool)
- [ ] Add Mystical Agriculter (triggered by inferiums essens)
- [ ] Catagories the modlist.md to core/lib mods, helper mods and dedicatde mods

## Custom recipes (random block pool)

Add shaped 3×3 compression recipes so blocks that only exist as “crafted” items can still drop from the random one-block pool. See [`howtocustomblocks.md`](howtocustomblocks.md).

- [x] **Leather block** — 3×3 leather ↔ leather block
- [x] **Sapling block** — 3×3 oak sapling ↔ sapling block
- [x] **Carrot block** — 3×3 carrot ↔ carrot block
- [x] **Potato block** — 3×3 potato ↔ potato block
- [x] **Torch block** — 3×3 torch ↔ torch block
- [ ] **Compressed wool** — 3×3 wool → wool block / compressed wool variant
- [ ] Audit other **craft-only storage/decorative blocks** and add recipes where missing
- [x] Document custom block workflow in **`howtocustomblocks.md`**

## Random One Block — mine counter rewards / milestone pool unlocks

Team-scoped milestones (not per-player) when the **Randon Mined** counter hits. Design: [`theatlasplan.md`](theatlasplan.md) §5.4.1.

- [x] **100** — chat message (“void notices”)
- [x] **500** — auto unlock **BBL Utility** (`utility`) pool
- [x] **1,000** — choice token: **Dark Utils** *or* **Apotheosis** (+ `apothic_enchanting`)
- [x] **2,500** — auto unlock **Easy Ore Generation** pool
- [x] **5,000** — choice token: remaining Dark Utils / Apotheosis package
- [x] **FTB chapter “Randon Mined”** — milestone track + book checkmark to spend choices
- [ ] Playtest remaining milestones (1k book claim, 2.5k, 5k)
- [ ] **10,000** — reserved
- [ ] **50,000** — reserved (pre-Echo)
- [x] **100,000** — Echo trophy (Phase 3) — implemented; playtest still open (`theatlasplan.md` Phase 3)

Commands: `/randomblock milestones`, `/randomblock unlock list`, `/randomblock unlock choose <mod>` · Quest book tab **Randon Mined**

## Random block tiers (progression gating)

- [x] **Mod pool gating** — vanilla default + `starter_exceptions`; per-team unlocks via `quest_unlock_map` / `poolenable` ([`random_one_block_mod_pools.json`](kubejs/config/random_one_block_mod_pools.json))
- [ ] Map more mods in `quest_unlock_map` (e.g. **Refined Storage**, Gateways, Ex Deorum) as intro quests are added — **must** also add `quest_task_fallback` task hex ids per quest; see [`howtoquest.md`](howtoquest.md) § *HARD RULES*
