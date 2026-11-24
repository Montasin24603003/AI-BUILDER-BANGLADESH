import math
from typing import Dict, List
from app.models.floor_plan import FloorPlanGeometry


def generate_3d_scene_from_geometry(geometry: FloorPlanGeometry) -> Dict:
    """
    Converts structured 2D FloorPlanGeometry into Three.js-ready 3D architectural elements
    centered around (0, 0, 0) in meters.
    Walls automatically derive 3D center, length, and rotation from (x1,y1)->(x2,y2),
    and doors/windows/stairs are positioned directly from corrected 2D coordinates.
    """
    half_w = geometry.width_m / 2.0
    half_h = geometry.height_m / 2.0

    def to_3d(x: float, y: float) -> tuple[float, float]:
        return round(x - half_w, 3), round(y - half_h, 3)

    walls_3d: List[Dict] = []
    for w in geometry.walls:
        dx = w.x2 - w.x1
        dy = w.y2 - w.y1
        length = math.hypot(dx, dy)
        if length < 0.05:
            continue
        cx, cz = to_3d((w.x1 + w.x2) / 2.0, (w.y1 + w.y2) / 2.0)
        angle = -math.atan2(dy, dx)
        walls_3d.append(
            {
                "id": w.id,
                "label": w.label or "Wall",
                "cx": cx,
                "cz": cz,
                "length": round(length, 3),
                "thickness": w.thickness,
                "height": geometry.wall_height_m,
                "rotation_y": round(angle, 4),
                "is_exterior": w.is_exterior,
                "modified": w.modified,
            }
        )

    rooms_3d: List[Dict] = []
    for r in geometry.rooms:
        cx, cz = to_3d(r.x + r.width / 2.0, r.y + r.height / 2.0)
        rooms_3d.append(
            {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "cx": cx,
                "cz": cz,
                "width": round(r.width, 3),
                "depth": round(r.height, 3),
                "area_sqm": r.area_sqm,
                "measurement_status": r.measurement_status,
            }
        )

    doors_3d: List[Dict] = []
    for d in geometry.doors:
        cx, cz = to_3d(d.x, d.y)
        doors_3d.append(
            {
                "id": d.id,
                "label": d.label,
                "cx": cx,
                "cz": cz,
                "width": d.width,
                "height": 2.1,
                "rotation_y": round(math.radians(d.angle_deg), 4),
                "is_exit": d.is_exit,
                "modified": d.modified,
            }
        )

    windows_3d: List[Dict] = []
    for win in geometry.windows:
        cx, cz = to_3d(win.x, win.y)
        windows_3d.append(
            {
                "id": win.id,
                "label": win.label,
                "cx": cx,
                "cz": cz,
                "width": win.width,
                "sill_m": win.sill_m,
                "height": max(0.8, geometry.wall_height_m - win.sill_m - 0.35),
                "rotation_y": round(math.radians(win.angle_deg), 4),
            }
        )

    stairs_3d: List[Dict] = []
    for st in geometry.stairs:
        cx, cz = to_3d(st.x + st.width / 2.0, st.y + st.length / 2.0)
        stairs_3d.append(
            {
                "id": st.id,
                "cx": cx,
                "cz": cz,
                "width": round(st.width, 3),
                "length": round(st.length, 3),
                "steps": st.steps,
                "clear_width_cm": st.clear_width_cm,
                "modified": st.modified,
            }
        )

    return {
        "footprint": {
            "width_m": geometry.width_m,
            "depth_m": geometry.height_m,
            "wall_height_m": geometry.wall_height_m,
            "slab_thickness_m": 0.24,
        },
        "walls": walls_3d,
        "rooms": rooms_3d,
        "doors": doors_3d,
        "windows": windows_3d,
        "stairs": stairs_3d,
        "roof": {
            "width_m": round(geometry.width_m + 0.4, 2),
            "depth_m": round(geometry.height_m + 0.4, 2),
            "elevation_m": round(geometry.wall_height_m + 0.34, 2),
        },
    }
