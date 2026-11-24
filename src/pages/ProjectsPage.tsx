import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectStatusBadge } from "@/components/app/StatusBadges";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/context/ProjectContext";
import { formatArea } from "@/lib/utils";
import { ProjectStatus } from "@/types/plancheck";
import { toast } from "sonner";

type SortBy = "newest" | "oldest" | "name";

export default function ProjectsPage() {
  const { projects, deleteProject, settings } = useProjects();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ProjectStatus>("All");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => {
        const matchesQuery =
          !q || p.name.toLowerCase().includes(q) || p.buildingType.toLowerCase().includes(q);
        const matchesStatus = statusFilter === "All" || p.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "oldest") return a.updatedAtIso.localeCompare(b.updatedAtIso);
        return b.updatedAtIso.localeCompare(a.updatedAtIso);
      });
  }, [projects, query, statusFilter, sortBy]);

  const handleDelete = (id: string, name: string) => {
    deleteProject(id);
    toast.success(`Deleted "${name}"`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage all uploaded floor plans, inspection revisions, and 3D models.
            </p>
          </div>
          <Button asChild>
            <Link to="/upload">
              <Plus className="size-4" /> New Analysis
            </Link>
          </Button>
        </div>

        {/* Filters & View Toolbar */}
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | ProjectStatus)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Needs Review">Needs Review</option>
                <option value="Corrections Applied">Corrections Applied</option>
                <option value="3D Ready">3D Ready</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>

              <div className="flex items-center rounded-lg border bg-background p-0.5">
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-8"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-8"
                  onClick={() => setViewMode("list")}
                  title="List View"
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <p className="text-sm text-muted-foreground">No projects match your current search or filter.</p>
              <Button className="mt-4" asChild>
                <Link to="/upload">Upload a Floor Plan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <Card key={project.id} className="group overflow-hidden transition-all hover:shadow-elevated">
                <div className="relative h-44 border-b bg-cad-grid p-2">
                  <FloorPlanCanvas
                    layoutTemplate={project.layoutTemplate}
                    uploadedPreviewUrl={project.uploadedPreviewUrl}
                    uploadedFileType={project.fileType}
                    uploadedFileName={project.fileName}
                    issues={project.issues}
                    mode={project.status === "Needs Review" ? "original" : "corrected"}
                    interactive={false}
                    compact
                    showDimensions={false}
                    className="h-full border-0 bg-transparent"
                  />
                  <div className="absolute right-3 top-3">
                    <ProjectStatusBadge status={project.status} />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {project.buildingType} · {formatArea(project.totalAreaSqm, settings.unitSystem)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Modified {project.lastModified}</span>
                    <span className="font-mono">{project.issues.length} issue(s)</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" className="flex-1" asChild>
                      <Link to={`/review/${project.id}`}>
                        <Eye className="size-3.5" /> Open Project
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" asChild title="3D Model">
                      <Link to={`/visualize/${project.id}`}>
                        <Box className="size-3.5" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" className="size-8" asChild title="Share">
                      <Link to={`/project/${project.id}`}>
                        <Share2 className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(project.id, project.name)}
                      title="Delete project"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {filtered.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link to={`/review/${project.id}`} className="font-semibold hover:text-primary">
                        {project.name}
                      </Link>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.buildingType} · {formatArea(project.totalAreaSqm, settings.unitSystem)} · Modified{" "}
                      {project.lastModified}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" asChild>
                      <Link to={`/review/${project.id}`}>Open Project</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/visualize/${project.id}`}>3D View</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(project.id, project.name)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
