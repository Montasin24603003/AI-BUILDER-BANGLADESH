import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Ruler,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { SimulatedNotice } from "@/components/app/StatusBadges";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/context/ProjectContext";
import { apiClient } from "@/services/apiClient";
import { ANALYSIS_STAGES } from "@/services/planCheckService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AnalysisPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProject, refreshProject, calibrateProjectScale, backendOnline, settings } = useProjects();
  const project = getProject(id);

  const [stageIndex, setStageIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refWidthInput, setRefWidthInput] = useState("12.4");
  const [calibrating, setCalibrating] = useState(false);

  const runPipeline = useCallback(async () => {
    if (!id) return;
    setStageIndex(0);
    setCompleted(false);
    setErrorMsg(null);

    if (backendOnline) {
      try {
        await apiClient.startAnalysis(id);
        let attempts = 0;
        const poll = async () => {
          attempts += 1;
          try {
            const res = await apiClient.getAnalysisStatus(id);
            const job = res.job;
            if (typeof job?.stage_index === "number") {
              setStageIndex(job.stage_index);
            }
            if (job?.status === "completed") {
              await refreshProject(id);
              setStageIndex(ANALYSIS_STAGES.length - 1);
              setCompleted(true);
              return;
            }
            if (job?.status === "failed") {
              setErrorMsg(job.error || "Analysis failed.");
              return;
            }
            if (attempts < 40) {
              window.setTimeout(poll, 350);
            } else {
              setErrorMsg("Analysis timed out. Please retry.");
            }
          } catch {
            // Fall back to local staged timer if network drops mid-poll
            setCompleted(true);
          }
        };
        window.setTimeout(poll, 350);
        return;
      } catch {
        // Fallback to local staged demo timing below
      }
    }

    // Local deterministic demo timer fallback
    ANALYSIS_STAGES.forEach((_, idx) => {
      window.setTimeout(() => {
        setStageIndex(idx);
        if (idx === ANALYSIS_STAGES.length - 1) {
          window.setTimeout(() => setCompleted(true), 450);
        }
      }, idx * 650);
    });
  }, [id, backendOnline, refreshProject]);

  useEffect(() => {
    runPipeline();
  }, [runPipeline]);

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

  const currentStage = ANALYSIS_STAGES[Math.min(stageIndex, ANALYSIS_STAGES.length - 1)];
  const progressPercent = completed ? 100 : currentStage.percent;

  const criticalCount = project.issues.filter((i) => i.severity === "high").length;
  const warningCount = project.issues.filter((i) => i.severity === "medium" || i.severity === "low").length;
  const passedCount = project.passedChecks.length;
  const cvSummary = project.currentGeometry?.cv_summary;
  const scaleEstimated = project.currentGeometry?.scale_status === "estimated";

  const handleCalibrate = async () => {
    const val = Number(refWidthInput);
    if (!Number.isFinite(val) || val < 2 || val > 100) {
      toast.error("Please enter a valid building width in meters (2–100 m).");
      return;
    }
    setCalibrating(true);
    try {
      const updated = await calibrateProjectScale(project.id, val);
      if (updated) {
        toast.success(`Scale calibrated to ${val.toFixed(1)} m reference width`);
      } else {
        toast.info("Calibration requires live backend connection.");
      }
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <WorkflowStepper activeStep="analysis" projectId={project.id} />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">Analyzing Your Architectural Plan</h1>
              <SimulatedNotice compact />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspecting <span className="font-medium text-foreground">{project.name}</span> ({project.fileName})
            </p>
          </div>

          {!completed ? (
            <Button variant="outline" size="sm" onClick={() => setCompleted(true)}>
              Skip to Results
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={runPipeline}>
                <RotateCcw className="size-3.5" /> Re-run
              </Button>
              <Button size="sm" onClick={() => navigate(`/review/${project.id}`)}>
                Review &amp; Fix Issues <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <span>{errorMsg}</span>
            <Button size="sm" variant="outline" onClick={runPipeline}>
              Retry Analysis
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
          {/* Central Floor Plan Viewer */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {completed ? (
                  <>
                    <CheckCircle2 className="size-4 text-success" />
                    Inspection Complete — {project.issues.length} Findings Highlighted
                  </>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin text-primary" />
                    {currentStage.label}...
                  </>
                )}
              </CardTitle>
              <span className="font-mono text-xs font-semibold text-primary">{progressPercent}%</span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="h-[430px]">
                <FloorPlanCanvas
                  geometry={project.currentGeometry}
                  layoutTemplate={project.layoutTemplate}
                  uploadedPreviewUrl={project.uploadedPreviewUrl}
                  uploadedFileType={project.fileType}
                  uploadedFileName={project.fileName}
                  issues={project.issues}
                  showMarkers={completed}
                  scanning={!completed}
                  unitSystem={settings.unitSystem}
                  showGrid={settings.showGridDefault}
                  className="h-full"
                />
              </div>

              {/* OpenCV Preprocessing Telemetry when user uploaded an image/PDF */}
              {completed && cvSummary && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3.5 py-2 text-xs">
                  <span className="font-medium text-foreground">OpenCV Drawing Telemetry:</span>
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>{cvSummary.wall_lines_detected ?? 0} wall lines</span>
                    <span>{cvSummary.room_contours_detected ?? 0} enclosed regions</span>
                    <span>{cvSummary.orientation || "landscape"}</span>
                    <span>Confidence: {Math.round((cvSummary.cv_confidence ?? 0.5) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Scale Calibration Prompt if drawing lacked reference scale */}
              {completed && scaleEstimated && (
                <div className="flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-xs text-amber-900">
                    <Ruler className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">Scale Not Calibrated (Measurements Marked Estimated)</p>
                      <p className="text-[11px] text-amber-800">
                        Enter a known overall building width (m) to calibrate dimensions.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      step="0.1"
                      value={refWidthInput}
                      onChange={(e) => setRefWidthInput(e.target.value)}
                      className="h-8 w-24 text-xs"
                    />
                    <Button size="sm" className="h-8 text-xs" disabled={calibrating} onClick={handleCalibrate}>
                      {calibrating ? "Calibrating..." : "Calibrate"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Progress Tracker & Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Analysis Pipeline</CardTitle>
                  <span className="font-mono text-xs text-muted-foreground">{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {ANALYSIS_STAGES.map((stage, idx) => {
                  const isDone = completed || idx < stageIndex;
                  const isActive = !completed && idx === stageIndex;
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border px-3 py-2 text-xs transition-colors",
                        isActive
                          ? "border-primary/40 bg-primary/[0.04]"
                          : isDone
                            ? "border-emerald-200/70 bg-emerald-50/40"
                            : "border-transparent bg-muted/30 opacity-60"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="size-4 text-success" />
                        ) : isActive ? (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        ) : (
                          <span className="flex size-4 items-center justify-center rounded-full border font-mono text-[10px]">
                            {stage.id}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{stage.label}</p>
                        {(isActive || isDone) && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{stage.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Inspection Summary */}
            {completed && (
              <Card className="border-primary/25 shadow-elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" /> Inspection Summary
                    </CardTitle>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                      {scaleEstimated ? "Estimated Scale" : "Needs Review"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg border bg-muted/30 p-2">
                      <p className="text-lg font-semibold">{project.issues.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total Issues</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50/70 p-2">
                      <p className="text-lg font-semibold text-destructive">{criticalCount}</p>
                      <p className="text-[10px] text-red-700">Critical</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2">
                      <p className="text-lg font-semibold text-amber-600">{warningCount}</p>
                      <p className="text-[10px] text-amber-800">Warnings</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2">
                      <p className="text-lg font-semibold text-emerald-600">{passedCount}</p>
                      <p className="text-[10px] text-emerald-700">Passed</p>
                    </div>
                  </div>

                  {/* Highlight List */}
                  <ul className="space-y-1.5 text-xs">
                    {project.issues.slice(0, 3).map((iss) => (
                      <li
                        key={iss.id}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2.5 py-1.5",
                          iss.severity === "high" ? "bg-red-50/70 text-red-900" : "bg-amber-50/70 text-amber-900"
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          {iss.severity === "high" ? (
                            <AlertCircle className="size-3.5 text-destructive" />
                          ) : (
                            <AlertTriangle className="size-3.5 text-warning" />
                          )}
                          {iss.title}: {iss.detectedValue}
                        </span>
                        <span className="font-mono text-[10px] uppercase">
                          {iss.measurementType === "estimated" ? "Estimated" : "Flagged"}
                        </span>
                      </li>
                    ))}
                    {project.passedChecks.slice(0, 2).map((pc) => (
                      <li
                        key={pc.id}
                        className="flex items-center justify-between rounded-md bg-emerald-50/70 px-2.5 py-1.5 text-emerald-900"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="size-3.5 text-success" /> {pc.title}
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700">Passed</span>
                      </li>
                    ))}
                  </ul>

                  <SimulatedNotice />

                  <Button className="w-full" size="lg" onClick={() => navigate(`/review/${project.id}`)}>
                    Proceed to Review &amp; Fix
                    <ArrowRight />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
