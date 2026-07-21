# Plan: Randon Atlas + Echo Endgame (v1)

**Status:** Design only — implement **after** remaining mod pool unlocks via quests/achievements are finished.  
**Combines:** Suggestion **1 (Randon Atlas)** + **3 (100k Echo / mine milestones)**.  
**Deferred (v2 pin):** Prestige / “Quiet the Block” stabilize / second seed / dual random block.

---

## 1. Goal

Give the pack a **clear finish line** that is native to Random One Block — not an ATM-style star — while reusing systems you already have:

| Existing | Role in this design |
|----------|---------------------|
| Team **Randon Mined** counter | Echo milestones + milestone unlock gates |
| Team **mod pool unlocks** (`quest_unlock_map`, `team_unlocks`) | Atlas scope + hybrid unlock paths |
| FTB Quests chapters | Soft clear, Atlas quests, Echo chapter, unlock docs |
| Center-block break pipeline | Source of truth for “atlas entries” and counter increments |

**v1 win ladder (player-facing):**

1. **Soft clear** — major mod chapters done + all intended pools available (quest and/or milestone paths).
2. **True end** — complete the **Randon Atlas** (unique center rolls for the endgame set).
3. **Climax** — hit the **Echo** at **100,000** team mines (guaranteed unique trophy block + final quest).

Prestige loops stay out of v1.

---

## 2. Player fantasy (one paragraph for quests / branding)

> Your island’s center block is a tear in the void. Every break is a page in the **Randon Atlas**. Unlock new mod pools through the quest book **and** by earning **mine milestones** — at some milestones you **choose** which locked mod joins the chaos. Fill the Atlas with blocks only the center can prove. On the **100,000th** break, the void answers once: the **Echo** — a block no other path can grant.

---

## 3. Design pillars

1. **Team-scoped** — Atlas, counter, unlocks, and Echo all use the same Haven team scope as today (`haven-…` via `resolveUnlockScopeId`).
2. **Center-block only** — Atlas entries and Echo progress only count **successful Random One Block replacements** (same path that increments Randon Mined today), not hand-placed or JEI-cheated blocks.
3. **Hybrid unlocks** — a mod namespace can unlock via:
   - **Quest only** (current behavior),
   - **Milestone only** (reach N mines),
   - **Quest + milestone** (both required),
   - **Milestone choice** (player picks one eligible mod at a threshold).
4. **Pity / fairness** — pure RNG Atlas uses a **curated endgame set** (not all ~2100 blocks). Echo is **guaranteed** at 100k. Optional Atlas pity later if needed (not required for first ship).
5. **Config-first** — thresholds, eligible mods, Atlas set, and rewards live in JSON under `kubejs/config/`; quests wire presentation and FTB tasks.
6. **No prestige in v1** — no stabilize, no second block, no NG+.

---

## 4. Systems overview

```text
                    ┌─────────────────────────────┐
                    │  Center block break (ROB)    │
                    └──────────────┬──────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   blocks_mined++          atlas.add(blockId)      roll next block
   (existing)              (new team set)          (existing pool)
           │                       │
           ▼                       ▼
   Milestone engine          Atlas progress
   - auto unlocks            - per-mod / full set
   - choice tokens           - FTB custom tasks
   - Echo at 100k            - end chapter
           │
           ▼
   Pool unlock state (extend team_unlocks)
```

---

## 5. System A — Mine milestones + hybrid pool unlocks

### 5.1 Unlock modes (per mod namespace)

Extend `random_one_block_mod_pools.json` (or a sibling config — see §7) with an explicit unlock definition per gated mod:

| Mode | Meaning | Example |
|------|---------|---------|
| `quest` | Unlocks only when mapped quest(s) complete | Sophisticated Storage via Leather Backpack |
| `milestone` | Unlocks when team `blocks_mined >= N` | Optional early helper mod at 500 |
| `quest_and_milestone` | Quest complete **and** mines ≥ N | “Serious” midgame pools |
| `milestone_choice` | Eligible for **player pick** when a choice token is spent at a threshold | Player unlocks Refined Storage **or** Powah at 5k |
| `starter` / always | Unchanged (`minecraft` + `starter_exceptions`) | elevatorid, kubejs, uncraftingtable |

