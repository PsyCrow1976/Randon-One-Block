"""Extract modpack items/blocks from installed mod JARs and pack data."""

from __future__ import annotations

import json
import pathlib
import re
import zipfile
from collections import defaultdict
from datetime import date

DEFAULT_INSTANCE = pathlib.Path(
    "/home/christer/Documents/curseforge/minecraft/Instances/Modded Randon One Block/mods"
)

SUBTYPE_RULES: list[tuple[str, str]] = [
    (r"(sword|axe|pickaxe|shovel|hoe|paxel|hammer|knife|dagger|mace|bow|crossbow|trident)", "Weapon/Tool"),
    (r"(helmet|chestplate|leggings|boots|armor|shield)", "Armor"),
    (r"(seed|sapling|crop|essence|sprout)", "Crop/Seed"),
    (r"(ore|ingot|nugget|gem|crystal|dust|shard|chunk|clump)", "Material"),
    (
        r"(furnace|machine|generator|motor|capacitor|conduit|cable|pipe|tank|grid|controller|"
        r"interface|constructor|processor|compressor|alloy|smelter|sieve|barrel|crucible|"
        r"infuser|enchanter|spawner|upgrade)",
        "Machine/Block",
    ),
    (r"(bucket|bottle|cell|fluid)", "Fluid Container"),
    (r"(spawn_egg|egg)", "Spawn Egg"),
    (r"(potion|elixir|brew|flask|bandage)", "Consumable"),
    (r"(book|tome|manual|guide|chronicle)", "Book/Guide"),
    (r"(backpack|chest|barrel|storage|disk|drive|cell|tank|crate|pouch|bag)", "Storage"),
    (
        r"(stairs|slab|wall|fence|door|trapdoor|button|pressure_plate|plate|pillar|brick|block|"
        r"planks|log|wood|stone|glass|wool|concrete|terracotta|leaves|sand|gravel|dirt|grass|"
        r"deepslate|netherrack|obsidian)",
        "Building Block",
    ),
    (r"(banner|rune|pattern)", "Decorative"),
    (r"(upgrade|module|component|plate|gear|circuit|coil|rod|wire|plate)", "Component"),
]

NS_ALIASES = {
    "apothic_attributes": "Apothic Attributes",
    "apothic_enchanting": "Apothic Enchanting",
    "apothic_spawners": "Apothic Spawners",
    "baubleyheartcanisters": "Baubley Heart Canisters",
    "bblcore": "BBL Core",
    "crafting_on_a_stick": "Crafting on a stick",
    "easy_piglins": "Easy Piglins",
    "easy_villagers": "Easy Villagers",
    "ftbchunks": "FTB Chunks (NeoForge)",
    "ftbessentials": "FTB Essentials (Forge & Fabric)",
    "ftblibrary": "FTB Library (NeoForge)",
    "ftbquests": "FTB Quests (NeoForge)",
    "ftbteams": "FTB Teams (NeoForge)",
    "ftbxmodcompat": "FTB XMod Compat",
    "fzzy_config": "Fzzy Config",
    "gateways": "Gateways to Eternity",
    "gravestone": "GraveStone Mod",
    "guideme": "GuideME",
    "haven_skyblock_builder": "Haven Skyblock Builder",
    "ironfurnaces": "Iron Furnaces (Fabric & NeoForge)",
    "jeresources": "Just Enough Resources (JER)",
    "mysticalagriculture": "Mystical Agriculture",
    "mysticalagradditions": "Mystical Agradditions",
    "mysticalautomation": "Mystical Automation",
    "pigpen": "Pig Pen Cipher",
    "refinedstorage_jei_integration": "Refined Storage - JEI Integration",
    "simplest_paxels": "Simplest Paxels",
    "sophisticatedbackpacks": "Sophisticated Backpacks",
    "sophisticatedcore": "Sophisticated Core",
    "sophisticatedstorage": "Sophisticated Storage",
    "uncraftingtable": "The Uncrafting Table",
    "voicechat": "Simple Voice Chat",
}


def parse_mods_toml(text: str) -> list[tuple[str, str]]:
    mods: list[tuple[str, str]] = []
    for block in text.split("[[mods]]")[1:]:
        mod_id = None
        display = None
        for line in block.splitlines():
            stripped = line.strip()
            if stripped.startswith("modId"):
                mod_id = stripped.split("=", 1)[1].strip().strip('"')
            elif stripped.startswith("displayName"):
                display = stripped.split("=", 1)[1].strip().strip('"')
        if mod_id:
            mods.append((mod_id, display or mod_id))
    return mods


def infer_subtype(path: str, kind: str) -> str:
    lowered = path.lower()
    for pattern, label in SUBTYPE_RULES:
        if re.search(pattern, lowered):
            return label
    return kind


def add_recipe_result(target: set[str], result) -> None:
    if result is None:
        return
    if isinstance(result, str):
        if ":" in result:
            target.add(result)
        return
    if isinstance(result, dict):
        rid = result.get("id") or result.get("item")
        if rid and ":" in str(rid):
            target.add(str(rid))
        return
    if isinstance(result, list):
        for entry in result:
            add_recipe_result(target, entry)


