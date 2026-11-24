import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Compass,
  Download,
  Droplets,
  Layers,
  MapPin,
  Ruler,
  Sun,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GooglePlotPicker } from "@/components/app/GooglePlotPicker";
import { RegulatoryDisclaimerBanner, VerificationBadge } from "@/components/app/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBangladesh } from "@/context/BangladeshContext";
import { BANGLADESH_DISTRICTS } from "@/data/bangladeshRules";
import { findDistrictMeta, generateClimateReport } from "@/services/bangladeshEngine";
import { BuildingPurpose, LandUseZone, PlotAnalysisInput } from "@/types/bangladesh";
import { toast } from "sonner";

const LAND_USE_ZONES: LandUseZone[] = [
  "Residential (R1/R2)",
  "Mixed-Use Zone",
  "Commercial Zone",
  "Urban Expansion / DAP",
  "Agricultural / Flood Flow Restricted",
  "Unverified / Needs Mouza Check",
];

const PURPOSES: BuildingPurpose[] = ["Residential", "Commercial", "Mixed-Use", "Institutional", "Industrial"];

export default function PlotAnalysisPage() {
  const { activePlot, runPlotAnalysis } = useBangladesh();
  const [form, setForm] = useState<PlotAnalysisInput>(activePlot.input);

  const selectedDistrictMeta = useMemo(() => findDistrictMeta(form.district), [form.district]);

  const climateReport = useMemo(() => {
    const roofArea = activePlot.parameters?.maxFootprintSqm ?? 140;
    return generateClimateReport(activePlot.input.district, activePlot.input.roadFacing, roofArea);
  }, [activePlot]);

  const handleDistrictChange = (district: string) => {
    const meta = findDistrictMeta(district);
    setForm((prev) => ({
      ...prev,
      district: meta.district,
      division: meta.division,
      upazilaOrArea: meta.knownAreas[0] ?? "",
    }));
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const res = runPlotAnalysis(form);
    if (res.canComputeFinal) {
      toast.success(`Feasibility calculated under ${res.jurisdiction.authority} framework`);
    } else {
      toast.warning("Missing essential plot inputs — see warnings below");
    }
  };

  const exportFeasibility = () => {
    const p = activePlot.parameters;
    const lines = [
      "PLANCHECK AI — BANGLADESH PLOT FEASIBILITY REPORT",
      "================================================",
      `Project: ${activePlot.input.projectName}`,
      `Location: ${activePlot.jurisdiction.jurisdictionLabel}`,
      `Applicable Authority: ${activePlot.jurisdiction.authorityName} (${activePlot.jurisdiction.authority})`,
      `Seismic Zone: ${activePlot.jurisdiction.seismicZone.label} [${activePlot.jurisdiction.seismicZone.sourceClause}]`,
      "",
      ...(activePlot.areaMetrics
        ? [
            `Land Area: ${activePlot.areaMetrics.totalAreaSqm} sqm (${activePlot.areaMetrics.areaKatha} Katha / ${activePlot.areaMetrics.areaDecimal} Decimal)`,
          ]
        : []),
      ...(p
        ? [
            `Permissible FAR: ${p.permissibleFAR}`,
            `Max Ground Coverage: ${p.maxGroundCoveragePct}% (${p.maxFootprintSqm} sqm max footprint)`,
            `Max Allowable Floor Area: ${p.maxAllowableFloorAreaSqm} sqm (${p.maxAllowableFloorAreaSqft} sq ft)`,
            `Mandatory Open Space: ${p.mandatoryOpenSpacePct}% (${p.mandatoryOpenSpaceSqm} sqm)`,
            `Recommended Max Floors: ${p.recommendedMaxFloors} floors (~${p.estimatedMaxHeightM} m)`,
            `Setbacks: Front ${p.setbacks.frontM}m, Rear ${p.setbacks.rearM}m, Sides ${p.setbacks.sideLeftM}m / ${p.setbacks.sideRightM}m`,
            `Required Parking: ${p.parkingSpacesRequired} bay(s)`,
          ]
        : ["STATUS: Incomplete inputs — final parameters withheld."]),
      "",
      `Disclaimer: ${activePlot.disclaimer}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activePlot.input.projectName.replace(/\s+/g, "-").toLowerCase()}-feasibility.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Feasibility report downloaded");
  };

  return (
    <AppShell
      title="Plot Analysis & Jurisdiction Finder"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportFeasibility}>
            <Download className="size-3.5" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/design-studio">
              Generate Designs →
            </Link>
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col gap-2 border-b pb-3.5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Bangladesh Plot Analyzer &amp; Authority Detection</h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Record plot dimensions and location. Authority schedules and parcel zoning require official confirmation before final allowances are computed.
            </p>
          </div>
          <VerificationBadge status={activePlot.verificationStatus} />
        </div>

        <RegulatoryDisclaimerBanner />

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          {/* Input Panel */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="size-4 text-primary" /> Plot &amp; Location Parameters
              </CardTitle>
              <CardDescription className="text-xs">Enter land location, dimensions, and abutting road details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyze} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Project / Plot Title</label>
                  <Input
                    className="h-8 text-xs"
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    placeholder="e.g. Banani Road 11 Plot"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium">District *</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={form.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d.district} value={d.district}>
                          {d.district}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Area / Upazila</label>
                    <Input
                      className="h-8 text-xs"
                      list="bd-areas"
                      value={form.upazilaOrArea}
                      onChange={(e) => setForm({ ...form, upazilaOrArea: e.target.value })}
                      placeholder="Area / Thana"
                    />
                    <datalist id="bd-areas">
                      {selectedDistrictMeta.knownAreas.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Length (ft) *</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.plotLengthFt ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, plotLengthFt: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Width (ft) *</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.plotWidthFt ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, plotWidthFt: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Road Width (ft) *</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      min={0}
                      step="1"
                      value={form.roadWidthFt ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, roadWidthFt: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Road Facing</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={form.roadFacing}
                      onChange={(e) =>
                        setForm({ ...form, roadFacing: e.target.value as PlotAnalysisInput["roadFacing"] })
                      }
                    >
                      <option value="South">South</option>
                      <option value="North">North</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="Corner">Corner Plot</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Land-Use Zone *</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={form.landUseZone}
                      onChange={(e) => setForm({ ...form, landUseZone: e.target.value as LandUseZone })}
                    >
                      {LAND_USE_ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Building Purpose</label>
                    <select
                      className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                      value={form.buildingPurpose}
                      onChange={(e) => setForm({ ...form, buildingPurpose: e.target.value as BuildingPurpose })}
                    >
                      {PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_110px] gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Plot Address / Mouza</label>
                    <Input
                      className="h-8 text-xs"
                      value={form.plotAddress ?? ""}
                      onChange={(e) => setForm({ ...form, plotAddress: e.target.value })}
                      placeholder="House / Road / Mouza"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Floors</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      min={1}
                      max={40}
                      value={form.proposedFloors ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, proposedFloors: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Run Plot &amp; Jurisdiction Analysis
                </Button>

                <div className="pt-1">
                  <GooglePlotPicker
                    coordinates={form.coordinates}
                    onChange={(coordinates) =>
                      setForm((current) => ({
                        ...current,
                        coordinates,
                        plotAddress: `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
                      }))
                    }
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right Column: Feasibility Results */}
          <div className="space-y-4">
            {/* Authority Detection Card */}
            <Card>
              <CardHeader className="pb-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="size-4 text-primary" />
                      Detected Authority: {activePlot.jurisdiction.authorityName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {activePlot.jurisdiction.planningArea} · {activePlot.jurisdiction.seismicZone.label}
                    </CardDescription>
                  </div>
                  <span className="rounded border bg-secondary px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                    {activePlot.jurisdiction.authority}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {activePlot.jurisdiction.needsConfirmation && (
                  <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-2.5 text-foreground/90">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                    <div>
                      <span className="font-semibold">Jurisdiction Confirmation Required: </span>
                      {activePlot.jurisdiction.confirmationPrompt}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {activePlot.jurisdiction.applicableRegulations.map((reg) => (
                    <span key={reg} className="rounded border border-border bg-secondary/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {reg}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Missing Inputs Warning OR Calculated Metrics */}
            {!activePlot.canComputeFinal ? (
              <Card className="border-border bg-card">
                <CardHeader className="pb-2.5">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Ruler className="size-4 text-primary" />
                    Official Schedule &amp; Site Verification Required before Final FAR/Setback Calculation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activePlot.areaMetrics
                      ? `Recorded plot area: ${activePlot.areaMetrics.areaKatha} Katha (${activePlot.areaMetrics.totalAreaSqm} m² · ${activePlot.areaMetrics.areaDecimal} dec). Final FAR, coverage, and setbacks require:`
                      : "PlanCheck AI will not guess FAR, setbacks, or height limits until the following items are confirmed:"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {activePlot.missingInputs.map((m) => (
                      <li key={m} className="flex items-center gap-2 rounded border border-border/80 bg-secondary/30 px-3 py-1.5 text-foreground">
                        <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (
              activePlot.parameters &&
              activePlot.areaMetrics && (
                <Tabs defaultValue="parameters">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="parameters">FAR & Setbacks</TabsTrigger>
                    <TabsTrigger value="climate">Climate & Sun-Path</TabsTrigger>
                    <TabsTrigger value="workflow">Approval Steps & Rules</TabsTrigger>
                  </TabsList>

                  <TabsContent value="parameters" className="mt-4 space-y-4">
                    {/* KPI Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Plot Area</p>
                          <p className="mt-1 text-xl font-semibold">
                            {activePlot.areaMetrics.areaKatha} <span className="text-sm font-normal">Katha</span>
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {activePlot.areaMetrics.totalAreaSqm} sqm · {activePlot.areaMetrics.areaDecimal} dec
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Permissible FAR</p>
                          <p className="mt-1 text-xl font-semibold text-primary">
                            {activePlot.parameters.permissibleFAR}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            Max {activePlot.parameters.maxAllowableFloorAreaSqft.toLocaleString()} sq ft
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Max Ground Coverage</p>
                          <p className="mt-1 text-xl font-semibold">
                            {activePlot.parameters.maxGroundCoveragePct}%
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            Footprint {activePlot.parameters.maxFootprintSqm} sqm
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Height / Parking</p>
                          <p className="mt-1 text-xl font-semibold">
                            {activePlot.parameters.recommendedMaxFloors} Floors
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            ~{activePlot.parameters.estimatedMaxHeightM}m · {activePlot.parameters.parkingSpacesRequired} Parking
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Visual Setback Diagram + Breakdown */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Ruler className="size-4 text-primary" /> Visual Setback Envelope
                          </CardTitle>
                          <CardDescription>{activePlot.parameters.setbacks.sourceClause}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center rounded-xl border bg-cad-grid p-5">
                            <svg viewBox="0 0 260 220" className="h-52 w-full max-w-[260px]">
                              {/* Road */}
                              <rect x="10" y="188" width="240" height="24" rx="4" fill="#cbd5e1" />
                              <text x="130" y="204" textAnchor="middle" fontSize="10" fill="#334155" fontWeight="600">
                                ABUTTING ROAD ({activePlot.input.roadWidthFt} ft · {activePlot.input.roadFacing})
                              </text>
                              {/* Plot Boundary */}
                              <rect
                                x="26"
                                y="14"
                                width="208"
                                height="168"
                                fill="#e2e8f0"
                                fillOpacity="0.45"
                                stroke="#0f172a"
                                strokeWidth="2"
                                strokeDasharray="5 3"
                              />
                              {/* Buildable Envelope */}
                              <rect
                                x="50"
                                y="36"
                                width="160"
                                height="114"
                                rx="4"
                                fill="#4263eb"
                                fillOpacity="0.16"
                                stroke="#4263eb"
                                strokeWidth="2"
                              />
                              <text x="130" y="90" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e3a8a">
                                Buildable Zone
                              </text>
                              <text x="130" y="106" textAnchor="middle" fontSize="10" fill="#334155">
                                Max {activePlot.parameters.maxFootprintSqm} sqm
                              </text>
                              {/* Setback labels */}
                              <text x="130" y="28" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#b45309">
                                Rear: {activePlot.parameters.setbacks.rearM} m
                              </text>
                              <text x="130" y="170" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#b45309">
                                Front: {activePlot.parameters.setbacks.frontM} m
                              </text>
                              <text x="38" y="95" textAnchor="middle" fontSize="9" fontWeight="600" fill="#b45309" transform="rotate(-90 38 95)">
                                Side: {activePlot.parameters.setbacks.sideLeftM}m
                              </text>
                              <text x="222" y="95" textAnchor="middle" fontSize="9" fontWeight="600" fill="#b45309" transform="rotate(90 222 95)">
                                Side: {activePlot.parameters.setbacks.sideRightM}m
                              </text>
                            </svg>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Layers className="size-4 text-primary" /> Warnings & Assumptions
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                          {activePlot.warnings.length > 0 && (
                            <div className="space-y-1.5">
                              {activePlot.warnings.map((w, idx) => (
                                <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                                  {w}
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">Calculation Assumptions:</p>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                              {activePlot.assumptions.map((a, idx) => (
                                <li key={idx}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Climate & Environmental Intelligence */}
                  <TabsContent value="climate" className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Sun className="size-4 text-amber-500" /> Solar & Orientation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-muted-foreground">
                          <p><strong className="text-foreground">South Orientation:</strong> {climateReport.solarExposure.southFaceNote}</p>
                          <p><strong className="text-foreground">West Sun Protection:</strong> {climateReport.solarExposure.westHeatMitigation}</p>
                          <p><strong className="text-foreground">Glazing Ratio:</strong> {climateReport.solarExposure.windowToWallRatioRec}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Wind className="size-4 text-cyan-600" /> Monsoon Ventilation
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
                            {climateReport.ventilationStrategy.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Droplets className="size-4 text-primary" /> Rainwater & Flood Plinth
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-muted-foreground">
                          <p>
                            <strong className="text-foreground">Annual Harvest Potential:</strong>{" "}
                            {climateReport.rainwaterHarvesting.annualMonsoonCaptureLiters.toLocaleString()} L/yr (from{" "}
                            {climateReport.rainwaterHarvesting.roofAreaSqm} sqm roof)
                          </p>
                          <p>
                            <strong className="text-foreground">Recommended Tank:</strong>{" "}
                            {climateReport.rainwaterHarvesting.recommendedTankLiters.toLocaleString()} Liters
                          </p>
                          <p>
                            <strong className="text-foreground">Plinth Level:</strong> Minimum{" "}
                            {climateReport.floodAndPlinthGuidance.recommendedPlinthHeightFt} ft above road crown.{" "}
                            {climateReport.floodAndPlinthGuidance.reason}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Workflow & Cited Rules */}
                  <TabsContent value="workflow" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Compass className="size-4 text-primary" /> Authority Approval Process ({activePlot.jurisdiction.authority})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {activePlot.jurisdiction.approvalWorkflow.map((step) => (
                          <div key={step} className="rounded-lg bg-muted/50 px-3 py-2 font-medium text-foreground">
                            {step}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Cited Regulatory Clauses (PRIE)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {activePlot.citedRules.map((r) => (
                          <div key={r.rule_id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-xs">
                            <div>
                              <span className="font-mono font-semibold text-primary">{r.rule_id}</span> ·{" "}
                              <span className="font-semibold">{r.regulation}</span>
                              <p className="mt-0.5 text-muted-foreground">{r.source_clause} — {r.summary}</p>
                            </div>
                            <VerificationBadge status={r.verification_status} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
