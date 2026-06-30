# Todo list

## Quest book

- [ ] Add a **quick book section** on getting a **bone block** (and using it) to obtain **seeds** — early-game farming tip for one-block skyblock
- [ ] Add **Gateways to Eternity** quest chapter (full progression beyond the intro quest in *Good to Know Mods*)
- [ ] Add **Ex Deorum** quest chapter
- [ ] Add **Construction Wands** intro quest to *Good to Know Mods*
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

## Random block tiers (progression gating)

- [x] **Mod pool gating** — vanilla default + `starter_exceptions`; per-team unlocks via `quest_unlock_map` / `poolenable` ([`random_one_block_mod_pools.json`](kubejs/config/random_one_block_mod_pools.json))
- [ ] Map more mods in `quest_unlock_map` (e.g. **Refined Storage**, Gateways, Ex Deorum) as intro quests are added — **must** also add `quest_task_fallback` task hex ids per quest; see [`howtoquest.md`](howtoquest.md) § *HARD RULES*