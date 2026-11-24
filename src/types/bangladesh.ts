import { FloorPlanGeometry, LayoutTemplate, Scene3DData } from "./plancheck";

export type RegulatoryAuthorityId =
  | "RAJUK"
  | "CDA"
  | "KDA"
  | "RDA"
  | "GDA"
  | "CoxDA"
  | "CITY_CORP"
  | "MUNICIPALITY"
  | "NATIONAL";

export type VerificationStatus =
  | "verified_reference"
  | "preliminary_guidance"
  | "pending_review";

export type RuleCategory =
  | "FAR"
  | "Ground Coverage"
  | "Setback"
  | "Building Height"
  | "Road Width"
  | "Land Use"
  | "Parking"
  | "Open Space"
  | "Fire Safety"
  | "Ventilation"
  | "Structural & Seismic"
  | "Permits";

export type BuildingPurpose =
  | "Residential"
  | "Commercial"
  | "Mixed-Use"
  | "Institutional"
  | "Industrial";

export type LandUseZone =
  | "Residential (R1/R2)"
  | "Mixed-Use Zone"
  | "Commercial Zone"
  | "Urban Expansion / DAP"
  | "Agricultural / Flood Flow Restricted"
  | "Unverified / Needs Mouza Check";

export interface RegulatoryRule {
  rule_id: string;
  authority: RegulatoryAuthorityId;
  authority_full_name: string;
  jurisdiction: string;
  regulation: string;
  year: number;
  category: RuleCategory;
  building_type: string;
  conditions: Record<string, string>;
  calculation_method: "rule_based" | "lookup_table" | "minimum_threshold" | "advisory";
  source_document: string;
  source_clause: string;
  source_url?: string;
  effective_from: string;
  amendment_history: string;
  verification_status: VerificationStatus;
  summary: string;
  formula_note: string;
}

export interface JurisdictionLookupInput {
  division: string;
  district: string;
  upazilaOrArea: string;
  plotAddress?: string;
  coordinates?: string;
  landUseZone?: LandUseZone;
}

export interface JurisdictionLookupResult {
  authority: RegulatoryAuthorityId;
  authorityName: string;
  jurisdictionLabel: string;
  planningArea: string;
  applicableRegulations: string[];
  approvalWorkflow: string[];
  requiredDocuments: string[];
  seismicZone: {
    zone: number;
    zFactor: number;
    label: string;
    sourceClause: string;
  };
  verificationStatus: VerificationStatus;
  needsConfirmation: boolean;
  confirmationPrompt?: string;
}

export interface PlotAnalysisInput {
  projectName: string;
  division: string;
  district: string;
  upazilaOrArea: string;
  plotAddress?: string;
  coordinates?: { lat: number; lng: number };
  plotLengthFt?: number | null;
  plotWidthFt?: number | null;
  totalAreaSqm?: number | null;
  roadWidthFt?: number | null;
  roadFacing: "North" | "South" | "East" | "West" | "Corner";
  landUseZone: LandUseZone;
  buildingPurpose: BuildingPurpose;
  proposedFloors?: number | null;
}

export interface SetbackOutput {
  frontM: number;
  rearM: number;
  sideLeftM: number;
  sideRightM: number;
  sourceClause: string;
}

export interface PlotFeasibilityReport {
  id: string;
  createdAt: string;
  input: PlotAnalysisInput;
  jurisdiction: JurisdictionLookupResult;
  missingInputs: string[];
  canComputeFinal: boolean;
  areaMetrics: {
    totalAreaSqm: number;
    totalAreaSqft: number;
    areaKatha: number;
    areaDecimal: number;
  } | null;
  parameters: {
    permissibleFAR: number;
    maxGroundCoveragePct: number;
    maxAllowableFloorAreaSqm: number;
    maxAllowableFloorAreaSqft: number;
    maxFootprintSqm: number;
    mandatoryOpenSpaceSqm: number;
    mandatoryOpenSpacePct: number;
    recommendedMaxFloors: number;
    estimatedMaxHeightM: number;
    parkingSpacesRequired: number;
    setbacks: SetbackOutput;
  } | null;
  warnings: string[];
  assumptions: string[];
  citedRules: RegulatoryRule[];
  verificationStatus: VerificationStatus;
  disclaimer: string;
}

export interface DesignGenerationInput {
  projectName: string;
  plotLengthFt: number;
  plotWidthFt: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  hasSeparateDining: boolean;
  parkingSpaces: number;
  staircaseType: "Single-Flight" | "Dog-Legged" | "Central Core";
  style: "Modern Urban" | "Tropical Cross-Vent" | "Compact Family";
  naturalLightPriority: "High" | "Balanced";
  district: string;
  upazilaOrArea: string;
  roadWidthFt: number;
}

