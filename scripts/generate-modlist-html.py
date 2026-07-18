#!/usr/bin/env python3
"""Generate modlist.html with mods and all pack items from installed mod JARs."""

from __future__ import annotations

import argparse
import html
import json
import os
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parents[1]
if str(REPO / "scripts") not in sys.path:
    sys.path.insert(0, str(REPO / "scripts"))

from modpack_items import DEFAULT_INSTANCE, extract_items  # noqa: E402

MODLIST_JSON = REPO / "modlist.json"
ITEMS_JSON = REPO / "modlist-items.json"
OUTPUT_HTML = REPO / "modlist.html"
MODPACK_NAME = "Randon One Block"
ITEMS_PAGE_SIZE = 75

MOD_META = {
    "Animal Pens": ("Utility", "Compact animal pens that hold livestock in a small space for skyblock farming."),
    "Apotheosis": ("Content", "Overhauls enchanting, spawners, potions, and gear with deeper endgame progression."),
    "Apothic Attributes": ("Library", "Attribute system library used by Apotheosis and related Shadowfacts mods."),
    "Apothic Enchanting": ("Content", "Standalone enchanting overhaul split from Apotheosis with shelves, stats, and tomes."),
    "Apothic Spawners": ("Content", "Enhanced mob spawners with modifiers, upgrades, and configurable spawn rules."),
    "AppleSkin": ("Quality of Life", "Shows food saturation, hunger restoration, and health preview on tooltips."),
    "Balm": ("Library", "Shared library and utilities for BlayTheNinth mods such as Farming for Blockheads."),
    "Baubley Heart Canisters": ("Content", "Craftable heart canisters that permanently increase maximum health when equipped."),
    "BBL Core": ("Library", "Core library for benbenlaw mods including Mystical Automation and related packs."),
    "BBL Utility": ("Utility", "Helper blocks and tools from benbenlaw for automation and pack utilities."),
    "Bookshelf": ("Library", "Darkhax library providing shared code for many Forge and NeoForge mods."),
    "Cloth Config API (Fabric/Forge/NeoForge)": ("Library", "Configuration GUI API used by mods that expose in-game config screens."),
    "Clumps": ("Performance", "Merges XP orbs into clusters to reduce lag from large experience drops."),
    "Colorful Hearts": ("Quality of Life", "Replaces vanilla hearts with color-coded health and absorption indicators."),
    "Common Network": ("Library", "Lightweight networking layer shared by several NeoForge utility mods."),
    "Construction Sticks": ("Utility", "Extends reach for placing blocks and building large structures from a distance."),
    "Controlling": ("Quality of Life", "Search and sort the controls menu to find keybinds quickly."),
    "Cooking for Blockheads": ("Content", "Kitchen multiblocks and appliances that craft food recipes from nearby ingredients."),
    "Crafting on a stick": ("Utility", "Portable crafting table item for working on a small skyblock island."),
    "Cucumber Library": ("Library", "Shared library for Mystical Agriculture and related BlakeBr0 mods."),
    "Curios API (Forge/NeoForge)": ("Library", "Accessory slot API for trinkets, rings, charms, and other wearable items."),
    "Dank Storage": ("Storage", "Tiered portable storage boxes that hold huge stacks of a single item type."),
    "Dark Utilities": ("Utility", "Collection of dark-themed utility blocks for farms, filters, and mob control."),
    "Day Count - a day counter HUD (Forge/NeoForge/Fabric)": ("Quality of Life", "On-screen day counter showing how many in-game days have passed."),
    "Easy Ore Generation": ("World Generation", "Adds configurable ore generation options for modpack ore balancing."),
    "Easy Piglins": ("Utility", "Simple piglin bartering setup blocks for automated gold trades."),
    "Easy Villagers": ("Utility", "Compact villager workstations and breeding blocks for trading automation."),
    "Ender IO": ("Automation", "Machines, conduits, and power systems for item, fluid, and energy transport."),
    "Ex Deorum": ("Skyblock", "Skyblock ore and resource loop with sieves, barrels, hammers, and compressed blocks."),
    "Farming for Blockheads": ("Content", "Market blocks and farming utilities that simplify crop and seed acquisition."),
    "Forgiving Void": ("Utility", "Teleports players back to safety instead of dying when falling off the island."),
    "FTB Chunks (NeoForge)": ("Utility", "Chunk claiming, map integration, and team-based world protection."),
    "FTB Essentials (Forge & Fabric)": ("Utility", "Basic server commands and player utilities bundled with FTB packs."),
    "FTB Library (NeoForge)": ("Library", "Core FTB library required by FTB Quests, Teams, Chunks, and related mods."),
    "FTB Quests (NeoForge)": ("Content", "Quest book progression system with chapters, tasks, and reward tables."),
    "FTB Teams (NeoForge)": ("Utility", "Team management for shared islands, quests, and chunk claims."),
    "FTB XMod Compat": ("Integration", "Compatibility layer connecting FTB mods with JEI, Jade, and other integrations."),
    "Fzzy Config": ("Library", "Modern config toolkit used by newer NeoForge mods for settings and keybinds."),
    "Gateways to Eternity": ("Content", "Wave-based gateway encounters that spawn themed mob fights for loot."),
    "GraveStone Mod": ("Utility", "Spawns a grave on death that stores items until the player retrieves them."),
    "GuideME": ("Integration", "In-game guide integration for Applied Energistics-style documentation flows."),
    "Haven Skyblock Builder": ("Skyblock", "Creates separated skyblock islands and templates such as the oneblock island."),
    "Iron Furnaces (Fabric & NeoForge)": ("Automation", "Upgradeable furnaces with faster smelting tiers and optional rainbow visuals."),
    "Jade 🔍": ("Quality of Life", "Block and entity tooltip overlay showing IDs, inventories, and mod data."),
    "Just Enough Items (JEI)": ("Quality of Life", "Recipe and ingredient viewer for looking up how items are crafted or used."),
    "Just Enough Resources (JER)": ("Quality of Life", "JEI addon showing mob drops, world gen, and loot table information."),
    "Konkrete": ("Library", "UI and event helper library used by several client-side NeoForge mods."),
    "Kotlin for Forge": ("Library", "Kotlin language runtime required by mods written in Kotlin."),
    "KubeJS": ("Scripting", "JavaScript-based scripting for recipes, tags, world events, and pack logic."),
    "Leaves Be Gone": ("Utility", "Quickly breaks connected leaf blocks after chopping down a tree."),
    "Melody": ("Library", "Audio helper library used by Konkrete-dependent client mods."),
    "More Overlays Updated": ("Quality of Life", "Chunk grid and spawn overlay helpers for building and mob farm planning."),
    "Mouse Tweaks": ("Quality of Life", "Improved mouse drag, wheel, and click behaviors for inventory management."),
    "Mystical Agradditions": ("Content", "Endgame expansion for Mystical Agriculture with higher tiers and extras."),
    "Mystical Agriculture": ("Content", "Grow crops for resources, essences, and crafting materials from seeds."),
    "Mystical Agriculture Tiered Crystals": ("Content", "Adds tiered growth accelerators and crystals for Mystical Agriculture crops."),
    "Mystical Automation": ("Automation", "Automation blocks and tools that integrate with Mystical Agriculture."),
    "Neat": ("Quality of Life", "Minimal mob health bars above enemies for quick combat feedback."),
    "Nirvana Library": ("Library", "Shared library for Nirvana mod family utilities and helpers."),
    "Nyctography": ("Utility", "In-world sign and text utilities for labeling builds and machines."),
    "OpenBlocks Elevator": ("Utility", "Colored elevator blocks for fast vertical travel between aligned columns."),
    "Pig Pen Cipher": ("Library", "Text obfuscation library used by Darkhax and related mods."),
    "Placebo": ("Library", "Core Shadowfacts library underpinning Apotheosis and related mods."),
    "Powah! (Rearchitected)": ("Automation", "Energy generation, storage, and transfer for powering machines and bases."),
    "Equivox": ("Content", "Equivalent Exchange / EMC transmutation (ProjectE fork renamed Equivox), collectors, and power items."),
    "Puzzles Lib": ("Library", "Shared library for Fuzs mods such as Leaves Be Gone and Easy Villagers."),
    "Reap Mod": ("Utility", "Harvests mature crops and replants seeds in one action."),
    "Refined Storage": ("Storage", "Digital storage network with autocrafting, disks, and wireless access."),
    "Refined Storage - JEI Integration": ("Integration", "Shows Refined Storage patterns and ingredients inside JEI."),
    "Rhino": ("Library", "JavaScript engine library required by KubeJS scripting."),
    "Runelic": ("Utility", "Rune banner patterns and decorative lettering blocks for labeling builds."),
    "Searchables": ("Library", "Search helper library used by Controlling and similar UI mods."),
    "Simple Voice Chat": ("Utility", "Proximity voice chat for multiplayer with push-to-talk and settings."),
    "Simplest Paxels": ("Utility", "Combined pickaxe, axe, and shovel tools for early-game efficiency."),
    "Sodium": ("Performance", "Rendering optimizations that improve FPS and reduce stutter on NeoForge."),
    "Sophisticated Backpacks": ("Storage", "Upgradeable backpacks with filters, magnets, and automation upgrades."),
    "Sophisticated Core": ("Library", "Shared core library for Sophisticated Backpacks and Sophisticated Storage."),
    "Sophisticated Storage": ("Storage", "Upgradeable chests, barrels, and storage with sorting and automation."),
    "The Uncrafting Table": ("Custom", "Pack custom mod that reverses crafting recipes to recover ingredients on 26.1.2."),
    "Time in a Bottle": ("Utility", "Stores and spends time to accelerate crop growth, machines, and spawners."),
    "Trade Cycling": ("Quality of Life", "Cycles villager trades without breaking and replacing workstations."),
}

