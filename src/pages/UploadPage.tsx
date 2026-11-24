import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileCheck2,
  FileImage,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkflowStepper } from "@/components/app/WorkflowStepper";
import { SimulatedNotice } from "@/components/app/StatusBadges";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/context/ProjectContext";
import { createAnalyzedProjectFromUpload, formatBytes } from "@/services/planCheckService";
import { LayoutTemplate, PlanProject } from "@/types/plancheck";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

interface SelectedFileState {
  rawFile?: File;
  fileName: string;
  fileSize: string;
  fileType: string;
  previewUrl?: string;
  isSample: boolean;
  layoutTemplate: LayoutTemplate;
  uploadedProject?: PlanProject;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const {
    addProject,
    uploadDrawingProject,
    createSampleOnBackend,
    selectPdfPage,
    backendOnline,
    settings,
  } = useProjects();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFileState | null>(null);
  const [projectName, setProjectName] = useState("");
  const [buildingType, setBuildingType] = useState("Multi-Family Residential");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const validMime = ACCEPTED_TYPES.includes(file.type) || ["pdf", "png", "jpg", "jpeg"].includes(ext);

    if (!validMime) {
      toast.error("Unsupported format. Please upload a PDF, PNG, or JPG drawing.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds 25 MB limit.");
      return;
    }

    const defaultName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setProjectName(defaultName);

    // Upload immediately to FastAPI backend when online so PDF pages are rendered & selectable
    if (backendOnline) {
      setUploading(true);
      try {
        const created = await uploadDrawingProject(file, defaultName, buildingType);
        setSelectedFile({
          rawFile: file,
          fileName: created.fileName,
          fileSize: created.fileSize,
          fileType: created.fileType,
          previewUrl: created.uploadedPreviewUrl,
          isSample: false,
          layoutTemplate: created.layoutTemplate,
          uploadedProject: created,
        });
        toast.success(
          created.pageCount && created.pageCount > 1
            ? `Uploaded ${file.name} (${created.pageCount} PDF pages rendered)`
            : `Uploaded ${file.name} to backend`
        );
        return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Backend upload failed, falling back to local preview.");
      } finally {
        setUploading(false);
      }
    }

    // Local fallback preview
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      setSelectedFile({
        rawFile: file,
        fileName: file.name,
        fileSize: formatBytes(file.size),
        fileType: file.type || (ext === "pdf" ? "application/pdf" : "image/png"),
        previewUrl: dataUrl,
        isSample: false,
        layoutTemplate: "2br-apartment",
      });
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const loadSamplePlan = (template: LayoutTemplate = "2br-apartment") => {
    const samples: Record<LayoutTemplate, { file: string; name: string; type: string; size: string }> = {
      "2br-apartment": {
        file: "modern-2br-apartment.pdf",
        name: "Modern 2-Bedroom Apartment (Demo)",
        type: "Multi-Family Residential",
        size: "2.4 MB",
      },
      "res-plan-a": {
        file: "residential-floor-plan-a.png",
        name: "Residential Floor Plan A (Demo)",
        type: "Duplex Residence",
        size: "3.1 MB",
      },
      "family-house": {
        file: "family-house-ground-lvl.jpg",
        name: "Family House Design (Demo)",
        type: "Single-Family Villa",
        size: "4.6 MB",
      },
      "urban-compact": {
        file: "compact-urban-unit-4B.pdf",
        name: "Compact Urban Residence (Demo)",
        type: "Urban Micro-Apartment",
        size: "1.8 MB",
      },
    };
    const s = samples[template];
    setSelectedFile({
      fileName: s.file,
      fileSize: s.size,
      fileType: s.file.endsWith(".pdf") ? "application/pdf" : "image/png",
      isSample: true,
      layoutTemplate: template,
    });
    setProjectName(s.name);
    setBuildingType(s.type);
    toast.success("Sample residential floor plan loaded");
  };

