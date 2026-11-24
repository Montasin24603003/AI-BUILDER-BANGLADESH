import {
  BANGLADESH_DISTRICTS,
  BANGLADESH_REGULATORY_RULES,
  DistrictGeoMeta,
} from "@/data/bangladeshRules";
import {
  ClimateReport,
  CostEstimateBreakdown,
  CostEstimateInput,
  DesignGenerationInput,
  GeneratedDesignVariant,
  JurisdictionLookupInput,
  JurisdictionLookupResult,
  PermitChecklistItem,
  PlotAnalysisInput,
  PlotFeasibilityReport,
  RegulatoryAuthorityId,
  RegulatoryChatMessage,
  RegulatoryRule,
  StructuralAssistInput,
  StructuralAssistResult,
} from "@/types/bangladesh";
import { FloorPlanGeometry, LayoutTemplate, Scene3DData } from "@/types/plancheck";

const SQFT_TO_SQM = 0.092903;
const SQM_TO_SQFT = 10.76391;
const KATHA_TO_SQM = 66.8902; // 1 Katha = 720 sq ft = 66.8902 sqm
const DECIMAL_TO_SQM = 40.4686; // 1 Decimal (Shotok) = 435.6 sq ft

export const PLATFORM_DISCLAIMER =
  "Preliminary AI & rule-based planning assistance only. Does not constitute certified code compliance, legal land clearance, or official approval from RAJUK, CDA, KDA, RDA, GDA, CoxDA, or any municipality. Engage a BNBC-licensed architect and structural engineer before construction.";

export function findDistrictMeta(districtName: string): DistrictGeoMeta {
  const norm = districtName.trim().toLowerCase();
  return (
    BANGLADESH_DISTRICTS.find((d) => d.district.toLowerCase() === norm) ??
    BANGLADESH_DISTRICTS[BANGLADESH_DISTRICTS.length - 1]
  );
}

/**
 * Location-Based Authority & Jurisdiction Detector
 */
export function detectJurisdiction(input: JurisdictionLookupInput): JurisdictionLookupResult {
  const meta = findDistrictMeta(input.district);
  const area = input.upazilaOrArea.trim();
  const areaLower = area.toLowerCase();

  let authority: RegulatoryAuthorityId = meta.defaultAuthority;
  let authorityName = meta.authorityName;
  let planningArea = `${meta.district} Urban Planning Jurisdiction`;
  let needsConfirmation = false;
  let confirmationPrompt: string | undefined;

  // Specific fringe/overlap awareness
  if (meta.district === "Dhaka") {
    planningArea = "Dhaka Metropolitan Development Plan (DMDP / DAP 2022–2035)";
    if (areaLower.includes("savar") || areaLower.includes("dhamrai")) {
      needsConfirmation = true;
      confirmationPrompt =
        "Outer Dhaka upazilas (e.g. Savar / Dhamrai) have areas under RAJUK DAP as well as local Pourashava jurisdiction. Confirm exact Mouza / CS-SA-RS plot coverage.";
    }
  } else if (meta.district === "Narayanganj" || meta.district === "Gazipur") {
    needsConfirmation = true;
    confirmationPrompt = `Fringe zones in ${meta.district} may fall under ${
      meta.district === "Gazipur" ? "GDA vs RAJUK DMDP boundary" : "RAJUK DMDP vs Narayanganj City Corporation"
    }. Confirm jurisdiction on your Land Use Clearance.`;
  } else if (!area || meta.district === "Other District / Upazila") {
    needsConfirmation = true;
    confirmationPrompt =
      "Exact Pourashava / Union Parishad ward boundary cannot be verified automatically. Confirm whether the plot lies inside a Class A/B/C Pourashava or rural Union.";
  }

  if (input.landUseZone === "Unverified / Needs Mouza Check") {
    needsConfirmation = true;
    confirmationPrompt =
      confirmationPrompt ||
      "Land-use zoning is unverified. Request a formal Land Use Clearance (ভূমি ব্যবহার ছাড়পত্র) before finalizing FAR.";
  }

  const applicableRegulations: string[] = ["Bangladesh National Building Code (BNBC 2020)"];
  if (authority === "RAJUK") {
    applicableRegulations.push(
      "Dhaka Metropolitan Building Rules, 2025 (S.R.O. No. 469-Law/2025)",
      "RAJUK Detailed Area Plan (DAP 2022–2035)",
      "Building Construction Act 1952"
    );
  } else if (authority === "CDA" || authority === "KDA" || authority === "RDA" || authority === "GDA" || authority === "CoxDA") {
    applicableRegulations.push(
      `${authority} Master Plan & Building Plan Approval Rules`,
      "Building Construction Act 1952",
      ...(authority === "CoxDA" ? ["Coastal ECA & Cyclone Wind Load Provisions (BNBC 2020)"] : [])
    );
  } else {
    applicableRegulations.push(
      "Building Construction Rules 1996 (Non-RAJUK Municipalities)",
      "Local Pourashava / City Corporation Bye-Laws"
    );
  }
  applicableRegulations.push("Fire Prevention and Extinction Act 2003 (if >= 7 floors / > 20m / commercial)");

  const approvalWorkflow =
    authority === "RAJUK"
      ? [
          "1. Apply for Land Use Clearance (LUC) online via RAJUK e-Permitting (ECP).",
          "2. Commission Digital Topographic Survey & Geotechnical Soil Investigation.",
          "3. Prepare Architectural, Structural & MEP drawings signed by IAB/IEB registered professionals.",
          "4. Obtain utility / FSCD / CAAB / DoE NOCs (if high-rise > 6–10 stories or special zone).",
          "5. Submit Building Permit (Plan Sanction) to RAJUK Zonal Office.",
        ]
      : [
          `1. Verify Mouza & Zoning Clearance with ${authorityName}.`,
          "2. Prepare Architectural & Structural drawings certified by licensed Architect/Engineer.",
          "3. Obtain Fire Service (FSCD) NOC if building >= 7 stories (> 20m) or commercial.",
          `4. Submit formal Plan Approval application to ${authorityName} Engineering/Planning Dept.`,
        ];

  const requiredDocuments = [
    "Registered Ownership Deed (Dalil) & Up-to-date Mutation (Namjari) Khatian",
    "Up-to-date Land Development Tax (Khajna) Receipt",
    "CS / SA / RS / BS Mouza Map & Plot Survey Sketch",
    "National ID (NID) of Landowner(s)",
    "Architectural Plan Set (Site Plan, Floor Plans, Elevations, Sections)",
    "Structural Design Drawings & Soil Investigation Report (for RCC structures)",
    ...(authority === "RAJUK" ? ["RAJUK Land Use Clearance (LUC)"] : []),
  ];

  return {
    authority,
    authorityName,
    jurisdictionLabel: `${area ? area + ", " : ""}${meta.district}`,
    planningArea,
    applicableRegulations,
    approvalWorkflow,
    requiredDocuments,
    seismicZone: {
      zone: meta.seismicZone,
      zFactor: meta.zFactor,
      label: `Seismic Zone ${meta.seismicZone} (Z = ${meta.zFactor.toFixed(2)})`,
      sourceClause: "BNBC 2020 Part 6, Ch. 2, Table 6.2.14",
    },
    // District/area labels do not prove the parcel is inside an authority boundary or DAP zone.
    verificationStatus: "preliminary_guidance",
    needsConfirmation,
    confirmationPrompt,
  };
}

