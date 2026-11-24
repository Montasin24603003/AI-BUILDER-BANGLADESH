from __future__ import annotations
from typing import Dict, List, Optional
from app.models.bangladesh import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    JurisdictionDetectRequest,
    JurisdictionDetectResponse,
    PlotAnalyzeRequest,
    PlotAnalyzeResponse,
    RegulatoryRuleModel,
)

SQFT_TO_SQM = 0.092903
KATHA_TO_SQM = 66.8902

DISCLAIMER = (
    "Preliminary AI & rule-based planning assistance only. Does not constitute certified code compliance "
    "or official approval from RAJUK, CDA, KDA, RDA, GDA, CoxDA, or any municipality."
)

DISTRICT_AUTHORITY_MAP: Dict[str, dict] = {
    "dhaka": {"authority": "RAJUK", "name": "Rajdhani Unnayan Kartripakkha (RAJUK)", "zone": 2, "z": 0.20},
    "chattogram": {"authority": "CDA", "name": "Chattogram Development Authority (CDA)", "zone": 3, "z": 0.28},
    "khulna": {"authority": "KDA", "name": "Khulna Development Authority (KDA)", "zone": 1, "z": 0.12},
    "rajshahi": {"authority": "RDA", "name": "Rajshahi Development Authority (RDA)", "zone": 2, "z": 0.20},
    "gazipur": {"authority": "GDA", "name": "Gazipur Development Authority (GDA)", "zone": 2, "z": 0.20},
    "cox's bazar": {"authority": "CoxDA", "name": "Cox's Bazar Development Authority (CoxDA)", "zone": 3, "z": 0.28},
    "sylhet": {"authority": "CITY_CORP", "name": "Sylhet City Corporation (SCC) / Pourashava", "zone": 4, "z": 0.36},
}

PRIE_RULES: List[RegulatoryRuleModel] = [
    RegulatoryRuleModel(
        rule_id="RAJUK-FAR-001",
        authority="RAJUK",
        authority_full_name="Rajdhani Unnayan Kartripakkha (RAJUK)",
        jurisdiction="Dhaka",
        regulation="Dhaka Metropolitan Building Rules, 2025",
        year=2025,
        category="FAR",
        building_type="Residential",
        conditions={"plot_area": "required", "road_width": "required", "zone": "required"},
        calculation_method="rule_based",
        source_document="S.R.O. No. 469-Law/2025, Bangladesh Gazette (14 Dec 2025); RAJUK DAP 2022â€“2035",
        source_clause="Plot-specific rule, schedule, and DAP land-use map sheet must be checked; official values are not encoded here",
        effective_from="Gazetted 14 December 2025; check for later amendments",
        amendment_history="The 2025 Rules replaced the 2008 Dhaka Metropolitan Building Rules",
        verification_status="preliminary_guidance",
        summary="FAR depends on the applicable 2025 rule schedule and DAP land-use controls for the exact parcel.",
        formula_note="The app does not calculate a permitted FAR until the controlling official schedule is supplied and verified.",
    ),
    RegulatoryRuleModel(
        rule_id="BNBC-CIR-001",
        authority="NATIONAL",
        authority_full_name="Bangladesh National Building Code (BNBC 2020)",
        jurisdiction="All Bangladesh",
        regulation="BNBC 2020 â€” Part 3 & Part 4",
        year=2020,
        category="Fire Safety",
        building_type="Residential / Commercial",
        conditions={"occupancy_class": "required", "building_height": "required"},
        calculation_method="minimum_threshold",
        source_document="Bangladesh National Building Code (BNBC 2020), Gazette S.R.O. No. 55-Law/2020",
        source_clause="Applicable BNBC occupancy chapter and Part 4 egress provisions; dimensional checks are not encoded",
        effective_from="2021-02-11",
        amendment_history="Gazetted Feb 2021 replacing BNBC 2006",
        verification_status="pending_review",
        summary="BNBC 2020 includes occupancy- and building-specific means-of-egress requirements. Dimensional checks are not encoded.",
        formula_note="Check the official BNBC provisions for occupancy, occupant load, and building configuration.",
    ),
]


def list_rules(authority: Optional[str] = None, category: Optional[str] = None) -> List[RegulatoryRuleModel]:
    res = PRIE_RULES
    if authority and authority != "ALL":
        res = [r for r in res if r.authority == authority]
    if category and category != "ALL":
        res = [r for r in res if r.category.lower() == category.lower()]
    return res