  const handleSelectPage = async (page: number) => {
    if (!selectedFile?.uploadedProject) return;
    const updated = await selectPdfPage(selectedFile.uploadedProject.id, page);
    if (updated) {
      setSelectedFile({
        ...selectedFile,
        previewUrl: updated.uploadedPreviewUrl,
        uploadedProject: updated,
      });
      toast.success(`Selected PDF Page ${page}`);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    try {
      // If already uploaded to backend via file picker
      if (selectedFile.uploadedProject) {
        navigate(`/analysis/${selectedFile.uploadedProject.id}`);
        return;
      }

      // Sample plan via backend
      if (backendOnline && selectedFile.isSample) {
        try {
          const created = await createSampleOnBackend(
            selectedFile.layoutTemplate,
            projectName || selectedFile.fileName,
            buildingType
          );
          navigate(`/analysis/${created.id}`);
          return;
        } catch {
          // Fall back to local demo creation below
        }
      }

      const project = createAnalyzedProjectFromUpload({
        name: projectName || selectedFile.fileName,
        buildingType,
        fileName: selectedFile.fileName,
        fileSize: selectedFile.fileSize,
        fileType: selectedFile.fileType,
        uploadedPreviewUrl: selectedFile.previewUrl,
        layoutTemplate: selectedFile.layoutTemplate,
      });
      addProject(project);
      navigate(`/analysis/${project.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const pagePreviews = selectedFile?.uploadedProject?.pagePreviews ?? [];
  const selectedPage = selectedFile?.uploadedProject?.selectedPage ?? 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <WorkflowStepper activeStep="upload" />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Let&apos;s Analyze Your Floor Plan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your architectural drawing and let AI inspect it for potential design issues.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadSamplePlan("2br-apartment")}>
            <Sparkles className="size-4 text-primary" />
            Load Sample Floor Plan
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Dropzone or Preview */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex min-h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all",
                    dragActive
                      ? "border-primary bg-primary/[0.04] scale-[1.01]"
                      : "border-slate-300 bg-muted/20 hover:border-primary/50"
                  )}
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {uploading ? <Loader2 className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
                  </div>
                  <h2 className="mt-4 text-base font-semibold">
                    {uploading ? "Processing drawing & rendering preview..." : "Drag and drop your floor plan here"}
                  </h2>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    Supports architectural 2D floor plans exported from AutoCAD, Revit, multi-page PDFs, or scanned images.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                      Browse Files
                    </Button>
                    <Button type="button" variant="outline" disabled={uploading} onClick={() => loadSamplePlan("2br-apartment")}>
                      <Sparkles className="size-4 text-primary" />
                      Use Sample Plan
                    </Button>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="size-3.5" /> Accepted: PDF, PNG, JPG
                    </span>
                    <span className="flex items-center gap-1">
                      <FileImage className="size-3.5" /> Max file size: 25 MB
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileCheck2 className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{selectedFile.fileName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {selectedFile.fileSize} ·{" "}
                          {selectedFile.uploadedProject
                            ? `Project ID: ${selectedFile.uploadedProject.id}`
                            : selectedFile.isSample
                              ? "Sample Architectural Sheet"
                              : selectedFile.fileType}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setSelectedFile(null)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>

                  {/* Multi-Page PDF Page Selector */}
                  {pagePreviews.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
                      <span className="font-medium text-muted-foreground">
                        PDF Page Selection ({pagePreviews.length} pages detected):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pagePreviews.map((_, idx) => {
                          const pageNum = idx + 1;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => handleSelectPage(pageNum)}
                              className={cn(
                                "rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                                selectedPage === pageNum
                                  ? "border-primary bg-primary text-white"
                                  : "bg-background hover:bg-muted"
                              )}
                            >
                              Page {pageNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preview Canvas */}
                  <div className="h-[340px]">
                    <FloorPlanCanvas
                      geometry={selectedFile.uploadedProject?.currentGeometry}
                      layoutTemplate={selectedFile.layoutTemplate}
                      uploadedPreviewUrl={selectedFile.previewUrl}
                      uploadedFileType={selectedFile.fileType}
                      uploadedFileName={selectedFile.fileName}
                      showMarkers={false}
                      unitSystem={settings.unitSystem}
                      className="h-full"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Metadata & Launch */}
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <h3 className="text-sm font-semibold">Drawing Details</h3>
                  <p className="text-xs text-muted-foreground">Configure project metadata before inspection.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Modern 2-Bedroom Apartment"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Building Type</label>
                  <select
                    value={buildingType}
                    onChange={(e) => setBuildingType(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Multi-Family Residential">Multi-Family Residential</option>
                    <option value="Single-Family Villa">Single-Family Villa</option>
                    <option value="Duplex Residence">Duplex Residence</option>
                    <option value="Urban Micro-Apartment">Urban Micro-Apartment</option>
                  </select>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={!selectedFile || uploading || submitting}
                    onClick={handleAnalyze}
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Analyze Drawing
                    <ArrowRight />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Sample Selector */}
            <Card>
              <CardContent className="p-5 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demo Sample Presets
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["2br-apartment", "2BR Apartment"],
                      ["res-plan-a", "Duplex Plan A"],
                      ["family-house", "Family House"],
                      ["urban-compact", "Compact Loft"],
                    ] as const
                  ).map(([tpl, label]) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => loadSamplePlan(tpl)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/[0.03]",
                        selectedFile?.layoutTemplate === tpl && selectedFile.isSample
                          ? "border-primary bg-primary/5 text-primary"
                          : "bg-background text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <SimulatedNotice />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