/**
 * Deterministic Plot Analyzer (FAR, MGC, Setbacks, Height, Parking)
 */
export function analyzePlot(input: PlotAnalysisInput): PlotFeasibilityReport {
  const jurisdiction = detectJurisdiction({
    division: input.division,
    district: input.district,
    upazilaOrArea: input.upazilaOrArea,
    plotAddress: input.plotAddress,
    landUseZone: input.landUseZone,
  });

  const missingInputs: string[] = [];
  const hasDimensions = Boolean(input.plotLengthFt && input.plotLengthFt > 0 && input.plotWidthFt && input.plotWidthFt > 0);
  const hasArea = Boolean(input.totalAreaSqm && input.totalAreaSqm > 0);

  if (!hasDimensions && !hasArea) {
    missingInputs.push("Plot dimensions (Length × Width in ft) or Total Plot Area (sqm)");
  }
  if (!input.roadWidthFt || input.roadWidthFt <= 0) {
    missingInputs.push("Adjacent Road Width (in ft)");
  }
  if (!input.district) {
    missingInputs.push("District / Location");
  }
  // A DAP block / mouza-specific approved schedule is not currently available in this app.
  // Never turn generic examples into a site-specific regulatory allowance.
  missingInputs.push("Official plot-specific land-use clearance and applicable authority schedule (DAP block / mouza)");
  if (input.landUseZone === "Unverified / Needs Mouza Check") {
    missingInputs.push("Verified Land-Use Category");
  }

  const canComputeFinal = missingInputs.length === 0;

  return {
    id: `plot-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    input,
    jurisdiction,
    missingInputs,
    canComputeFinal,
    areaMetrics: hasDimensions || hasArea
      ? buildAreaMetrics(
          hasArea
            ? (input.totalAreaSqm as number)
            : (input.plotLengthFt as number) * (input.plotWidthFt as number) * SQFT_TO_SQM
        )
      : null,
    parameters: null,
    warnings: [
      "Plot area can be converted, but this app has no verified plot-specific authority schedule. FAR, coverage, setbacks, parking, and storey limits are withheld until the applicable official clearance and schedule are supplied.",
      ...(jurisdiction.confirmationPrompt ? [jurisdiction.confirmationPrompt] : []),
    ],
    assumptions: ["The map pin and typed address are location aids only; they do not verify a RAJUK DAP block, mouza, zoning, or approval boundary."],
    citedRules: getRelevantRulesForAuthority(jurisdiction.authority),
    verificationStatus: "pending_review",
    disclaimer: PLATFORM_DISCLAIMER,
  };
}

function buildAreaMetrics(totalAreaSqm: number) {
  return {
    totalAreaSqm: Number(totalAreaSqm.toFixed(2)),
    totalAreaSqft: Number((totalAreaSqm * SQM_TO_SQFT).toFixed(1)),
    areaKatha: Number((totalAreaSqm / KATHA_TO_SQM).toFixed(2)),
    areaDecimal: Number((totalAreaSqm / DECIMAL_TO_SQM).toFixed(2)),
  };
}

export function getRelevantRulesForAuthority(authority: RegulatoryAuthorityId): RegulatoryRule[] {
  return BANGLADESH_REGULATORY_RULES.filter(
    (r) => r.authority === authority || r.authority === "NATIONAL"
  );
}

/**
 * Produces three illustrative layout concepts. No code or permit validation is performed.
 */
export function generateDesignVariants(input: DesignGenerationInput): GeneratedDesignVariant[] {
  const plotW_m = Math.max(7.5, Number((input.plotWidthFt * 0.3048).toFixed(2)));
  const plotL_m = Math.max(9.0, Number((input.plotLengthFt * 0.3048).toFixed(2)));
  const plotAreaSqm = plotW_m * plotL_m;

  // Illustrative margins for a schematic only; they do not represent approved setbacks.
  const bldgW = Math.max(6.2, Number((plotW_m - 2.2).toFixed(2)));
  const bldgH = Math.max(7.4, Number((plotL_m - 3.3).toFixed(2)));

  const feasibility = analyzePlot({
    projectName: input.projectName,
    division: "Dhaka",
    district: input.district,
    upazilaOrArea: input.upazilaOrArea,
    plotLengthFt: input.plotLengthFt,
    plotWidthFt: input.plotWidthFt,
    roadWidthFt: input.roadWidthFt,
    roadFacing: "South",
    landUseZone: "Residential (R1/R2)",
    buildingPurpose: "Residential",
    proposedFloors: input.floors,
  });

  const maxFAR = feasibility.parameters?.permissibleFAR ?? null;

  const variants: Array<{
    key: "A" | "B" | "C";
    title: string;
    subtitle: string;
    strategySummary: string;
    template: LayoutTemplate;
    scaleW: number;
    scaleH: number;
    daylight: number;
    vent: number;
    eff: number;
    stairWidthCm: number;
  }> = [
    {
      key: "A",
      title: "Design A — Max Practical Space",
      subtitle: "Optimized Net-to-Gross Floor Efficiency",
      strategySummary:
        "Maximizes usable room area within setback limits with compact central circulation and efficient service core.",
      template: "2br-apartment",
      scaleW: 1.0,
      scaleH: 1.0,
      daylight: 82,
      vent: 79,
      eff: 95,
      stairWidthCm: 105,
    },
    {
      key: "B",
      title: "Design B — Natural Light & Cross-Ventilation",
      subtitle: "Tropical South-East Breeze & Recessed Light-Well",
      strategySummary:
        "Carves an open ventilated notch and wide south balcony to maximize cross-ventilation and reduce daytime cooling load in Bangladesh's climate.",
      template: "res-plan-a",
      scaleW: 0.94,
      scaleH: 0.96,
      daylight: 96,
      vent: 97,
      eff: 86,
      stairWidthCm: 115,
    },
    {
      key: "C",
      title: "Design C — Family-Friendly & Privacy Zoning",
      subtitle: "Semi-Private Drawing / Dining Separation",
      strategySummary:
        "Separates formal guest living zone near entry from private family bedrooms and kitchen service veranda — tailored for Bangladeshi households.",
      template: "family-house",
      scaleW: 0.97,
      scaleH: 0.98,
      daylight: 88,
      vent: 87,
      eff: 90,
      stairWidthCm: 110,
    },
  ];

  return variants.map((v) => {
    const w = Number((bldgW * v.scaleW).toFixed(2));
    const h = Number((bldgH * v.scaleH).toFixed(2));
    const footprintSqm = Number((w * h).toFixed(1));
    const totalBuiltUpSqm = Number((footprintSqm * input.floors).toFixed(1));
    const groundCoveragePct = Number(((footprintSqm / plotAreaSqm) * 100).toFixed(1));
    const proposedFAR = Number((totalBuiltUpSqm / plotAreaSqm).toFixed(2));
    const openSpacePct = Number((100 - groundCoveragePct).toFixed(1));

    const geometry = buildGeneratedGeometry(w, h, input, v.key, v.stairWidthCm);
    const scene3d = geometryToScene3D(geometry);

    return {
      id: `design-${v.key.toLowerCase()}-${Date.now().toString(36)}`,
      variantKey: v.key,
      title: v.title,
      subtitle: v.subtitle,
      strategySummary: v.strategySummary,
      layoutTemplate: v.template,
      geometry,
      scene3d,
      metrics: {
        footprintSqm,
        totalBuiltUpSqm,
        groundCoveragePct,
        proposedFAR,
        permissibleFAR: maxFAR,
        openSpacePct,
        daylightScore: v.daylight,
        ventilationScore: v.vent,
        efficiencyScore: v.eff,
      },
      complianceChecks: [
        {
          code: "FAR-CHK",
          title: "Permissible FAR Limit",
          status: "warning",
          detail: `Conceptual proposed FAR is ${proposedFAR}; the permitted value requires the verified parcel schedule and DAP land-use controls.`,
          clause: "DMBR 2025 / applicable DAP controls",
        },
        {
          code: "MGC-CHK",
          title: "Ground Coverage & Setback",
          status: "warning",
          detail: `Conceptual footprint is ${groundCoveragePct}%; permitted coverage and setbacks have not been checked.`,
          clause: "DMBR 2025 schedule review required",
        },
        {
          code: "BNBC-CIR",
          title: "Staircase & Egress Width",
          status: "warning",
          detail: `Schematic stair width is ${v.stairWidthCm} cm; verify the applicable BNBC egress requirements for occupancy and building height.`,
          clause: "BNBC 2020 Part 4 review required",
        },
        {
          code: "BNBC-VENT",
          title: "Habitable Room Daylighting",
          status: "warning",
          detail: `Design preference score ${v.daylight}/100; this is not a daylight simulation or a BNBC compliance result.`,
          clause: "Daylight simulation and BNBC review required",
        },
      ],
      elevations: {
        frontHeightM: Number((input.floors * 3.05 + 1.5).toFixed(2)),
        plinthHeightM: 0.75,
        parapetHeightM: 1.05,
        floorToFloorM: 3.05,
        facadeFeatures:
          v.key === "B"
            ? ["Deep south sun-breakers (louvers)", "Recessed ventilated balcony", "Light-well shaft"]
            : v.key === "C"
              ? ["Semi-private entry foyer", "Double-height stairwell glazing", "Service veranda screen"]
              : ["Clean modern box framing", "Corner ribbon windows", "Compact roof parapet"],
      },
    };
  });
}

function buildGeneratedGeometry(
  w: number,
  h: number,
  input: DesignGenerationInput,
  variant: "A" | "B" | "C",
  stairWidthCm: number
): FloorPlanGeometry {
  const splitX = Number((w * (variant === "B" ? 0.52 : 0.48)).toFixed(2));
  const midY = Number((h * 0.5).toFixed(2));
  const stairW = Number((stairWidthCm / 100 + 0.85).toFixed(2));
  const stairH = Number((h * 0.28).toFixed(2));

  const rooms: FloorPlanGeometry["rooms"] = [
    {
      id: "r-living",
      name: variant === "C" ? "Formal Living & Drawing" : "Living & Dining Hall",
      category: "living",
      x: 0.22,
      y: 0.22,
      width: Number((splitX - 0.3).toFixed(2)),
      height: Number((midY - 0.3).toFixed(2)),
      area_sqm: Number(((splitX - 0.3) * (midY - 0.3)).toFixed(1)),
      measurement_status: "estimated",
    },
    {
      id: "r-master",
      name: "Master Bedroom",
      category: "bedroom",
      x: 0.22,
      y: Number((midY + 0.1).toFixed(2)),
      width: Number((splitX - 0.3).toFixed(2)),
      height: Number((h - midY - 0.32).toFixed(2)),
      area_sqm: Number(((splitX - 0.3) * (h - midY - 0.32)).toFixed(1)),
      measurement_status: "estimated",
    },
    {
      id: "r-bed2",
      name: input.bedrooms >= 3 ? "Bedroom 2 & Family Zone" : "Bedroom 2",
      category: "bedroom",
      x: Number((splitX + 0.1).toFixed(2)),
      y: Number((midY + 0.1).toFixed(2)),
      width: Number((w - splitX - 0.32).toFixed(2)),
      height: Number((h - midY - 0.32).toFixed(2)),
      area_sqm: Number(((w - splitX - 0.32) * (h - midY - 0.32)).toFixed(1)),
      measurement_status: "estimated",
    },
    {
      id: "r-kitchen",
      name: "Kitchen & Utility",
      category: "kitchen",
      x: Number((splitX + 0.1).toFixed(2)),
      y: 0.22,
      width: Number((w - splitX - stairW - 0.35).toFixed(2)),
      height: Number((midY * 0.65).toFixed(2)),
      area_sqm: Number(((w - splitX - stairW - 0.35) * (midY * 0.65)).toFixed(1)),
      measurement_status: "estimated",
    },
    {
      id: "r-bath",
      name: `${input.bathrooms} Bath / Wet Core`,
      category: "bathroom",
      x: Number((splitX + 0.1).toFixed(2)),
      y: Number((midY * 0.65 + 0.3).toFixed(2)),
      width: Number((w - splitX - stairW - 0.35).toFixed(2)),
      height: Number((midY * 0.35 - 0.15).toFixed(2)),
      area_sqm: Number(((w - splitX - stairW - 0.35) * (midY * 0.35 - 0.15)).toFixed(1)),
      measurement_status: "estimated",
    },
  ];

  const walls: FloorPlanGeometry["walls"] = [
    { id: "w-n", x1: 0, y1: 0, x2: w, y2: 0, thickness: 0.22, is_exterior: true, label: "North Exterior Wall" },
    { id: "w-s", x1: 0, y1: h, x2: w, y2: h, thickness: 0.22, is_exterior: true, label: "South Front Wall" },
    { id: "w-w", x1: 0, y1: 0, x2: 0, y2: h, thickness: 0.22, is_exterior: true, label: "West Exterior Wall" },
    { id: "w-e", x1: w, y1: 0, x2: w, y2: h, thickness: 0.22, is_exterior: true, label: "East Exterior Wall" },
    { id: "w-mid-x", x1: splitX, y1: 0, x2: splitX, y2: h, thickness: 0.14, is_exterior: false, label: "Central Spine Wall" },
    { id: "w-mid-y", x1: 0, y1: midY, x2: w, y2: midY, thickness: 0.14, is_exterior: false, label: "Cross Partition Wall" },
  ];

  return {
    width_m: w,
    height_m: h,
    wall_height_m: 2.9,
    is_simulated_demo_geometry: true,
    scale_status: "estimated",
    scale_note: `Illustrative schematic only (${input.plotWidthFt} ft by ${input.plotLengthFt} ft plot); dimensions and margins are not approved setbacks or construction dimensions.`,
    walls,
    doors: [
      { id: "d-entry", x: Number((splitX * 0.45).toFixed(2)), y: h - 0.1, width: 1.05, angle_deg: 0, swing: "inward-left", label: "Main Entry", is_exit: true },
      { id: "d-master", x: Number((splitX * 0.6).toFixed(2)), y: midY, width: 0.9, angle_deg: 0, swing: "inward-right", label: "Master Door" },
      { id: "d-bed2", x: Number((splitX + 0.7).toFixed(2)), y: midY, width: 0.9, angle_deg: 0, swing: "inward-left", label: "Bed 2 Door" },
    ],
    windows: [
      { id: "win-1", x: Number((splitX * 0.5).toFixed(2)), y: 0.05, width: 1.8, angle_deg: 0, sill_m: 0.9, label: "North Window" },
      { id: "win-2", x: Number((splitX * 0.5).toFixed(2)), y: h - 0.05, width: 2.0, angle_deg: 0, sill_m: 0.8, label: "South Window" },
      { id: "win-3", x: w - 0.05, y: Number((h * 0.72).toFixed(2)), width: 1.5, angle_deg: 90, sill_m: 0.9, label: "East Window" },
    ],
    rooms,
    stairs: [
      {
        id: "stair-core",
        x: Number((w - stairW - 0.22).toFixed(2)),
        y: 0.22,
        width: stairW,
        length: stairH,
        steps: 16,
        direction: input.staircaseType,
        clear_width_cm: stairWidthCm,
      },
    ],
    dimensions: [
      { id: "dim-w", label: `${w} m`, value_cm: Math.round(w * 100), x1: 0, y1: -0.4, x2: w, y2: -0.4, status: "ok", measurement_status: "estimated" },
      { id: "dim-h", label: `${h} m`, value_cm: Math.round(h * 100), x1: -0.4, y1: 0, x2: -0.4, y2: h, status: "ok", measurement_status: "estimated" },
    ],
    annotations: [
      { id: "ann-1", text: `Design ${variant} · ${input.floors}F`, x: 1.2, y: 0.8, kind: "note" },
    ],
  };
}

export function geometryToScene3D(geom: FloorPlanGeometry): Scene3DData {
  const halfW = geom.width_m / 2;
  const halfH = geom.height_m / 2;
  return {
    footprint: {
      width_m: geom.width_m,
      depth_m: geom.height_m,
      wall_height_m: geom.wall_height_m,
      slab_thickness_m: 0.24,
    },
    walls: geom.walls.map((w) => {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const length = Math.hypot(dx, dy);
      const cx = (w.x1 + w.x2) / 2 - halfW;
      const cz = (w.y1 + w.y2) / 2 - halfH;
      const angle = -Math.atan2(dy, dx);
      return {
        id: w.id,
        label: w.label || "Wall",
        cx,
        cz,
        length,
        thickness: w.thickness,
        height: geom.wall_height_m,
        rotation_y: angle,
        is_exterior: w.is_exterior,
        modified: Boolean(w.modified),
      };
    }),
    rooms: geom.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      cx: r.x + r.width / 2 - halfW,
      cz: r.y + r.height / 2 - halfH,
      width: r.width,
      depth: r.height,
      area_sqm: r.area_sqm,
      measurement_status: r.measurement_status,
    })),
    doors: geom.doors.map((d) => ({
      id: d.id,
      label: d.label,
      cx: d.x - halfW,
      cz: d.y - halfH,
      width: d.width,
      height: 2.1,
      rotation_y: (d.angle_deg * Math.PI) / 180,
      is_exit: Boolean(d.is_exit),
      modified: Boolean(d.modified),
    })),
    windows: geom.windows.map((win) => ({
      id: win.id,
      label: win.label,
      cx: win.x - halfW,
      cz: win.y - halfH,
      width: win.width,
      sill_m: win.sill_m,
      height: 1.3,
      rotation_y: (win.angle_deg * Math.PI) / 180,
    })),
    stairs: geom.stairs.map((s) => ({
      id: s.id,
      cx: s.x + s.width / 2 - halfW,
      cz: s.y + s.length / 2 - halfH,
      width: s.width,
      length: s.length,
      steps: s.steps,
      clear_width_cm: s.clear_width_cm,
      modified: Boolean(s.modified),
    })),
    roof: {
      width_m: geom.width_m + 0.4,
      depth_m: geom.height_m + 0.4,
      elevation_m: geom.wall_height_m,
    },
  };
}

/**
 * Structural & Building Services Engineering Assistant
 */
export function runStructuralAssist(input: StructuralAssistInput): StructuralAssistResult {
  const meta = findDistrictMeta(input.district);
  const recommendedFoundation =
    "No foundation recommendation generated. Selection requires a geotechnical investigation and project-specific structural design.";

  return {
    seismicZone: meta.seismicZone,
    zFactor: meta.zFactor,
    soilClassification: input.soilType,
    recommendedFoundation,
    preliminaryColumnGrid: {
      estimatedColumnsCount: null,
      typicalSpacingM: "Requires structural analysis and coordinated architectural plans",
      typicalColumnSizeMm: "Not calculated",
      typicalBeamSizeMm: "Not calculated",
      slabThicknessMm: null,
    },
    preliminaryQuantities: {
      concreteVolCum: null,
      rebarKg: null,
      foundationFactor: null,
    },
    earthquakeChecks: [
      {
        check: `BNBC 2020 Seismic Zone ${meta.seismicZone} Lateral Detailing`,
        status: "Required",
        clause: "BNBC 2020 Part 6, Sec 2.5 & Ch. 8",
        note: `District-level reference only (Zone ${meta.seismicZone}); confirm the site parameters from the official BNBC 2020 map and geotechnical report. No seismic analysis has been performed.`,
      },
      {
        check: "Soft-Storey Prevention (Ground Parking Level)",
        status: "Required",
        clause: "BNBC 2020 Part 6, Table 6.2.15",
        note: "Evaluate vertical irregularities from the actual structural model and load path; this schematic tool cannot assess them.",
      },
      {
        check: "Geotechnical Sub-Soil Investigation (SPT)",
        status: "Required",
        clause: "BNBC 2020 Part 6, Ch. 3",
        note: "Use a project-specific geotechnical investigation and the applicable BNBC requirements; no borehole count or depth is assumed here.",
      },
    ],
    mepModules: [
      {
        discipline: "Electrical",
        summary: "Load estimation, DB/MDB sizing, earthing pit, and lightning protection.",
        keySpecs: [
          "Connected load and protection schedule require the actual occupancy, equipment schedule, and electrical design.",
          "Cable sizing, protective devices, earthing, and lightning protection require design calculations.",
        ],
        clauseRef: "BNBC 2020 Part 8 Ch. 1 (Electrical)",
      },
      {
        discipline: "Plumbing",
        summary: "Overhead & underground water reservoirs, riser pipes, and pump sizing.",
        keySpecs: [
          "Water demand and tank sizing require occupancy, fixture counts, pressure, and authority service data.",
          "Coordinate supply, drainage, and rainwater systems with the project design and local utility.",
        ],
        clauseRef: "BNBC 2020 Part 8 Ch. 5 (Water Supply)",
      },
      {
        discipline: "Sanitary",
        summary: "Septic tank / soak well or municipal sewer connection with inspection pits.",
        keySpecs: [
          "Pipe sizing, gradients, treatment, and connection details require fixture-unit calculations and site levels.",
          "Confirm the approved sewer or on-site treatment arrangement with the relevant authority.",
        ],
        clauseRef: "BNBC 2020 Part 8 Ch. 6 (Sanitary)",
      },
      {
        discipline: "Fire Safety",
        summary: "Detection, extinguishers, fire hose reel, and stairwell smoke control.",
        keySpecs: [
          "Required fire protection depends on occupancy, height, floor area, and the current authority requirements.",
          "Fire alarm, suppression, egress, and water supply need a project-specific fire strategy.",
        ],
        clauseRef: "BNBC 2020 Part 4 & FSCD Act 2003",
      },
      {
        discipline: "HVAC",
        summary: "Cross-ventilation paths, kitchen exhaust, and split-AC condensate routing.",
        keySpecs: [
          "Ventilation and cooling loads require room-by-room heat gain and ventilation calculations.",
          "Coordinate equipment, exhaust, condensate, and acoustic needs with the architectural design.",
        ],
        clauseRef: "BNBC 2020 Part 8 Ch. 3",
      },
      {
        discipline: "Interior",
        summary: "Clear furniture circulation, daylight zoning, and ergonomic clearances.",
        keySpecs: [
          "Verify circulation widths and accessible routes against the applicable occupancy provisions.",
          "Coordinate kitchen, plumbing, and service layouts with the project requirements.",
        ],
        clauseRef: "Architectural Space Planning Standard",
      },
      {
        discipline: "Landscape",
        summary: "Permeable setback paving, native shade trees, and stormwater percolation.",
        keySpecs: [
          "Verify required open space and stormwater controls against the parcel schedule and site conditions.",
          "Use site-specific drainage, shade, and planting design.",
        ],
        clauseRef: "DAP Green Coverage Guidelines",
      },
    ],
    disclaimer:
      "PRELIMINARY AI STRUCTURAL ASSISTANCE ONLY — Not for construction. Final column sizing, rebar detailing, and foundation design must be computed and stamped by an IEB-registered Structural Engineer using site-specific SPT soil test data.",
  };
}

/**
 * Permit Checklist Builder
 */
export function buildPermitChecklist(authority: RegulatoryAuthorityId, floors: number): PermitChecklistItem[] {
  const isRajuk = authority === "RAJUK";
  const items: PermitChecklistItem[] = [
    {
      id: "doc-deed",
      category: "Land & Legal",
      title: "Registered Ownership Deed (Dalil) & Chain of Title",
      description: "Certified copy of purchase deed / inheritance deed proving ownership.",
      requiredBy: authority,
      completed: false,
      mandatory: true,
    },
    {
      id: "doc-mutation",
      category: "Land & Legal",
      title: "Up-to-date Mutation (Namjari) & Khajna Receipt",
      description: "Current fiscal year land tax payment and AC Land khatian.",
      requiredBy: authority,
      completed: false,
      mandatory: true,
    },
    {
      id: "doc-mouza",
      category: "Land & Legal",
      title: "CS / SA / RS / BS Mouza Map & Digital Survey",
      description: "Scaled plot boundary survey showing abutting road width.",
      requiredBy: authority,
      completed: false,
      mandatory: true,
    },
    {
      id: "doc-arch",
      category: "Architectural Drawings",
      title: "Architectural Plan Set (IAB Registered Architect Sign-off)",
      description: "Site plan, floor plans, elevations, sections, FAR & setback calculation table.",
      requiredBy: authority,
      completed: false,
      mandatory: true,
    },
    {
      id: "doc-struct",
      category: "Structural & Soil",
      title: "Structural Drawings & Geotechnical Soil Report",
      description: "Borelog SPT report and structural sheets stamped by IEB-registered structural engineer.",
      requiredBy: "BNBC 2020 / " + authority,
      completed: false,
      mandatory: true,
    },
  ];

  if (isRajuk) {
    items.unshift({
      id: "doc-luc",
      category: "Clearances & NOC",
      title: "RAJUK Land Use Clearance (ভূমি ব্যবহার ছাড়পত্র)",
      description: "Mandatory DAP zoning clearance via RAJUK ECP portal before plan submission.",
      requiredBy: "RAJUK",
      completed: false,
      mandatory: true,
    });
  }

  if (floors >= 7) {
    items.push(
      {
        id: "doc-fscd",
        category: "Clearances & NOC",
        title: "Fire Service & Civil Defence (FSCD) NOC",
        description: "Mandatory for buildings >= 7 stories or > 20m height.",
        requiredBy: "FSCD",
        completed: false,
        mandatory: true,
      },
      {
        id: "doc-caab",
        category: "Clearances & NOC",
        title: "Civil Aviation (CAAB) Height Clearance & DoE / Traffic NOC",
        description: "Required for high-rises in flight-funnel zones and large developments.",
        requiredBy: "CAAB / DoE / " + authority,
        completed: false,
        mandatory: floors >= 10,
      }
    );
  }

  return items;
}

/**
 * AI Construction Cost Estimator (Bangladesh BDT Market Model)
 */
export function calculateConstructionCost(input: CostEstimateInput): CostEstimateBreakdown {
  const area = Math.max(100, input.totalBuiltUpSqft);
  const tierMultiplier = input.finishTier === "Premium" ? 1.32 : input.finishTier === "Mid-Range" ? 1.12 : 1.0;
  const foundationMultiplier =
    input.foundationType === "Pile Foundation" ? 1.18 : input.foundationType === "Mat / Raft" ? 1.09 : 1.0;

  // Approximate Bangladesh RCC residential thumb rules per sq ft
  const cementBags = Math.round(area * 0.42);
  const steelTons = Number(((area * 4.35) / 1000).toFixed(2)); // ~4.35 kg/sqft -> metric tons (1000 kg)
  const bricksCount = Math.round(area * 16.5);
  const sandCft = Math.round(area * 1.85);
  const aggregateCft = Math.round(area * 1.35);

  const cementCostBdt = cementBags * input.rates.cementPerBagBdt;
  const steelCostBdt = Math.round(steelTons * input.rates.steelPerTonBdt);
  const bricksCostBdt = bricksCount * input.rates.brickPerPieceBdt;
  const sandCostBdt = sandCft * input.rates.sandPerCftBdt;
  const aggregateCostBdt = aggregateCft * 195; // ~195 BDT/cft Sylhet stone chips average

  const materialSubtotal = cementCostBdt + steelCostBdt + bricksCostBdt + sandCostBdt + aggregateCostBdt;
  const labourBdt = Math.round(area * input.rates.labourPerSqftBdt);
  const electricalBdt = Math.round(area * 185 * tierMultiplier);
  const plumbingSanitaryBdt = Math.round(area * 210 * tierMultiplier);
  const finishingBdt = Math.round(area * 620 * tierMultiplier); // tiles, paint, doors, windows, railings
  const foundationSurchargeBdt = Math.round((materialSubtotal + labourBdt) * (foundationMultiplier - 1));

  const totalEstimatedBdt =
    materialSubtotal + labourBdt + electricalBdt + plumbingSanitaryBdt + finishingBdt + foundationSurchargeBdt;
  const costPerSqftBdt = Math.round(totalEstimatedBdt / area);

  return {
    totalEstimatedBdt,
    costPerSqftBdt,
    rangeMinBdt: Math.round(totalEstimatedBdt * 0.92),
    rangeMaxBdt: Math.round(totalEstimatedBdt * 1.12),
    materials: {
      cementBags,
      cementCostBdt,
      steelTons,
      steelCostBdt,
      bricksCount,
      bricksCostBdt,
      sandCft,
      sandCostBdt,
      aggregateCft,
      aggregateCostBdt,
    },
    trades: {
      labourBdt,
      electricalBdt,
      plumbingSanitaryBdt,
      finishingBdt,
      foundationSurchargeBdt,
    },
    assumptions: [
      "Thumb-rule material coefficients: ~0.42 bag cement/sqft, ~4.35 kg MS rod/sqft, ~16.5 bricks/sqft.",
      `Stone aggregate baseline estimated at BDT 195/cft; ${input.finishTier} finishing tier applied.`,
      "Excludes land cost, utility connection fees, architect/engineer consultancy, and authority approval fees.",
    ],
  };
}

/**
 * Climate & Environmental Intelligence (Bangladesh Tropical Monsoon Profile)
 */
export function generateClimateReport(district: string, roadFacing: string, roofAreaSqm: number): ClimateReport {
  const isCoastal = ["Chattogram", "Cox's Bazar", "Khulna", "Barishal"].includes(district);
  const isSylhet = district === "Sylhet";
  const annualRainfallMm = isSylhet ? 3800 : isCoastal ? 2900 : 2100;
  // Runoff coefficient 0.80
  const annualMonsoonCaptureLiters = Math.round(roofAreaSqm * annualRainfallMm * 0.8);
  const recommendedTankLiters = Math.min(25000, Math.max(3000, Math.round(roofAreaSqm * 45)));

  return {
    district,
    roadFacing,
    solarExposure: {
      southFaceNote:
        "South orientation captures winter warmth and prevailing summer monsoon breeze (March–October). Prioritize main living & bedrooms along South/South-East.",
      westHeatMitigation:
        "West facade receives intense afternoon solar radiation (2 PM–5 PM). Place staircases, bathrooms, utility, or deep overhangs/louvers along the West wall.",
      windowToWallRatioRec: "Target 22%–30% Window-to-Wall Ratio on South/North; <= 12% shaded glazing on West.",
    },
    ventilationStrategy: [
      "Align operable windows on South/South-East walls with outlet windows or ventilated corridors on North/North-West for stack & cross-ventilation.",
      "Use 150 mm–200 mm projected chajjas (sunshades) over windows to permit open windows during monsoon rain.",
      "Maintain >= 10% openable window area per habitable room floor area (BNBC 2020 Part 3 Sec 1.17).",
    ],
    rainwaterHarvesting: {
      roofAreaSqm,
      annualMonsoonCaptureLiters,
      recommendedTankLiters,
    },
    floodAndPlinthGuidance: {
      recommendedPlinthHeightFt: isCoastal || isSylhet ? 3.5 : 2.5,
      reason: isCoastal
        ? "Elevated plinth (3.5+ ft above crown of adjacent road) advised for monsoon waterlogging & tidal surge resilience."
        : "Standard 2.5 ft minimum plinth above adjacent road crown recommended to prevent monsoon street runoff ingress.",
      dataStatus: "approximate_climate_guidance",
    },
    heatReductionStrategies: [
      "Apply white/high-SRI heat-reflective roof screed or hollow terracotta tiles on roof slab to lower top-floor heat gain by 3–5°C.",
      "Keep >= 50% of mandatory setback area unpaved/vegetated to reduce urban heat island effect.",
      "Install double-wall cavity or autoclaved aerated concrete (AAC) blocks on West-facing elevations.",
    ],
  };
}

/**
 * Regulatory AI Assistant (Structured Retrieval & Citation Engine — never invents laws)
 */
export function answerRegulatoryQuery(
  query: string,
  context: {
    district?: string;
    upazilaOrArea?: string;
    plotAreaSqm?: number | null;
    roadWidthFt?: number | null;
  }
): RegulatoryChatMessage {
  const q = query.toLowerCase();
  const jurisdiction = detectJurisdiction({
    division: "",
    district: context.district || "Dhaka",
    upazilaOrArea: context.upazilaOrArea || "",
  });

  const missingInfo: string[] = [];
  if (!context.district) missingInfo.push("Plot District / City");
  if (!context.plotAreaSqm) missingInfo.push("Plot Area (in Katha or sqm)");
  if (!context.roadWidthFt) missingInfo.push("Abutting Road Width (in ft)");

  let answerText = "";
  let rule: RegulatoryRule = BANGLADESH_REGULATORY_RULES[0];
  let calculationExplanation = "";

  if (q.includes("authority") || q.includes("approve") || q.includes("rajuk") || q.includes("cda") || q.includes("who")) {
    rule =
      BANGLADESH_REGULATORY_RULES.find((r) => r.authority === jurisdiction.authority) ??
      BANGLADESH_REGULATORY_RULES[BANGLADESH_REGULATORY_RULES.length - 2];
    answerText = `For **${jurisdiction.jurisdictionLabel}**, the applicable development/building approval authority is **${jurisdiction.authorityName}**. RAJUK rules only apply inside the Dhaka Metropolitan Planning Area (DMDP); other regions follow their respective Development Authority (CDA, KDA, RDA, GDA, CoxDA) or City Corporation / Pourashava together with **BNBC 2020**.`;
    calculationExplanation = `Authority matched from district "${context.district || "Dhaka"}" -> ${jurisdiction.authority}.`;
  } else if (q.includes("far") || q.includes("floor area") || q.includes("how much building")) {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "RAJUK-FAR-001")!;
    answerText = `The Dhaka Metropolitan Building Rules, 2025 and applicable DAP land-use controls govern FAR in RAJUK areas. This app does not verify the DAP block or encode the parcel-specific schedule, so it cannot state the permitted FAR. Obtain the authority land-use clearance and confirm the applicable schedule.`;
    calculationExplanation = "FAR withheld: dimensions and a map pin do not identify the controlling DAP land-use schedule.";
  } else if (q.includes("setback") || q.includes("open space")) {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "RAJUK-SBK-003")!;
    answerText = `Setbacks must be checked against the applicable 2025 Dhaka Metropolitan Building Rules schedule and parcel conditions. This app does not encode those tables, so it cannot report a compliant setback.`;
    calculationExplanation = "Setback calculation withheld pending the controlling official schedule and verified parcel data.";
  } else if (q.includes("parking")) {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "RAJUK-PRK-004")!;
    answerText = `Off-street parking depends on the applicable building class and current authority schedule. The rule catalog does not encode the 2025 Dhaka schedule, so it cannot calculate a required bay count.`;
    calculationExplanation = "Parking count withheld pending the controlling official schedule and verified building program.";
  } else if (q.includes("fire") || q.includes("stair") || q.includes("exit")) {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "FSCD-FIRE-001")!;
    answerText = `BNBC 2020 contains national means-of-egress and fire-safety provisions. Requirements depend on occupancy, building height, and layout; this assistant has not encoded the relevant clauses and schedules. Review the official BNBC and confirm required Fire Service and Civil Defence clearance with the authority.`;
    calculationExplanation = "No stair width, exit count, or clearance threshold is asserted without a verified occupancy-specific code check.";
  } else if (q.includes("document") || q.includes("permit") || q.includes("approval")) {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "MUNI-BLD-001")!;
    answerText = `Permit documents and approval steps are authority- and project-specific. Confirm the current checklist directly with ${jurisdiction.authorityName}; this app checklist is general guidance, not an official application checklist.`;
    calculationExplanation = "The checklist is not a substitute for the current authority application form or written clearance.";
  } else {
    rule = BANGLADESH_REGULATORY_RULES.find((r) => r.rule_id === "BNBC-CIR-001")!;
    answerText = `I can identify relevant source documents and collect project inputs, but site-specific permissions and code compliance are not verified in this app. For RAJUK plots, consult the 2025 Dhaka Metropolitan Building Rules, applicable DAP sheet, and written land-use clearance.`;
    calculationExplanation = "General source guidance only; no permit or engineering compliance result is produced.";
  }

  return {
    id: `msg-${Date.now().toString(36)}`,
    role: "assistant",
    content: answerText,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    structuredAnswer: {
      applicableRegulation: rule.regulation,
      authority: rule.authority_full_name,
      relevantClause: rule.source_clause,
      officialSource: rule.source_document,
      calculationExplanation,
      missingInformation: missingInfo,
      verificationStatus: rule.verification_status,
    },
  };
}


