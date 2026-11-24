import {
  FloorPlanGeometry,
  IssueStatus,
  LayoutTemplate,
  PlanIssue,
  PlanProject,
  ProjectStatus,
  Scene3DData,
} from "@/types/plancheck";

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    window.clearTimeout(timer);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendStatus(status: string): ProjectStatus {
  switch (status) {
    case "3d_ready":
      return "3D Ready";
    case "corrections_applied":
      return "Corrections Applied";
    case "needs_review":
      return "Needs Review";
    case "uploaded":
      return "Uploaded";
    default:
      return "Analyzed";
  }
}

function mapIssueStatus(status: string): IssueStatus {
  switch (status) {
    case "accepted":
      return "accepted";
    case "rejected":
      return "dismissed";
    case "applied":
      return "applied";
    default:
      return "open";
  }
}

function mapCategory(cat: string): PlanIssue["category"] {
  switch (cat) {
    case "dimension":
      return "Dimension";
    case "clearance":
      return "Clearance";
    case "safety":
      return "Safety";
    case "consistency":
      return "Consistency";
    default:
      return "Circulation";
  }
}

function formatRelativeTime(iso: string): string {
  try {
    const dt = new Date(iso);
    const diffSec = Math.round((Date.now() - dt.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recently";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendProject(raw: any): PlanProject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issues: PlanIssue[] = (raw.issues || []).map((iss: any) => ({
    id: iss.issue_id,
    code: iss.code || "PC-100",
    category: mapCategory(iss.category),
    title: iss.title,
    severity: iss.severity,
    status: mapIssueStatus(iss.status),
    detectedValue: iss.detected_value,
    suggestedTarget: iss.expected_value,
    measurementType: iss.measurement_type,
    recommendation: iss.recommendation,
    reason: iss.explanation,
    aiExplanation: iss.why_it_matters || iss.explanation,
    whyItMatters: iss.why_it_matters,
    expectedImpact: iss.expected_impact,
    confidenceScore: iss.confidence_score,
    manualReviewRequired: iss.manual_review_required,
    markerX: Math.round(((iss.location?.x ?? 0.5) as number) * 100),
    markerY: Math.round(((iss.location?.y ?? 0.5) as number) * 100),
    locationBox: iss.location,
    correctionTag: iss.correction_tag || iss.title,
    geometryFixKey: iss.geometry_fix_key || undefined,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passedChecks = (raw.passed_checks || []).map((pc: any) => ({
    id: pc.id,
    title: pc.title,
    category: pc.category,
    measuredValue: pc.measured_value,
    targetValue: pc.target_value,
    measurementType: pc.measurement_type,
    note: pc.note,
  }));

  return {
    id: raw.project_id,
    name: raw.project_name,
    buildingType: raw.building_type,
    lastModified: formatRelativeTime(raw.updated_at || raw.created_at),
    updatedAtIso: raw.updated_at || raw.created_at,
    status: mapBackendStatus(raw.status),
    layoutTemplate: (raw.layout_template || "2br-apartment") as LayoutTemplate,
    fileName: raw.original_file,
    fileSize: raw.file_size,
    fileType: raw.file_type,
    uploadedPreviewUrl: raw.preview_url || undefined,
    pageCount: raw.page_count ?? 1,
    selectedPage: raw.selected_page ?? 1,
    pagePreviews: raw.page_previews ?? [],
    scaleCalibrated: raw.scale_calibrated ?? true,
    referenceWidthM: raw.reference_width_m ?? null,
    totalAreaSqm: raw.total_area_sqm ?? 109.6,
    roomCount: raw.room_count ?? 6,
    issues,
    passedChecks,
    originalGeometry: raw.original_geometry as FloorPlanGeometry | undefined,
    currentGeometry: raw.current_geometry as FloorPlanGeometry | undefined,
    correctionHistory: raw.correction_history || [],
    isSample: Boolean(raw.is_sample),
  };
}

export const apiClient = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout("/api/health", undefined, 2500);
      return res.ok;
    } catch {
      return false;
    }
  },

  async listProjects() {
    const res = await fetchWithTimeout("/api/projects");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      projects: (data.projects || []).map(mapBackendProject),
      metrics: data.metrics,
    };
  },

  async getProject(id: string): Promise<PlanProject> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return mapBackendProject(await res.json());
  },

  async uploadDrawing(file: File, projectName: string, buildingType: string): Promise<PlanProject> {
    const form = new FormData();
    form.append("file", file);
    form.append("project_name", projectName);
    form.append("building_type", buildingType);
    const res = await fetchWithTimeout("/api/projects/upload", { method: "POST", body: form }, 25000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || `Upload failed (${res.status})`);
    }
    return mapBackendProject(await res.json());
  },

  async createSampleProject(template: string, projectName?: string, buildingType?: string): Promise<PlanProject> {
    const res = await fetchWithTimeout("/api/projects/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, project_name: projectName, building_type: buildingType }),
    });
    if (!res.ok) throw new Error(`Sample creation failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async selectPdfPage(projectId: string, page: number): Promise<PlanProject> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/select-page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
    if (!res.ok) throw new Error(`Page selection failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async calibrateScale(projectId: string, referenceWidthM: number): Promise<PlanProject> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/calibrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_width_m: referenceWidthM }),
    });
    if (!res.ok) throw new Error(`Scale calibration failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async startAnalysis(projectId: string) {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`Analysis start failed (${res.status})`);
    return res.json();
  },

  async getAnalysisStatus(projectId: string) {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/analysis`);
    if (!res.ok) throw new Error(`Analysis polling failed (${res.status})`);
    return res.json();
  },

  async acceptIssue(projectId: string, issueId: string): Promise<PlanProject> {
    const res = await fetchWithTimeout(
      `/api/projects/${encodeURIComponent(projectId)}/corrections/${encodeURIComponent(issueId)}/accept`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Accept failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async rejectIssue(projectId: string, issueId: string): Promise<PlanProject> {
    const res = await fetchWithTimeout(
      `/api/projects/${encodeURIComponent(projectId)}/corrections/${encodeURIComponent(issueId)}/reject`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error(`Reject failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async applyCorrections(projectId: string): Promise<{ applied_count: number; project: PlanProject }> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "apply_accepted" }),
    });
    if (!res.ok) throw new Error(`Apply failed (${res.status})`);
    const data = await res.json();
    return { applied_count: data.applied_count, project: mapBackendProject(data.project) };
  },

  async undoCorrection(projectId: string): Promise<PlanProject> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/corrections/undo`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Nothing to undo" }));
      throw new Error(err.detail || "Undo failed");
    }
    return mapBackendProject(await res.json());
  },

  async resetProject(projectId: string): Promise<PlanProject> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/corrections/reset`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`Reset failed (${res.status})`);
    return mapBackendProject(await res.json());
  },

  async get3DModel(projectId: string): Promise<{ scene: Scene3DData; is_simulated_demo_geometry: boolean }> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/model`);
    if (!res.ok) throw new Error(`3D model load failed (${res.status})`);
    return res.json();
  },

  async getSharePayload(projectId: string): Promise<{ project: PlanProject; model_3d: Scene3DData }> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}/share`);
    if (!res.ok) throw new Error(`Share load failed (${res.status})`);
    const data = await res.json();
    return { project: mapBackendProject(data.project), model_3d: data.model_3d };
  },

  async deleteProject(projectId: string): Promise<void> {
    const res = await fetchWithTimeout(`/api/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
  },

  getPdfReportUrl(projectId: string): string {
    return `/api/projects/${encodeURIComponent(projectId)}/report`;
  },

  getOriginalFileUrl(projectId: string): string {
    return `/api/projects/${encodeURIComponent(projectId)}/original`;
  },
};