TYPE_ORDER = [
    "Skyblock", "Custom", "Scripting", "Content", "Automation", "Storage", "Utility",
    "Quality of Life", "Integration", "Performance", "World Generation", "Library", "Mod",
]

ITEM_TYPE_ORDER = [
    "Block", "Item", "Building Block", "Machine/Block", "Material", "Storage", "Weapon/Tool",
    "Armor", "Crop/Seed", "Component", "Consumable", "Fluid Container", "Book/Guide",
    "Decorative", "Spawn Egg",
]


def load_mods() -> tuple[dict, list[dict]]:
    with open(MODLIST_JSON, encoding="utf-8") as f:
        data = json.load(f)
    return data, data["mods"]


def build_mod_rows(mods: list[dict]) -> list[dict]:
    rows = []
    missing = []
    for mod in mods:
        name = mod["name"]
        meta = MOD_META.get(name)
        if not meta:
            missing.append(name)
            item_type, description = "Mod", "Installed mod in the Randon One Block modpack."
        else:
            item_type, description = meta
        rows.append(
            {
                "modpack": MODPACK_NAME,
                "item": name,
                "item_type": item_type,
                "description": description,
                "version": mod.get("version", ""),
                "url": mod.get("url", ""),
            }
        )
    if missing:
        print("warning: missing metadata for:", ", ".join(missing), file=sys.stderr)
    rows.sort(
        key=lambda row: (
            TYPE_ORDER.index(row["item_type"]) if row["item_type"] in TYPE_ORDER else 99,
            row["item"].lower(),
        )
    )
    return rows


