"""
Module E: Geometry Extraction Pipeline
Converts segmented wall/room polygons, detected door/window/stair symbols,
and calibrated OCR scale into PlanCheck AI's structured FloorPlanGeometry JSON.
"""
from __future__ import annotations
from typing import Dict, Any, List
from pathlib import Path
import json


def build_plancheck_geometry_json(
    sample_id: str,
    width_m: float,
    height_m: float,
    scale_status: str,
    walls: List[Dict[str, Any]],
    doors: List[Dict[str, Any]],
    windows: List[Dict[str, Any]],
    rooms: List[Dict[str, Any]],
    stairs: List[Dict[str, Any]],
    columns: List[Dict[str, Any]] | None = None,
    source_dataset: str = "cubicasa5k",
) -> Dict[str, Any]:
    """
    Produce a structured JSON document compatible with both PlanCheck AI's
    FloorPlanGeometry schema and the ML unified annotation specification.
    """
    return {
        "sample_id": sample_id,
        "source_dataset": source_dataset,
        "schema_version": "1.0.0",
        "width_m": round(width_m, 2),
        "height_m": round(height_m, 2),
        "wall_height_m": 2.9,
        "is_simulated_demo_geometry": False,
        "scale_status": scale_status,
        "scale_note": f"Extracted from {source_dataset} sample {sample_id}",
        "walls": walls,
        "doors": doors,
        "windows": windows,
        "rooms": rooms,
        "stairs": stairs,
        "columns": columns if columns is not None else [],
        "dimensions": [],
        "annotations": [],
    }


def save_geometry_json(payload: Dict[str, Any], output_path: str | Path) -> Path:
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out
