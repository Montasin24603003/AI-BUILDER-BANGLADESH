from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


class IssueLocation(BaseModel):
    x: float  # normalized 0..1
    y: float  # normalized 0..1
    width: float = 0.12
    height: float = 0.10


class PlanIssueModel(BaseModel):
    issue_id: str
    code: str
    category: Literal["dimension", "circulation", "safety", "consistency", "clearance", "egress"]
    title: str
    severity: Literal["high", "medium", "low"]
    location: IssueLocation
    detected_value: str
    expected_value: str
    measurement_type: Literal["verified", "estimated", "missing"] = "verified"
    explanation: str
    why_it_matters: str
    recommendation: str
    expected_impact: str
    confidence_score: float = 0.91
    manual_review_required: bool = True
    status: Literal["pending", "accepted", "rejected", "applied"] = "pending"
    correction_tag: str
    geometry_fix_key: Optional[str] = None


class PassedCheckModel(BaseModel):
    id: str
    title: str
    category: str
    measured_value: str
    target_value: str
    measurement_type: Literal["verified", "estimated"] = "verified"
    note: str


class CorrectionHistoryEntry(BaseModel):
    id: str
    issue_id: str
    title: str
    original_value: str
    revised_value: str
    action: Literal["accepted", "rejected", "applied", "undone", "reset"]
    timestamp: str