**Rule:** Once unlocked for a team, stay unlocked (persist in `random_one_block_team_unlocks.json` as today). Reaching a higher milestone does not revoke choices.

### 5.2 User-selectable milestone unlocks (core UX)

**Problem this solves:** Not every mod needs a full quest line before it can appear in the pool; players should feel **agency** at big mine numbers.

**Behavior:**

1. Config defines **choice thresholds**, e.g. `1000`, `5000`, `10000`, `25000`.
2. When team `blocks_mined` first crosses a threshold, the team receives **one unlock token** for that threshold (persisted; not lost on logout).
3. Player runs a command (or completes a “Spend token” quest) to **choose one still-locked mod** from that threshold’s **eligible list**.
4. Choice immediately runs the same unlock path as `/randomblock poolenable <mod> true` for that team.

**Example config intent:**

```json
"milestone_choices": [
  {
    "threshold": 1000,
    "token_id": "choice_1k",
    "eligible_mods": ["ironfurnaces", "cookingforblockheads", "animal_pen"],
    "description": "First crack in the void — pick one support mod for the pool"
  },
  {
    "threshold": 5000,
    "token_id": "choice_5k",
    "eligible_mods": ["refinedstorage", "powah", "enderio"],
    "description": "The tear widens — pick one major tech pool"
  }
]
```

**Also support non-choice milestones** (auto unlock or quest_and_milestone without a pick):

```json
"milestone_auto_unlocks": [
  { "threshold": 100, "mods": ["kubejs"] },
  { "threshold": 500, "mods": [] }
]
```

(`kubejs` custom blocks may already be starter-enabled — list is illustrative.)

### 5.3 Quest + milestone combination

Two patterns (both supported):

| Pattern | Player experience | Implementation |
|---------|-------------------|----------------|
| **A. Gate the pool** | Quest done but pool stays off until mines ≥ N | Unlock engine requires both flags |
| **B. Gate the quest** | FTB quest requires custom “mines ≥ N” task, then quest reward unlocks pool | Existing quest_unlock_map after task |

**Recommend primary = Pattern A** in KubeJS unlock engine so designers don’t depend on fragile custom FTB task types for every mod. Quests still **document** “Reach 1,000 Randon Mined” and can grant XP/items; the **pool** only turns on when both conditions are true.

Pseudo:

```text
isPoolUnlocked(team, mod) =
  starter OR force_manual_enable OR (
    mode requirements:
      quest: questComplete
      milestone: mined >= N
      quest_and_milestone: questComplete AND mined >= N
      milestone_choice: mod in team.chosen_unlocks
  )
```

### 5.4 Milestone schedule (default proposal — tunable in config)

| Mines | Type | Suggested effect |
|------:|------|------------------|
| 100 | Auto / quest toast | Cosmetic + small reward; intro to counter |
| 1,000 | **Choice token** | Pick 1 from early/support list |
| 5,000 | **Choice token** | Pick 1 from mid tech list |
| 10,000 | Auto or choice | Larger reward + optional second-tier choice |
| 25,000 | Quest-tied / choice | Late pools or Atlas boosts |
| 50,000 | Pre-Echo | Guaranteed rare Atlas help **or** big item reward (not prestige) |
| **100,000** | **Echo** | Guaranteed trophy block + final quest complete |

Exact mod lists for each choice tier should be filled **after** all quest→pool mappings exist, so choice lists don’t steal mods that already have a strong quest-only story (or deliberately offer a **shortcut** for players who skip that chapter).

**Design rule for packing lists later:**

- Mods with a **full chapter + signature unlock quest** → prefer `quest` or `quest_and_milestone`.
- Mods that are **nice-to-have early** → `milestone_choice` at 1k/5k.
- “Must feel earned” endgame mods → `quest_and_milestone` with high N **or** only via Atlas chapter, not free choice.

### 5.5 Commands (player + op)

| Command | Who | Purpose |
|---------|-----|---------|
| `/randomblock counter` | existing | Show mines |
| `/randomblock milestones` | player | List thresholds, progress, unspent tokens, eligibility |
| `/randomblock unlock choose <mod>` | player | Spend one eligible unspent token on `<mod>` |
| `/randomblock unlock list` | player | Mods locked/unlocked + mode + requirements |
| `/randomblock atlas` | player | Atlas progress summary |
| `/randomblock poolenable …` | op | Keep as override / debug |

