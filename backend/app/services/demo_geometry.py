from app.models.floor_plan import (
    AnnotationItem,
    DimensionItem,
    DoorItem,
    FloorPlanGeometry,
    RoomItem,
    StairItem,
    WallSegment,
    WindowItem,
)


def build_demo_2br_geometry(template: str = "2br-apartment") -> FloorPlanGeometry:
    """
    Predefined, dimensionally consistent 2-bedroom residential apartment geometry
    (12.4 m x 8.8 m) with deliberate demo inspection findings:
      1. Staircase clear width = 80 cm (target 100 cm)
      2. Bathroom door swing intruding into central corridor clearance (68 cm vs 90 cm)
      3. Single primary exit without secondary egress
    All coordinates are in meters in the drawing frame [0..12.4] x [0..8.8].
    """
    master_label = "LOFT SUITE" if template == "urban-compact" else "MASTER BEDROOM"
    bed2_label = "STUDY / GUEST" if template == "family-house" else "BEDROOM 02"

    walls = [
        # Exterior Perimeter
        WallSegment(id="w-ext-n", x1=0.0, y1=0.0, x2=12.4, y2=0.0, thickness=0.22, is_exterior=True, label="North Exterior Wall"),
        WallSegment(id="w-ext-s", x1=0.0, y1=8.8, x2=12.4, y2=8.8, thickness=0.22, is_exterior=True, label="South Exterior Wall"),
        WallSegment(id="w-ext-w", x1=0.0, y1=0.0, x2=0.0, y2=8.8, thickness=0.22, is_exterior=True, label="West Exterior Wall"),
        WallSegment(id="w-ext-e", x1=12.4, y1=0.0, x2=12.4, y2=8.8, thickness=0.22, is_exterior=True, label="East Exterior Wall"),
        # Interior Partitions
        WallSegment(id="w-int-mb-v", x1=4.2, y1=0.0, x2=4.2, y2=3.7, thickness=0.14, is_exterior=False, label="Master Bedroom East Wall"),
        WallSegment(id="w-int-mb-h", x1=0.0, y1=4.2, x2=4.2, y2=4.2, thickness=0.14, is_exterior=False, label="Master Bedroom South Wall"),
        WallSegment(id="w-int-b2-h", x1=4.2, y1=3.7, x2=8.2, y2=3.7, thickness=0.14, is_exterior=False, label="Bedroom 2 South Wall"),
        WallSegment(id="w-int-stair-v", x1=9.8, y1=0.0, x2=9.8, y2=3.7, thickness=0.14, is_exterior=False, label="Staircase Core Partition"),
        WallSegment(id="w-int-stair-h", x1=8.2, y1=3.7, x2=9.8, y2=3.7, thickness=0.14, is_exterior=False, label="Staircase Landing Wall"),
        WallSegment(id="w-int-bath-w", x1=5.9, y1=4.6, x2=5.9, y2=6.6, thickness=0.14, is_exterior=False, label="Bath West Wall"),
        WallSegment(id="w-int-bath-s", x1=5.9, y1=6.6, x2=8.2, y2=6.6, thickness=0.14, is_exterior=False, label="Bath South Wall"),
        WallSegment(id="w-int-bath-e", x1=8.2, y1=4.6, x2=8.2, y2=6.6, thickness=0.14, is_exterior=False, label="Bath East Wall"),
        WallSegment(id="w-int-bath-n", x1=5.9, y1=4.6, x2=8.2, y2=4.6, thickness=0.14, is_exterior=False, label="Bath North Wall"),
        WallSegment(id="w-int-kit-v", x1=8.2, y1=3.7, x2=8.2, y2=6.0, thickness=0.14, is_exterior=False, label="Kitchen Divider Wall"),
    ]

    doors = [
        DoorItem(id="d-main", x=7.4, y=8.8, width=1.05, angle_deg=0.0, swing="inward-left", wall_id="w-ext-s", label="Main Entrance", is_exit=True),
        DoorItem(id="d-mb", x=3.2, y=4.2, width=0.9, angle_deg=0.0, swing="inward-left", wall_id="w-int-mb-h", label="Master Bedroom Door"),
        DoorItem(id="d-b2", x=5.9, y=3.7, width=0.9, angle_deg=0.0, swing="inward-right", wall_id="w-int-b2-h", label="Bedroom 2 Door"),
        DoorItem(id="d-bath", x=6.9, y=4.6, width=0.8, angle_deg=0.0, swing="outward-left", wall_id="w-int-bath-n", label="Bathroom Door"),
    ]

    windows = [
        WindowItem(id="win-mb-n", x=2.1, y=0.0, width=1.8, angle_deg=0.0, sill_m=0.9, wall_id="w-ext-n", label="Master North Window"),
        WindowItem(id="win-b2-n", x=6.4, y=0.0, width=1.8, angle_deg=0.0, sill_m=0.9, wall_id="w-ext-n", label="Bedroom 2 Window"),
        WindowItem(id="win-mb-w", x=0.0, y=2.2, width=1.6, angle_deg=90.0, sill_m=0.9, wall_id="w-ext-w", label="West Bay Window"),
        WindowItem(id="win-liv-s", x=2.2, y=8.8, width=3.2, angle_deg=0.0, sill_m=0.3, wall_id="w-ext-s", label="Balcony Sliding Glazing"),
    ]

    rooms = [
        RoomItem(id="r-mb", name=master_label, category="bedroom", x=0.0, y=0.0, width=4.2, height=4.2, area_sqm=17.6, measurement_status="verified"),
        RoomItem(id="r-b2", name=bed2_label, category="bedroom", x=4.2, y=0.0, width=4.0, height=3.7, area_sqm=14.8, measurement_status="verified"),
        RoomItem(id="r-living", name="LIVING & DINING", category="living", x=0.0, y=4.2, width=5.9, height=4.6, area_sqm=27.1, measurement_status="verified"),
        RoomItem(id="r-bath", name="BATHROOM", category="bathroom", x=5.9, y=4.6, width=2.3, height=2.0, area_sqm=4.6, measurement_status="verified"),
        RoomItem(id="r-kitchen", name="KITCHEN", category="kitchen", x=8.2, y=3.7, width=4.2, height=5.1, area_sqm=21.4, measurement_status="verified"),
        RoomItem(id="r-stair", name="STAIRCASE CORE", category="staircase", x=9.8, y=0.0, width=2.6, height=3.7, area_sqm=9.6, measurement_status="verified"),
        RoomItem(id="r-corridor", name="CORRIDOR", category="corridor", x=4.2, y=3.7, width=4.0, height=0.9, area_sqm=3.6, measurement_status="verified"),
        RoomItem(id="r-balcony", name="BALCONY TERRACE", category="balcony", x=0.2, y=7.6, width=3.9, height=1.2, area_sqm=4.7, measurement_status="verified"),
    ]

    stairs = [
        StairItem(
            id="st-main",
            x=9.8,
            y=0.2,
            width=2.4,
            length=3.3,
            steps=9,
            direction="up-north",
            clear_width_cm=80,
            modified=False,
        )
    ]

    dimensions = [
        DimensionItem(
            id="dim-overall-w",
            label="Overall Width",
            value_cm=1240,
            x1=0.0,
            y1=-0.45,
            x2=12.4,
            y2=-0.45,
            status="ok",
            measurement_status="verified",
        ),
        DimensionItem(
            id="dim-stair-w",
            label="Stair Clear Width",
            value_cm=80,
            x1=9.9,
            y1=3.4,
            x2=12.2,
            y2=3.4,
            status="violation",
            measurement_status="verified",
        ),
    ]

    annotations = [
        AnnotationItem(id="ann-entry", text="MAIN ENTRY", x=7.4, y=8.45, kind="exit"),
    ]

    return FloorPlanGeometry(
        width_m=12.4,
        height_m=8.8,
        wall_height_m=2.75,
        is_simulated_demo_geometry=True,
        scale_status="verified",
        scale_note="Predefined editable 2BR architectural reference model (1:100).",
        walls=walls,
        doors=doors,
        windows=windows,
        rooms=rooms,
        stairs=stairs,
        dimensions=dimensions,
        annotations=annotations,
    )
