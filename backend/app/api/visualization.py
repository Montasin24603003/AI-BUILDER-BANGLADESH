from fastapi import APIRouter, HTTPException
from app.db import load_project
from app.services.model_generator import generate_3d_scene_from_geometry

router = APIRouter(prefix="/api/projects", tags=["visualization"])


@router.get("/{project_id}/geometry")
def get_geometry(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "project_id": project.project_id,
        "original_geometry": project.original_geometry,
        "current_geometry": project.current_geometry,
        "correction_history": project.correction_history,
    }


@router.get("/{project_id}/model")
def get_3d_model(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    scene = generate_3d_scene_from_geometry(project.current_geometry)
    return {
        "project_id": project.project_id,
        "project_name": project.project_name,
        "is_simulated_demo_geometry": project.current_geometry.is_simulated_demo_geometry,
        "scale_status": project.current_geometry.scale_status,
        "scene": scene,
    }
