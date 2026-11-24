import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  analyzePlot,
  buildPermitChecklist,
  generateDesignVariants,
} from "@/services/bangladeshEngine";
import {
  DesignGenerationInput,
  GeneratedDesignVariant,
  PermitChecklistItem,
  PlotAnalysisInput,
  PlotFeasibilityReport,
  RegulatoryAuthorityId,
} from "@/types/bangladesh";

interface BangladeshContextValue {
  plotHistory: PlotFeasibilityReport[];
  activePlot: PlotFeasibilityReport;
  generatedDesigns: GeneratedDesignVariant[];
  selectedDesignId: string | null;
  permitChecklist: PermitChecklistItem[];
  runPlotAnalysis: (input: PlotAnalysisInput) => PlotFeasibilityReport;
  runDesignGeneration: (input: DesignGenerationInput) => GeneratedDesignVariant[];
  selectDesignVariant: (id: string) => void;
  togglePermitItem: (id: string) => void;
  resetPermitChecklistForAuthority: (authority: RegulatoryAuthorityId, floors: number) => void;
}

const DEFAULT_PLOT_INPUT: PlotAnalysisInput = {
  projectName: "Uttara Sector 11 Residence",
  division: "Dhaka",
  district: "Dhaka",
  upazilaOrArea: "Uttara",
  plotAddress: "Road 14, Sector 11, Uttara",
  plotLengthFt: 60,
  plotWidthFt: 45,
  totalAreaSqm: null,
  roadWidthFt: 30,
  roadFacing: "South",
  landUseZone: "Residential (R1/R2)",
  buildingPurpose: "Residential",
  proposedFloors: 6,
};

const DEFAULT_DESIGN_INPUT: DesignGenerationInput = {
  projectName: "Uttara 6-Story Residence",
  plotLengthFt: 60,
  plotWidthFt: 45,
  floors: 6,
  bedrooms: 3,
  bathrooms: 3,
  hasSeparateDining: true,
  parkingSpaces: 2,
  staircaseType: "Dog-Legged",
  style: "Tropical Cross-Vent",
  naturalLightPriority: "High",
  district: "Dhaka",
  upazilaOrArea: "Uttara",
  roadWidthFt: 30,
};

const STORAGE_KEY_PLOT = "plancheck_bd_plot_v2";
const STORAGE_KEY_PERMITS = "plancheck_bd_permits_v2";

const BangladeshContext = createContext<BangladeshContextValue | null>(null);

export function BangladeshProvider({ children }: { children: React.ReactNode }) {
  const [plotHistory, setPlotHistory] = useState<PlotFeasibilityReport[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PLOT);
      if (raw) {
        const parsed = JSON.parse(raw) as PlotFeasibilityReport[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [analyzePlot(DEFAULT_PLOT_INPUT)];
  });

  const activePlot = plotHistory[0];

  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesignVariant[]>(() =>
    generateDesignVariants(DEFAULT_DESIGN_INPUT)
  );
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
    () => generatedDesigns[1]?.id ?? generatedDesigns[0]?.id ?? null
  );

  const [permitChecklist, setPermitChecklist] = useState<PermitChecklistItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PERMITS);
      if (raw) {
        const parsed = JSON.parse(raw) as PermitChecklistItem[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return buildPermitChecklist(activePlot.jurisdiction.authority, activePlot.input.proposedFloors ?? 6);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLOT, JSON.stringify(plotHistory.slice(0, 8)));
    } catch {
      // ignore
    }
  }, [plotHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERMITS, JSON.stringify(permitChecklist));
    } catch {
      // ignore
    }
  }, [permitChecklist]);

  const runPlotAnalysis = useCallback((input: PlotAnalysisInput) => {
    const report = analyzePlot(input);
    setPlotHistory((prev) => [report, ...prev.slice(0, 9)]);
    setPermitChecklist(
      buildPermitChecklist(report.jurisdiction.authority, input.proposedFloors ?? report.parameters?.recommendedMaxFloors ?? 6)
    );
    return report;
  }, []);

  const runDesignGeneration = useCallback((input: DesignGenerationInput) => {
    const variants = generateDesignVariants(input);
    setGeneratedDesigns(variants);
    setSelectedDesignId(variants[0]?.id ?? null);
    return variants;
  }, []);

  const selectDesignVariant = useCallback((id: string) => {
    setSelectedDesignId(id);
  }, []);

  const togglePermitItem = useCallback((id: string) => {
    setPermitChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  }, []);

  const resetPermitChecklistForAuthority = useCallback((authority: RegulatoryAuthorityId, floors: number) => {
    setPermitChecklist(buildPermitChecklist(authority, floors));
  }, []);

  return (
    <BangladeshContext.Provider
      value={{
        plotHistory,
        activePlot,
        generatedDesigns,
        selectedDesignId,
        permitChecklist,
        runPlotAnalysis,
        runDesignGeneration,
        selectDesignVariant,
        togglePermitItem,
        resetPermitChecklistForAuthority,
      }}
    >
      {children}
    </BangladeshContext.Provider>
  );
}

export function useBangladesh() {
  const ctx = useContext(BangladeshContext);
  if (!ctx) throw new Error("useBangladesh must be used inside BangladeshProvider");
  return ctx;
}
