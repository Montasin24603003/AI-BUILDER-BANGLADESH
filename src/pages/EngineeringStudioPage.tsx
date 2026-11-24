import { useMemo, useState } from "react";
import {
  Activity,
  Droplets,
  Flame,
  Hammer,
  HardHat,
  Layers,
  ShieldAlert,
  Trees,
  Wind,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner } from "@/components/app/VerificationBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBangladesh } from "@/context/BangladeshContext";
import { BANGLADESH_DISTRICTS } from "@/data/bangladeshRules";
import { runStructuralAssist } from "@/services/bangladeshEngine";
import { StructuralAssistInput } from "@/types/bangladesh";

const MODULE_ICONS: Record<string, typeof Zap> = {
  Electrical: Zap,
  Plumbing: Droplets,
  Sanitary: Layers,
  "Fire Safety": Flame,
  HVAC: Wind,
  Interior: Hammer,
  Landscape: Trees,
};

export default function EngineeringStudioPage() {
  const { activePlot } = useBangladesh();

  const [input, setInput] = useState<StructuralAssistInput>({
    plotAreaSqm: activePlot.areaMetrics?.totalAreaSqm ?? 250,
    footprintSqm: activePlot.parameters?.maxFootprintSqm ?? 155,
    floors: activePlot.input.proposedFloors ?? 6,
    district: activePlot.input.district || "Dhaka",
    soilType: "Medium Silty Clay",
    bearingCapacityKpa: 135,
    spanMaxM: 4.5,
  });

  const result = useMemo(() => runStructuralAssist(input), [input]);

  const colsPerSide = Math.max(3, Math.round(Math.sqrt(result.preliminaryColumnGrid.estimatedColumnsCount ?? 9)));

  return (
    <AppShell title="Engineering Studio">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <HardHat className="size-6 text-primary" /> Structural & MEP Engineering Studio
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conceptual layout prompts with district-level seismic references. No structural analysis, foundation selection, or BNBC compliance calculation is performed.
            </p>
          </div>
          <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            Preliminary AI Engineering Assist (Not Stamped)
          </span>
        </div>

        <RegulatoryDisclaimerBanner text={result.disclaimer} />

        <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
          {/* Structural Parameter Panel */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Building & Soil Inputs</CardTitle>
              <CardDescription>Configure structural assumptions for preliminary checks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium">District (BNBC Seismic Map)</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                  value={input.district}
                  onChange={(e) => setInput({ ...input, district: e.target.value })}
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district} (Zone {d.seismicZone})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Footprint (sqm)</label>
                  <Input
                    type="number"
                    min={30}
                    value={input.footprintSqm}
                    onChange={(e) => setInput({ ...input, footprintSqm: Number(e.target.value) || 100 })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Floors</label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={input.floors}
                    onChange={(e) => setInput({ ...input, floors: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Sub-Soil Profile</label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                  value={input.soilType}
                  onChange={(e) =>
                    setInput({ ...input, soilType: e.target.value as StructuralAssistInput["soilType"] })
                  }
                >
                  <option value="Soft Clay / Alluvial">Soft Clay / Alluvial</option>
                  <option value="Medium Silty Clay">Medium Silty Clay</option>
                  <option value="Stiff Clay / Dense Sand">Stiff Clay / Dense Sand</option>
                  <option value="Unverified (Soil Test Required)">Unverified (Soil Test Required)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Max Span (m)</label>
                  <Input
                    type="number"
                    step="0.2"
                    min={2.5}
                    max={8}
                    value={input.spanMaxM}
                    onChange={(e) => setInput({ ...input, spanMaxM: Number(e.target.value) || 4.0 })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Bearing Cap. (kPa)</label>
                  <Input
                    type="number"
                    min={40}
                    value={input.bearingCapacityKpa ?? ""}
                    onChange={(e) =>
                      setInput({ ...input, bearingCapacityKpa: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1.5">
                <p className="font-semibold">Preliminary District Reference ({input.district})</p>
                <p>Zone {result.seismicZone} · Z = <span className="font-mono font-semibold">{result.zFactor.toFixed(2)}</span></p>
                <p className="text-muted-foreground">Confirm parameters from the official BNBC 2020 map and geotechnical report.</p>
                <p className="text-muted-foreground">Concrete quantity: not calculated</p>
                <p className="text-muted-foreground">Rebar quantity: not calculated</p>
              </div>
            </CardContent>
          </Card>

          {/* Main Engineering Tabs */}
          <div className="space-y-6">
            <Tabs defaultValue="structure">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="structure">Structure & Column Grid</TabsTrigger>
                <TabsTrigger value="seismic">Seismic & Foundation</TabsTrigger>
                <TabsTrigger value="mep">MEP, Fire & Services</TabsTrigger>
              </TabsList>

              {/* Structure & Column Grid */}
              <TabsContent value="structure" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Column Count</p>
                      <p className="mt-1 text-lg font-semibold">{result.preliminaryColumnGrid.estimatedColumnsCount ?? "Not calculated"}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{result.preliminaryColumnGrid.typicalSpacingM}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Preliminary Column</p>
                      <p className="mt-1 text-lg font-semibold font-mono">{result.preliminaryColumnGrid.typicalColumnSizeMm}</p>
                      <p className="text-[11px] text-muted-foreground">Requires project design</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Preliminary Beam</p>
                      <p className="mt-1 text-lg font-semibold font-mono">{result.preliminaryColumnGrid.typicalBeamSizeMm}</p>
                      <p className="text-[11px] text-muted-foreground">Requires project design</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">Slab Thickness</p>
                      <p className="mt-1 text-lg font-semibold font-mono">{result.preliminaryColumnGrid.slabThicknessMm ? `${result.preliminaryColumnGrid.slabThicknessMm} mm` : "Not calculated"}</p>
                      <p className="text-[11px] text-muted-foreground">Requires engineered design</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Schematic Column & Beam Grid Layout</CardTitle>
                    <CardDescription>Illustrative grid only; column positions, frame elements, and core are not an engineered structural layout.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center rounded-xl border bg-cad-grid p-4">
                      <svg viewBox="0 0 320 220" className="h-60 w-full max-w-md">
                        {/* Beams */}
                        {Array.from({ length: colsPerSide }).map((_, r) => {
                          const y = 30 + (r * 160) / Math.max(1, colsPerSide - 1);
                          return <line key={`hb-${r}`} x1="35" y1={y} x2="285" y2={y} stroke="#4263eb" strokeWidth="2.5" strokeOpacity="0.65" />;
                        })}
                        {Array.from({ length: colsPerSide }).map((_, c) => {
                          const x = 35 + (c * 250) / Math.max(1, colsPerSide - 1);
                          return <line key={`vb-${c}`} x1={x} y1="30" x2={x} y2="190" stroke="#4263eb" strokeWidth="2.5" strokeOpacity="0.65" />;
                        })}
                        {/* Stair/Shear Core Highlight */}
                        <rect x="200" y="30" width="85" height="60" fill="#f59e0b" fillOpacity="0.16" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 2" />
                        <text x="242" y="64" textAnchor="middle" fontSize="9" fontWeight="600" fill="#92400e">
                          Stair/Shear Core
                        </text>
                        {/* Columns */}
                        {Array.from({ length: colsPerSide }).map((_, r) =>
                          Array.from({ length: colsPerSide }).map((__, c) => {
                            const x = 35 + (c * 250) / Math.max(1, colsPerSide - 1);
                            const y = 30 + (r * 160) / Math.max(1, colsPerSide - 1);
                            return (
                              <rect
                                key={`col-${r}-${c}`}
                                x={x - 5}
                                y={y - 5}
                                width="10"
                                height="10"
                                fill="#0f172a"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            );
                          })
                        )}
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Seismic & Foundation */}
              <TabsContent value="seismic" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="size-4 text-primary" /> Foundation Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 font-medium text-foreground">
                      {result.recommendedFoundation}
                    </div>
                    <div className="space-y-2.5">
                      {result.earthquakeChecks.map((chk) => (
                        <div key={chk.check} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-xs">
                          <div className="flex items-start gap-2">
                            <ShieldAlert
                              className={`mt-0.5 size-4 shrink-0 ${
                                chk.status === "Critical" ? "text-destructive" : "text-amber-600"
                              }`}
                            />
                            <div>
                              <p className="font-semibold text-sm">{chk.check}</p>
                              <p className="mt-0.5 text-muted-foreground">{chk.note}</p>
                            </div>
                          </div>
                          <span className="rounded bg-muted px-2 py-1 font-mono text-[11px]">{chk.clause}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MEP & Building Services */}
              <TabsContent value="mep" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {result.mepModules.map((mod) => {
                    const Icon = MODULE_ICONS[mod.discipline] ?? Layers;
                    return (
                      <Card key={mod.discipline}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <Icon className="size-4 text-primary" /> {mod.discipline} Module
                            </CardTitle>
                            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px]">
                              {mod.clauseRef}
                            </span>
                          </div>
                          <CardDescription className="text-xs">{mod.summary}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                            {mod.keySpecs.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