Validation for `unlock choose`:

- Team has unspent token whose `eligible_mods` contains `<mod>`.
- Mod not already unlocked.
- Prefer **lowest unspent threshold token** that allows that mod (or require `token_id` arg if ambiguous).

Chat feedback on first cross of a threshold (team-wide once):

```text
[Randon] Milestone 1,000 — you earned an unlock choice!
Use /randomblock unlock list and /randomblock unlock choose <mod>
```

### 5.6 Persistence (extend team data)

Today:

- `random_one_block_team_counters.json` → `{ scope_id, blocks_mined, updated_at }`
- `random_one_block_team_unlocks.json` → per-scope enabled mods

**v1 extensions (recommended shapes):**

**Counter record:**

```json
{
  "scope_id": "haven-…",
  "blocks_mined": 1000,
  "updated_at": "…",
  "milestones_reached": [100, 1000],
  "unspent_choice_tokens": ["choice_1k"],
  "spent_choice_tokens": {
    "choice_1k": "ironfurnaces"
  },
  "echo_granted": false
}
```

**Unlocks record:** keep boolean map of mods; optionally store `unlock_source: { "ironfurnaces": "milestone_choice:choice_1k" }` for debug.

Milestone detection: on each `incrementTeamCounter`, if `blocks_mined` crosses any configured threshold not in `milestones_reached`, append it, grant token/auto-unlock, notify online team members.

---

## 6. System B — Randon Atlas

### 6.1 What counts as an Atlas entry

On successful ROB replace (same code path that logs `Replaced broken block … with <id>`):

- Record `nextId` (block id string) into team **`atlas_blocks`** set (unique).
- Only if the break was a valid ROB center break (already true for counter increment).

Do **not** count:

- Blocks obtained by crafting/trading,
- Creative/JEI give,
- Worldgen / hand place.

### 6.2 Atlas tiers (avoid “mine all 2100”)

| Tier | Content | Purpose |
|------|---------|---------|
| **Per-mod discovery** | At least **1** unique roll from each **unlocked** gated mod | Soft Atlas; ties to pool unlocks |
| **Endgame set (True Atlas)** | Curated list of **N** block ids (suggest **48–96**) across vanilla + unlocked mods | True end quest |
| **Completionist (optional)** | All full-cube blocks currently in **effective** pool | Prestige-adjacent — mark **optional** in v1 or skip |

**v1 true end = Endgame set**, not full registry.

Curated set file idea: `kubejs/config/random_one_block_atlas.json`

```json
{
  "endgame_set_id": "randon_atlas_v1",
  "require_mod_unlocked": true,
  "entries": [
    { "id": "minecraft:diamond_block", "group": "vanilla_value" },
    { "id": "equivox:…", "group": "equivox", "requires_mod": "equivox" },
    { "id": "refinedstorage:machine_casing", "group": "rs", "requires_mod": "refinedstorage" }
  ]
}
```

Rules:

- If `require_mod_unlocked` and `requires_mod` not unlocked for team, that entry is **inactive** (does not block completion) **or** **blocked until unlock** (prefer **inactive until unlock**, then required — so early Atlas % isn’t softlocked by locked pools).
- Completion % = `owned ∩ active_entries / active_entries`.
- When player unlocks a new mod pool, active set grows → Atlas % may drop briefly (communicate in quest text: “The Atlas expands when the void opens new mods”).

**Alternative (simpler %):** fixed endgame set of only blocks from always-available + intentionally late mods; discovery tier separate. Prefer **expanding active set** so Atlas stays tied to pool unlocks.

### 6.3 Atlas persistence

New file (gitignored runtime like other team data):  
`kubejs/config/random_one_block_team_atlas.json`

```json
{
  "haven-…": {
    "scope_id": "haven-…",
    "blocks": {
      "minecraft:iron_ore": true,
      "exdeorum:compressed_dirt": true
    },
    "updated_at": "…"
  }
}
```

Write strategy: update set in memory on each roll; **debounce disk writes** (e.g. every 25 new unique ids or every 100 breaks or on logout/server stop) to avoid heavy IO at high mine rates. Counter already writes every break today — consider same batching improvement while touching this code.

### 6.4 Atlas commands / HUD

