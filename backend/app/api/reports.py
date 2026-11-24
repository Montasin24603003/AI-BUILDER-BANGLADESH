from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.db import load_project
from app.services.model_generator import generate_3d_scene_from_geometry
from app.services.report_generator import build_pdf_report

router = APIRouter(prefix="/api/projects", tags=["reports"])


@router.get("/{project_id}/report")
def download_pdf_report(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pdf_bytes = build_pdf_report(project)
    safe_slug = "".join(c if c.isalnum() or c in ("-", "_") else "-" for c in project.project_name.lower()).strip("-")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_slug or project.project_id}-report.pdf"'},
    )


@router.get("/{project_id}/share")
def get_share_payload(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "project": project,
        "model_3d": generate_3d_scene_from_geometry(project.current_geometry),
        "share_path": f"/project/{project.project_id}",
    }
