from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import analysis, corrections, intelligence, projects, reports, upload, visualization
from app.db import STORAGE_DIR, ensure_dirs, init_db, list_all_projects, save_project
from app.models.project import AnalysisJobStatus, ProjectRecord
from app.services.demo_geometry import build_demo_2br_geometry
from app.services.geometry_engine import rebuild_geometry_from_issues
from app.services.rule_engine import run_rule_engine


def _seed_demo_projects() -> None:
    if list_all_projects():
        return

    now = datetime.now(timezone.utc).isoformat()
    samples = [
        ("demo-2br", "Modern 2-Bedroom Apartment", "Multi-Family Residential", "2br-apartment", "modern-2br-apartment.pdf", "needs_review", False),
        ("res-plan-a", "Residential Floor Plan A", "Duplex Residence", "res-plan-a", "residential-floor-plan-a.png", "corrections_applied", True),
        ("family-house", "Family House Design", "Single-Family Villa", "family-house", "family-house-ground-lvl.jpg", "3d_ready", True),
        ("urban-compact", "Compact Urban Residence", "Urban Micro-Apartment", "urban-compact", "compact-urban-unit-4B.pdf", "needs_review", False),
    ]

    for pid, name, btype, tpl, fname, status, apply_first_two in samples:
        orig = build_demo_2br_geometry(tpl)
        issues, passed = run_rule_engine(orig)
        if apply_first_two:
            for iss in issues[:2]:
                iss.status = "applied"
            curr = rebuild_geometry_from_issues(orig, issues)
        else:
            curr = orig

        rec = ProjectRecord(
            project_id=pid,
            project_name=name,
            building_type=btype,
            original_file=fname,
            file_type="application/pdf" if fname.endswith(".pdf") else "image/png",
            file_size="2.4 MB",
            page_count=1,
            selected_page=1,
            status=status,  # type: ignore[arg-type]
            layout_template=tpl,  # type: ignore[arg-type]
            is_sample=True,
            created_at=now,
            updated_at=now,
            scale_calibrated=True,
            reference_width_m=12.4,
            total_area_sqm=109.6,
            room_count=len(curr.rooms),
            analysis_job=AnalysisJobStatus(
                status="completed",
                stage_index=5,
                stage_label="Analysis Complete",
                stage_detail="Demo inspection complete.",
                progress=100,
            ),
            original_geometry=orig,
            current_geometry=curr,
            issues=issues,
            passed_checks=passed,
        )
        save_project(rec, undo_stack=[])


def create_app() -> FastAPI:
    ensure_dirs()
    init_db()
    _seed_demo_projects()

    app = FastAPI(
        title="PlanCheck AI API",
        version="1.0.0",
        description="Architectural floor plan processing, deterministic rule checking, geometry correction, and 3D scene generation API.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

    app.include_router(upload.router)
    app.include_router(projects.router)
    app.include_router(analysis.router)
    app.include_router(corrections.router)
    app.include_router(visualization.router)
    app.include_router(reports.router)
    app.include_router(intelligence.router)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "plancheck-ai-backend"}

    return app


app = create_app()
