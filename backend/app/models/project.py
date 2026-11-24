from __future__ import annotations
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from app.models.floor_plan import FloorPlanGeometry
from app.models.issue import CorrectionHistoryEntry, PassedCheckModel, PlanIssueModel


class AnalysisJobStatus(BaseModel):
    status: Literal["idle", "running", "completed", "failed"] = "idle"
    stage_index: int = 0
    stage_label: str = "Ready"
    stage_detail: str = ""
    progress: int = 0
    error: Optional[str] = None


class ProjectRecord(BaseModel):
    project_id: str
    project_name: str
    building_type: str = "Multi-Family Residential (2BR)"
    original_file: str
    file_type: str
    file_size: str
    page_count: int = 1
    selected_page: int = 1
    preview_url: Optional[str] = None
    page_previews: List[str] = Field(default_factory=list)
    status: Literal["uploaded", "analyzing", "needs_review", "corrections_applied", "3d_ready", "failed"] = "uploaded"
    layout_template: Literal["2br-apartment", "res-plan-a", "family-house", "urban-compact"] = "2br-apartment"
    is_sample: bool = False
    created_at: str
    updated_at: str
    scale_calibrated: bool = True
    reference_width_m: Optional[float] = None
    total_area_sqm: float = 109.1
    room_count: int = 6
    analysis_job: AnalysisJobStatus = Field(default_factory=AnalysisJobStatus)
    original_geometry: FloorPlanGeometry
    current_geometry: FloorPlanGeometry
    issues: List[PlanIssueModel] = Field(default_factory=list)
    passed_checks: List[PassedCheckModel] = Field(default_factory=list)
    correction_history: List[CorrectionHistoryEntry] = Field(default_factory=list)
