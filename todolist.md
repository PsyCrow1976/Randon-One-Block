# Todo list

## Quest book

- [ ] Add **Gateways to Eternity** quest chapter (full progression beyond the intro quest in *Good to Know Mods*)
- [ ] Add **Ex Deorum** quest chapter
- [ ] Add **Construction Wands** intro quest to *Good to Know Mods*
- [ ] Catagories the modlist.md to core/lib mods, helper mods and dedicatde mods

## Custom recipes (random block pool)

Add shaped 3×3 compression recipes so blocks that only exist as “crafted” items can still drop from the random one-block pool.

- [ ] **Leather block** — 3×3 leather → leather block (or equivalent mod item id)
- [ ] **Compressed wool** — 3×3 wool → wool block / compressed wool variant
- [ ] Audit other **craft-only storage/decorative blocks** (e.g. block forms of common materials) and add recipes where missing so they can appear in the pool
- [ ] Register recipes in **KubeJS** (`kubejs/server_scripts/`) and verify ids with `/randomblock reload` + pool dump

## Random block tiers (progression gating)

- [x] **Mod pool gating** — vanilla default + `starter_exceptions`; per-team unlocks via `quest_unlock_map` / `poolenable` ([`random_one_block_mod_pools.json`](kubejs/config/random_one_block_mod_pools.json))
- [ ] Map more mods in `quest_unlock_map` (e.g. **Refined Storage**, Gateways, Ex Deorum) as intro quests are added
- [ ] Custom compression recipes (leather block, wool) so craft-only blocks can enter the master pool
