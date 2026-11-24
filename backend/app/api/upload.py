from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.db import STORAGE_DIR, load_project, save_project
from app.models.project import AnalysisJobStatus, ProjectRecord
from app.schemas.project import SampleProjectRequest, ScaleCalibrationRequest, SelectPageRequest
from app.services.demo_geometry import build_demo_2br_geometry
from app.services.image_processing import normalize_and_analyze_image
from app.services.pdf_processing import get_pdf_page_count, render_pdf_pages
from app.services.room_detection import detect_rooms_and_geometry
from app.services.rule_engine import run_rule_engine
from app.utils.file_validation import format_file_size, generate_project_id, validate_upload_file

router = APIRouter(prefix="/api/projects", tags=["upload"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/upload")
async def upload_floor_plan(
    file: UploadFile = File(...),
    project_name: str = Form("Residential Apartment"),
    building_type: str = Form("Multi-Family Residential"),
):
    content = await file.read()
    ext = validate_upload_file(file, content)
    project_id = generate_project_id()

    proj_dir = STORAGE_DIR / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)

    original_filename = Path(file.filename or f"drawing.{ext}").name
    stored_path = proj_dir / f"original.{ext}"
    stored_path.write_bytes(content)

    page_count = 1
    page_previews = []
    preview_url = None

    if ext == "pdf":
        try:
            page_count = get_pdf_page_count(stored_path)
            page_previews = render_pdf_pages(stored_path, proj_dir, project_id)
            preview_url = page_previews[0] if page_previews else None
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not parse PDF file: {exc}")
    else:
        try:
            normalize_and_analyze_image(stored_path)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {exc}")
        preview_url = f"/storage/{project_id}/original.{ext}"
        page_previews = [preview_url]

    base_geom = detect_rooms_and_geometry("2br-apartment", is_sample=False)
    now = _now_iso()

    project = ProjectRecord(
        project_id=project_id,
        project_name=project_name.strip() or original_filename.rsplit(".", 1)[0],
        building_type=building_type.strip() or "Multi-Family Residential",
        original_file=original_filename,
        file_type=file.content_type or ("application/pdf" if ext == "pdf" else f"image/{ext}"),
        file_size=format_file_size(len(content)),
        page_count=page_count,
        selected_page=1,
        preview_url=preview_url,
        page_previews=page_previews,
        status="uploaded",
        layout_template="2br-apartment",
        is_sample=False,
        created_at=now,
        updated_at=now,
        scale_calibrated=False,
        total_area_sqm=round(sum(r.area_sqm for r in base_geom.rooms if r.category not in ("balcony", "corridor")), 1),
        room_count=len(base_geom.rooms),
        analysis_job=AnalysisJobStatus(status="idle", stage_label="Uploaded", progress=0),
        original_geometry=base_geom,
        current_geometry=base_geom,
    )
    save_project(project, undo_stack=[])
    return project


@router.post("/sample")
def create_sample_project(payload: SampleProjectRequest):
    template = payload.template if payload.template in ("2br-apartment", "res-plan-a", "family-house", "urban-compact") else "2br-apartment"
    project_id = generate_project_id()
    geom = build_demo_2br_geometry(template)
    now = _now_iso()

    names = {
        "2br-apartment": "Modern 2-Bedroom Apartment (Demo)",
        "res-plan-a": "Residential Floor Plan A (Demo)",
        "family-house": "Family House Design (Demo)",
        "urban-compact": "Compact Urban Residence (Demo)",
    }

    project = ProjectRecord(
        project_id=project_id,
        project_name=payload.project_name or names[template],
        building_type=payload.building_type or "Multi-Family Residential",
        original_file=f"{template}.pdf",
        file_type="application/pdf",
        file_size="2.4 MB",
        page_count=1,
        selected_page=1,
        status="uploaded",
        layout_template=template,  # type: ignore[arg-type]
        is_sample=True,
        created_at=now,
        updated_at=now,
        scale_calibrated=True,
        reference_width_m=12.4,
        total_area_sqm=109.6,
        room_count=len(geom.rooms),
        original_geometry=geom,
        current_geometry=geom,
    )
    save_project(project, undo_stack=[])
    return project


@router.post("/{project_id}/select-page")
def select_pdf_page(project_id: str, payload: SelectPageRequest):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.page > len(project.page_previews):
        raise HTTPException(status_code=400, detail="Requested page is out of range")
    project.selected_page = payload.page
    project.preview_url = project.page_previews[payload.page - 1]
    project.updated_at = _now_iso()
    save_project(project)
    return project


@router.post("/{project_id}/calibrate")
def calibrate_scale(project_id: str, payload: ScaleCalibrationRequest):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    cv_summary = project.current_geometry.cv_summary
    geom = detect_rooms_and_geometry(
        project.layout_template,
        cv_metrics=cv_summary,
        reference_width_m=payload.reference_width_m,
        is_sample=False,
    )
    issues, passed = run_rule_engine(geom)
    project.scale_calibrated = True
    project.reference_width_m = payload.reference_width_m
    project.original_geometry = geom
    project.current_geometry = geom
    project.issues = issues
    project.passed_checks = passed
    project.total_area_sqm = round(sum(r.area_sqm for r in geom.rooms if r.category not in ("balcony", "corridor")), 1)
    project.updated_at = _now_iso()
    save_project(project, undo_stack=[])
    return project