| Feature | v1 |
|---------|----|
| `/randomblock atlas` | `X/Y active entries (Z% · unique rolls total U)` |
| `/randomblock atlas missing [mod]` | List up to N missing endgame ids (chat/log) |
| Overlay | Keep **Randon Mined** only; do not crowd HUD with Atlas % unless config opt-in later |
| Quest book | Primary progress UI via FTB tasks (see §8) |

### 6.5 Atlas and pools

- Rolling a block from a **locked** mod should be impossible if gating works; if a roll somehow happens, still record it but do not treat as unlock proof.
- **Per-mod discovery** quest: “Obtain any block from mod X **via the center block** after unlock” — tracked by atlas namespace presence, not item task alone (item tasks can be cheated; prefer KubeJS custom completion or command reward when atlas gains namespace).

Practical FTB approach for v1:

1. KubeJS maintains atlas.
2. On atlas change, if endgame set complete → grant advancement-like state: run `FTBQuests` complete command / set stage / give tag item `kubejs:atlas_seal` once.
3. Final quest task = obtain `kubejs:atlas_seal` (or custom datapack item).

Same pattern for per-mod seals if needed: `kubejs:atlas_page_refinedstorage` (optional, only if quest UX needs it).

---

## 7. System C — The Echo (100,000th break)

### 7.1 Behavior

When `incrementTeamCounter` returns **exactly 100000** (or first time `blocks_mined >= 100000` and `echo_granted == false`):

1. Force the **next** replacement id to the Echo trophy block (do not rely on random weight).
2. Set `echo_granted: true`.
3. Broadcast team message + server log.
4. Grant seal item / complete Echo quest (same seal pattern as Atlas).

**Trophy block (new pack content):**

| Id | Role |
|----|------|
| `kubejs:echo_block` | Full cube, pool-eligible only via Echo force-place (blacklist from normal weighted pool) |
| Optional item form | Placeable; quest icon |

Also add **non-block reward** if desired: title, firework, one-time loot — keep modest for v1.

### 7.2 Intermediate Echo “beats” (milestones as story)

Not prestige — just rewards so 100k isn’t a silent grind:

| At | Reward class |
|----|----------------|
| 100 | Chat + quest check-in |
| 1k / 5k / 10k | Choice tokens (above) + small loot |
| 25k / 50k | Unique cosmetic or guaranteed “Atlas hint” (e.g. reveal 3 missing atlas ids) |
| **100k** | **Echo block** + final quest |

Wire rewards in config:

```json
"echo": {
  "threshold": 100000,
  "block_id": "kubejs:echo_block",
  "force_on_break": true
},
"milestone_rewards": [
  { "threshold": 100, "message": "…", "commands": [] },
  { "threshold": 1000, "grant_choice_token": "choice_1k" }
]
```

### 7.3 Relationship to Atlas

| Path | Can finish without the other? |
|------|-------------------------------|
| Atlas complete | Yes — true end “collection” win |
| Echo at 100k | Yes — “dedication” win |
| **Pack true ending (recommended)** | **Both** — final quest “The Randon Ending” requires Atlas seal **and** Echo seal |

Quest book copy should celebrate either order (mine-heavy vs collection-heavy players).

---

## 8. Quest book structure (new chapter)

Add chapter e.g. **`randon_endgame.json5`** / title **“Randon Atlas & Echo”** (name free).

Suggested quest graph:

```text
[Intro: The Tear]
    │
    ├─► [Randon Mined 100]
    ├─► [Randon Mined 1,000] ──► [Spend Unlock Choice I]  (optional checklist quest)
    ├─► [Randon Mined 5,000] ──► [Spend Unlock Choice II]
    ├─► … intermediate …
    │
    ├─► [Atlas: First Page]          (any 10 unique center rolls)
    ├─► [Atlas: Mod Pages]           (1 unique per unlocked major mod — dynamic text)
    ├─► [Atlas: Complete]            (endgame set seal)
    │
    ├─► [Echo Approaches]            (50k)
    └─► [The Echo]                   (100k seal)
              │
              └─► [The Randon Ending]  (Atlas seal + Echo seal)
```

**Dependencies:** Intro unlocks after Getting Started basics (or free from start).  
**Do not** hide major mod chapters behind Echo — those remain the soft clear path.

