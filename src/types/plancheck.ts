export type IssueSeverity = "high" | "medium" | "low";
export type IssueStatus = "open" | "accepted" | "dismissed" | "applied";
export type ProjectStatus = "Needs Review" | "Corrections Applied" | "3D Ready" | "Analyzed" | "Uploaded";
export type LayoutTemplate = "2br-apartment" | "res-plan-a" | "family-house" | "urban-compact";
export type UnitSystem = "metric" | "imperial";

export interface GeometryWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  is_exterior: boolean;
  label?: string;
  modified?: boolean;
}

export interface GeometryDoor {
  id: string;
  x: number;
  y: number;
  width: number;
  angle_deg: number;
  swing: "inward-left" | "inward-right" | "outward-left" | "outward-right";
  wall_id?: string;
  label: string;
  is_exit?: boolean;
  modified?: boolean;
}

export interface GeometryWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  angle_deg: number;
  sill_m: number;
  wall_id?: string;
  label: string;
}

export interface GeometryRoom {
  id: string;
  name: string;
  category: "bedroom" | "living" | "kitchen" | "bathroom" | "corridor" | "balcony" | "staircase" | "other";
  x: number;
  y: number;
  width: number;
  height: number;
  area_sqm: number;
  measurement_status: "verified" | "estimated";
}

export interface GeometryStair {
  id: string;
  x: number;
  y: number;
  width: number;
  length: number;
  steps: number;
  direction: string;
  clear_width_cm: number;
  modified?: boolean;
}

export interface GeometryDimension {
  id: string;
  label: string;
  value_cm: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status: "ok" | "warning" | "violation";
  measurement_status: "verified" | "estimated";
}

export interface GeometryAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  kind: "room" | "exit" | "correction" | "note";
}

export interface FloorPlanGeometry {
  width_m: number;
  height_m: number;
  wall_height_m: number;
  is_simulated_demo_geometry: boolean;
  scale_status: "verified" | "estimated";
  scale_note: string;
  cv_summary?: {
    width_px?: number;
    height_px?: number;
    aspect_ratio?: number;
    orientation?: string;
    wall_lines_detected?: number;
    room_contours_detected?: number;
    cv_confidence?: number;
    reliable_geometry?: boolean;
  } | null;
  walls: GeometryWall[];
  doors: GeometryDoor[];
  windows: GeometryWindow[];
  rooms: GeometryRoom[];
  stairs: GeometryStair[];
  dimensions: GeometryDimension[];
  annotations: GeometryAnnotation[];
}

export interface Scene3DData {
  footprint: {
    width_m: number;
    depth_m: number;
    wall_height_m: number;
    slab_thickness_m: number;
  };
  walls: Array<{
    id: string;
    label: string;
    cx: number;
    cz: number;
    length: number;
    thickness: number;
    height: number;
    rotation_y: number;
    is_exterior: boolean;
    modified: boolean;
  }>;
  rooms: Array<{
    id: string;
    name: string;
    category: string;
    cx: number;
    cz: number;
    width: number;
    depth: number;
    area_sqm: number;
    measurement_status: "verified" | "estimated";
  }>;
  doors: Array<{
    id: string;
    label: string;
    cx: number;
    cz: number;
    width: number;
    height: number;
    rotation_y: number;
    is_exit: boolean;
    modified: boolean;
  }>;
  windows: Array<{
    id: string;
    label: string;
    cx: number;
    cz: number;
    width: number;
    sill_m: number;
    height: number;
    rotation_y: number;
  }>;
  stairs: Array<{
    id: string;
    cx: number;
    cz: number;
    width: number;
    length: number;
    steps: number;
    clear_width_cm: number;
    modified: boolean;
  }>;
  roof: {
    width_m: number;
    depth_m: number;
    elevation_m: number;
  };
}

export interface PlanIssue {
  id: string;
  code: string;
  category: "Circulation" | "Egress" | "Clearance" | "Ventilation" | "Geometry" | "Dimension" | "Safety" | "Consistency";
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  detectedValue: string;
  suggestedTarget: string;
  measurementType?: "verified" | "estimated" | "missing";
  recommendation: string;
  reason: string;
  aiExplanation: string;
  whyItMatters?: string;
  expectedImpact?: string;
  confidenceScore?: number;
  manualReviewRequired?: boolean;
  /** Position on the 2D drawing in % (0-100) */
  markerX: number;
  markerY: number;
  /** Normalized bounding box (0..1) */
  locationBox?: { x: number; y: number; width: number; height: number };
  correctionTag: string;
  geometryFixKey?: "widen-staircase" | "reverse-door-swing" | "add-secondary-exit" | "widen-corridor";
}

export interface PassedCheck {
  id: string;
  title: string;
  category: string;
  measuredValue: string;
  targetValue: string;
  measurementType?: "verified" | "estimated";
  note: string;
}

export interface CorrectionHistoryEntry {
  id: string;
  issue_id: string;
  title: string;
  original_value: string;
  revised_value: string;
  action: "accepted" | "rejected" | "applied" | "undone" | "reset";
  timestamp: string;
}

export interface PlanProject {
  id: string;
  name: string;
  buildingType: string;
  lastModified: string;
  updatedAtIso: string;
  status: ProjectStatus;
  layoutTemplate: LayoutTemplate;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedPreviewUrl?: string;
  pageCount?: number;
  selectedPage?: number;
  pagePreviews?: string[];
  scaleCalibrated?: boolean;
  referenceWidthM?: number | null;
  totalAreaSqm: number;
  roomCount: number;
  issues: PlanIssue[];
  passedChecks: PassedCheck[];
  originalGeometry?: FloorPlanGeometry;
  currentGeometry?: FloorPlanGeometry;
  correctionHistory?: CorrectionHistoryEntry[];
  isSample: boolean;
}

export interface UserSettings {
  architectName: string;
  studioName: string;
  email: string;
  unitSystem: UnitSystem;
  showGridDefault: boolean;
  highContrastMarkers: boolean;
  notifications: {
    analysisComplete: boolean;
    issueAlerts: boolean;
    shareViews: boolean;
  };
}

export interface DashboardMetrics {
  totalProjects: number;
  plansAnalyzed: number;
  issuesDetected: number;
  issuesResolved: number;
}
