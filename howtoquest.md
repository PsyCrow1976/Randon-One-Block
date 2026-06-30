# FTB Quests How-To (Randon One Block)

Quick reference for adding and editing quests in this pack. Based on the **Storage Options** chapter (Sophisticated Backpacks tier line).

Pack format: **JSON5** (not SNBT). Reload in-game with `/ftbquests reload` or restart the client.

---

## File layout

```
config/ftbquests/quests/
├── data.json5                          # global quest book settings
├── chapter_groups.json5
└── chapters/
    ├── getting_started.json5           # one file per chapter
    ├── basics.json5
    └── storage_options.json5           # working example — read this first

config/ftbquests/quests/lang/en_us/
├── file.json5                          # quest book title
├── chapter.json5                       # chapter tab titles
└── chapters/
    ├── getting_started.json5           # quest titles/descriptions per chapter
    └── storage_options.json5
```

Chapters are auto-discovered from `chapters/*.json5`. No extra registry file is needed.

---

## Checklist: new chapter

1. Create `config/ftbquests/quests/chapters/<filename>.json5`
2. Add chapter title to `config/ftbquests/quests/lang/en_us/chapter.json5`
3. Create `config/ftbquests/quests/lang/en_us/chapters/<filename>.json5` for quest text
4. Reload quests in-game and verify title + dependency lines

---

## Chapter file skeleton

```json5
{
  id: "4BD893412B6B3963",           // 16-char hex ID — must match lang key
  group: "",
  order_index: 3,                   // tab order in quest book
  icon: {
    id: "sophisticatedbackpacks:backpack",
    count: 1,
  },
  filename: "storage_options",      // must match filename (without .json5)
  default_quest_shape: "",
  default_hide_dependency_lines: false,
  quests: [ /* ... */ ],
  quest_links: [],
  images: [],
}
```

### Chapter title (fixes "Unnamed")

In `lang/en_us/chapter.json5`:

```json5
{
  "chapter.4BD893412B6B3963.title": "Storage Options"
}
```

The hex string **must exactly match** the chapter `id` in the chapter JSON5 file. If the in-game editor saves the chapter, it may regenerate this ID — update the lang entry to match.

---

## Quest skeleton

```json5
{
  icon: {
    id: "sophisticatedbackpacks:backpack",
    count: 1,
  },
  x: 0.0,
  y: 0.0,
  dependencies: [
    "54426B5BBE263DB4",             // quest IDs this one requires
  ],
  id: "1D5A582F52D7CB30",           // unique 16-char hex quest ID
  tasks: [
    {
      id: "1A2B3C4D5E6F7081",        // unique task ID
      type: "item",
      item: {
        id: "sophisticatedbackpacks:backpack",
        count: 1,
      },
    },
  ],
  rewards: [
    {
      id: "2B3C4D5E6F708192",
      type: "xp",
      xp: 10,
    },
  ],
}
```

Common task types in this pack: `item`, `checkmark`.

---

## Quest text (titles & descriptions)

In `lang/en_us/chapters/<filename>.json5`:

```json5
{
  "quest.1D5A582F52D7CB30.title": "Sophisticated Backpack",
  "quest.1D5A582F52D7CB30.quest_subtitle": "Portable storage on the go",
  "quest.1D5A582F52D7CB30.quest_desc": [
    "Line one of description.",
    "",
    "Blank line above = paragraph break."
  ],
  "task.1A2B3C4D5E6F7081.title": "Obtain a Backpack"
}
```

Lang keys use the **quest ID** and **task ID** from the chapter file. If quests show unnamed titles, the lang keys are pointing at old/wrong IDs.

---

## Dependencies

### Linear chain (each tier requires the previous)

```json5
dependencies: [
  "4485085C6BFD2FC6",   // iron backpack quest ID
],
```

Used for: Gold → requires Iron, Diamond → requires Gold, Netherite → requires Diamond.

### Cross-chapter dependency

