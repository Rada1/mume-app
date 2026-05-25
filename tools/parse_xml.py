"""
@file parse_xml.py
@description Converts MMapper XML into the compact mapper JSON consumed by the client.
"""

import argparse
import json
import xml.etree.ElementTree as ET
from pathlib import Path


DIR_MAP = {
    "north": "n",
    "south": "s",
    "east": "e",
    "west": "w",
    "up": "u",
    "down": "d",
    "northeast": "ne",
    "northwest": "nw",
    "southeast": "se",
    "southwest": "sw",
    "out": "out",
}


def get_child_text(elem: ET.Element, tag: str, default: str = "") -> str:
    child = elem.find(tag)
    if child is None or child.text is None:
        return default
    return child.text.strip()


def get_all_child_text(elem: ET.Element, tag: str) -> list[str]:
    return [
        child.text.strip()
        for child in elem.findall(tag)
        if child.text and child.text.strip()
    ]


def parse_light(value: str) -> int:
    upper = value.upper()
    if upper == "DARK":
        return 1
    if upper == "LIT":
        return 2
    return 0


def parse_sundeath(value: str) -> int | None:
    upper = value.upper()
    if upper == "NO_SUNDEATH":
        return 0
    if upper == "SUNDEATH":
        return 1
    return None


def get_normalized_child_text(elem: ET.Element, tag: str, default: str) -> str:
    value = get_child_text(elem, tag)
    return value if value else default


def normalize_description_text(value: str) -> str:
    paragraphs = [
        " ".join(line.strip() for line in paragraph.splitlines() if line.strip())
        for paragraph in value.split("\n\n")
    ]
    return "\n\n".join(paragraph for paragraph in paragraphs if paragraph)


def normalize_contents_text(value: str) -> str:
    lines = [" ".join(line.split()) for line in value.splitlines() if line.strip()]
    if not lines:
        return ""

    normalized: list[str] = []
    for line in lines:
        if normalized and not normalized[-1].endswith((".", "!", "?", '"', "'")):
            normalized[-1] = f"{normalized[-1]} {line}"
        else:
            normalized.append(line)

    return "\n".join(normalized)


def parse_exit(exit_elem: ET.Element) -> tuple[str, dict[str, object]] | None:
    raw_dir = (exit_elem.get("dir") or exit_elem.get("direction") or "").lower()
    direction = DIR_MAP.get(raw_dir, raw_dir[:1])
    target = exit_elem.get("target")
    to_elem = exit_elem.find("to")
    if to_elem is not None and to_elem.text:
        target = to_elem.text.strip()

    if not direction or not target:
        return None

    flags = get_all_child_text(exit_elem, "exitflag")
    flags.extend(get_all_child_text(exit_elem, "doorflag"))

    flags_attr = exit_elem.get("flags")
    if flags_attr:
        flags.extend(flag.strip() for flag in flags_attr.split(",") if flag.strip())

    upper_flags = {flag.upper() for flag in flags}
    door_attr = (exit_elem.get("door") or "").lower()
    has_door = door_attr in {"1", "true", "yes"} or "DOOR" in upper_flags

    exit_data: dict[str, object] = {
        "target": target,
        "hasDoor": has_door,
    }
    door_name = exit_elem.get("doorname") or exit_elem.get("doorName") or exit_elem.get("door_name")
    if door_name:
        exit_data["doorName"] = door_name.strip()
    if flags:
        exit_data["flags"] = flags

    return direction, exit_data


def parse_xml_to_json(xml_file: Path, output_file: Path, floor_height: float = 1.0) -> None:
    print(f"Parsing {xml_file}...")
    rooms: dict[str, list[object]] = {}

    context = ET.iterparse(xml_file, events=("end",))
    for _, elem in context:
        if elem.tag != "room":
            continue

        room_id = elem.get("id")
        if not room_id:
            elem.clear()
            continue

        server_id = elem.get("server_id") or room_id
        name = elem.get("name") or elem.get("title") or "Unknown Room"
        area = get_child_text(elem, "area")
        terrain = get_child_text(elem, "terrain", "UNKNOWN")

        coord = elem.find("coord")
        if coord is not None:
            x = int(coord.get("x", "0"))
            y = -int(coord.get("y", "0"))
            z = float(coord.get("z", "0")) * floor_height
        else:
            x, y, z = 0, 0, 0.0

        exits: dict[str, dict[str, object]] = {}
        for exit_elem in elem.findall("exit"):
            parsed = parse_exit(exit_elem)
            if parsed:
                direction, exit_data = parsed
                exits[direction] = exit_data

        mob_flags = get_all_child_text(elem, "mobflag")
        load_flags = get_all_child_text(elem, "loadflag")
        light = parse_light(get_child_text(elem, "light"))
        sundeath = parse_sundeath(get_child_text(elem, "sundeath"))
        align = get_normalized_child_text(elem, "align", "NEUTRAL")
        portable = get_normalized_child_text(elem, "portable", "PORTABLE")
        ridable = get_normalized_child_text(elem, "ridable", "RIDABLE")
        note = get_child_text(elem, "note")
        contents = normalize_contents_text(get_child_text(elem, "contents"))
        description = normalize_description_text(get_child_text(elem, "description"))

        room_data: list[object] = [
            x,
            y,
            z,
            terrain,
            exits,
            name,
            server_id,
            mob_flags,
            load_flags,
            area,
            light,
            sundeath if sundeath is not None else 1,
            align,
            portable,
            ridable,
            note,
            contents,
            description,
        ]

        rooms[room_id] = room_data
        elem.clear()

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(rooms, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {len(rooms)} rooms to {output_file}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert MMapper XML into client map JSON.")
    parser.add_argument("input", nargs="?", default="data/ardanazgum.xml")
    parser.add_argument("-o", "--output", default="public/mume_map_data.json")
    parser.add_argument("-f", "--floor-height", type=float, default=1.0)
    args = parser.parse_args()

    parse_xml_to_json(Path(args.input), Path(args.output), args.floor_height)


if __name__ == "__main__":
    main()
