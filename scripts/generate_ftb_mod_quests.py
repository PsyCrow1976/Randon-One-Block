#!/usr/bin/env python3
"""Generate FTB Quest chapters (one per mod) from installed mod recipe data."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import zipfile
from collections import defaultdict

REPO = pathlib.Path(__file__).resolve().parents[1]
QUESTS_DIR = REPO / "config/ftbquests/quests"
CHAPTERS_DIR = QUESTS_DIR / "chapters"
LANG_CHAPTERS_DIR = QUESTS_DIR / "lang/en_us/chapters"
LANG_CHAPTER_FILE = QUESTS_DIR / "lang/en_us/chapter.json5"
DEFAULT_INSTANCE = pathlib.Path(
    "/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block"
)

GRID_COLS = 8
XP_REWARD = 10

CHAPTER_DEFS = [
    {
        "filename": "ender_io",
        "namespace": "enderio",
        "title": "Ender IO",
        "icon": "enderio:alloy_smelter",
        "order_index": 10,
        "seed": "chapter:enderio",
    },
    {
        "filename": "cooking_for_blockheads",
        "namespace": "cookingforblockheads",
        "title": "Cooking for Blockheads",
        "icon": "cookingforblockheads:cow_jar",
        "order_index": 11,
        "seed": "chapter:cookingforblockheads",
    },
    {
        "filename": "refined_storage",
        "namespace": "refinedstorage",
        "title": "Refined Storage",
        "icon": "refinedstorage:controller",
        "order_index": 12,
        "seed": "chapter:refinedstorage",
    },
    {
        "filename": "powah",
        "namespace": "powah",
        "title": "Powah",
        "icon": "powah:energy_cell_starter",
        "order_index": 13,
        "seed": "chapter:powah",
    },
    {
        "filename": "baubley_heart_canisters",
        "namespace": "bhc",
        "title": "Baubley Heart Canisters",
        "icon": "bhc:red_heart_canister",
        "order_index": 15,
        "seed": "chapter:bhc",
    },
    {
        "filename": "bbl_utility",
        "namespace": "utility",
        "title": "BBL Utility",
        "icon": "utility:block_breaker",
        "order_index": 16,
        "seed": "chapter:utility",
    },
    {
        "filename": "mystical_agriculture",
        "namespace": "mysticalagriculture",
        "title": "Mystical Agriculture",
        "icon": "mysticalagriculture:inferium_essence",
        "order_index": 19,
        "seed": "chapter:mysticalagriculture",
    },
    {
        "filename": "mystical_agradditions",
        "namespace": "mysticalagradditions",
        "title": "Mystical Agradditions",
        "icon": "mysticalagradditions:inferium_apple",
        "order_index": 20,
        "seed": "chapter:mysticalagradditions",
    },
    {
        "filename": "mystical_automation",
        "namespace": "mysticalautomation",
        "title": "Mystical Automation",
        "icon": "mysticalautomation:farmer",
        "order_index": 21,
        "seed": "chapter:mysticalautomation",
    },
    {
        "filename": "mystical_agriculture_tiered_crystals",
        "namespace": "matc",
        "title": "Mystical Agriculture Tiered Crystals",
        "icon": "matc:inferium_crystal",
        "order_index": 22,
        "seed": "chapter:matc",
    },
]

TITLE_KEYWORDS: list[tuple[str, list[str]]] = [
    (r"conduit", ["Conduit Your Enthusiasm", "Pipe Dreams Incorporated", "Fluid Motion Sickness"]),
    (r"capacitor|battery|cell", ["Watt Could Go Wrong?", "Stored Thunder", "Charge It to the Block"]),
    (r"sag|mill", ["Sag Off", "Millennials", "Grind Set Activated"]),
    (r"alloy|smelt|furnace", ["Smelt With the Times", "Hot Take", "Forge Ahead"]),
    (r"heart|canister", ["Heartware Update", "Extra Life DLC", "Tank Your Healthbar"]),
    (r"seed|crop|essence", ["Seed Me the Details", "Crop Circles Anonymous", "Essence of the Point"]),
    (r"market|fertilizer", ["Stock Market Garden", "Buy the Farm", "Fertilizer of Truth"]),
    (r"stick|wand", ["Stick It to the Island", "Wand-erlust", "Reach for the Stars"]),
    (r"storage|disk|drive|grid", ["Byte Me", "Disk Jockey", "Grid and Bear It"]),
    (r"dark|evil|wither", ["Dark Humor Only", "Shady Business", "Void Where Prohibited"]),
    (r"cook|kitchen|food|oven", ["Chef's Kiss", "Kitchen Sync", "Well Done"]),
    (r"powah|energ", ["Power Trip", "Current Events", "Watt's Up"]),
    (r"spawner|mob", ["Spawn Campers Anonymous", "Mob Mentality", "Respawnables"]),
    (r"upgrade|augment", ["Upgrade Season", "Patch Notes IRL", "Buff My Block"]),
]

FALLBACK_TITLES = [
    "{short}? In This Economy?",
    "Certified {short} Moment",
    "The {short} Situation",
    "Bold Move: {short}",
    "Island Approved {short}",
    "{short} Speedrun Any%",
]

MOD_FLAVOR = {
    "enderio": "Ender IO turns your skyblock into a cable-strewn factory. Conduits, capacitors, and machines love a flat island with room to expand.",
    "cookingforblockheads": "Cooking for Blockheads lets you build a real kitchen instead of starving next to a dirt cube. Fridges, ovens, and cow jars are your friends.",
    "refinedstorage": "Refined Storage is digital hoarding done right — disks, grids, and autocrafting for when your random block vomits ingredients faster than you can sort them.",
    "powah": "Powah generates and stores FE for everything else on the island. Start small, dream of nitro cells, pretend you planned the cable route.",
    "bhc": "Baubley Heart Canisters permanently raise your max health when worn in Curios slots. More hearts = more forgiveness when you fall off the island.",
    "utility": "BBL Utility adds practical helper items and blocks for pack builders and players who want tools that just work on skyblock.",
    "mysticalagriculture": "Mystical Agriculture lets you grow resources from seeds. Plant inferium, escalate through tiers, and turn crops into crafting materials.",
    "mysticalagradditions": "Mystical Agradditions is the endgame layer on top of Mystical Agriculture — higher tiers, extras, and chase items for dedicated farmers.",
    "mysticalautomation": "Mystical Automation connects MA crops to machines and automation blocks so you can stop right-clicking every plant by hand.",
    "matc": "Mystical Agriculture Tiered Crystals adds growth accelerators and crystals to speed up crop tiers — less waiting, more essence.",
}

RECIPE_HINTS = {
    "minecraft:crafting_shaped": "Craft it in a shaped pattern — open JEI and search the item for the exact grid layout.",
    "minecraft:crafting_shapeless": "Shapeless crafting recipe — ingredients can sit anywhere in the grid.",
    "minecraft:smelting": "Smelt the ingredients in a furnace or powered smelter.",
    "minecraft:blasting": "Blast furnace recipe — faster for ores and metals.",
    "minecraft:smithing": "Smithing table upgrade — base item plus template/material.",
    "minecraft:stonecutting": "Stonecutter recipe — efficient block conversion.",
    "farmingforblockheads:market": "Buy this from a Farming for Blockheads Market block — place the market, open it, and look in the matching tab.",
    "exdeorum:sieve": "Sieve recipe — drop blocks through a mesh in Ex Deorum.",
    "exdeorum:hammer": "Hammer recipe — crush blocks with an Ex Deorum hammer.",
    "exdeorum:compressed_sieve": "Compressed sieve recipe — higher-tier mesh processing.",
    "enderio:sag_milling": "Sag Mill recipe — grind items in an Ender IO Sag Mill for bonus outputs.",
    "enderio:alloy_smelting": "Alloy Smelter recipe — combine ingredients with energy in an Alloy Smelter.",
    "enderio:enchanter": "Enchanter recipe — Ender IO machine crafting with enchantment flavor.",
    "refinedstorage:refinery": "Refinery recipe — process materials in Refined Storage machines.",
    "powah:energizing": "Powah Energizing Rod recipe — combine items with energy blast.",
    "mysticalagriculture:infusion": "Infusion altar recipe — place pedestals, supplies, and essence around the altar.",
    "mysticalagriculture:reprocessor": "Seed Reprocessor recipe — recycle crops into essence.",
    "mysticalagriculture:awakening": "Awakening altar recipe — late-tier MA crafting.",
    "mysticalagriculture:enchanter": "Imbuing Station / enchanter recipe for MA gear.",
    "mysticalagriculture:soul_extractor": "Soul Extractor recipe — extract souls from mobs or items.",
}


def make_id(*parts: str) -> str:
    payload = "randon-one-block-ftb|" + "|".join(parts)
    return hashlib.sha1(payload.encode()).hexdigest()[:16].upper()


def pick_index(seed: str, size: int) -> int:
    return int(make_id(seed, "pick"), 16) % size


def resolve_mods_dir(instance: str | None = None) -> pathlib.Path:
    if instance:
        instance_path = pathlib.Path(instance)
        return instance_path / "mods" if instance_path.name != "mods" else instance_path
    env_instance = os.environ.get("MODLIST_INSTANCE", "").strip()
    if env_instance:
        return pathlib.Path(env_instance) / "mods"
    return DEFAULT_INSTANCE / "mods"


def load_installed_mod_ids(mods_dir: pathlib.Path) -> set[str]:
    installed: set[str] = set()
    for jar_path in mods_dir.glob("*.jar"):
        with zipfile.ZipFile(jar_path) as zf:
            toml_name = next(
                (name for name in ("META-INF/neoforge.mods.toml", "META-INF/mods.toml") if name in zf.namelist()),
                None,
            )
            if not toml_name:
                continue
            text = zf.read(toml_name).decode("utf-8", errors="replace")
            for match in re.finditer(r'modId\s*=\s*"([^"]+)"', text):
                installed.add(match.group(1))
    return installed


def load_lang_data(mods_dir: pathlib.Path) -> tuple[dict[str, str], dict[str, str]]:
    names: dict[str, str] = {}
    descriptions: dict[str, str] = {}
    for jar_path in mods_dir.glob("*.jar"):
        with zipfile.ZipFile(jar_path) as zf:
            for name in zf.namelist():
                if not name.endswith("/lang/en_us.json"):
                    continue
                try:
                    lang = json.loads(zf.read(name))
                except json.JSONDecodeError:
                    continue
                for key, value in lang.items():
                    if not isinstance(value, str):
                        continue
                    if key.endswith(".desc") or key.endswith(".description"):
                        base = key.rsplit(".", 1)[0]
                        descriptions[base] = value
                        continue
                    if key.startswith("item.") or key.startswith("block."):
                        kind, rest = key.split(".", 1)
                        if "." not in rest:
                            continue
                        namespace, path = rest.split(".", 1)
                        names[f"{namespace}:{path}"] = value
    return names, descriptions


def recipe_result(raw: dict) -> str | None:
    result = raw.get("result")
    if result is None:
        return None
    if isinstance(result, str):
        return result if ":" in result else None
    if isinstance(result, dict):
        rid = result.get("id") or result.get("item")
        return str(rid) if rid and ":" in str(rid) else None
    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, dict):
            rid = first.get("id") or first.get("item")
            return str(rid) if rid and ":" in str(rid) else None
        if isinstance(first, str) and ":" in first:
            return first
    return None


def recipe_conditions_ok(raw: dict, installed: set[str]) -> bool:
    conditions = raw.get("neoforge:conditions") or raw.get("conditions") or []
    for condition in conditions:
        ctype = condition.get("type", "")
        if ctype.endswith("mod_loaded"):
            mod = condition.get("modid") or condition.get("mod")
            if mod and mod not in installed and mod not in {"minecraft", "neoforge", "forge"}:
                return False
    return True


def collect_recipes(namespace: str, installed: set[str], mods_dir: pathlib.Path) -> dict[str, set[str]]:
    items: dict[str, set[str]] = defaultdict(set)
    for jar_path in mods_dir.glob("*.jar"):
        with zipfile.ZipFile(jar_path) as zf:
            for name in zf.namelist():
                if not name.startswith(f"data/{namespace}/recipe/") or not name.endswith(".json"):
                    continue
                if "advancement" in name:
                    continue
                try:
                    raw = json.loads(zf.read(name))
                except json.JSONDecodeError:
                    continue
                if not isinstance(raw, dict) or "type" not in raw:
                    continue
                if not recipe_conditions_ok(raw, installed):
                    continue
                rid = recipe_result(raw)
                if rid:
                    items[rid].add(raw["type"])
    return items


def pretty_name(item_id: str, names: dict[str, str]) -> str:
    if item_id in names:
        return names[item_id]
    return item_id.split(":", 1)[-1].replace("_", " ").title()


def short_name(display: str) -> str:
    words = display.split()
    if len(words) <= 3:
        return display
    return " ".join(words[:3])


def funny_title(item_id: str, display: str) -> str:
    path = item_id.split(":", 1)[-1].lower()
    for pattern, options in TITLE_KEYWORDS:
        if re.search(pattern, path):
            pick = options[pick_index(item_id + "|title", len(options))]
            return pick.replace("{short}", short_name(display))
    template = FALLBACK_TITLES[pick_index(item_id + "|fallback", len(FALLBACK_TITLES))]
    return template.format(short=short_name(display))


def infer_category(path: str) -> str:
    lowered = path.lower()
    if any(x in lowered for x in ("sword", "axe", "pickaxe", "shovel", "hoe", "bow")):
        return "tool or weapon"
    if any(x in lowered for x in ("helmet", "chestplate", "leggings", "boots", "armor")):
        return "armor piece"
    if any(x in lowered for x in ("seed", "crop", "essence")):
        return "farming resource"
    if any(x in lowered for x in ("machine", "furnace", "generator", "grid", "conduit")):
        return "machine or automation block"
    if "block" in lowered or lowered.endswith("_bricks"):
        return "building block"
    return "item"


def build_description(
    item_id: str,
    display: str,
    namespace: str,
    recipe_types: set[str],
    names: dict[str, str],
    descriptions: dict[str, str],
) -> list[str]:
    path = item_id.split(":", 1)[-1]
    item_ns = item_id.split(":", 1)[0]
    base_keys = [f"item.{item_ns}.{path}", f"block.{item_ns}.{path}"]
    lines: list[str] = []

    if item_ns != namespace:
        lines.append(
            f"{display} — crafted or obtained through a {MOD_FLAVOR.get(namespace, namespace)} recipe chain "
            f"(registry id: {item_id})."
        )
    else:
        article = "an" if display[:1].lower() in "aeiou" else "a"
        lines.append(
            f"{display} — {article} {infer_category(path)} from the {CHAPTER_BY_NS[namespace]['title']} mod."
        )

    for key in base_keys:
        if key in descriptions:
            lines.extend(["", descriptions[key]])
            break

    lines.extend(["", MOD_FLAVOR.get(namespace, "")])

    hints = []
    for recipe_type in sorted(recipe_types):
        hint = RECIPE_HINTS.get(recipe_type)
        if hint and hint not in hints:
            hints.append(hint)
    if hints:
        lines.extend(["", "How to make it:", *[f"• {hint}" for hint in hints[:3]]])
    else:
        lines.extend(["", "How to make it:", "• Open JEI, search this item, and follow the recipe shown for your setup."])

    if item_ns == "minecraft":
        lines.extend(
            [
                "",
                "Vanilla item — still counts because this mod's recipe or market entry is how skyblock players are expected to get it.",
            ]
        )

    lines.extend(
        [
            "",
            "Skyblock tip: your random center block may eventually roll the parts — stash duplicates in storage until you have the full recipe.",
        ]
    )
    return lines


def json5_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("&", "\\&")


def write_chapter_file(defn: dict, quests: list[dict]) -> None:
    chapter_id = make_id(defn["seed"], "chapter")
    lines = [
        "{",
        f'  id: "{chapter_id}",',
        '  group: "",',
        f"  order_index: {defn['order_index']},",
        "  icon: {",
        f'    id: "{defn["icon"]}",',
        "    count: 1,",
        "  },",
        f'  filename: "{defn["filename"]}",',
        '  default_quest_shape: "",',
        "  default_hide_dependency_lines: false,",
        "  quests: [",
    ]
    for quest in quests:
        lines.extend(
            [
                "    {",
                "      icon: {",
                f'        id: "{quest["item_id"]}",',
                "        count: 1,",
                "      },",
                f"      x: {quest['x']},",
                f"      y: {quest['y']},",
                f'      id: "{quest["quest_id"]}",',
                "      tasks: [",
                "        {",
                f'          id: "{quest["task_id"]}",',
                '          type: "item",',
                "          item: {",
                f'            id: "{quest["item_id"]}",',
                "            count: 1,",
                "          },",
                "        },",
                "      ],",
                "      rewards: [",
                "        {",
                f'          id: "{quest["reward_id"]}",',
                '          type: "xp",',
                f"          xp: {XP_REWARD},",
                "        },",
                "      ],",
                "    },",
            ]
        )
    lines.extend(["  ],", "  quest_links: [],", "  images: [],", "}", ""])
    out = CHAPTERS_DIR / f"{defn['filename']}.json5"
    out.write_text("\n".join(lines), encoding="utf-8")
    defn["chapter_id"] = chapter_id


def write_lang_file(defn: dict, lang_entries: dict[str, object]) -> None:
    out = LANG_CHAPTERS_DIR / f"{defn['filename']}.json5"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(lang_entries, f, indent=2, ensure_ascii=False)
        f.write("\n")


def generate_chapter(
    defn: dict,
    installed: set[str],
    names: dict[str, str],
    descriptions: dict[str, str],
    mods_dir: pathlib.Path,
) -> tuple[int, dict[str, object]]:
    namespace = defn["namespace"]
    recipe_map = collect_recipes(namespace, installed, mods_dir)
    item_ids = sorted(recipe_map)
    quests = []
    lang_entries: dict[str, object] = {}

    for index, item_id in enumerate(item_ids):
        col = index % GRID_COLS
        row = index // GRID_COLS
        display = pretty_name(item_id, names)
        quest_id = make_id(defn["seed"], "quest", item_id)
        task_id = make_id(defn["seed"], "task", item_id)
        reward_id = make_id(defn["seed"], "reward", item_id)
        quests.append(
            {
                "item_id": item_id,
                "quest_id": quest_id,
                "task_id": task_id,
                "reward_id": reward_id,
                "x": round(col * 1.5, 1),
                "y": round(row * 1.5, 1),
            }
        )
        title = funny_title(item_id, display)
        lang_entries[f"quest.{quest_id}.title"] = title
        lang_entries[f"quest.{quest_id}.quest_subtitle"] = f"Craft or obtain {display}"
        lang_entries[f"quest.{quest_id}.quest_desc"] = build_description(
            item_id, display, namespace, recipe_map[item_id], names, descriptions
        )
        lang_entries[f"task.{task_id}.title"] = f"Obtain {display}"

    write_chapter_file(defn, quests)
    write_lang_file(defn, lang_entries)
    return len(quests), lang_entries


CHAPTER_BY_NS = {d["namespace"]: d for d in CHAPTER_DEFS}


def load_chapter_titles() -> dict[str, str]:
    text = re.sub(r",(\s*})", r"\1", LANG_CHAPTER_FILE.read_text(encoding="utf-8"))
    return json.loads(text)


def update_chapter_titles(new_defs: list[dict]) -> None:
    text = LANG_CHAPTER_FILE.read_text(encoding="utf-8")
    existing = load_chapter_titles()
    ordered_keys = re.findall(r'"([^"]+)"\s*:', text)
    for defn in new_defs:
        chapter_id = defn["chapter_id"]
        key = f"chapter.{chapter_id}.title"
        existing[key] = defn["title"]
        if key not in ordered_keys:
            ordered_keys.append(key)
    lines = ["{"]
    for index, key in enumerate(ordered_keys):
        if key not in existing:
            continue
        comma = "," if index < len(ordered_keys) - 1 else ""
        value = json.dumps(existing[key], ensure_ascii=False)
        lines.append(f'  {json.dumps(key, ensure_ascii=False)}: {value}{comma}')
    lines.append("}")
    LANG_CHAPTER_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate FTB Quest chapters from mod recipe data")
    parser.add_argument(
        "--instance",
        help="CurseForge instance folder (defaults to MODLIST_INSTANCE env or playtest instance)",
    )
    args = parser.parse_args()

    mods_dir = resolve_mods_dir(args.instance)
    if not mods_dir.is_dir():
        raise SystemExit(f"error: mods directory not found: {mods_dir}")

    installed = load_installed_mod_ids(mods_dir)
    names, descriptions = load_lang_data(mods_dir)
    CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)
    LANG_CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    for defn in CHAPTER_DEFS:
        count, _ = generate_chapter(defn, installed, names, descriptions, mods_dir)
        total += count
        print(f"{defn['title']}: {count} quests -> {defn['filename']}.json5")

    update_chapter_titles(CHAPTER_DEFS)
    print(f"done: {len(CHAPTER_DEFS)} chapters, {total} quests (no dependencies — link manually)")
    print(f"source mods: {mods_dir}")


if __name__ == "__main__":
    main()