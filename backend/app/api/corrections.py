from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from app.db import load_project, load_undo_stack, save_project
from app.schemas.project import BatchCorrectionRequest
from app.services.geometry_engine import rebuild_geometry_from_issues, record_history

router = APIRouter(prefix="/api/projects/{project_id}/corrections", tags=["corrections"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _push_undo_snapshot(project_id: str, project) -> list[dict]:
    stack = load_undo_stack(project_id)
    stack.append(
        {
            "issues": [i.model_dump() for i in project.issues],
            "status": project.status,
        }
    )
    return stack[-20:]


@router.post("/{issue_id}/accept")
def accept_correction(project_id: str, issue_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target = next((i for i in project.issues if i.issue_id == issue_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Issue not found")

    undo_stack = _push_undo_snapshot(project_id, project)
    target.status = "accepted"
    project.current_geometry = rebuild_geometry_from_issues(project.original_geometry, project.issues)
    project.correction_history = record_history(
        project.correction_history, target, "accepted", target.expected_value
    )
    project.updated_at = _now_iso()
    save_project(project, undo_stack=undo_stack)
    return project


@router.post("/{issue_id}/reject")
def reject_correction(project_id: str, issue_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target = next((i for i in project.issues if i.issue_id == issue_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Issue not found")

    undo_stack = _push_undo_snapshot(project_id, project)
    target.status = "rejected"
    project.current_geometry = rebuild_geometry_from_issues(project.original_geometry, project.issues)
    project.correction_history = record_history(
        project.correction_history, target, "rejected", target.detected_value
    )
    project.updated_at = _now_iso()
    save_project(project, undo_stack=undo_stack)
    return project


@router.post("")
def apply_corrections(project_id: str, payload: BatchCorrectionRequest | None = None):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    undo_stack = _push_undo_snapshot(project_id, project)
    req = payload or BatchCorrectionRequest()

    applied_count = 0
    for iss in project.issues:
        should_apply = False
        if req.issue_ids:
            should_apply = iss.issue_id in req.issue_ids
        elif iss.status in ("accepted", "applied"):
            should_apply = True

        if should_apply:
            if iss.status != "applied":
                applied_count += 1
                project.correction_history = record_history(
                    project.correction_history, iss, "applied", iss.expected_value
                )
            iss.status = "applied"

    project.current_geometry = rebuild_geometry_from_issues(project.original_geometry, project.issues)
    project.status = "corrections_applied"
    project.updated_at = _now_iso()
    save_project(project, undo_stack=undo_stack)
    return {"applied_count": applied_count, "project": project}


@router.post("/undo")
def undo_last_correction(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stack = load_undo_stack(project_id)
    if not stack:
        raise HTTPException(status_code=400, detail="Nothing to undo")

    snapshot = stack.pop()
    from app.models.issue import PlanIssueModel

    project.issues = [PlanIssueModel.model_validate(item) for item in snapshot["issues"]]
    project.status = snapshot["status"]
    project.current_geometry = rebuild_geometry_from_issues(project.original_geometry, project.issues)
    if project.issues:
        project.correction_history = record_history(
            project.correction_history, project.issues[0], "undone", "Previous state restored"
        )
    project.updated_at = _now_iso()
    save_project(project, undo_stack=stack)
    return project


@router.post("/reset")
def reset_to_original(project_id: str):
    project = load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    undo_stack = _push_undo_snapshot(project_id, project)
    for iss in project.issues:
        iss.status = "pending"
    project.current_geometry = project.original_geometry
    project.status = "needs_review"
    if project.issues:
        project.correction_history = record_history(
            project.correction_history, project.issues[0], "reset", "Original drawing restored"
        )
    project.updated_at = _now_iso()
    save_project(project, undo_stack=undo_stack)
    return project
