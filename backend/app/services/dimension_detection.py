from typing import List
from app.models.floor_plan import FloorPlanGeometry


def extract_dimension_summary(geometry: FloorPlanGeometry) -> List[dict]:
    """Returns structured room and circulation measurements with explicit verified vs estimated status."""
    summary = []
    for room in geometry.rooms:
        summary.append(
            {
                "id": room.id,
                "name": room.name,
                "category": room.category,
                "width_m": round(room.width, 2),
                "height_m": round(room.height, 2),
                "area_sqm": round(room.area_sqm, 1),
                "measurement_status": room.measurement_status,
            }
        )
    for stair in geometry.stairs:
        summary.append(
            {
                "id": stair.id,
                "name": "Staircase Clear Width",
                "category": "circulation",
                "value_cm": stair.clear_width_cm,
                "measurement_status": geometry.scale_status,
            }
        )
    return summary
