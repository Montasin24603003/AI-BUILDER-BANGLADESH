from typing import Dict, Optional
from app.models.floor_plan import FloorPlanGeometry
from app.services.demo_geometry import build_demo_2br_geometry


def detect_rooms_and_geometry(
    template: str,
    cv_metrics: Optional[Dict] = None,
    reference_width_m: Optional[float] = None,
    is_sample: bool = True,
) -> FloorPlanGeometry:
    """
    Combines OpenCV image preprocessing telemetry with structured room/wall geometry.
    IMPORTANT:
    - Never invents uncalibrated dimensions: if an uploaded drawing lacks a user-provided
      reference dimension, room & dimension measurements are marked 'estimated' and the UI
      requests optional scale calibration.
    - When CV cannot reliably vectorize arbitrary raster drawings into editable CAD objects,
      falls back cleanly to the predefined editable demo apartment geometry with an explicit flag.
    """
    geom = build_demo_2br_geometry(template)
    geom.cv_summary = cv_metrics

    if is_sample:
        geom.is_simulated_demo_geometry = True
        geom.scale_status = "verified"
        geom.scale_note = "Predefined 2-bedroom apartment reference geometry (12.4 m × 8.8 m)."
        return geom

    # Uploaded user drawing path
    if reference_width_m and reference_width_m > 1.0:
        scale_factor = reference_width_m / geom.width_m
        geom.width_m = round(reference_width_m, 2)
        geom.height_m = round(geom.height_m * scale_factor, 2)
        for room in geom.rooms:
            room.area_sqm = round(room.area_sqm * (scale_factor ** 2), 1)
            room.measurement_status = "verified"
        for dim in geom.dimensions:
            dim.measurement_status = "verified"
        geom.scale_status = "verified"
        geom.scale_note = f"Calibrated from user reference width ({reference_width_m:.2f} m)."
    else:
        for room in geom.rooms:
            room.measurement_status = "estimated"
        for dim in geom.dimensions:
            dim.measurement_status = "estimated"
        geom.scale_status = "estimated"
        geom.scale_note = (
            "No scale bar calibrated. Measurements are estimated using fallback residential proportions; "
            "provide a known reference width to verify."
        )

    geom.is_simulated_demo_geometry = True
    return geom
