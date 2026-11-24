from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class WallSegment(BaseModel):
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    thickness: float = 0.2
    is_exterior: bool = True
    label: Optional[str] = None
    modified: bool = False


class DoorItem(BaseModel):
    id: str
    x: float
    y: float
    width: float = 0.9
    angle_deg: float = 0.0
    swing: Literal["inward-left", "inward-right", "outward-left", "outward-right"] = "inward-left"
    wall_id: Optional[str] = None
    label: str = "Door"
    is_exit: bool = False
    modified: bool = False


class WindowItem(BaseModel):
    id: str
    x: float
    y: float
    width: float = 1.6
    angle_deg: float = 0.0
    sill_m: float = 0.9
    wall_id: Optional[str] = None
    label: str = "Window"


class RoomItem(BaseModel):
    id: str
    name: str
    category: Literal["bedroom", "living", "kitchen", "bathroom", "corridor", "balcony", "staircase", "other"]
    x: float
    y: float
    width: float
    height: float
    area_sqm: float
    measurement_status: Literal["verified", "estimated"] = "verified"


class StairItem(BaseModel):
    id: str
    x: float
    y: float
    width: float
    length: float
    steps: int = 8
    direction: Literal["up-north", "up-south", "up-east", "up-west"] = "up-north"
    clear_width_cm: int = 80
    modified: bool = False


class DimensionItem(BaseModel):
    id: str
    label: str
    value_cm: float
    x1: float
    y1: float
    x2: float
    y2: float
    status: Literal["ok", "warning", "violation"] = "ok"
    measurement_status: Literal["verified", "estimated"] = "verified"


class AnnotationItem(BaseModel):
    id: str
    text: str
    x: float
    y: float
    kind: Literal["room", "exit", "correction", "note"] = "note"


class FloorPlanGeometry(BaseModel):
    width_m: float = 12.4
    height_m: float = 8.8
    wall_height_m: float = 2.75
    is_simulated_demo_geometry: bool = True
    scale_status: Literal["verified", "estimated"] = "verified"
    scale_note: str = "Calibrated from architectural reference dimensions."
    cv_summary: Optional[dict] = None
    walls: List[WallSegment] = Field(default_factory=list)
    doors: List[DoorItem] = Field(default_factory=list)
    windows: List[WindowItem] = Field(default_factory=list)
    rooms: List[RoomItem] = Field(default_factory=list)
    stairs: List[StairItem] = Field(default_factory=list)
    dimensions: List[DimensionItem] = Field(default_factory=list)
    annotations: List[AnnotationItem] = Field(default_factory=list)