def detect_jurisdiction_backend(req: JurisdictionDetectRequest) -> JurisdictionDetectResponse:
    key = req.district.strip().lower()
    meta = DISTRICT_AUTHORITY_MAP.get(
        key,
        {"authority": "MUNICIPALITY", "name": "Local Pourashava / City Corporation Building Authority", "zone": 2, "z": 0.20},
    )
    needs_confirmation = req.land_use_zone == "Unverified / Needs Mouza Check" or key not in DISTRICT_AUTHORITY_MAP
    prompt = (
        "Confirm exact Pourashava / Mouza zoning with local authority before finalizing parameters."
        if needs_confirmation
        else None
    )
    regs = ["Bangladesh National Building Code (BNBC 2020)"]
    if meta["authority"] == "RAJUK":
        regs.extend(["Dhaka Metropolitan Building Rules, 2025 (S.R.O. 469-Law/2025)", "RAJUK Detailed Area Plan (DAP 2022â€“2035)"])
    else:
        regs.append(f"{meta['authority']} Local Building Rules & Building Construction Act 1952")

    return JurisdictionDetectResponse(
        authority=meta["authority"],
        authority_name=meta["name"],
        jurisdiction_label=f"{req.upazila_or_area + ', ' if req.upazila_or_area else ''}{req.district}",
        planning_area=f"{req.district} Planning Jurisdiction",
        applicable_regulations=regs,
        seismic_zone=meta["zone"],
        z_factor=meta["z"],
        verification_status="preliminary_guidance",
        needs_confirmation=True,
        confirmation_prompt=prompt or "District-level lookup does not verify the parcel's authority boundary, DAP block, mouza, or land-use clearance. Confirm these with the relevant authority.",
    )


def analyze_plot_backend(req: PlotAnalyzeRequest) -> PlotAnalyzeResponse:
    jur = detect_jurisdiction_backend(
        JurisdictionDetectRequest(
            district=req.district,
            upazila_or_area=req.upazila_or_area,
            land_use_zone=req.land_use_zone,
        )
    )
    missing: List[str] = []
    has_dims = bool(req.plot_length_ft and req.plot_length_ft > 0 and req.plot_width_ft and req.plot_width_ft > 0)
    has_area = bool(req.total_area_sqm and req.total_area_sqm > 0)
    if not has_dims and not has_area:
        missing.append("Plot dimensions or total area")
    if not req.road_width_ft or req.road_width_ft <= 0:
        missing.append("Abutting road width (ft)")
    if req.land_use_zone == "Unverified / Needs Mouza Check":
        missing.append("Verified land-use category")

    # Area arithmetic is safe; regulatory allowances are not. The live authority schedule
    # and plot-level zoning layer are not integrated, so never return guessed FAR/coverage.
    missing.append("Official plot-specific land-use clearance and applicable authority schedule (DAP block / mouza)")
    area_sqm = float(req.total_area_sqm) if has_area else (
        float(req.plot_length_ft) * float(req.plot_width_ft) * SQFT_TO_SQM if has_dims else None
    )
    return PlotAnalyzeResponse(
        can_compute_final=False,
        missing_inputs=missing,
        jurisdiction=jur,
        total_area_sqm=round(area_sqm, 2) if area_sqm is not None else None,
        area_katha=round(area_sqm / KATHA_TO_SQM, 2) if area_sqm is not None else None,
        warnings=["FAR, coverage, setbacks, parking, and storey limits are withheld until the controlling parcel-specific official schedule is verified."],
        verification_status="pending_review",
        disclaimer=DISCLAIMER,
    )

def answer_regulatory_backend(req: AssistantQueryRequest) -> AssistantQueryResponse:
    jur = detect_jurisdiction_backend(
        JurisdictionDetectRequest(district=req.district, upazila_or_area=req.upazila_or_area)
    )
    missing: List[str] = []
    if not req.plot_area_sqm:
        missing.append("Plot area (sqm)")
    if not req.road_width_ft:
        missing.append("Road width (ft)")

    rule = PRIE_RULES[0] if jur.authority == "RAJUK" else PRIE_RULES[1]
    return AssistantQueryResponse(
        answer=(
            f"For {jur.jurisdiction_label}, the governing authority is {jur.authority_name} alongside BNBC 2020."
        ),
        applicable_regulation=rule.regulation,
        authority=jur.authority_name,
        relevant_clause=rule.source_clause,
        official_source=rule.source_document,
        calculation_explanation=rule.formula_note,
        missing_information=missing,
        verification_status=rule.verification_status,
    )

