from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
from typing import List, Tuple
from app.models.floor_plan import AnnotationItem, DoorItem, FloorPlanGeometry
from app.models.issue import CorrectionHistoryEntry, PlanIssueModel


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def apply_issue_geometry_fix(
    geometry: FloorPlanGeometry,
    issue: PlanIssueModel,
) -> Tuple[FloorPlanGeometry, bool]:
    """
    Mutates structured FloorPlanGeometry objects cleanly for a single accepted issue.
    Preserves unrelated components and validates coordinate bounds.
    """
    next_geom = deepcopy(geometry)
    fix_key = issue.geometry_fix_key
    mutated = False

    if fix_key == "widen-staircase":
        # Shift staircase left partition wall 20 cm west (x=9.8 -> x=9.6) and widen stair core
        for wall in next_geom.walls:
            if wall.id == "w-int-stair-v":
                wall.x1 = 9.55
                wall.x2 = 9.55
                wall.modified = True
                mutated = True
            elif wall.id == "w-int-stair-h":
                wall.x1 = 8.2
                wall.x2 = 9.55
                wall.modified = True
        for stair in next_geom.stairs:
            if stair.id == "st-main":
                stair.x = 9.55
                stair.width = 2.65
                stair.clear_width_cm = 100
                stair.modified = True
                mutated = True
        for dim in next_geom.dimensions:
            if dim.id == "dim-stair-w":
                dim.x1 = 9.6
                dim.value_cm = 100
                dim.status = "ok"
        for room in next_geom.rooms:
            if room.id == "r-stair":
                room.x = 9.55
                room.width = 2.85
                room.area_sqm = round(room.width * room.height, 1)

    elif fix_key == "reverse-door-swing":
        for door in next_geom.doors:
            if door.id == "d-bath":
                door.swing = "inward-right"
                door.x = 7.4
                door.modified = True
                mutated = True

    elif fix_key == "add-secondary-exit":
        existing = next((d for d in next_geom.doors if d.id == "d-exit-2"), None)
        if not existing:
            next_geom.doors.append(
                DoorItem(
                    id="d-exit-2",
                    x=12.4,
                    y=6.6,
                    width=0.95,
                    angle_deg=90.0,
                    swing="outward-right",
                    wall_id="w-ext-e",
                    label="Secondary Egress",
                    is_exit=True,
                    modified=True,
                )
            )
            next_geom.annotations.append(
                AnnotationItem(id="ann-exit-2", text="EXIT 2", x=12.0, y=6.2, kind="exit")
            )
            mutated = True

    # Validate geometry bounds
    for wall in next_geom.walls:
        wall.x1 = max(0.0, min(next_geom.width_m, wall.x1))
        wall.x2 = max(0.0, min(next_geom.width_m, wall.x2))
        wall.y1 = max(0.0, min(next_geom.height_m, wall.y1))
        wall.y2 = max(0.0, min(next_geom.height_m, wall.y2))

    return next_geom, mutated


def rebuild_geometry_from_issues(
    original_geometry: FloorPlanGeometry,
    issues: List[PlanIssueModel],
) -> FloorPlanGeometry:
    """Recomputes current geometry deterministically from original geometry + applied/accepted issues."""
    geom = deepcopy(original_geometry)
    for iss in issues:
        if iss.status in ("applied", "accepted"):
            geom, _ = apply_issue_geometry_fix(geom, iss)
    return geom


def record_history(
    history: List[CorrectionHistoryEntry],
    issue: PlanIssueModel,
    action: str,
    revised_value: str,
) -> List[CorrectionHistoryEntry]:
    entry = CorrectionHistoryEntry(
        id=f"hist-{len(history) + 1:03d}",
        issue_id=issue.issue_id,
        title=issue.title,
        original_value=issue.detected_value,
        revised_value=revised_value,
        action=action,  # type: ignore[arg-type]
        timestamp=_now_iso(),
    )
    return [entry, *history]
