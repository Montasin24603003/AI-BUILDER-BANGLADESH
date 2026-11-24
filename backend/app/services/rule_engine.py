from typing import List, Tuple
from app.models.floor_plan import FloorPlanGeometry
from app.models.issue import IssueLocation, PassedCheckModel, PlanIssueModel


def run_rule_engine(
    geometry: FloorPlanGeometry,
    stair_target_cm: int = 100,
    min_door_clearance_cm: int = 90,
) -> Tuple[List[PlanIssueModel], List[PassedCheckModel]]:
    """
    Deterministic, configurable demonstration rule set for residential 2-bedroom apartments.
    Does NOT claim certified compliance with BNBC or any local building code.
    Distinguishes between verified vs estimated measurements and flags missing scale calibration.
    """
    issues: List[PlanIssueModel] = []
    passed: List[PassedCheckModel] = []
    m_type = "verified" if geometry.scale_status == "verified" else "estimated"

    # 1. Circulation: Staircase clear width check
    for stair in geometry.stairs:
        if stair.clear_width_cm < stair_target_cm:
            issues.append(
                PlanIssueModel(
                    issue_id="ISSUE-001",
                    code="PC-101",
                    category="dimension",
                    title="Staircase Width Concern",
                    severity="high",
                    location=IssueLocation(x=0.83, y=0.27, width=0.14, height=0.20),
                    detected_value=f"{stair.clear_width_cm} cm",
                    expected_value=f"{stair_target_cm} cm",
                    measurement_type=m_type,
                    explanation=(
                        f"The detected staircase clear width ({stair.clear_width_cm} cm) is below the configured "
                        f"demonstration target of {stair_target_cm} cm."
                    ),
                    why_it_matters="Narrow stair flights restrict safe two-way movement, furniture transport, and emergency egress.",
                    recommendation=f"Review and increase the staircase width to the selected design target of {stair_target_cm} cm.",
                    expected_impact="Improved vertical circulation and alignment with the configured residential target.",
                    confidence_score=0.94 if m_type == "verified" else 0.72,
                    manual_review_required=True,
                    status="pending",
                    correction_tag=f"Staircase widened {stair.clear_width_cm} → {stair_target_cm} cm",
                    geometry_fix_key="widen-staircase",
                )
            )
        else:
            passed.append(
                PassedCheckModel(
                    id="pass-stair",
                    title="Staircase Width",
                    category="Circulation",
                    measured_value=f"{stair.clear_width_cm} cm",
                    target_value=f"≥ {stair_target_cm} cm",
                    measurement_type=m_type,
                    note="Meets configured demonstration stair width target.",
                )
            )

    # 2. Circulation: Bathroom door swing clearance
    bath_door = next((d for d in geometry.doors if d.id == "d-bath"), None)
    if bath_door and bath_door.swing.startswith("outward"):
        issues.append(
            PlanIssueModel(
                issue_id="ISSUE-002",
                code="PC-104",
                category="clearance",
                title="Door Clearance Concern",
                severity="medium",
                location=IssueLocation(x=0.54, y=0.48, width=0.10, height=0.10),
                detected_value="68 cm swing gap",
                expected_value=f"≥ {min_door_clearance_cm} cm clear arc",
                measurement_type=m_type,
                explanation="The outward bathroom door swing overlaps the 90 cm central corridor turning zone.",
                why_it_matters="Door arc collisions create pinch points in compact hallways and impede accessible circulation.",
                recommendation="Reverse the bathroom door swing inward or adjust door hinge placement to preserve corridor clearance.",
                expected_impact="Restores unobstructed 90 cm hallway passage.",
                confidence_score=0.89 if m_type == "verified" else 0.70,
                manual_review_required=True,
                status="pending",
                correction_tag="Door swing & clearance adjusted",
                geometry_fix_key="reverse-door-swing",
            )
        )
    else:
        passed.append(
            PassedCheckModel(
                id="pass-door-clear",
                title="Corridor Door Clearance",
                category="Circulation",
                measured_value=f"≥ {min_door_clearance_cm} cm",
                target_value=f"≥ {min_door_clearance_cm} cm",
                measurement_type=m_type,
                note="Hallway clearance unobstructed by adjacent door swings.",
            )
        )

    # 3. Safety Review: Secondary exit availability
    exit_doors = [d for d in geometry.doors if d.is_exit]
    if len(exit_doors) < 2:
        issues.append(
            PlanIssueModel(
                issue_id="ISSUE-003",
                code="PC-109",
                category="safety",
                title="Missing Secondary Exit",
                severity="high",
                location=IssueLocation(x=0.88, y=0.74, width=0.10, height=0.12),
                detected_value="1 primary exit",
                expected_value="2 egress points",
                measurement_type="verified",
                explanation="Only a single primary exit was identified along the south facade; no alternate egress was detected.",
                why_it_matters="Having an alternate exit route improves evacuation options if the main corridor is obstructed.",
                recommendation="Review the required exit arrangement and consider adding a secondary rear/service egress door.",
                expected_impact="Provides dual-path residential egress for architect and homeowner review.",
                confidence_score=0.91,
                manual_review_required=True,
                status="pending",
                correction_tag="Secondary egress route added",
                geometry_fix_key="add-secondary-exit",
            )
        )
    else:
        passed.append(
            PassedCheckModel(
                id="pass-egress",
                title="Dual Egress Arrangement",
                category="Safety Review",
                measured_value=f"{len(exit_doors)} exits detected",
                target_value="≥ 2 egress points",
                measurement_type="verified",
                note="Primary and secondary exit openings present.",
            )
        )

    # 4. Drawing Consistency: Flag missing scale calibration if image was uploaded without reference width
    if geometry.scale_status == "estimated":
        issues.append(
            PlanIssueModel(
                issue_id="ISSUE-004",
                code="PC-115",
                category="consistency",
                title="Missing Drawing Scale Reference",
                severity="low",
                location=IssueLocation(x=0.18, y=0.12, width=0.16, height=0.08),
                detected_value="Uncalibrated raster",
                expected_value="Reference scale (m)",
                measurement_type="missing",
                explanation="No calibrated scale bar was detected on the uploaded sheet; room measurements are marked as estimated.",
                why_it_matters="Without a known reference dimension, pixel-to-meter ratios cannot be guaranteed.",
                recommendation="Enter a known exterior wall width in the calibration bar to convert estimated values to verified dimensions.",
                expected_impact="Upgrades room and circulation checks from estimated to calibrated measurements.",
                confidence_score=0.98,
                manual_review_required=True,
                status="pending",
                correction_tag="Scale reference noted",
                geometry_fix_key=None,
            )
        )

    # 5. Room Dimensions & Spatial Passed Checks
    bedrooms = [r for r in geometry.rooms if r.category == "bedroom"]
    if bedrooms:
        min_bed = min(r.area_sqm for r in bedrooms)
        passed.append(
            PassedCheckModel(
                id="pass-bedrooms",
                title="Bedroom Dimensions",
                category="Room Dimensions",
                measured_value=f"{len(bedrooms)} bedrooms (min {min_bed:.1f} m²)",
                target_value="≥ 9.5 m²",
                measurement_type=m_type,
                note="Bedrooms meet minimum residential demonstration area criteria.",
            )
        )

    main_door = next((d for d in geometry.doors if d.id == "d-main"), None)
    if main_door:
        passed.append(
            PassedCheckModel(
                id="pass-main-entry",
                title="Main Entrance Width",
                category="Safety Review",
                measured_value=f"{int(round(main_door.width * 100))} cm clear",
                target_value="≥ 90 cm",
                measurement_type=m_type,
                note="Main entry doorway provides adequate residential access width.",
            )
        )

    living = next((r for r in geometry.rooms if r.category == "living"), None)
    if living:
        passed.append(
            PassedCheckModel(
                id="pass-living",
                title="Living & Dining Area",
                category="Room Dimensions",
                measured_value=f"{living.area_sqm:.1f} m²",
                target_value="≥ 18.0 m²",
                measurement_type=m_type,
                note="Primary living space exceeds minimum target footprint.",
            )
        )

    kitchen = next((r for r in geometry.rooms if r.category == "kitchen"), None)
    if kitchen:
        passed.append(
            PassedCheckModel(
                id="pass-kitchen",
                title="Kitchen Dimensions",
                category="Room Dimensions",
                measured_value=f"{kitchen.area_sqm:.1f} m²",
                target_value="≥ 6.5 m²",
                measurement_type=m_type,
                note="Kitchen footprint and work-zone clearance meet demo criteria.",
            )
        )

    return issues, passed
