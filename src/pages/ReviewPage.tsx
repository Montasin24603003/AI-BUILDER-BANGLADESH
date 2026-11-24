import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crosshair,
  Grid3X3,
  History,
  Info,
  Loader2,
  RotateCcw,
  Ruler,
  Sparkles,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { IssueStatusBadge, SeverityBadge, SimulatedNotice } from "@/components/app/StatusBadges";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProjects } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FilterTab = "all" | "high" | "medium" | "resolved";

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getProject,
    refreshProject,
    updateIssueStatus,
    applyAcceptedFixes,
    undoLastCorrection,
    resetProjectToOriginal,
    settings,
  } = useProjects();
  const project = getProject(id);

  useEffect(() => {
    if (id) refreshProject(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showGrid, setShowGrid] = useState(settings.showGridDefault);
  const [showDimensions, setShowDimensions] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [applying, setApplying] = useState(false);

  const issues = project?.issues ?? [];

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      if (filter === "high") return iss.severity === "high" && iss.status === "open";
      if (filter === "medium") return iss.severity === "medium" && iss.status === "open";
      if (filter === "resolved") return iss.status === "accepted" || iss.status === "applied" || iss.status === "dismissed";
      return true;
    });
  }, [issues, filter]);

  const activeIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) ?? filteredIssues[0] ?? issues[0] ?? null,
    [issues, filteredIssues, selectedIssueId]
  );

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

  const acceptedCount = issues.filter((i) => i.status === "accepted" || i.status === "applied").length;
  const openCount = issues.filter((i) => i.status === "open").length;

  const focusIssueOnDrawing = (issueId: string, markerX: number, markerY: number) => {
    setSelectedIssueId(issueId);
    setZoom(1.45);
    setPan({
      x: Math.round((50 - markerX) * 3.2),
      y: Math.round((50 - markerY) * 2.2),
    });
  };

  const handleApplyFixes = async () => {
    if (acceptedCount === 0) {
      toast.info("Accept at least one AI suggestion (or click Accept All) before applying fixes.");
      return;
    }
    setApplying(true);
    try {
      const count = await applyAcceptedFixes(project.id);
      toast.success(`Applied ${count > 0 ? count : acceptedCount} geometry correction(s) to revised 2D plan.`);
      navigate(`/comparison/${project.id}`);
    } finally {
      setApplying(false);
    }
  };

  const acceptAllSuggestions = async () => {
    for (const iss of issues) {
      if (iss.status === "open") {
        await updateIssueStatus(project.id, iss.id, "accepted");
      }
    }
    toast.success("All open AI suggestions marked as accepted.");
  };

  const handleUndo = async () => {
    const ok = await undoLastCorrection(project.id);
    if (ok) toast.success("Undid last correction action.");
    else toast.info("Nothing to undo.");
  };

  const handleReset = async () => {
    await resetProjectToOriginal(project.id);
    toast.success("Reset floor plan geometry to original state.");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px]">
        <WorkflowStepper activeStep="review" projectId={project.id} />

        {/* Header Bar */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{project.name} — Review &amp; Fix</h1>
              <SimulatedNotice compact />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {openCount} pending · {acceptedCount} accepted/applied · {project.passedChecks.length} checks passed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleUndo} title="Undo last action">
              <Undo2 className="size-3.5" /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} title="Reset to original geometry">
              <RotateCcw className="size-3.5" /> Reset
            </Button>
            {openCount > 0 && (
              <Button variant="outline" size="sm" onClick={acceptAllSuggestions}>
                <Check className="size-3.5" /> Accept All
              </Button>
            )}
            <Button size="sm" onClick={handleApplyFixes} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Applying Corrections...
                </>
              ) : (
                <>
                  <Wand2 className="size-4" />
                  Apply Fixes ({acceptedCount})
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Split-Screen Workspace */}
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Panel — Original 2D Plan */}
          <Card className="flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">2D Plan Inspection</span>
                <span className="hidden rounded border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                  Click pins to inspect
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={showGrid ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowGrid((g) => !g)}
                >
                  <Grid3X3 className="size-3.5" /> Grid
                </Button>
                <Button
                  type="button"
                  variant={showDimensions ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowDimensions((d) => !d)}
                >
                  <Ruler className="size-3.5" /> Dims
                </Button>
              </div>
            </div>

            <div className="relative h-[470px] lg:h-[600px] p-3">
              <FloorPlanCanvas
                geometry={project.currentGeometry}
                layoutTemplate={project.layoutTemplate}
                uploadedPreviewUrl={project.uploadedPreviewUrl}
                uploadedFileType={project.fileType}
                uploadedFileName={project.fileName}
                issues={issues}
                selectedIssueId={activeIssue?.id ?? null}
                onSelectIssue={(issId) => setSelectedIssueId(issId)}
                mode={acceptedCount > 0 ? "corrected" : "original"}
                showGrid={showGrid}
                showDimensions={showDimensions}
                unitSystem={settings.unitSystem}
                highContrastMarkers={settings.highContrastMarkers}
                zoom={zoom}
                pan={pan}
                onZoomChange={setZoom}
                onPanChange={setPan}
                className="h-full"
              />

              {/* Legend */}
              <div className="pointer-events-none absolute bottom-5 right-5 z-20 flex flex-wrap items-center gap-3 rounded-lg border bg-card/95 px-3 py-1.5 text-[11px] shadow-card backdrop-blur">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500" /> Critical
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500" /> Warning
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" /> Accepted/Applied
                </span>
              </div>
            </div>
          </Card>

          {/* Right Panel — AI Inspection Report */}
          <div className="flex flex-col gap-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-2 shadow-card">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["all", `All (${issues.length})`],
                    ["high", `High (${issues.filter((i) => i.severity === "high" && i.status === "open").length})`],
                    ["medium", `Warnings (${issues.filter((i) => i.severity === "medium" && i.status === "open").length})`],
                    ["resolved", `Resolved (${issues.filter((i) => i.status !== "open").length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === key
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No issues match this filter.
                  </CardContent>
                </Card>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const isSelected = activeIssue?.id === issue.id;
                  return (
                    <Card
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={cn(
                        "cursor-pointer transition-all",
                        isSelected ? "border-primary ring-2 ring-primary/15" : "hover:border-primary/40"
                      )}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                                {issue.id || `ISSUE-${String(idx + 1).padStart(3, "0")}`} · {issue.code}
                              </span>
                              <SeverityBadge severity={issue.severity} />
                              <IssueStatusBadge status={issue.status} />
                              {issue.measurementType && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                                  {issue.measurementType}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{issue.title}</h3>
                          </div>
                          {typeof issue.confidenceScore === "number" && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {Math.round(issue.confidenceScore * 100)}% conf.
                            </span>
                          )}
                        </div>

                        {/* Detected vs Target */}
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Detected Value
                            </span>
                            <p className="mt-0.5 font-mono font-semibold text-destructive">{issue.detectedValue}</p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Suggested Target
                            </span>
                            <p className="mt-0.5 font-mono font-semibold text-emerald-700">{issue.suggestedTarget}</p>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <p className="text-foreground">
                            <span className="font-semibold">Suggested Correction:</span> {issue.recommendation}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Why it matters:</span>{" "}
                            {issue.whyItMatters || issue.reason}
                          </p>
                          {issue.expectedImpact && (
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Expected impact:</span> {issue.expectedImpact}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              focusIssueOnDrawing(issue.id, issue.markerX, issue.markerY);
                            }}
                          >
                            <Crosshair className="size-3.5" /> View on Drawing
                          </Button>
                          {issue.status !== "accepted" && issue.status !== "applied" ? (
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateIssueStatus(project.id, issue.id, "accepted");
                                toast.success(`Accepted correction: ${issue.title}`);
                              }}
                            >
                              <Check className="size-3.5" /> Accept
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateIssueStatus(project.id, issue.id, "open");
                              }}
                            >
                              Reopen
                            </Button>
                          )}
                          {issue.status !== "dismissed" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateIssueStatus(project.id, issue.id, "dismissed");
                                toast("Recommendation rejected.");
                              }}
                            >
                              <X className="size-3.5" /> Reject
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* AI Explanation Panel */}
            {activeIssue && (
              <Card className="border-primary/20 bg-primary/[0.03]">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      AI Review Notes — {activeIssue.title}
                    </span>
                    {activeIssue.manualReviewRequired && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        Human Review Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{activeIssue.aiExplanation}</p>
                </CardContent>
              </Card>
            )}

            {/* Correction History & Passed Checks */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                    <CheckCircle2 className="size-3.5 text-success" />
                    Passed Checks ({project.passedChecks.length})
                  </p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {project.passedChecks.map((pc) => (
                      <div key={pc.id} className="rounded-md border bg-emerald-50/40 px-2.5 py-1 text-[11px]">
                        <span className="font-medium text-emerald-950">{pc.title}: </span>
                        <span className="font-mono text-[10px] text-emerald-700">{pc.measuredValue}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                    <History className="size-3.5 text-primary" />
                    Correction History ({project.correctionHistory?.length ?? 0})
                  </p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto text-[11px]">
                    {project.correctionHistory && project.correctionHistory.length > 0 ? (
                      project.correctionHistory.slice(0, 4).map((h) => (
                        <div key={h.id} className="rounded-md border bg-muted/40 px-2 py-1">
                          <span className="font-medium capitalize">{h.action}</span> · {h.title}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No geometry changes recorded yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Proposed architectural modifications are AI-assisted suggestions and do not constitute certified compliance
                or professional approval.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
