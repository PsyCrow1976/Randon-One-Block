# Randon One Block 1.0.5.6

## Headline: mine milestones unlock more random pools

Your team **Randon Mined** counter (center-block breaks) now unlocks additional mod namespaces into the random one-block pool — not only FTB quest completions.

| Team mines | Unlock |
|-----------:|--------|
| 500 | **Auto** — BBL Utility (`utility`) |
| 1,000 | **Choice** — Dark Utils **or** Apotheosis (+ Enchanting) |
| 2,500 | **Auto** — Easy Ore Generation |
| 5,000 | **Choice** — remaining Dark Utils / Apotheosis |

- One choice per token (quest book claim or `/randomblock unlock choose <mod>`)
- New FTB tab: **Randon Mined** (after Getting Started) — milestones gated by real mine count
- Commands: `/randomblock milestones`, `/randomblock unlock list`, `/randomblock unlock choose <mod>`

Quest-gated pools (Storage, Ex Deorum, Equivox, tech chapters, Mystical Agriculture, etc.) are unchanged.

## Also

- Milestone engine + team counter token fields
- Fix: milestone config load (empty auto/choice lists)
- Design: Randon Atlas / Echo still planned (Phase 2+); not in this build

## Platform

- Minecraft 26.1.2 · NeoForge 26.1.2.94 · 85 mods (no jar changes vs 1.0.5.4)

## Known

- Equivox Philosopher’s Stone world-transmutation crash until upstream rebuild
