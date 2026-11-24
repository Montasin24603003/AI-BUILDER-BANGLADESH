import React, { Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Armchair,
  Box,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Home,
  Layers,
  Loader2,
  MousePointerClick,
  RotateCcw,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { SimulatedNotice } from "@/components/app/StatusBadges";
import type { Apartment3DHandle, Selected3DPart } from "@/components/three/Apartment3DViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects } from "@/context/ProjectContext";
import { apiClient } from "@/services/apiClient";
import { formatArea } from "@/lib/utils";
import { Scene3DData } from "@/types/plancheck";
import { toast } from "sonner";

// Lazy load Three.js / React Three Fiber canvas for fast initial bundle loading
const LazyApartment3DViewer = React.lazy(() =>
  import("@/components/three/Apartment3DViewer").then((m) => ({ default: m.Apartment3DViewer }))
);

export default function Visualize3DPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProject, refreshProject, markProjectStatus, backendOnline, settings } = useProjects();
  const project = getProject(id);
  const viewerRef = useRef<Apartment3DHandle | null>(null);

  const [building, setBuilding] = useState(true);
  const [scene3d, setScene3d] = useState<Scene3DData | null>(null);
  const [showWalls, setShowWalls] = useState(true);
  const [showRoof, setShowRoof] = useState(false);
  const [showFurniture, setShowFurniture] = useState(true);
  const [selectedPart, setSelectedPart] = useState<Selected3DPart | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setBuilding(true);

    const loadModel = async () => {
      if (id && backendOnline) {
        try {
          await refreshProject(id);
          const data = await apiClient.get3DModel(id);
          if (active) setScene3d(data.scene);
        } catch {
          // Graceful fallback to client-side demo geometry
        }
      }
      window.setTimeout(() => {
        if (!active) return;
        setBuilding(false);
        if (project && project.status !== "3D Ready") {
          markProjectStatus(project.id, "3D Ready");
        }
      }, 650);
    };

    loadModel();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, backendOnline]);

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

  const appliedCorrections = project.issues.filter((i) => i.status === "applied" || i.status === "accepted");
  const openRemaining = project.issues.filter((i) => i.status === "open");

  const handleDownload3D = async () => {
    if (!viewerRef.current) return;
    setExporting(true);
    try {
      const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await viewerRef.current.exportGLB(`${slug}-3d.glb`);
      toast.success("Exported interactive 3D model (.glb)");
    } catch {
      toast.error("Could not export 3D model.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-4">
        <WorkflowStepper activeStep="visualize" projectId={project.id} />

        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name} — 3D Visualization</h1>
              <SimulatedNotice compact />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Generated directly from corrected 2D geometry · Drag to orbit · Scroll to zoom · Click components to inspect.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload3D} disabled={building || exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Download 3D Model (.GLB)
            </Button>
            <Button size="sm" onClick={() => navigate(`/project/${project.id}`)}>
              <Share2 className="size-4" />
              Share Presentation
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          {/* 3D Studio Viewport */}
          <Card className="relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card/95 px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => viewerRef.current?.setCameraPreset("perspective")}
                >
                  Perspective
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => viewerRef.current?.setCameraPreset("top")}
                >
                  Top View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => viewerRef.current?.setCameraPreset("isometric")}
                >
                  Isometric
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => viewerRef.current?.resetCamera()}
                >
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant={showWalls ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setShowWalls((w) => !w)}
                >
                  {showWalls ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  Walls
                </Button>
                <Button
                  type="button"
                  variant={showRoof ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setShowRoof((r) => !r)}
                >
                  <Home className="size-3.5" /> Roof
                </Button>
                <Button
                  type="button"
                  variant={showFurniture ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setShowFurniture((f) => !f)}
                >
                  <Armchair className="size-3.5" /> Furniture
                </Button>
              </div>
            </div>

            <div className="relative h-[500px] lg:h-[590px] w-full bg-[#EEF2F8]">
              {building && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#EEF2F8]/95 backdrop-blur-sm">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Box className="size-7 animate-pulse" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">Building your 3D model...</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Extruding structured walls, glazing apertures, and corrected stair geometry
                  </p>
                </div>
              )}

              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Loading Three.js viewport...
                  </div>
                }
              >
                <LazyApartment3DViewer
                  ref={viewerRef}
                  scene3d={scene3d}
                  issues={project.issues}
                  showWalls={showWalls}
                  showRoof={showRoof}
                  showFurniture={showFurniture}
                  selectedPart={selectedPart}
                  onSelectPart={setSelectedPart}
                />
              </Suspense>

              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                <span className="inline-flex items-center gap-1.5">
                  <MousePointerClick className="size-3.5 text-primary" />
                  Click slab, walls, rooms, or staircase to highlight
                </span>
              </div>
            </div>
          </Card>

          {/* Right Information Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="size-4 text-primary" /> Model Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">Project Name</span>
                  <span className="font-medium text-right">{project.name}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">Building Type</span>
                  <span className="text-xs font-medium">{project.buildingType}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs text-muted-foreground">Rooms / Zones</span>
                  <span className="font-mono text-xs font-semibold">{project.roomCount} zones</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Floor Area</span>
                  <span className="font-mono text-xs font-semibold text-primary">
                    {formatArea(project.totalAreaSqm, settings.unitSystem)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={selectedPart ? "border-primary/40 bg-primary/[0.03]" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                  Selected Component
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPart ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="text-sm font-semibold text-primary">{selectedPart.label}</p>
                    <p className="font-mono text-[11px] text-foreground">{selectedPart.dimensions}</p>
                    <p className="text-muted-foreground">{selectedPart.notes}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Click any element in the 3D viewport to inspect its architectural dimensions and notes.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Applied Corrections ({appliedCorrections.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {appliedCorrections.length > 0 ? (
                  appliedCorrections.map((iss) => (
                    <div
                      key={iss.id}
                      className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs"
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="font-medium text-emerald-950">{iss.correctionTag}</p>
                        <p className="font-mono text-[10px] text-emerald-700">
                          {iss.detectedValue} → {iss.suggestedTarget}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No design corrections applied yet.{" "}
                    <Link to={`/review/${project.id}`} className="text-primary underline">
                      Review issues
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Inspection Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-base font-semibold text-emerald-700">{project.passedChecks.length}</p>
                  <p className="text-[10px] text-emerald-800">Passed</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <p className="text-base font-semibold text-primary">{appliedCorrections.length}</p>
                  <p className="text-[10px] text-primary">Corrected</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-base font-semibold text-amber-700">{openRemaining.length}</p>
                  <p className="text-[10px] text-amber-800">Open</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
