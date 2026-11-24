import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Box,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  DraftingCompass,
  Eye,
  FileSearch,
  FolderKanban,
  Globe,
  HardHat,
  MapPin,
  Plus,
  Share2,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge, SimulatedNotice } from "@/components/app/StatusBadges";
import { VerificationBadge } from "@/components/app/VerificationBadge";
import { useProjects } from "@/context/ProjectContext";
import { useBangladesh } from "@/context/BangladeshContext";
import { formatArea } from "@/lib/utils";

export default function DashboardPage() {
  const { projects, metrics, settings } = useProjects();
  const { activePlot, permitChecklist } = useBangladesh();

  const statCards = [
    { label: "Total Projects", value: metrics.totalProjects, icon: FolderKanban, dot: "bg-primary" },
    { label: "Plans Analyzed", value: metrics.plansAnalyzed, icon: FileSearch, dot: "bg-foreground/60" },
    { label: "Issues Detected", value: metrics.issuesDetected, icon: AlertTriangle, dot: "bg-amber-500" },
    { label: "Issues Resolved", value: metrics.issuesResolved, icon: CheckCircle2, dot: "bg-emerald-600" },
  ];

  const ecosystemModules = [
    { title: "AutoCAD Studio", desc: "2D CAD drafting + live 3D", to: "/cad-studio", icon: DraftingCompass },
    { title: "Bangladesh Map", desc: "Live projects, malls & RMG", to: "/bangladesh-map", icon: Globe },
    { title: "Plot Analyzer", desc: "Authority, FAR, MGC & setbacks", to: "/plot-analysis", icon: MapPin },
    { title: "AI Design Studio", desc: "Generate A/B/C layouts & 3D", to: "/design-studio", icon: Sparkles },
    { title: "Building Laws (PRIE)", desc: "BNBC 2020, RAJUK, CDA, KDA", to: "/laws", icon: BookOpen },
    { title: "Engineering Studio", desc: "Columns, seismic & MEP specs", to: "/engineering", icon: HardHat },
    { title: "Cost Estimator", desc: "BDT materials & BOQ budget", to: "/cost-estimator", icon: Calculator },
    { title: "Permit Assistant", desc: "Approval & missing doc check", to: "/permits", icon: ClipboardCheck },
  ];

  const completedPermits = permitChecklist.filter((i) => i.completed).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Clean Architectural Workspace Header */}
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              Bangladesh Building Intelligence · Workspace
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-[26px]">
              Project &amp; Regulatory Overview
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              Evaluate land &amp; jurisdiction, inspect 2D drawings against BNBC 2020 / local rules, and manage 3D models.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/plot-analysis">
                <MapPin className="size-3.5 text-muted-foreground" />
                Analyze Plot
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/upload">
                <Plus className="size-3.5" />
                New Plan Check
              </Link>
            </Button>
          </div>
        </div>

        {/* Crisp Divider-Grid Metric Strip */}
        <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rounded-lg border bg-card lg:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="flex items-start justify-between p-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${stat.dot}`} />
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </div>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
              <stat.icon className="size-4 text-muted-foreground/70" />
            </div>
          ))}
        </div>

        {/* Active Plot Feasibility & Regulatory Alerts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2.5 flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="size-4 text-primary" /> Active Plot: {activePlot.input.projectName}
                </CardTitle>
                <CardDescription>
                  {activePlot.jurisdiction.authorityName} · {activePlot.jurisdiction.seismicZone.label}
                </CardDescription>
              </div>
              <VerificationBadge status={activePlot.verificationStatus} />
            </CardHeader>
            <CardContent className="grid gap-2.5 sm:grid-cols-4 text-xs">
              <div className="rounded-md border bg-secondary/40 p-3">
                <span className="text-[11px] text-muted-foreground">Land Area</span>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {activePlot.areaMetrics ? `${activePlot.areaMetrics.areaKatha} Katha` : "Pending"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {activePlot.areaMetrics ? `${activePlot.areaMetrics.totalAreaSqm} m²` : "Enter dimensions"}
                </p>
              </div>
              <div className="rounded-md border bg-secondary/40 p-3">
                <span className="text-[11px] text-muted-foreground">Road &amp; Facing</span>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {activePlot.input.roadWidthFt ?? 30} ft · {activePlot.input.roadFacing}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">Abutting road</p>
              </div>
              <div className="rounded-md border bg-secondary/40 p-3">
                <span className="text-[11px] text-muted-foreground">FAR &amp; Coverage</span>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {activePlot.parameters ? `FAR ${activePlot.parameters.permissibleFAR}` : "Schedule Needed"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {activePlot.parameters ? `${activePlot.parameters.maxGroundCoveragePct}% MGC` : "Verify DAP / Mouza"}
                </p>
              </div>
              <div className="rounded-md border bg-secondary/40 p-3">
                <span className="text-[11px] text-muted-foreground">Permit Checklist</span>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {completedPermits}/{permitChecklist.length} Ready
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {activePlot.jurisdiction.authority} package
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Regulatory Scope</CardTitle>
              <CardDescription>Jurisdiction &amp; safety reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="rounded-md border border-border bg-secondary/50 p-2.5 text-foreground/90">
                <strong className="font-medium text-foreground">Authority Scope:</strong> RAJUK rules apply only inside Dhaka DMDP. Regional cities follow CDA/KDA/RDA/GDA/CoxDA + BNBC 2020.
              </div>
              <div className="rounded-md border border-border bg-secondary/30 p-2.5 text-muted-foreground">
                Buildings &ge; 7 floors (&gt;20m) require mandatory FSCD fire safety clearance &amp; dual egress.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bangladesh Ecosystem Launchpad */}
        <div>
          <h2 className="mb-2.5 text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
            Studio Modules
          </h2>
          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {ecosystemModules.map((mod) => (
              <Link
                key={mod.to}
                to={mod.to}
                className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-foreground/30 hover:bg-secondary/40"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded border bg-secondary/70 text-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <mod.icon className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{mod.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{mod.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <SimulatedNotice />

        {/* Recent Projects Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Click any drawing to inspect issues, compare revisions, or view in 3D.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/projects">
                View All <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-xs font-medium text-muted-foreground">
                    <th className="px-5 py-3">Project Name</th>
                    <th className="px-4 py-3">Building Type</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Last Modified</th>
                    <th className="px-4 py-3">Issues Found</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.slice(0, 6).map((project) => {
                    const openIssues = project.issues.filter(
                      (i) => i.status === "open"
                    ).length;
                    const totalIssues = project.issues.length;
                    return (
                      <tr key={project.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <Link to={`/review/${project.id}`} className="font-medium text-foreground hover:text-primary">
                            {project.name}
                          </Link>
                          <p className="font-mono text-[11px] text-muted-foreground">{project.fileName}</p>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{project.buildingType}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {formatArea(project.totalAreaSqm, settings.unitSystem)}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{project.lastModified}</td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-medium">
                            {openIssues > 0 ? (
                              <span className="text-amber-700">{openIssues} open / {totalIssues} total</span>
                            ) : (
                              <span className="text-emerald-700">0 open ({totalIssues} resolved)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <ProjectStatusBadge status={project.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild title="Review Issues">
                              <Link to={`/review/${project.id}`}>
                                <Eye className="size-3.5" />
                                <span className="hidden sm:inline">Review</span>
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild title="3D Model">
                              <Link to={`/visualize/${project.id}`}>
                                <Box className="size-3.5 text-primary" />
                                <span className="hidden sm:inline">3D</span>
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8" asChild title="Client Share Page">
                              <Link to={`/project/${project.id}`}>
                                <Share2 className="size-3.5 text-muted-foreground" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
