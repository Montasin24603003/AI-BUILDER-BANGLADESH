import React, { Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { SimulatedNotice } from "@/components/app/StatusBadges";
import { FloorPlanCanvas, downloadSvgElement } from "@/components/plan/FloorPlanCanvas";
import type { Apartment3DHandle, Selected3DPart } from "@/components/three/Apartment3DViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjects } from "@/context/ProjectContext";
import { apiClient } from "@/services/apiClient";
import { formatArea } from "@/lib/utils";
import { PlanProject, Scene3DData } from "@/types/plancheck";
import { toast } from "sonner";

const LazyApartment3DViewer = React.lazy(() =>
  import("@/components/three/Apartment3DViewer").then((m) => ({ default: m.Apartment3DViewer }))
);

export default function ShareProjectPage() {
  const { id } = useParams();
  const { getProject, backendOnline, settings } = useProjects();
  const contextProject = getProject(id);

  const [sharedProject, setSharedProject] = useState<PlanProject | undefined>(contextProject);
  const [scene3d, setScene3d] = useState<Scene3DData | null>(null);

  useEffect(() => {
    setSharedProject(contextProject);
  }, [contextProject]);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getSharePayload(id)
      .then((res) => {
        setSharedProject(res.project);
        setScene3d(res.model_3d);
      })
      .catch(() => {
        // Offline fallback uses contextProject
      });
  }, [id]);

  const project = sharedProject ?? contextProject;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewer3DRef = useRef<Apartment3DHandle | null>(null);
  const section3DRef = useRef<HTMLDivElement | null>(null);

  const [planViewMode, setPlanViewMode] = useState<"corrected" | "original">("corrected");
  const [showRoof, setShowRoof] = useState(false);
  const [showWalls, setShowWalls] = useState(true);
  const [selectedPart, setSelectedPart] = useState<Selected3DPart | null>(null);
  const [copied, setCopied] = useState(false);

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <Logo />
        <h1 className="mt-6 text-xl font-semibold">Shared project not found</h1>
        <Button className="mt-4" asChild>
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const applied = project.issues.filter((i) => i.status === "applied" || i.status === "accepted");
  const remaining = project.issues.filter((i) => i.status === "open" || i.status === "dismissed");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Shareable client URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.success("Share link ready: " + window.location.pathname);
    }
  };

  const handleDownload2D = () => {
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const ok = downloadSvgElement(svgRef.current, `${slug}-revised-2d.svg`);
    if (ok) toast.success("Downloaded Revised 2D CAD Plan (.svg)");
  };

  const handleDownloadReport = () => {
    if (backendOnline) {
      window.open(apiClient.getPdfReportUrl(project.id), "_blank");
      toast.success("Downloading PDF Inspection Report");
      return;
    }

    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${project.name} — PlanCheck AI Report</title></head><body><h1>${project.name}</h1><p>Simulated demo report — run FastAPI backend for PDF export.</p></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-report.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Inspection Report");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-5 w-px bg-border sm:inline-block" />
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-muted-foreground">Client Presentation · {project.id}</p>
              <p className="text-sm font-semibold">{project.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/visualize/${project.id}`}>
                <ArrowLeft className="size-3.5" /> Workspace
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              {copied ? "Link Copied" : "Copy Share Link"}
            </Button>
            <Button size="sm" onClick={handleDownloadReport}>
              <FileText className="size-3.5" /> Download PDF Report
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        {/* Banner */}
        <div className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                <Sparkles className="size-3" /> Architectural Design Package
              </span>
              <SimulatedNotice compact />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              Prepared by <span className="font-medium text-foreground">{settings.architectName}</span> ·{" "}
              {settings.studioName} · Last updated {project.lastModified}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {!project.isSample && backendOnline && (
              <Button variant="outline" asChild>
                <a href={apiClient.getOriginalFileUrl(project.id)} target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  Original Drawing
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={handleDownload2D}>
              <Download className="size-4" />
              Revised 2D Plan
            </Button>
            <Button onClick={() => section3DRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              <Box className="size-4" />
              View 3D Model
            </Button>
          </div>
        </div>

        {/* Overview KPI Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Building Typology</p>
              <p className="mt-1 text-base font-semibold">{project.buildingType}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Floor Area &amp; Layout</p>
              <p className="mt-1 text-base font-semibold">
                {formatArea(project.totalAreaSqm, settings.unitSystem)} · {project.roomCount} Zones
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Corrections Applied</p>
              <p className="mt-1 text-base font-semibold text-emerald-700">
                {applied.length} of {project.issues.length} Recommendations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Checks Passed</p>
              <p className="mt-1 text-base font-semibold text-primary">{project.passedChecks.length} Verified Items</p>
            </CardContent>
          </Card>
        </div>

        {/* 3D + 2D */}
        <div ref={section3DRef} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden shadow-elevated">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Box className="size-4 text-primary" /> Interactive 3D Architectural Model
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={showWalls ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowWalls((w) => !w)}
                >
                  Walls
                </Button>
                <Button
                  type="button"
                  variant={showRoof ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowRoof((r) => !r)}
                >
                  Roof
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => viewer3DRef.current?.exportGLB(`${project.id}-3d.glb`)}
                >
                  <Download className="size-3" /> GLB
                </Button>
              </div>
            </CardHeader>
            <div className="h-[460px] w-full bg-[#EEF2F8]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Loading 3D view...
                  </div>
                }
              >
                <LazyApartment3DViewer
                  ref={viewer3DRef}
                  scene3d={scene3d}
                  issues={project.issues}
                  showWalls={showWalls}
                  showRoof={showRoof}
                  showFurniture
                  selectedPart={selectedPart}
                  onSelectPart={setSelectedPart}
                />
              </Suspense>
            </div>
          </Card>

          <Card className="overflow-hidden shadow-elevated">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="size-4 text-primary" /> 2D Floor Plan Preview
              </CardTitle>
              <div className="flex items-center rounded-lg border bg-card p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPlanViewMode("corrected")}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    planViewMode === "corrected" ? "bg-emerald-600 text-white" : "text-muted-foreground"
                  }`}
                >
                  Revised 2D
                </button>
                <button
                  type="button"
                  onClick={() => setPlanViewMode("original")}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    planViewMode === "original" ? "bg-primary text-white" : "text-muted-foreground"
                  }`}
                >
                  Original 2D
                </button>
              </div>
            </CardHeader>
            <div className="h-[460px] p-3">
              <FloorPlanCanvas
                svgRef={svgRef}
                geometry={planViewMode === "corrected" ? project.currentGeometry : project.originalGeometry}
                layoutTemplate={project.layoutTemplate}
                uploadedPreviewUrl={project.uploadedPreviewUrl}
                uploadedFileType={project.fileType}
                uploadedFileName={project.fileName}
                issues={project.issues}
                mode={planViewMode}
                preferUploadedImage={planViewMode === "original" ? undefined : false}
                unitSystem={settings.unitSystem}
                className="h-full"
              />
            </div>
          </Card>
        </div>

        {/* Compliance & Inspection Report Section */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Inspection &amp; Revision Summary Report</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 p-6 md:grid-cols-3">
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Passed Checks ({project.passedChecks.length})
              </h3>
              <div className="space-y-2">
                {project.passedChecks.map((pc) => (
                  <div key={pc.id} className="rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-3 text-xs">
                    <p className="font-semibold text-foreground">{pc.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-emerald-700">{pc.measuredValue}</p>
                    <p className="mt-1 text-muted-foreground">{pc.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="size-4 text-primary" />
                Corrections Applied ({applied.length})
              </h3>
              <div className="space-y-2">
                {applied.length > 0 ? (
                  applied.map((iss) => (
                    <div key={iss.id} className="rounded-lg border border-primary/25 bg-primary/[0.04] p-3 text-xs">
                      <p className="font-semibold text-foreground">{iss.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-primary">
                        {iss.detectedValue} → {iss.suggestedTarget}
                      </p>
                      <p className="mt-1 text-muted-foreground">{iss.recommendation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No AI corrections have been applied yet.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="size-4 text-amber-600" />
                Items Requiring Review ({remaining.length})
              </h3>
              <div className="space-y-2">
                {remaining.length > 0 ? (
                  remaining.map((iss) => (
                    <div key={iss.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs">
                      <p className="font-semibold text-foreground">{iss.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-amber-700">
                        Detected: {iss.detectedValue}
                      </p>
                      <p className="mt-1 text-muted-foreground">{iss.recommendation}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs text-emerald-800">
                    All flagged items have been addressed in the revised layout.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <SimulatedNotice />
      </main>
    </div>
  );
}