def render_html(data: dict, mod_rows: list[dict], item_data: dict) -> str:
    generated = data.get("generated", item_data.get("generated", ""))
    minecraft = data.get("minecraft", "")
    neoforge = data.get("neoforge", "")
    mod_count = data.get("mod_count", len(mod_rows))
    item_count = item_data["item_count"]
    craftable_count = item_data["craftable_count"]
    uncraftable_count = item_data["uncraftable_count"]

    type_counts: dict[str, int] = {}
    for row in mod_rows:
        type_counts[row["item_type"]] = type_counts.get(row["item_type"], 0) + 1

    mod_filter_buttons = "".join(
        f'<button type="button" class="filter-btn mod-filter" data-filter="{html.escape(t)}">{html.escape(t)} ({c})</button>'
        for t, c in sorted(
            type_counts.items(),
            key=lambda item: (TYPE_ORDER.index(item[0]) if item[0] in TYPE_ORDER else 99, item[0]),
        )
    )

    mod_table_rows = []
    for row in mod_rows:
        link = (
            f'<a href="{html.escape(row["url"])}" target="_blank" rel="noopener">{html.escape(row["item"])}</a>'
            if row["url"]
            else html.escape(row["item"])
        )
        mod_table_rows.append(
            "<tr>"
            f'<td class="modpack">{html.escape(row["modpack"])}</td>'
            f'<td class="item">{link}</td>'
            f'<td class="type"><span class="badge type-{html.escape(row["item_type"].lower().replace(" ", "-"))}">{html.escape(row["item_type"])}</span></td>'
            f'<td class="desc">{html.escape(row["description"])}</td>'
            f'<td class="ver">{html.escape(row["version"])}</td>'
            "</tr>"
        )

    item_type_counts = item_data["stats"]["by_type"]
    item_type_filter_options = "".join(
        f'<option value="{html.escape(item_type)}">{html.escape(item_type)} ({count})</option>'
        for item_type, count in sorted(
            item_type_counts.items(),
            key=lambda item: (ITEM_TYPE_ORDER.index(item[0]) if item[0] in ITEM_TYPE_ORDER else 99, item[0]),
        )
    )

    mod_name_options = "".join(
        f'<option value="{html.escape(mod_name)}">{html.escape(mod_name)} ({count})</option>'
        for mod_name, count in item_data["stats"]["by_mod"].items()
    )

    items_json = json.dumps(item_data["items"], ensure_ascii=False, separators=(",", ":"))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(MODPACK_NAME)} — Mod &amp; Item List</title>
  <style>
    :root {{
      --bg: #0f1419;
      --panel: #1a2332;
      --panel-2: #243044;
      --text: #e8eef7;
      --muted: #9db0c7;
      --accent: #6ec1ff;
      --border: #334155;
      --row-hover: #1f2b3d;
      --good: #7dffb2;
      --warn: #ffd27d;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(180deg, #0b1016 0%, var(--bg) 220px);
      color: var(--text);
      line-height: 1.5;
    }}
    .wrap {{ max-width: 1400px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }}
    header {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem 1.75rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
    }}
    h1 {{ margin: 0 0 .35rem; font-size: 1.9rem; }}
    .meta {{ color: var(--muted); font-size: .95rem; }}
    .meta strong {{ color: var(--text); }}
    .tabs {{
      display: flex;
      gap: .5rem;
      margin: 1rem 0 0;
      flex-wrap: wrap;
    }}
    .tab-btn {{
      border: 1px solid var(--border);
      background: var(--panel-2);
      color: var(--muted);
      border-radius: 10px;
      padding: .55rem 1rem;
      cursor: pointer;
      font-size: .95rem;
      font-weight: 600;
    }}
    .tab-btn.active {{
      color: var(--text);
      border-color: var(--accent);
      background: #1d3348;
    }}
    .panel {{ display: none; }}
    .panel.active {{ display: block; }}
    .toolbar {{
      display: flex;
      flex-wrap: wrap;
      gap: .65rem;
      align-items: center;
      margin: 1rem 0 1.25rem;
    }}
    .search, .select-filter {{
      padding: .7rem .9rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      font-size: 1rem;
    }}
    .search {{ flex: 1 1 240px; min-width: 220px; }}
    .select-filter {{ min-width: 180px; }}
    .filters {{ display: flex; flex-wrap: wrap; gap: .45rem; }}
    .filter-btn {{
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--muted);
      border-radius: 999px;
      padding: .35rem .75rem;
      cursor: pointer;
      font-size: .82rem;
    }}
    .filter-btn.active, .filter-btn:hover {{
      color: var(--text);
      border-color: var(--accent);
      background: var(--panel-2);
    }}
    .table-shell {{
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: var(--panel);
      box-shadow: 0 10px 30px rgba(0,0,0,.2);
    }}
    table {{ width: 100%; border-collapse: collapse; }}
    thead {{ background: var(--panel-2); position: sticky; top: 0; z-index: 1; }}
    th, td {{ padding: .85rem 1rem; text-align: left; vertical-align: top; }}
    th {{
      font-size: .78rem;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }}
    tbody tr {{ border-bottom: 1px solid rgba(51,65,85,.55); }}
    tbody tr:hover {{ background: var(--row-hover); }}
    tbody tr.hidden {{ display: none; }}
    .item a {{ color: var(--accent); text-decoration: none; font-weight: 600; }}
    .item a:hover {{ text-decoration: underline; }}
    .desc {{ color: #d7e3f3; max-width: 40rem; }}
    .ver, .id-cell {{
      color: var(--muted);
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: .82rem;
    }}
    .badge {{
      display: inline-block;
      padding: .18rem .55rem;
      border-radius: 999px;
      font-size: .76rem;
      font-weight: 600;
      border: 1px solid transparent;
      white-space: nowrap;
    }}
    .type-skyblock {{ background: #123047; color: #8fd0ff; border-color: #2d5f86; }}
    .type-custom {{ background: #3a1f4d; color: #e2b4ff; border-color: #6a3f88; }}
    .type-scripting {{ background: #2d3a17; color: #d6f08f; border-color: #5f7a2d; }}
    .type-content {{ background: #3a2414; color: #ffc58d; border-color: #8a5528; }}
    .type-automation {{ background: #14352f; color: #8ef0d8; border-color: #2d7a68; }}
    .type-storage {{ background: #1c2f4a; color: #a8c7ff; border-color: #3f5f95; }}
    .type-utility {{ background: #2a2f18; color: #e0e58a; border-color: #666f2f; }}
    .type-quality-of-life {{ background: #1f2f45; color: #b8d7ff; border-color: #47688f; }}
    .type-integration {{ background: #2f1f45; color: #d2b6ff; border-color: #60458a; }}
    .type-performance {{ background: #3a1717; color: #ffb0b0; border-color: #8a3a3a; }}
    .type-world-generation {{ background: #173126; color: #9be0c0; border-color: #2f6a52; }}
    .type-library {{ background: #242424; color: #c7c7c7; border-color: #555; }}
    .type-mod {{ background: #2a2a2a; color: #ddd; border-color: #666; }}
    .type-block {{ background: #1c2f4a; color: #a8c7ff; border-color: #3f5f95; }}
    .type-item {{ background: #2a2f18; color: #e0e58a; border-color: #666f2f; }}
    .type-building-block {{ background: #2f2418; color: #ffd9a8; border-color: #7a5a2f; }}
    .type-machine-block {{ background: #14352f; color: #8ef0d8; border-color: #2d7a68; }}
    .type-material {{ background: #3a2414; color: #ffc58d; border-color: #8a5528; }}
    .type-weapon-tool {{ background: #3a1717; color: #ffb0b0; border-color: #8a3a3a; }}
    .type-armor {{ background: #1f2f45; color: #b8d7ff; border-color: #47688f; }}
    .type-crop-seed {{ background: #173126; color: #9be0c0; border-color: #2f6a52; }}
    .type-component {{ background: #2d3a17; color: #d6f08f; border-color: #5f7a2d; }}
    .type-consumable {{ background: #3a1f4d; color: #e2b4ff; border-color: #6a3f88; }}
    .type-fluid-container {{ background: #123047; color: #8fd0ff; border-color: #2d5f86; }}
    .type-book-guide {{ background: #2f1f45; color: #d2b6ff; border-color: #60458a; }}
    .type-decorative {{ background: #2f2418; color: #ffd9a8; border-color: #7a5a2f; }}
    .type-spawn-egg {{ background: #3a1f4d; color: #e2b4ff; border-color: #6a3f88; }}
    .avail-craftable {{ background: #123a2a; color: var(--good); border-color: #2d7a52; }}
    .avail-uncraftable {{ background: #3a2c12; color: var(--warn); border-color: #7a5c22; }}
    .pager {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
      color: var(--muted);
      flex-wrap: wrap;
    }}
    .pager button {{
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
      border-radius: 8px;
      padding: .45rem .85rem;
      cursor: pointer;
    }}
    .pager button:disabled {{ opacity: .45; cursor: not-allowed; }}
    footer {{ margin-top: 1rem; color: var(--muted); font-size: .85rem; }}
    @media (max-width: 900px) {{
      .ver, th.ver, td.ver, .id-cell, th.id-col, td.id-col {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>{html.escape(MODPACK_NAME)}</h1>
      <p class="meta">
        <strong>Minecraft</strong> {html.escape(minecraft)} ·
        <strong>NeoForge</strong> {html.escape(neoforge)} ·
        <strong>Mods</strong> {mod_count} ·
        <strong>Items &amp; Blocks</strong> {item_count} ·
        <strong>Generated</strong> {html.escape(generated)}
      </p>
      <p class="meta">Format: <strong>Modpack</strong> · <strong>Item</strong> · <strong>Item Type</strong> · <strong>Description</strong></p>
      <div class="tabs">
        <button type="button" class="tab-btn active" data-tab="mods">Mods ({mod_count})</button>
        <button type="button" class="tab-btn" data-tab="items">Items &amp; Blocks ({item_count})</button>
      </div>
    </header>

    <section id="mods-panel" class="panel active">
      <div class="toolbar">
        <input id="mod-search" class="search" type="search" placeholder="Search mods, types, or descriptions..." aria-label="Search mods">
        <div class="filters">
          <button type="button" class="filter-btn mod-filter active" data-filter="all">All ({mod_count})</button>
          {mod_filter_buttons}
        </div>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Modpack</th>
              <th>Item</th>
              <th>Item Type</th>
              <th>Description</th>
              <th class="ver">Version</th>
            </tr>
          </thead>
          <tbody id="mod-rows">
            {"".join(mod_table_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <section id="items-panel" class="panel">
      <div class="toolbar">
        <input id="item-search" class="search" type="search" placeholder="Search item names, mods, ids, types, or descriptions..." aria-label="Search items">
        <select id="item-mod-filter" class="select-filter" aria-label="Filter by mod">
          <option value="all">All mods</option>
          {mod_name_options}
        </select>
        <select id="item-type-filter" class="select-filter" aria-label="Filter by item type">
          <option value="all">All item types</option>
          {item_type_filter_options}
        </select>
        <select id="item-avail-filter" class="select-filter" aria-label="Filter by craftability">
          <option value="all">Craftable + Uncraftable</option>
          <option value="Craftable">Craftable ({craftable_count})</option>
          <option value="Uncraftable">Uncraftable ({uncraftable_count})</option>
        </select>
      </div>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Modpack</th>
              <th>Mod</th>
              <th>Item</th>
              <th>Item Type</th>
              <th>Craftable</th>
              <th>Description</th>
              <th class="id-col">ID</th>
            </tr>
          </thead>
          <tbody id="item-rows"></tbody>
        </table>
      </div>
      <div class="pager">
        <button type="button" id="item-prev">Previous</button>
        <span id="item-page-info"></span>
        <button type="button" id="item-next">Next</button>
      </div>
    </section>

    <footer>
      Sources: <code>modlist.json</code>, installed mod JAR lang/recipe data, <code>kubejs/</code> pack recipes ·
      Regenerate with <code>python3 scripts/generate-modlist-html.py</code>
    </footer>
  </div>

  <script id="item-data" type="application/json">{items_json}</script>
  <script>
    const PAGE_SIZE = {ITEMS_PAGE_SIZE};
    const allItems = JSON.parse(document.getElementById('item-data').textContent);
    let filteredItems = allItems.slice();
    let itemPage = 0;

    const tabButtons = [...document.querySelectorAll('.tab-btn')];
    const panels = {{
      mods: document.getElementById('mods-panel'),
      items: document.getElementById('items-panel'),
    }};

    tabButtons.forEach((btn) => {{
      btn.addEventListener('click', () => {{
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        Object.values(panels).forEach((panel) => panel.classList.remove('active'));
        panels[btn.dataset.tab].classList.add('active');
      }});
    }});

    const modSearch = document.getElementById('mod-search');
    const modRows = [...document.querySelectorAll('#mod-rows tr')];
    const modButtons = [...document.querySelectorAll('.mod-filter')];
    let activeModFilter = 'all';

    function applyModFilters() {{
      const q = modSearch.value.trim().toLowerCase();
      modRows.forEach((row) => {{
        const type = row.querySelector('.type .badge')?.textContent.trim() || '';
        const matchesType = activeModFilter === 'all' || type === activeModFilter;
        const matchesSearch = !q || row.textContent.toLowerCase().includes(q);
        row.classList.toggle('hidden', !(matchesType && matchesSearch));
      }});
    }}

    modSearch.addEventListener('input', applyModFilters);
    modButtons.forEach((btn) => {{
      btn.addEventListener('click', () => {{
        modButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeModFilter = btn.dataset.filter;
        applyModFilters();
      }});
    }});

    const itemSearch = document.getElementById('item-search');
    const itemModFilter = document.getElementById('item-mod-filter');
    const itemTypeFilter = document.getElementById('item-type-filter');
    const itemAvailFilter = document.getElementById('item-avail-filter');
    const itemRows = document.getElementById('item-rows');
    const itemPrev = document.getElementById('item-prev');
    const itemNext = document.getElementById('item-next');
    const itemPageInfo = document.getElementById('item-page-info');

    function slugType(value) {{
      return value.toLowerCase().replace(/[\\/]/g, '-').replace(/\\s+/g, '-');
    }}

    function escapeHtml(value) {{
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }}

    function applyItemFilters() {{
      const q = itemSearch.value.trim().toLowerCase();
      const mod = itemModFilter.value;
      const type = itemTypeFilter.value;
      const avail = itemAvailFilter.value;
      filteredItems = allItems.filter((row) => {{
        const haystack = [
          row.modpack, row.mod, row.item, row.item_type, row.availability, row.description, row.id,
        ].join(' ').toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (mod !== 'all' && row.mod !== mod) return false;
        if (type !== 'all' && row.item_type !== type) return false;
        if (avail !== 'all' && row.availability !== avail) return false;
        return true;
      }});
      itemPage = 0;
      renderItemPage();
    }}

    function renderItemPage() {{
      const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
      if (itemPage >= totalPages) itemPage = totalPages - 1;
      const start = itemPage * PAGE_SIZE;
      const pageItems = filteredItems.slice(start, start + PAGE_SIZE);
      itemRows.innerHTML = pageItems.map((row) => `
        <tr>
          <td>${{escapeHtml(row.modpack)}}</td>
          <td>${{escapeHtml(row.mod)}}</td>
          <td class="item">${{escapeHtml(row.item)}}</td>
          <td class="type"><span class="badge type-${{slugType(row.item_type)}}">${{escapeHtml(row.item_type)}}</span></td>
          <td><span class="badge avail-${{row.availability.toLowerCase()}}">${{escapeHtml(row.availability)}}</span></td>
          <td class="desc">${{escapeHtml(row.description)}}</td>
          <td class="id-cell">${{escapeHtml(row.id)}}</td>
        </tr>
      `).join('');
      itemPageInfo.textContent = `Showing ${{filteredItems.length ? start + 1 : 0}}–${{Math.min(start + PAGE_SIZE, filteredItems.length)}} of ${{filteredItems.length}} · page ${{itemPage + 1}} / ${{totalPages}}`;
      itemPrev.disabled = itemPage === 0;
      itemNext.disabled = itemPage >= totalPages - 1;
    }}

    [itemSearch, itemModFilter, itemTypeFilter, itemAvailFilter].forEach((el) => {{
      el.addEventListener('input', applyItemFilters);
      el.addEventListener('change', applyItemFilters);
    }});
    itemPrev.addEventListener('click', () => {{ itemPage -= 1; renderItemPage(); }});
    itemNext.addEventListener('click', () => {{ itemPage += 1; renderItemPage(); }});

    applyItemFilters();
  </script>
</body>
</html>
"""


def resolve_mods_dir(instance: str | None = None) -> pathlib.Path:
    if instance:
        instance_path = pathlib.Path(instance)
        return instance_path / "mods" if instance_path.is_dir() and not instance_path.name == "mods" else instance_path
    env_instance = os.environ.get("MODLIST_INSTANCE", "").strip()
    if env_instance:
        instance_path = pathlib.Path(env_instance)
        return instance_path / "mods"
    return DEFAULT_INSTANCE


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate modlist.html and modlist-items.json")
    parser.add_argument(
        "--instance",
        help="CurseForge instance folder (defaults to MODLIST_INSTANCE env or playtest instance)",
    )
    args = parser.parse_args()

    mods_dir = resolve_mods_dir(args.instance)
    if not mods_dir.is_dir():
        raise SystemExit(f"error: mods directory not found: {mods_dir}")

    data, mods = load_mods()
    mod_rows = build_mod_rows(mods)
    item_data = extract_items(REPO, mods_dir, MODPACK_NAME)

    with open(ITEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(item_data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    OUTPUT_HTML.write_text(render_html(data, mod_rows, item_data), encoding="utf-8")
    print(f"wrote {OUTPUT_HTML} ({len(mod_rows)} mods, {item_data['item_count']} items)")
    print(f"wrote {ITEMS_JSON}")
    print(f"source mods: {mods_dir}")


if __name__ == "__main__":
    main()