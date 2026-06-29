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

Gate the weighted block pool so late-mod blocks do not appear until the player has unlocked that mod’s dependencies (quest completion, item craft, or FTB Quest chapter gate).

- [ ] Design **tier structure** — e.g. Tier 0 (vanilla / early skyblock), Tier 1 (basic storage & utilities), Tier 2 (Sophisticated Storage, etc.), Tier 3 (**Refined Storage** and peers)
- [ ] Map **mods → tier** and **unlock conditions** (quest id, crafted item, or chapter completion)
- [ ] Extend `random_one_block.json` / `random_one_block.js` to filter pool by active tier per player or per island/team
- [ ] Tie unlocks to **FTB Quests** where possible (e.g. no Refined Storage blocks until Storage Options / RS intro is complete)
- [ ] Document tier rules in `requirements.md` and add `/randomblock` debug output for current tier + eligible pool size
