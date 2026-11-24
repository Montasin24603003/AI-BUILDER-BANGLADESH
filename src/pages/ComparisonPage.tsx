import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Box, CheckCircle2, Columns2, Layers, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { SimulatedNotice } from "@/components/app/StatusBadges";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";

export default function ComparisonPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProject, refreshProject, settings } = useProjects();
  const project = getProject(id);

  useEffect(() => {
    if (id) refreshProject(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Synchronized Zoom & Pan across Original and Corrected drawings
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [sliderPos, setSliderPos] = useState(52);

  if (!project) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <h1 className="text-xl font-semibold">Project not found</h1>
          <Button className="mt-4" asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const totalSuggested = project.issues.length;
  const acceptedOrApplied = project.issues.filter((i) => i.status === "applied" || i.status === "accepted");
  const unresolvedCount = project.issues.filter((i) => i.status === "open" || i.status === "dismissed").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-5">
        <WorkflowStepper activeStep="comparison" projectId={project.id} />

        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Before &amp; After Floor Plan Comparison</h1>
              <SimulatedNotice compact />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Synchronized zoom and pan enabled — compare <span className="font-medium text-foreground">{project.name}</span> original vs corrected CAD geometry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("side-by-side")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "side-by-side" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns2 className="size-3.5" /> Side by Side
              </button>
              <button
                type="button"
                onClick={() => setViewMode("slider")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "slider" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="size-3.5" /> Split Overlay
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw className="size-3.5" /> Sync Reset
            </Button>

            <Button size="sm" onClick={() => navigate(`/visualize/${project.id}`)}>
              <Box className="size-4" />
              Generate 3D Visualization
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Correction Summary Bar */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Suggested Changes</p>
                <p className="text-2xl font-semibold">{totalSuggested}</p>
              </div>
              <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary">
                AI PROPOSED
              </span>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-emerald-800">Accepted / Applied Changes</p>
                <p className="text-2xl font-semibold text-emerald-700">{acceptedOrApplied.length}</p>
              </div>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-mono text-xs font-medium text-emerald-800">
                UPDATED CAD
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Unresolved / Rejected</p>
                <p className="text-2xl font-semibold">{unresolvedCount}</p>
              </div>
              <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-medium text-muted-foreground">
                REMAINING
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Viewport */}
        {viewMode === "side-by-side" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-2.5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Original Floor Plan
                </CardTitle>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                  Before Fixes
                </span>
              </CardHeader>
              <div className="h-[440px] p-3">
                <FloorPlanCanvas
                  geometry={project.originalGeometry}
                  layoutTemplate={project.layoutTemplate}
                  uploadedPreviewUrl={project.uploadedPreviewUrl}
                  uploadedFileType={project.fileType}
                  uploadedFileName={project.fileName}
                  issues={project.issues}
                  mode="original"
                  preferUploadedImage={false}
                  unitSystem={settings.unitSystem}
                  zoom={zoom}
                  pan={pan}
                  onZoomChange={setZoom}
                  onPanChange={setPan}
                  className="h-full"
                />
              </div>
            </Card>

            <Card className="overflow-hidden border-emerald-300/70">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-emerald-50/60 py-2.5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  AI Corrected Floor Plan
                </CardTitle>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  Revised CAD Geometry
                </span>
              </CardHeader>
              <div className="h-[440px] p-3">
                <FloorPlanCanvas
                  geometry={project.currentGeometry}
                  layoutTemplate={project.layoutTemplate}
                  uploadedPreviewUrl={project.uploadedPreviewUrl}
                  uploadedFileType={project.fileType}
                  uploadedFileName={project.fileName}
                  issues={project.issues}
                  mode="corrected"
                  preferUploadedImage={false}
                  unitSystem={settings.unitSystem}
                  zoom={zoom}
                  pan={pan}
                  onZoomChange={setZoom}
                  onPanChange={setPan}
                  className="h-full"
                />
              </div>
            </Card>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-2.5">
              <CardTitle className="text-xs font-semibold">
                Interactive Before / After Split Slider ({sliderPos}%)
              </CardTitle>
              <input
                type="range"
                min={10}
                max={90}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-40 accent-primary"
              />
            </CardHeader>
            <div className="relative h-[480px] p-3">
              <div className="absolute inset-3">
                <FloorPlanCanvas
                  geometry={project.currentGeometry}
                  layoutTemplate={project.layoutTemplate}
                  issues={project.issues}
                  mode="corrected"
                  preferUploadedImage={false}
                  unitSystem={settings.unitSystem}
                  interactive={false}
                  className="h-full"
                />
              </div>
              <div
                className="pointer-events-none absolute inset-3 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <FloorPlanCanvas
                  geometry={project.originalGeometry}
                  layoutTemplate={project.layoutTemplate}
                  issues={project.issues}
                  mode="original"
                  preferUploadedImage={false}
                  unitSystem={settings.unitSystem}
                  interactive={false}
                  className="h-full"
                />
              </div>
              <div
                className="pointer-events-none absolute bottom-3 top-3 z-30 w-0.5 bg-primary shadow-[0_0_12px_rgba(66,99,235,0.8)]"
                style={{ left: `calc(${sliderPos}% )` }}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-1 font-mono text-[10px] font-semibold text-white shadow">
                  BEFORE | AFTER
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Applied Corrections List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Applied Corrections Log
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {acceptedOrApplied.length > 0 ? (
              acceptedOrApplied.map((item) => (
                <div key={item.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    {item.correctionTag}
                  </div>
                  <p className="mt-1 text-muted-foreground">{item.recommendation}</p>
                  <p className="mt-2 font-mono text-[11px] text-emerald-700">
                    {item.detectedValue} → {item.suggestedTarget}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-3 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
                No corrections were accepted yet. Return to{" "}
                <Link to={`/review/${project.id}`} className="font-medium text-primary underline">
                  Review &amp; Fix
                </Link>{" "}
                to accept AI suggestions, or proceed directly to preview the 3D apartment model.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
