from __future__ import annotations
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

AuthorityId = Literal[
    "RAJUK", "CDA", "KDA", "RDA", "GDA", "CoxDA", "CITY_CORP", "MUNICIPALITY", "NATIONAL"
]
VerificationStatus = Literal["verified_reference", "preliminary_guidance", "pending_review"]


class RegulatoryRuleModel(BaseModel):
    rule_id: str
    authority: AuthorityId
    authority_full_name: str
    jurisdiction: str
    regulation: str
    year: int
    category: str
    building_type: str
    conditions: Dict[str, str]
    calculation_method: str
    source_document: str
    source_clause: str
    effective_from: str
    amendment_history: str
    verification_status: VerificationStatus
    summary: str
    formula_note: str


class JurisdictionDetectRequest(BaseModel):
    division: str = ""
    district: str
    upazila_or_area: str = ""
    plot_address: Optional[str] = None
    land_use_zone: str = "Residential (R1/R2)"


class JurisdictionDetectResponse(BaseModel):
    authority: AuthorityId
    authority_name: str
    jurisdiction_label: str
    planning_area: str
    applicable_regulations: List[str]
    seismic_zone: int
    z_factor: float
    verification_status: VerificationStatus
    needs_confirmation: bool
    confirmation_prompt: Optional[str] = None


class PlotAnalyzeRequest(BaseModel):
    project_name: str = "Untitled Plot"
    district: str
    upazila_or_area: str = ""
    plot_length_ft: Optional[float] = None
    plot_width_ft: Optional[float] = None
    total_area_sqm: Optional[float] = None
    road_width_ft: Optional[float] = None
    road_facing: str = "South"
    land_use_zone: str = "Residential (R1/R2)"
    building_purpose: str = "Residential"
    proposed_floors: Optional[int] = None


class PlotAnalyzeResponse(BaseModel):
    can_compute_final: bool
    missing_inputs: List[str]
    jurisdiction: JurisdictionDetectResponse
    total_area_sqm: Optional[float] = None
    area_katha: Optional[float] = None
    permissible_far: Optional[float] = None
    max_ground_coverage_pct: Optional[float] = None
    max_allowable_floor_area_sqm: Optional[float] = None
    max_footprint_sqm: Optional[float] = None
    front_setback_m: Optional[float] = None
    rear_setback_m: Optional[float] = None
    side_setback_m: Optional[float] = None
    recommended_max_floors: Optional[int] = None
    parking_spaces_required: Optional[int] = None
    warnings: List[str] = Field(default_factory=list)
    verification_status: VerificationStatus
    disclaimer: str


class AssistantQueryRequest(BaseModel):
    query: str
    district: str = "Dhaka"
    upazila_or_area: str = ""
    plot_area_sqm: Optional[float] = None
    road_width_ft: Optional[float] = None


class AssistantQueryResponse(BaseModel):
    answer: str
    applicable_regulation: str
    authority: str
    relevant_clause: str
    official_source: str
    calculation_explanation: str
    missing_information: List[str]
    verification_status: VerificationStatus