Reference a quest ID from another chapter file. Getting Started entry quest:

```json5
// quest ID 54426B5BBE263DB4 in getting_started.json5
dependencies: [
  "54426B5BBE263DB4",
],
```

Used for: first quest in a chapter gated behind the Getting Started checkmark.

### Fork / OR dependency (`one_completed`)

When multiple paths lead to the same quest (e.g. two crafting recipes), list **all** parent quests and set:

```json5
dependencies: [
  "1D5A582F52D7CB30",   // leather backpack
  "58C53A19F1C804A9",   // copper backpack (optional branch)
],
dependency_requirement: "one_completed",
```

Player only needs **one** of the listed quests completed to unlock the next quest. Both dependency lines still draw in the quest map.

**Important:** `dependency_requirement` does nothing without a `dependencies` array. Both fields are required.

### Optional side branch

```json5
optional: true,
```

Marks a quest as optional (e.g. copper detour). It still participates in `one_completed` forks when listed as a dependency.

---

## Storage Options reference graph

Working example in `config/ftbquests/quests/chapters/storage_options.json5`:

```
Getting Started (54426B5BBE263DB4)
        │
        ▼
  Leather Backpack (1D5A582F52D7CB30)
       ╱                    ╲
      ▼                      ▼
Copper (58C53A19F1C804A9)   (leather also connects)
      ╲                      ╱
       ▼                    ▼
   Iron Backpack (4485085C6BFD2FC6)   ← one_completed: leather OR copper
              │
              ▼
        Gold (08E47E11A1D8C0DB)
              │
              ▼
      Diamond (0EF32096EC1AA836)
              │
              ▼
    Netherite (391C5E29148EC181)
```

| Quest | ID | Depends on |
|-------|-----|------------|
| Sophisticated Backpack | `1D5A582F52D7CB30` | Getting Started `54426B5BBE263DB4` |
| Copper Backpack | `58C53A19F1C804A9` | Leather |
| Iron Backpack | `4485085C6BFD2FC6` | Leather **or** Copper |
| Gold Backpack | `08E47E11A1D8C0DB` | Iron |
| Diamond Backpack | `0EF32096EC1AA836` | Gold |
| Netherite Backpack | `391C5E29148EC181` | Diamond |

---

## Item tasks: variants & colors

For items that share one registry ID across variants (dyed backpacks, etc.), use a single item task:

```json5
item: {
  id: "sophisticatedbackpacks:backpack",
  count: 1,
}
```

Any color/version with that ID counts. No NBT or components needed.

---

## Recipe forks: design pattern

When a mod has **multiple recipes for the same output** (e.g. iron backpack from leather vs. copper):

1. Create one quest per **input path** (leather, copper) — not per recipe output
2. Create **one** quest for the shared output (iron backpack)
3. Point the output quest at both paths with `one_completed`
4. Describe both recipes in the output quest's `quest_desc`
5. Chain higher tiers linearly off the shared output quest

Do **not** create two separate iron quests for two recipes — merge into one with OR dependencies.

---

## Rewards

Simple XP reward (used throughout this pack):

```json5
{
  id: "2B3C4D5E6F708192",
  type: "xp",
  xp: 10,
}
```

Item reward example:

```json5
{
  id: "4D5E6F708192A3B4",
  type: "item",
  item: {
    id: "minecraft:copper_ingot",
    count: 1,
  },
}
```

Every reward needs its own unique `id`.

---

## Layout tips

- `x` / `y` — quest position on the chapter map
- `shape` — e.g. `"rsquare"` for emphasis on entry quests
- `size` — e.g. `1.5` to enlarge a quest node
- `default_hide_dependency_lines: false` — keep connection lines visible chapter-wide
- Avoid `hide_dependent_lines: true` on quests unless you intentionally want to hide a connector

---

## Random block mod unlocks (FTB XMod Compat)

