# Randon One Block

**An experimental AI-built modpack — no grand plan, just curiosity.**

This pack exists because I wanted to see how far **AI** (Grok Composer 2.5 fast) could take a real Minecraft **26.1.2** NeoForge project. I do not mod by hand: I describe what I want, and the AI writes configs, KubeJS scripts, quests, and pack structure. **Randon One Block** is that experiment made playable.

**1.0.5.0** is the first “finished first pass” milestone: a complete FTB Quest book, Equivox (EMC / Equivalent Exchange fork), full quest descriptions, and confirmed random-block pool unlocks.

There is no deep endgame vision here — it is a sandbox to learn what AI can ship on the latest Minecraft version.

### Why “Randon”?

**Randon** is not a clever brand — I simply misspelled **Random** when creating the GitHub repo (`Randon-One-Block`). CurseForge asked for a project name without “mod/modded” or loader names in the title (so **Modded Random OneBlock** and **Random Modded One Block** were both rejected). The repo typo became the official name **Randon One Block** instead of renaming folders and links everywhere. The gameplay is still a **random** one-block skyblock; the name is just an honest mistake that stuck.

---

## What you do in-game

You start on a **simple Haven skyblock island**. In the middle sits **one block**. Break it and a **new random block from anywhere in the modpack** appears in its place — then break that, and roll again.

That loop was built with **KubeJS**, with heavy inspiration from **[Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock)**. Huge shout-out to that pack’s creator — the random one-block idea is theirs; this is a separate mod list, Haven islands, and our own scripts.

Early rolls stay mostly **vanilla + a few starter mods**. Completing certain quests **unlocks whole mod namespaces** into your team’s random pool (storage, Ex Deorum, Equivox, and more as the book grows).

Progression highlights:

- **FTB Quests** — **16 chapters · ~888 quests** with dependency lines and full descriptions (Getting Started, Storage, Ex Deorum, Equivox, Iron Furnaces, Mystical Agriculture, Ender IO, Refined Storage, Powah, and more).
- **The Uncrafting Table** — a custom mod for **Minecraft 26.1.2**: reverse a crafting recipe and get ingredients back. Nothing like it existed for this version, so AI helped create it for the pack.
- **Equivox** — feed the ingredients you recover from the Uncrafting Table into Equivox’s transmutation grid to build **EMC** (Energy-Matter Currency). Craft the Philosopher’s Stone (*The Red Rock*) to unlock Equivox blocks in your random pool. (ProjectE was renamed Equivox for copyright reasons.)
- **Randon Mined** — team counter above the hotbar for center blocks broken.
- Everything else is “mods I liked” thrown together on skyblock.

---

## Quick start

1. Create a world with preset **`haven_skyblock_builder:skyblock_world`**
2. Run: `/havensb island create oneblock_island My Island`
3. Mine the **center dirt** on the small pyramid — it will keep re-rolling random blocks
4. Watch **Randon Mined :** above the hotbar — your **team** total for center blocks broken
5. Open the **FTB Quest book** in your hotbar for starter tasks

Stuck with an unbreakable roll? Use the repeatable **Cant mine the block?** quest to reset the center to dirt.

---

## How this pack was made (honest notes)

| Part | How |
|------|-----|
| Mod selection & versions | Picked for MC 26.1.2 / NeoForge 26.1.2.94 |
| Random center block | KubeJS (`kubejs/server_scripts/random_one_block.js`) |
| Skyblock islands | Haven Skyblock Builder + `oneblock_island` template |
| Quest book | FTB Quests JSON5 in `config/ftbquests/` — AI-assisted authoring |
| Uncrafting Table | Dedicated mod (reverse crafting) — no existing 26.1.2 option |
| Equivox | EMC / transmutation (ProjectE fork renamed for copyright) |
| Repo & docs | GitHub: [PsyCrow1976/Randon-One-Block](https://github.com/PsyCrow1976/Randon-One-Block) |

**Inspired by:** [Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock)

---

## Versions

| | |
|--|--|
| Pack version | **1.0.5.0** |
| Minecraft | 26.1.2 |
| NeoForge | 26.1.2.94 |
| Mods | 81 |

---

## Expectations

- This is an **experimental AI-assisted pack**, not a polished expert pack — but **1.0.5.0** is a real playable milestone with a finished first quest-book pass.
- Balance and content will keep growing as the AI-assisted workflow continues.
- Bug reports and ideas welcome on [GitHub Issues](https://github.com/PsyCrow1976/Randon-One-Block/issues).

If you want a polished one-block experience, play **[Chaos OneBlock](https://www.curseforge.com/minecraft/modpacks/chaos-oneblock)** too — and thank its creator for the concept that started this rabbit hole.
