import { Link } from "react-router-dom";
import { Download, ExternalLink, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectStatusBadge, SimulatedNotice } from "@/components/app/StatusBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProjects } from "@/context/ProjectContext";
import { apiClient } from "@/services/apiClient";
import { formatArea } from "@/lib/utils";
import { PlanProject } from "@/types/plancheck";
import { toast } from "sonner";

export default function ReportsPage() {
  const { projects, backendOnline, settings } = useProjects();

  const downloadProjectSummary = (project: PlanProject) => {
    if (backendOnline) {
      window.open(apiClient.getPdfReportUrl(project.id), "_blank");
      toast.success(`Downloading PDF Report for ${project.name}`);
      return;
    }

    const content = [
      `PlanCheck AI — Simulated Inspection Report`,
      `Project: ${project.name}`,
      `Building Type: ${project.buildingType}`,
      `Total Area: ${formatArea(project.totalAreaSqm, settings.unitSystem)}`,
      `Last Modified: ${project.lastModified}`,
      `Status: ${project.status}`,
      ``,
      `DISCLAIMER: Simulated demo inspection results only. Not certified code compliance.`,
      ``,
      `DETECTED ITEMS (${project.issues.length}):`,
      ...project.issues.map(
        (i, idx) =>
          `${idx + 1}. [${i.severity.toUpperCase()} | ${i.status.toUpperCase()}] ${i.title} (${i.detectedValue} -> ${i.suggestedTarget})\n   Recommendation: ${i.recommendation}`
      ),
      ``,
      `PASSED CHECKS (${project.passedChecks.length}):`,
      ...project.passedChecks.map((p) => `- ${p.title}: ${p.measuredValue} (${p.note})`),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-inspection-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded report for ${project.name}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inspection Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Download PDF architectural inspection reports or open client-ready presentation links.
          </p>
        </div>

        <SimulatedNotice />

        <div className="space-y-3">
          {projects.map((p) => {
            const applied = p.issues.filter((i) => i.status === "applied" || i.status === "accepted").length;
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{p.name}</h3>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.buildingType} · {applied}/{p.issues.length} corrections applied · {p.passedChecks.length} passed
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadProjectSummary(p)}>
                      <Download className="size-3.5" /> {backendOnline ? "Download PDF Report" : "Export Report"}
                    </Button>
                    <Button size="sm" asChild>
                      <Link to={`/project/${p.id}`}>
                        <ExternalLink className="size-3.5" /> Client Presentation
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