Completing certain quests unlocks that mod's blocks in the **random one-block pool** for the player's **team** (shared Haven island).

### Config map

Edit [`kubejs/config/random_one_block_mod_pools.json`](../kubejs/config/random_one_block_mod_pools.json):

```json5
{
  starter_exceptions: ["elevatorid"],   // also in pool from day one (vanilla is always on)
  quest_unlock_map: {
    "330C599A54702742": "sophisticatedstorage"   // quest hex id -> mod namespace
  }
}
```

1. Right-click a quest in the editor → **Copy ID** (hex string).
2. Add `QUEST_ID: "modnamespace"` to `quest_unlock_map` (namespace = block id prefix, e.g. `refinedstorage:machine` → `refinedstorage`).
3. Run `/randomblock reload` in-game (or restart).

**FTB XMod Compat** registers `FTBQuestsEvents.completed` handlers automatically — a command reward is optional. Login backfill applies unlocks for quests already completed.

### Manual / admin unlock

```
/randomblock poolenable refinedstorage true
/randomblock pools
/randomblock pools list
/randomblock pools debug
```

Team unlocks persist under `kubejs/data/random_one_block_unlocks/` (gitignored). `/randomblock pools debug` lists every mod namespace in chat and copies the full report to `logs/kubejs/server.log`.

---

## Reload & test

1. Edit JSON5 files in `config/ftbquests/`
2. Run `/ftbquests reload` in-game (or restart)
3. Verify:
   - Chapter tab shows correct title (not "Unnamed")
   - Quest titles and descriptions appear
   - Dependency lines connect quests
   - Locked quests unlock after completing prerequisites

---

## Pitfalls (learned the hard way)

### In-game quest editor overwrites your work

Saving from the FTB Quests editor can:

- Regenerate chapter and quest IDs
- **Strip `dependencies` arrays** while leaving `dependency_requirement` behind
- Break lang file keys → "Unnamed" chapter and quest titles

**Recommendation:** edit JSON5 files directly in the repo. Use the in-game editor only for positioning (`x`/`y`) if needed, then diff the file before committing. After any in-game save, check that `dependencies` arrays are still present and lang IDs still match.

### "Unnamed" chapter

Cause: `chapter.<ID>.title` in `lang/en_us/chapter.json5` uses a different ID than the chapter `id` field.

Fix: open the chapter JSON5, copy the current `id`, update the lang entry.

### Dependencies not showing / quests all unlocked

Cause: `dependencies` array missing from quest entries (often after in-game save).

Fix: restore `dependencies` in the JSON5 file. `dependency_requirement` alone is not enough.

### Lang text not appearing

Cause: lang keys reference old quest/task IDs.

Fix: grep the chapter JSON5 for current `id` values and update `lang/en_us/chapters/<filename>.json5`.

---

## Finding item IDs & recipes

Extract from the mod JAR in the instance `mods/` folder:

```bash
unzip -l mods/sophisticatedbackpacks-*.jar "data/sophisticatedbackpacks/recipe/*"
unzip -p mods/sophisticatedbackpacks-*.jar data/sophisticatedbackpacks/recipe/iron_backpack.json
```

Use JEI in-game as the primary sanity check for obtainable items.

---

## Existing chapter IDs (Randon One Block)

| Chapter | File | Chapter ID | Entry quest |
|---------|------|------------|-------------|
| Getting Started | `getting_started.json5` | `7364166FBA5DFE42` | `54426B5BBE263DB4` (checkmark) |
| Good to Know Mods | `good_to_know_mods.json5` | `72F7BBFBF1CB5500` | `1B88CD62B3AA33C6` |
| The Basics | `basics.json5` | `02482B0A2AAED9D8` | `4137D6CD3FC01F40` |
| Storage Options | `storage_options.json5` | `4BD893412B6B3963` | `1D5A582F52D7CB30` |

Use `54426B5BBE263DB4` as the standard gate for new chapters that should open after Getting Started.