def extract_items(
    repo: pathlib.Path,
    mods_dir: pathlib.Path | None = None,
    modpack_name: str = "Randon One Block",
) -> dict:
    mods_dir = mods_dir or DEFAULT_INSTANCE
    if not mods_dir.is_dir():
        raise FileNotFoundError(f"mods directory not found: {mods_dir}")

    ns_to_mod: dict[str, str] = dict(NS_ALIASES)
    for jar_path in sorted(mods_dir.glob("*.jar")):
        with zipfile.ZipFile(jar_path) as zf:
            toml_name = next(
                (name for name in ("META-INF/neoforge.mods.toml", "META-INF/mods.toml") if name in zf.namelist()),
                None,
            )
            if not toml_name:
                continue
            text = zf.read(toml_name).decode("utf-8", errors="replace")
            for mod_id, display in parse_mods_toml(text):
                if mod_id not in ("minecraft", "neoforge", "forge", "fabric", "javafml"):
                    ns_to_mod[mod_id] = display

    entries: dict[str, dict] = {}
    lang_desc: dict[str, str] = {}

    for jar_path in sorted(mods_dir.glob("*.jar")):
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
                    if key.endswith(".desc") or key.endswith(".description") or ".tooltip." in key:
                        base = key
                        for suffix in (".desc", ".description"):
                            if base.endswith(suffix):
                                base = base[: -len(suffix)]
                                break
                        if ".tooltip." in key:
                            base = key.split(".tooltip.")[0]
                        lang_desc[base] = value
                        continue
                    if not (key.startswith("item.") or key.startswith("block.")):
                        continue
                    kind, rest = key.split(".", 1)
                    if "." not in rest:
                        continue
                    namespace, path = rest.split(".", 1)
                    full_id = f"{namespace}:{path}"
                    base_kind = "Block" if kind == "block" else "Item"
                    entries[full_id] = {
                        "id": full_id,
                        "name": value,
                        "kind": base_kind,
                        "namespace": namespace,
                        "path": path,
                        "mod": ns_to_mod.get(namespace, namespace.replace("_", " ").title()),
                    }

    kube_lang = repo / "kubejs/assets/kubejs/lang/en_us.json"
    if kube_lang.is_file():
        lang = json.loads(kube_lang.read_text(encoding="utf-8"))
        for key, value in lang.items():
            if not (key.startswith("item.") or key.startswith("block.")):
                continue
            kind, rest = key.split(".", 1)
            namespace, path = rest.split(".", 1)
            full_id = f"{namespace}:{path}"
            entries[full_id] = {
                "id": full_id,
                "name": value,
                "kind": "Block" if kind == "block" else "Item",
                "namespace": namespace,
                "path": path,
                "mod": "KubeJS",
            }

    craftable: set[str] = set()
    for jar_path in sorted(mods_dir.glob("*.jar")):
        with zipfile.ZipFile(jar_path) as zf:
            for name in zf.namelist():
                if "/recipe/" not in name or not name.endswith(".json") or "advancement" in name:
                    continue
                try:
                    raw = json.loads(zf.read(name))
                except json.JSONDecodeError:
                    continue
                if isinstance(raw, dict) and "type" in raw:
                    add_recipe_result(craftable, raw.get("result"))
                    add_recipe_result(craftable, raw.get("results"))

    for recipe_file in (repo / "kubejs/data").rglob("*.json"):
        if not any(part in ("recipe", "recipes") for part in recipe_file.parts):
            continue
        try:
            raw = json.loads(recipe_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        if isinstance(raw, dict):
            add_recipe_result(craftable, raw.get("result"))

    rows: list[dict] = []
    for full_id in sorted(entries):
        entry = entries[full_id]
        base_key = f"{entry['kind'].lower()}.{entry['namespace']}.{entry['path']}"
        description = lang_desc.get(base_key, "")
        subtype = infer_subtype(entry["path"], entry["kind"])
        availability = "Craftable" if full_id in craftable else "Uncraftable"
        if not description:
            if availability == "Craftable":
                description = f"A craftable {subtype.lower()} from {entry['mod']}."
            else:
                description = (
                    f"An uncraftable {subtype.lower()} from {entry['mod']} — may drop, generate, "
                    "or be obtained through machines, world loot, or quests."
                )
        rows.append(
            {
                "modpack": modpack_name,
                "mod": entry["mod"],
                "item": entry["name"],
                "item_type": subtype,
                "availability": availability,
                "description": description,
                "id": full_id,
            }
        )

    by_mod = defaultdict(int)
    by_type = defaultdict(int)
    by_availability = defaultdict(int)
    for row in rows:
        by_mod[row["mod"]] += 1
        by_type[row["item_type"]] += 1
        by_availability[row["availability"]] += 1

    return {
        "generated": str(date.today()),
        "modpack": modpack_name,
        "item_count": len(rows),
        "craftable_count": by_availability.get("Craftable", 0),
        "uncraftable_count": by_availability.get("Uncraftable", 0),
        "mods_with_items": len(by_mod),
        "items": rows,
        "stats": {
            "by_mod": dict(sorted(by_mod.items(), key=lambda item: (-item[1], item[0].lower()))),
            "by_type": dict(sorted(by_type.items(), key=lambda item: (-item[1], item[0].lower()))),
        },
    }