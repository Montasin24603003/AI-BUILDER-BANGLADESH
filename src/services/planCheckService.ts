import { createDemo2BRIssues, DEMO_2BR_PASSED } from "@/data/mockProjects";
import { LayoutTemplate, PlanProject } from "@/types/plancheck";

/**
 * Clean abstraction layer for PlanCheck AI analysis.
 * Currently runs deterministic simulated checks locally for demo mode.
 * Designed so a FastAPI backend endpoint (e.g. POST /api/v1/plans/analyze)
 * can be plugged in cleanly without modifying UI components.
 */
export interface UploadPlanPayload {
  name: string;
  buildingType: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedPreviewUrl?: string;
  layoutTemplate?: LayoutTemplate;
}

export const ANALYSIS_STAGES = [
  { id: 1, label: "Uploading Drawing", detail: "Validating vector/raster layers and sheet DPI...", percent: 15 },
  { id: 2, label: "Parsing Floor Plan", detail: "Isolating structural walls, partitions, and openings...", percent: 34 },
  { id: 3, label: "Detecting Rooms and Dimensions", detail: "Segmenting living spaces, bedrooms, wet zones, and stair core...", percent: 55 },
  { id: 4, label: "Checking Basic Safety Rules", detail: "Running simulated circulation, clearance, and egress heuristics...", percent: 74 },
  { id: 5, label: "Identifying Design Issues", detail: "Flagging geometry conflicts and dimension anomalies...", percent: 90 },
  { id: 6, label: "Preparing Recommendations", detail: "Synthesizing corrective geometry options and 3D parameters...", percent: 100 },
] as const;

export function createAnalyzedProjectFromUpload(payload: UploadPlanPayload): PlanProject {
  const id = `plan-${Date.now().toString(36)}`;
  const template: LayoutTemplate = payload.layoutTemplate ?? "2br-apartment";

  const areaMap: Record<LayoutTemplate, { area: number; rooms: number }> = {
    "2br-apartment": { area: 109.6, rooms: 6 },
    "res-plan-a": { area: 134.8, rooms: 7 },
    "family-house": { area: 195.2, rooms: 8 },
    "urban-compact": { area: 67.4, rooms: 4 },
  };

  return {
    id,
    name: payload.name.trim() || payload.fileName.replace(/\.[^.]+$/, ""),
    buildingType: payload.buildingType || "Residential Apartment",
    lastModified: "Just now",
    updatedAtIso: new Date().toISOString(),
    status: "Needs Review",
    layoutTemplate: template,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    fileType: payload.fileType,
    uploadedPreviewUrl: payload.uploadedPreviewUrl,
    totalAreaSqm: areaMap[template].area,
    roomCount: areaMap[template].rooms,
    issues: createDemo2BRIssues(),
    passedChecks: DEMO_2BR_PASSED,
    isSample: !payload.uploadedPreviewUrl,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