export interface GeneratedDesignVariant {
  id: string;
  variantKey: "A" | "B" | "C";
  title: string;
  subtitle: string;
  strategySummary: string;
  layoutTemplate: LayoutTemplate;
  geometry: FloorPlanGeometry;
  scene3d: Scene3DData;
  metrics: {
    footprintSqm: number;
    totalBuiltUpSqm: number;
    groundCoveragePct: number;
    proposedFAR: number;
    permissibleFAR: number | null;
    openSpacePct: number;
    daylightScore: number;
    ventilationScore: number;
    efficiencyScore: number;
  };
  complianceChecks: Array<{
    code: string;
    title: string;
    status: "pass" | "warning" | "fail";
    detail: string;
    clause: string;
  }>;
  elevations: {
    frontHeightM: number;
    plinthHeightM: number;
    parapetHeightM: number;
    floorToFloorM: number;
    facadeFeatures: string[];
  };
}

export interface StructuralAssistInput {
  plotAreaSqm: number;
  footprintSqm: number;
  floors: number;
  district: string;
  soilType: "Soft Clay / Alluvial" | "Medium Silty Clay" | "Stiff Clay / Dense Sand" | "Unverified (Soil Test Required)";
  bearingCapacityKpa: number | null;
  spanMaxM: number;
}

export interface StructuralAssistResult {
  seismicZone: number;
  zFactor: number;
  soilClassification: string;
  recommendedFoundation: string;
  preliminaryColumnGrid: {
    estimatedColumnsCount: number | null;
    typicalSpacingM: string;
    typicalColumnSizeMm: string;
    typicalBeamSizeMm: string;
    slabThicknessMm: number | null;
  };
  preliminaryQuantities: {
    concreteVolCum: number | null;
    rebarKg: number | null;
    foundationFactor: number | null;
  };
  earthquakeChecks: Array<{
    check: string;
    status: "Required" | "Advisory" | "Critical";
    clause: string;
    note: string;
  }>;
  mepModules: Array<{
    discipline: "Electrical" | "Plumbing" | "Sanitary" | "Fire Safety" | "HVAC" | "Interior" | "Landscape";
    summary: string;
    keySpecs: string[];
    clauseRef: string;
  }>;
  disclaimer: string;
}

export interface PermitChecklistItem {
  id: string;
  category: "Land & Legal" | "Architectural Drawings" | "Structural & Soil" | "Clearances & NOC";
  title: string;
  description: string;
  requiredBy: string;
  completed: boolean;
  mandatory: boolean;
}

export interface CostEstimateInput {
  totalBuiltUpSqft: number;
  floors: number;
  finishTier: "Standard" | "Mid-Range" | "Premium";
  foundationType: "Isolated Footing" | "Mat / Raft" | "Pile Foundation";
  rates: {
    cementPerBagBdt: number;
    steelPerTonBdt: number;
    brickPerPieceBdt: number;
    sandPerCftBdt: number;
    labourPerSqftBdt: number;
  };
}

export interface CostEstimateBreakdown {
  totalEstimatedBdt: number;
  costPerSqftBdt: number;
  rangeMinBdt: number;
  rangeMaxBdt: number;
  materials: {
    cementBags: number;
    cementCostBdt: number;
    steelTons: number;
    steelCostBdt: number;
    bricksCount: number;
    bricksCostBdt: number;
    sandCft: number;
    sandCostBdt: number;
    aggregateCft: number;
    aggregateCostBdt: number;
  };
  trades: {
    labourBdt: number;
    electricalBdt: number;
    plumbingSanitaryBdt: number;
    finishingBdt: number;
    foundationSurchargeBdt: number;
  };
  assumptions: string[];
}

export interface ClimateReport {
  district: string;
  roadFacing: string;
  solarExposure: {
    southFaceNote: string;
    westHeatMitigation: string;
    windowToWallRatioRec: string;
  };
  ventilationStrategy: string[];
  rainwaterHarvesting: {
    roofAreaSqm: number;
    annualMonsoonCaptureLiters: number;
    recommendedTankLiters: number;
  };
  floodAndPlinthGuidance: {
    recommendedPlinthHeightFt: number;
    reason: string;
    dataStatus: "approximate_climate_guidance";
  };
  heatReductionStrategies: string[];
}

export interface RegulatoryChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  structuredAnswer?: {
    applicableRegulation: string;
    authority: string;
    relevantClause: string;
    officialSource: string;
    calculationExplanation: string;
    missingInformation: string[];
    verificationStatus: VerificationStatus;
  };
}