Quest tasks implementation notes:

- Mine counts: prefer KubeJS → grant items/seals / `ftbquests change_progress` when thresholds hit (more reliable than vanilla scoreboard in this stack).
- Document in `howtoquest.md` the same HARD RULES if any quest also maps to `quest_unlock_map`.

---

## 9. Config files (target layout)

| File | Owner | Purpose |
|------|-------|---------|
| `kubejs/config/random_one_block.json` | existing | HUD, mechanic; optional `randon_counter_hud` stays |
| `kubejs/config/random_one_block_mod_pools.json` | existing + extend | Quest maps; **add** unlock modes / milestone hooks **or** reference sibling |
| `kubejs/config/random_one_block_milestones.json` | **new** | Thresholds, choice tokens, auto unlocks, Echo, rewards |
| `kubejs/config/random_one_block_atlas.json` | **new** | Endgame set + groups |
| `kubejs/config/random_one_block_team_counters.json` | runtime | Extended milestone fields |
| `kubejs/config/random_one_block_team_unlocks.json` | runtime | Unchanged role |
| `kubejs/config/random_one_block_team_atlas.json` | runtime **new** | Unique roll sets |

Prefer **sibling configs** over stuffing everything into `mod_pools.json` so quest-only authors don’t touch Echo/Atlas.

---

## 10. Code / script touchpoints (when implementing)

| Script | Change |
|--------|--------|
| `random_one_block_team_counters.js` | Milestone cross detection, tokens, Echo flag, notify |
| `random_one_block_mod_pools.js` | Unlock mode evaluation; integrate choice unlocks; expose helpers on `RandonOneBlockPools` |
| `random_one_block_quest_unlocks.js` | Unchanged pattern; still quest→mod; engine decides if milestone also required |
| `random_one_block.js` | On successful pick: atlas record; if Echo pending force `kubejs:echo_block`; hook milestone after increment |
| **new** `random_one_block_atlas.js` | Load set, team atlas IO, progress queries, seal grant |
| **new** `random_one_block_milestones.js` | Config load, token spend command handlers |
| `startup_scripts/custom_blocks.js` + assets | `echo_block` (+ optional seal items as items not blocks) |
| `client_scripts/…` | Optional; keep HUD as counter only for v1 |
| Commands in `random_one_block.js` | Subcommands: `milestones`, `unlock`, `atlas` |

**Load order:** keep pools before quest unlocks; atlas/milestones after config IO; call atlas+milestone from break handler after counter increment (single choke point).

**Rhino constraints:** follow `requirements.md` (no bad UUID APIs, no EventBus listeners, batch JSON carefully).

---

## 11. Phased implementation (execute after pool unlocks ready)

### Prerequisite (your work before this plan)

- [ ] Finish remaining **quest → mod pool** unlocks for major chapters (map + `quest_task_fallback` per `howtoquest.md`).
- [ ] Playtest: each unlock shows pool ON for team; `/randomblock pools debug quests` clean.
- [ ] Freeze list of **gated mod namespaces** for choice tiers vs quest-only vs quest_and_milestone.

### Phase 0 — Design freeze (short, no code)

- [ ] Fill tables: each gated mod → unlock mode + threshold/token eligibility.
- [ ] Draft Atlas endgame set (~48–96 ids) from real pool (`/randomblock pools debug complete` dumps).
- [ ] Confirm default choice thresholds: **1000** and **5000** (plus any extras).
- [ ] Write player-facing names: Echo block, chapter title, seal items.

### Phase 1 — Milestone engine + selectable unlocks

- [ ] Add `random_one_block_milestones.json` + team counter field extensions.
- [ ] Detect threshold crossings on increment; grant tokens; chat notify.
- [ ] Commands: `milestones`, `unlock list`, `unlock choose`.
- [ ] Wire choice → same persistence as `poolenable`.
- [ ] Support `quest_and_milestone` in pool eligibility.
- [ ] Tests: hit 1000 in creative test world; choose mod; see rolls from that namespace.

### Phase 2 — Atlas tracking

- [ ] Team atlas persistence + record on ROB replace.
- [ ] Config endgame set; progress math with `requires_mod`.
- [ ] Commands: `atlas`, `atlas missing`.
- [ ] Seal item / quest completion hook when set complete.
- [ ] Optional: per-mod first discovery message (rate-limited).

