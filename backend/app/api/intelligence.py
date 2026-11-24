from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter
from app.models.bangladesh import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    JurisdictionDetectRequest,
    JurisdictionDetectResponse,
    PlotAnalyzeRequest,
    PlotAnalyzeResponse,
    RegulatoryRuleModel,
)
from app.services.regulatory_engine import (
    analyze_plot_backend,
    answer_regulatory_backend,
    detect_jurisdiction_backend,
    list_rules,
)

router = APIRouter(prefix="/api/v1/bd", tags=["Bangladesh Intelligence (PRIE)"])


@router.get("/laws", response_model=List[RegulatoryRuleModel])
def get_building_laws(authority: Optional[str] = None, category: Optional[str] = None):
    return list_rules(authority=authority, category=category)


@router.post("/jurisdiction/detect", response_model=JurisdictionDetectResponse)
def detect_jurisdiction_endpoint(req: JurisdictionDetectRequest):
    return detect_jurisdiction_backend(req)


@router.post("/plot/analyze", response_model=PlotAnalyzeResponse)
def analyze_plot_endpoint(req: PlotAnalyzeRequest):
    return analyze_plot_backend(req)


@router.post("/assistant/query", response_model=AssistantQueryResponse)
def query_regulatory_assistant(req: AssistantQueryRequest):
    return answer_regulatory_backend(req)
