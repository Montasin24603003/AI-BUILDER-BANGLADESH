from __future__ import annotations
import json
import os
import sqlite3
from pathlib import Path
from typing import List, Optional
from app.models.floor_plan import FloorPlanGeometry
from app.models.project import ProjectRecord

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = BASE_DIR / "storage"
DB_PATH = DATA_DIR / "plancheck.db"


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                undo_stack_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS regulatory_rules (
                rule_id TEXT PRIMARY KEY,
                authority TEXT NOT NULL,
                jurisdiction TEXT NOT NULL,
                category TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                verification_status TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS plot_analyses (
                plot_id TEXT PRIMARY KEY,
                district TEXT NOT NULL,
                authority TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_project(project: ProjectRecord, undo_stack: Optional[List[dict]] = None) -> None:
    conn = get_conn()
    try:
        existing = conn.execute(
            "SELECT undo_stack_json FROM projects WHERE project_id = ?", (project.project_id,)
        ).fetchone()
        if undo_stack is None:
            stack_json = existing["undo_stack_json"] if existing else "[]"
        else:
            stack_json = json.dumps(undo_stack)

        conn.execute(
            """
            INSERT INTO projects (project_id, payload_json, undo_stack_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET
                payload_json = excluded.payload_json,
                undo_stack_json = excluded.undo_stack_json,
                updated_at = excluded.updated_at
            """,
            (
                project.project_id,
                project.model_dump_json(),
                stack_json,
                project.created_at,
                project.updated_at,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def load_project(project_id: str) -> Optional[ProjectRecord]:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT payload_json FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if not row:
            return None
        return ProjectRecord.model_validate_json(row["payload_json"])
    finally:
        conn.close()


def load_undo_stack(project_id: str) -> List[dict]:
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT undo_stack_json FROM projects WHERE project_id = ?", (project_id,)
        ).fetchone()
        if not row:
            return []
        return json.loads(row["undo_stack_json"])
    finally:
        conn.close()


def list_all_projects() -> List[ProjectRecord]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT payload_json FROM projects ORDER BY updated_at DESC").fetchall()
        return [ProjectRecord.model_validate_json(r["payload_json"]) for r in rows]
    finally:
        conn.close()


def delete_project_record(project_id: str) -> bool:
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
