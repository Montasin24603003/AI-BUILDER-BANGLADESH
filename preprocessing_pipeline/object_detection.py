"""
Module B: Architectural Symbol & Object Detection Pipeline
Targets unified classes: door (2), window (3), staircase (5), column (6).
Provides:
1. SVG Annotation to YOLO / COCO bounding box converter (for CubiCasa5K & FloorPlanCAD).
2. Model inference adapter (YOLOv8 / Torchvision Faster R-CNN compatible).
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
import re

DETECTION_CLASSES: Dict[str, int] = {
    "door": 0,
    "window": 1,
    "staircase": 2,
    "column": 3,
}


@dataclass
class DetectedSymbol:
    symbol_id: str
    class_name: str
    class_id: int
    bbox_xyxy: List[float]  # [x1, y1, x2, y2] in pixel coordinates
    bbox_yolo: List[float]  # [cx_norm, cy_norm, w_norm, h_norm] in 0..1
    confidence: float
    source_label: str


def _extract_coords_from_svg_points(points_str: str) -> List[Tuple[float, float]]:
    nums = [float(x) for x in re.findall(r"[-+]?\d*\.\d+|\d+", points_str)]
    return [(nums[i], nums[i + 1]) for i in range(0, len(nums) - 1, 2)]


def parse_svg_symbols_to_bboxes(svg_path: str | Path) -> Dict[str, Any]:
    """
    Parse vector SVG floor plans (FloorPlanCAD / CubiCasa5K style) and extract
    ground-truth bounding boxes without inventing absent classes.
    """
    p = Path(svg_path)
    tree = ET.parse(str(p))
    root = tree.getroot()

    viewbox = root.attrib.get("viewBox", "0 0 1000 1000").split()
    vb_w = float(viewbox[2]) if len(viewbox) == 4 else 1000.0
    vb_h = float(viewbox[3]) if len(viewbox) == 4 else 1000.0

    detections: List[DetectedSymbol] = []
    idx = 0

    for elem in root.iter():
        cls_attr = (elem.attrib.get("class") or elem.attrib.get("id") or "").lower()
        semantic = elem.attrib.get("semantic-id") or elem.attrib.get("inkscape:label") or cls_attr

        mapped: Optional[str] = None
        if "door" in semantic:
            mapped = "door"
        elif "window" in semantic:
            mapped = "window"
        elif "stair" in semantic:
            mapped = "staircase"
        elif "column" in semantic or "pillar" in semantic:
            mapped = "column"

        if not mapped:
            continue

        pts_raw = elem.attrib.get("points") or elem.attrib.get("d") or ""
        coords = _extract_coords_from_svg_points(pts_raw)
        if not coords:
            continue

        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        if (x2 - x1) <= 0.5 and (y2 - y1) <= 0.5:
            continue

        idx += 1
        cx = ((x1 + x2) / 2.0) / max(vb_w, 1.0)
        cy = ((y1 + y2) / 2.0) / max(vb_h, 1.0)
        bw = (x2 - x1) / max(vb_w, 1.0)
        bh = (y2 - y1) / max(vb_h, 1.0)

        detections.append(
            DetectedSymbol(
                symbol_id=f"sym-{idx:04d}",
                class_name=mapped,
                class_id=DETECTION_CLASSES[mapped],
                bbox_xyxy=[round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                bbox_yolo=[round(cx, 5), round(cy, 5), round(bw, 5), round(bh, 5)],
                confidence=1.0,
                source_label=semantic,
            )
        )

    return {
        "source_svg": str(p),
        "canvas_width": vb_w,
        "canvas_height": vb_h,
        "count": len(detections),
        "symbols": [asdict(d) for d in detections],
    }
