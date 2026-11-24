"""
Module D: OCR Dimension & Room Label Extraction
Parses architectural dimension strings (metric cm/m/mm and imperial ft-in)
and English + Bangla room labels found on Bangladeshi architectural sheets.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
import re


@dataclass
class ParsedDimension:
    raw_text: str
    value_cm: float
    unit_system: str  # "metric" | "imperial"
    dimension_pair_cm: Optional[List[float]] = None


BANGLA_ENGLISH_ROOM_LEXICON: Dict[str, str] = {
    "bedroom": "bedroom",
    "master bed": "bedroom",
    "bed": "bedroom",
    "বেডরুম": "bedroom",
    "শোবার ঘর": "bedroom",
    "living": "living_room",
    "drawing": "living_room",
    "lounge": "living_room",
    "ড্রইং": "living_room",
    "বসার ঘর": "living_room",
    "kitchen": "kitchen",
    "রান্নাঘর": "kitchen",
    "কিচেন": "kitchen",
    "bath": "bathroom",
    "toilet": "bathroom",
    "wc": "bathroom",
    "টয়লেট": "bathroom",
    "বাথরুম": "bathroom",
    "corridor": "corridor",
    "lobby": "corridor",
    "passage": "corridor",
    "করিডোর": "corridor",
    "stair": "staircase",
    "সিঁড়ি": "staircase",
    "dining": "room",
    "ডাইনিং": "room",
    "verandah": "room",
    "balcony": "room",
    "বারান্দা": "room",
}

# Matches imperial e.g. 12'-6" x 14'-0" or 10'-6"
IMPERIAL_PAIR_RE = re.compile(
    r"(\d+)\s*['’]\s*(?:-\s*)?(\d+)?\s*(?:[\"”])?\s*[xX×]\s*(\d+)\s*['’]\s*(?:-\s*)?(\d+)?\s*(?:[\"”])?"
)
IMPERIAL_SINGLE_RE = re.compile(r"(\d+)\s*['’]\s*(?:-\s*)?(\d+)\s*[\"”]")
METRIC_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(mm|cm|m)\b", re.IGNORECASE)


def parse_dimension_text(text: str) -> Optional[ParsedDimension]:
    """Convert raw OCR dimension string into standardized centimeters."""
    clean = text.strip()

    m_pair = IMPERIAL_PAIR_RE.search(clean)
    if m_pair:
        ft1, in1, ft2, in2 = (
            int(m_pair.group(1)),
            int(m_pair.group(2) or 0),
            int(m_pair.group(3)),
            int(m_pair.group(4) or 0),
        )
        cm1 = round((ft1 * 12 + in1) * 2.54, 1)
        cm2 = round((ft2 * 12 + in2) * 2.54, 1)
        return ParsedDimension(raw_text=clean, value_cm=cm1, unit_system="imperial", dimension_pair_cm=[cm1, cm2])

    m_single = IMPERIAL_SINGLE_RE.search(clean)
    if m_single:
        ft, inch = int(m_single.group(1)), int(m_single.group(2))
        cm = round((ft * 12 + inch) * 2.54, 1)
        return ParsedDimension(raw_text=clean, value_cm=cm, unit_system="imperial")

    m_met = METRIC_RE.search(clean)
    if m_met:
        val = float(m_met.group(1))
        unit = m_met.group(2).lower()
        cm = val / 10.0 if unit == "mm" else (val * 100.0 if unit == "m" else val)
        return ParsedDimension(raw_text=clean, value_cm=round(cm, 1), unit_system="metric")

    return None


def classify_room_label(text: str) -> Optional[str]:
    """Classify OCR text into unified room class if matched; returns None otherwise."""
    lower = text.strip().lower()
    for key, unified in BANGLA_ENGLISH_ROOM_LEXICON.items():
        if key in lower:
            return unified
    return None