### Phase 3 — Echo

- [ ] Register `kubejs:echo_block` (full cube, recipes none, blacklisted from weighted pool).
- [ ] Force place at 100k; `echo_granted`; seal + quest.
- [ ] Intermediate milestone messages/rewards config-driven.

### Phase 4 — Quest book chapter

- [ ] Create endgame chapter JSON5 + lang.
- [ ] Wire dependency to Getting Started / optional.
- [ ] Tasks for seals and key milestones (not every atlas id as separate quest unless desired).
- [ ] Final quest: Atlas + Echo.

### Phase 5 — Docs, changelog, ship

- [ ] Update `README.md` endgame section, `howtoquest.md` (milestone + choice rules), `requirements.md` must-not-break list.
- [ ] `CHANGELOG.md` + version bump when shipping.
- [ ] Playtest checklist (§12).

**Suggested ship version:** next minor after pool-unlock pass (e.g. `1.0.6.0` endgame milestone) — adjust to your versioning.

---

## 12. Playtest / acceptance checklist

### Unlocks

- [ ] Quest-only mod still unlocks on quest complete with mines = 0.
- [ ] `quest_and_milestone` mod stays locked after quest until N mines, then unlocks without re-completing quest (login backfill / live check).
- [ ] At 1000 mines, token granted once; reconnect does not duplicate token.
- [ ] `unlock choose <mod>` unlocks pool; rolls include that mod; token spent; cannot choose twice.
- [ ] Choosing invalid / already unlocked mod fails cleanly.
- [ ] Op `poolenable` still overrides for debug.

### Atlas

- [ ] Unique center rolls accumulate; duplicate rolls do not increase unique count.
- [ ] Non-center breaks do not add atlas entries.
- [ ] Completing endgame set grants seal once; final quest completable.
- [ ] Unlocking a new mod expands active set; UI explains progress change.

### Echo

- [ ] 99999 → 100000 break places `kubejs:echo_block` (or configured id).
- [ ] Further breaks do not re-grant Echo.
- [ ] Counter HUD still accurate; team scope shared for two players on same island.

### Regression

- [ ] Island create auto setbelow, weighted roll log line, `/randomblock reload`, existing quest unlocks — all green per README baseline.

---

## 13. Explicitly out of scope (v2 pin)

| Idea | Why later |
|------|-----------|
| Stabilize / Quiet the Block | Prestige world mutation |
| Second random block / Multiverse Seed | NG+ content |
| Server-wide constellation | Multiplayer meta |
| Full-registry completionist Atlas as required end | Burnout / length |
| ATM-style star craft | Intentionally avoided |

---

## 14. Open decisions (fill during Phase 0)

These do **not** block the plan shape; decide before coding Phase 1:

1. **Choice vs auto at 1k/5k** — confirmed **player choice** for at least 1000 and 5000; any auto-only mods?
2. **Can choice unlock a mod that also has a quest path?**  
   - **Recommended:** Yes — choice is an alternate on-ramp; quest can still grant items/XP without being the only pool key.  
   - Or: quest-only mods excluded from choice lists (stricter story).
3. **Atlas end size** — 48 vs 96?
4. **Final win = Atlas only / Echo only / both?** — plan recommends **both** for “The Randon Ending,” with each seal feeling like a win alone.
5. **Should milestone choice require a small quest click** (“Confirm unlock”) for discoverability, or pure command? — recommend **command + quest checklist** that completes when token spent.

---

## 15. Success criteria (product)

Players finishing the pack should say:

- “We finished the **quest book** and opened the **pools**.”
- “We **chose** what chaos to add at 1k/5k.”
- “We filled the **Atlas** from the center block.”
- “We hit **100k** and got the **Echo**.”

Not: “We crafted a star.”

---

## 16. Execution note for future session

When ready to implement:

1. Confirm prerequisite pool unlocks are done and list of mods/modes is filled (§11 Phase 0).
2. Start **Phase 1** only (milestones + selectable unlocks) — shippable value even before Atlas/Echo art.
3. Then Atlas, Echo, quest chapter, docs.

Do not implement prestige. Do not expand scope into new combat mods for the finale; Gateways remain optional side content unless you later re-open that design.
