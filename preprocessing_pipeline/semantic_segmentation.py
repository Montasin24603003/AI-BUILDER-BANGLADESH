"""
Module C: Semantic Segmentation Pipeline for Walls & Rooms
Maps floor-plan polygons into the unified 12-class semantic mask:
0: background, 1: wall, 2: door, 3: window, 4: room, 5: staircase,
6: column, 7: bathroom, 8: kitchen, 9: bedroom, 10: living_room, 11: corridor.
"""
from __future__ import annotations
from typing import Dict, List, Tuple

UNIFIED_SEGMENTATION_CLASSES: Dict[int, str] = {
    0: "background",
    1: "wall",
    2: "door",
    3: "window",
    4: "room",
    5: "staircase",
    6: "column",
    7: "bathroom",
    8: "kitchen",
    9: "bedroom",
    10: "living_room",
    11: "corridor",
}

CLASS_COLOR_PALETTE_HEX: Dict[str, str] = {
    "background": "#F8FAFC",
    "wall": "#0F172A",
    "door": "#D97706",
    "window": "#0284C7",
    "room": "#E2E8F0",
    "staircase": "#7C3AED",
    "column": "#DC2626",
    "bathroom": "#67E8F9",
    "kitchen": "#FDE047",
    "bedroom": "#BFDBFE",
    "living_room": "#BBF7D0",
    "corridor": "#FED7AA",
}

CUBICASA_ROOM_TO_UNIFIED: Dict[str, str] = {
    "Wall": "wall",
    "Bath": "bathroom",
    "Sauna": "bathroom",
    "Kitchen": "kitchen",
    "Bedroom": "bedroom",
    "LivingRoom": "living_room",
    "Lounge": "living_room",
    "HallWay": "corridor",
    "DraughtLobby": "corridor",
    "Entry": "corridor",
    "Hall": "corridor",
    "StairWell": "staircase",
    "Stairs": "staircase",
    "Room": "room",
    "Dining": "room",
    "EatingArea": "room",
    "Office": "room",
    "Den": "room",
    "Storage": "room",
    "Closet": "room",
    "Utility": "room",
}


def map_cubicasa_label(raw_label: str) -> Tuple[str | None, int | None]:
    """
    Map a raw CubiCasa5K room/icon label to the PlanCheck unified class.
    Returns (None, None) if the label is not part of the 11 target classes (never invents labels).
    """
    clean = raw_label.strip().split()[0]
    unified = CUBICASA_ROOM_TO_UNIFIED.get(clean)
    if not unified:
        if clean == "Door":
            unified = "door"
        elif clean == "Window":
            unified = "window"
        else:
            return None, None

    for cid, cname in UNIFIED_SEGMENTATION_CLASSES.items():
        if cname == unified:
            return unified, cid
    return None, None
