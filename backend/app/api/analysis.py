import asyncio
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.db import STORAGE_DIR, load_project, save_project
from app.models.project import AnalysisJobStatus
from app.schemas.analysis import AnalyzeRequest
from app.services.dimension_detection import extract_dimension_summary
from app.services.image_processing import normalize_and_analyze_image
from app.services.recommendation_engine import enrich_recommendations_with_ai
from app.services.room_detection import detect_rooms_and_geometry
from app.services.rule_engine import run_rule_engine

router = APIRouter(prefix="/api/projects", tags=["analysis"])

STAGES = [
    (1, "Uploading Drawing", "Validating vector/raster layers and file integrity...", 15),
    (2, "Parsing Floor Plan", "Running OpenCV wall segmentation and line detection...", 34),
    (3, "Detecting Rooms and Dimensions", "Extracting room polygons and checking scale calibration...", 55),
    (4, "Checking Basic Safety Rules", "Evaluating staircase width, door swings, and egress paths...", 74),
    (5, "Identifying Design Issues", "Generating normalized issue coordinates and confidence scores...", 90),
    (6, "Preparing Recommendations", "Synthesizing AI architectural explanations and 3D parameters...", 100),
]


async def _run_analysis_pipeline(project_id: str, params: AnalyzeRequest) -> None:
    project = load_project(project_id)
    if not project:
        return

    try:
        cv_metrics = None
        for idx, label, detail, pct in STAGES:
            project.status = "analyzing"
            project.analysis_job = AnalysisJobStatus(
                status="running",
                stage_index=idx - 1,
                stage_label=label,
                stage_detail=detail,
                progress=pct,
            )

            # Stage 2: run real OpenCV image processing on uploaded drawing if present
            if idx == 2 and not project.is_sample:
                proj_dir = STORAGE_DIR / project_id
                target_img: Path | None = None
                if project.preview_url and project.preview_url.startswith("/storage/"):
                    rel = project.preview_url.replace("/storage/", "", 1)
                    candidate = STORAGE_DIR / rel
                    if candidate.exists():
                        target_img = candidate
                if target_img and target_img.suffix.lower() in (".png", ".jpg", ".jpeg"):
                    cv_metrics = normalize_and_analyze_image(target_img)

            # Stage 5: run room detection, rule engine, and recommendation enrichment
            if idx == 5:
                ref_w = params.reference_width_m or project.reference_width_m
                geom = detect_rooms_and_geometry(
                    template=project.layout_template,
                    cv_metrics=cv_metrics,
                    reference_width_m=ref_w,
                    is_sample=project.is_sample,
                )
                issues, passed = run_rule_engine(
                    geom,
                    stair_target_cm=params.stair_target_cm,
                    min_door_clearance_cm=params.min_door_clearance_cm,
                )
                issues = enrich_recommendations_with_ai(issues)

                project.original_geometry = geom
                project.current_geometry = geom
                project.issues = issues
                project.passed_checks = passed
                project.room_count = len(geom.rooms)
                project.total_area_sqm = round(
                    sum(r.area_sqm for r in geom.rooms if r.category not in ("balcony", "corridor")), 1
                )

            save_project(project)
            await asyncio.sleep(0.45)

        project.status = "needs_review"
        project.updated_at = datetime.now(timezone.utc).isoformat()
        project.analysis_job = AnalysisJobStatus(
            status="completed",
            stage_index=5,
            stage_label="Analysis Complete",
            stage_detail="Structured geometry and inspection findings are ready.",
            progress=100,
        )
        save_project(project, undo_stack=[])
    except Exception as exc:
        project = load_project(project_id)
        if project:
            project.status = "failed"
            project.analysis_job = AnalysisJobStatus(
                status="failed",
                stage_index=0,
                stage_label="Analysis Failed",
                stage_detail=str(exc),
                progress=0,
                error=str(exc),
            )
            save_project(project)


@router.post("/{project_id}/analyze")
async def start_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    payload: AnalyzeRequest | None = None,
):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req = payload or AnalyzeRequest()
    project.status = "analyzing"
    project.analysis_job = AnalysisJobStatus(
        status="running",
        stage_index=0,
        stage_label=STAGES[0][1],
        stage_detail=STAGES[0][2],
        progress=15,
    )
    save_project(project)
    background_tasks.add_task(_run_analysis_pipeline, project_id, req)
    return {"project_id": project_id, "job": project.analysis_job}


@router.get("/{project_id}/analysis")
def get_analysis_status(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "project_id": project.project_id,
        "status": project.status,
        "job": project.analysis_job,
        "scale_status": project.current_geometry.scale_status,
        "scale_note": project.current_geometry.scale_note,
        "cv_summary": project.current_geometry.cv_summary,
        "dimensions": extract_dimension_summary(project.current_geometry),
        "issues": project.issues,
        "passed_checks": project.passed_checks,
    }
