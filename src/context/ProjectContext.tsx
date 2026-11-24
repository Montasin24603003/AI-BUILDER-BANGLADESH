import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SETTINGS, INITIAL_PROJECTS } from "@/data/mockProjects";
import { apiClient } from "@/services/apiClient";
import {
  DashboardMetrics,
  IssueStatus,
  LayoutTemplate,
  PlanProject,
  ProjectStatus,
  UserSettings,
} from "@/types/plancheck";

interface ProjectContextValue {
  projects: PlanProject[];
  settings: UserSettings;
  metrics: DashboardMetrics;
  backendOnline: boolean;
  loading: boolean;
  getProject: (id: string | undefined) => PlanProject | undefined;
  refreshProjects: () => Promise<void>;
  refreshProject: (id: string) => Promise<PlanProject | undefined>;
  addProject: (project: PlanProject) => void;
  upsertProject: (project: PlanProject) => void;
  uploadDrawingProject: (file: File, name: string, buildingType: string) => Promise<PlanProject>;
  createSampleOnBackend: (template: LayoutTemplate, name?: string, buildingType?: string) => Promise<PlanProject>;
  selectPdfPage: (projectId: string, page: number) => Promise<PlanProject | undefined>;
  calibrateProjectScale: (projectId: string, referenceWidthM: number) => Promise<PlanProject | undefined>;
  deleteProject: (id: string) => Promise<void>;
  updateIssueStatus: (projectId: string, issueId: string, status: IssueStatus) => Promise<void>;
  applyAcceptedFixes: (projectId: string) => Promise<number>;
  undoLastCorrection: (projectId: string) => Promise<boolean>;
  resetProjectToOriginal: (projectId: string) => Promise<void>;
  markProjectStatus: (projectId: string, status: ProjectStatus) => void;
  updateSettings: (next: Partial<UserSettings>) => void;
  resetDemoData: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const PROJECTS_STORAGE_KEY = "plancheck_projects_v1";
const SETTINGS_STORAGE_KEY = "plancheck_settings_v1";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<PlanProject[]>(() => {
    try {
      const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlanProject[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore invalid storage
    }
    return INITIAL_PROJECTS;
  });

  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backendMetrics, setBackendMetrics] = useState<DashboardMetrics | null>(null);

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // Ignore invalid storage
    }
    return DEFAULT_SETTINGS;
  });

  const refreshProjects = useCallback(async () => {
    try {
      const data = await apiClient.listProjects();
      setProjects(data.projects);
      if (data.metrics) {
        setBackendMetrics({
          totalProjects: data.metrics.total_projects,
          plansAnalyzed: data.metrics.plans_analyzed,
          issuesDetected: data.metrics.issues_detected,
          issuesResolved: data.metrics.issues_resolved,
        });
      }
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Ignore quota exceeded
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage error
    }
  }, [settings]);

  const upsertProject = useCallback((project: PlanProject) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (!exists) return [project, ...prev];
      return prev.map((p) => (p.id === project.id ? project : p));
    });
  }, []);

  const getProject = useCallback(
    (id: string | undefined) => {
      if (!id) return projects[0];
      return projects.find((p) => p.id === id);
    },
    [projects]
  );

  const refreshProject = useCallback(
    async (id: string) => {
      try {
        const fresh = await apiClient.getProject(id);
        setBackendOnline(true);
        upsertProject(fresh);
        return fresh;
      } catch {
        return projects.find((p) => p.id === id);
      }
    },
    [projects, upsertProject]
  );

  const addProject = useCallback((project: PlanProject) => {
    setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
  }, []);

  const uploadDrawingProject = useCallback(
    async (file: File, name: string, buildingType: string): Promise<PlanProject> => {
      const created = await apiClient.uploadDrawing(file, name, buildingType);
      setBackendOnline(true);
      upsertProject(created);
      return created;
    },
    [upsertProject]
  );

  const createSampleOnBackend = useCallback(
    async (template: LayoutTemplate, name?: string, buildingType?: string): Promise<PlanProject> => {
      const created = await apiClient.createSampleProject(template, name, buildingType);
      setBackendOnline(true);
      upsertProject(created);
      return created;
    },
    [upsertProject]
  );

  const selectPdfPage = useCallback(
    async (projectId: string, page: number) => {
      try {
        const updated = await apiClient.selectPdfPage(projectId, page);
        upsertProject(updated);
        return updated;
      } catch {
        return undefined;
      }
    },
    [upsertProject]
  );

  const calibrateProjectScale = useCallback(
    async (projectId: string, referenceWidthM: number) => {
      try {
        const updated = await apiClient.calibrateScale(projectId, referenceWidthM);
        upsertProject(updated);
        return updated;
      } catch {
        return undefined;
      }
    },
    [upsertProject]
  );

  const deleteProject = useCallback(async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await apiClient.deleteProject(id);
    } catch {
      // Keep local deletion in offline fallback
    }
  }, []);

  const updateIssueStatus = useCallback(
    async (projectId: string, issueId: string, status: IssueStatus) => {
      // Optimistic local update
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          return {
            ...proj,
            lastModified: "Just now",
            updatedAtIso: new Date().toISOString(),
            issues: proj.issues.map((iss) => (iss.id === issueId ? { ...iss, status } : iss)),
          };
        })
      );

      if (backendOnline) {
        try {
          if (status === "accepted") {
            const updated = await apiClient.acceptIssue(projectId, issueId);
            upsertProject(updated);
          } else if (status === "dismissed") {
            const updated = await apiClient.rejectIssue(projectId, issueId);
            upsertProject(updated);
          }
        } catch {
          // Graceful fallback
        }
      }
    },
    [backendOnline, upsertProject]
  );

  const applyAcceptedFixes = useCallback(
    async (projectId: string): Promise<number> => {
      if (backendOnline) {
        try {
          const res = await apiClient.applyCorrections(projectId);
          upsertProject(res.project);
          return res.applied_count;
        } catch {
          // Fallback to local
        }
      }

      let appliedCount = 0;
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const nextIssues = proj.issues.map((iss) => {
            if (iss.status === "accepted" || iss.status === "applied") {
              if (iss.status === "accepted") appliedCount += 1;
              return { ...iss, status: "applied" as const };
            }
            return iss;
          });
          return {
            ...proj,
            lastModified: "Just now",
            updatedAtIso: new Date().toISOString(),
            status: "Corrections Applied",
            issues: nextIssues,
          };
        })
      );
      return appliedCount;
    },
    [backendOnline, upsertProject]
  );

  const undoLastCorrection = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!backendOnline) return false;
      try {
        const updated = await apiClient.undoCorrection(projectId);
        upsertProject(updated);
        return true;
      } catch {
        return false;
      }
    },
    [backendOnline, upsertProject]
  );

  const resetProjectToOriginal = useCallback(
    async (projectId: string) => {
      if (backendOnline) {
        try {
          const updated = await apiClient.resetProject(projectId);
          upsertProject(updated);
          return;
        } catch {
          // Fallback
        }
      }
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          return {
            ...proj,
            status: "Needs Review",
            currentGeometry: proj.originalGeometry,
            issues: proj.issues.map((i) => ({ ...i, status: "open" as const })),
          };
        })
      );
    },
    [backendOnline, upsertProject]
  );

  const markProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((proj) => (proj.id === projectId ? { ...proj, status, lastModified: "Just now" } : proj))
    );
  }, []);

  const updateSettings = useCallback((next: Partial<UserSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...next,
      notifications: next.notifications ? { ...prev.notifications, ...next.notifications } : prev.notifications,
    }));
  }, []);

  const resetDemoData = useCallback(() => {
    setProjects(INITIAL_PROJECTS);
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(PROJECTS_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    refreshProjects();
  }, [refreshProjects]);

  const metrics = useMemo<DashboardMetrics>(() => {
    if (backendMetrics && backendOnline) return backendMetrics;
    const extraProjects = Math.max(0, projects.length - INITIAL_PROJECTS.length);
    const liveResolved = projects.reduce(
      (acc, p) => acc + p.issues.filter((i) => i.status === "applied" || i.status === "accepted").length,
      0
    );
    const initialResolved = INITIAL_PROJECTS.reduce(
      (acc, p) => acc + p.issues.filter((i) => i.status === "applied" || i.status === "accepted").length,
      0
    );
    const liveIssues = projects.reduce((acc, p) => acc + p.issues.length, 0);
    const initialIssues = INITIAL_PROJECTS.reduce((acc, p) => acc + p.issues.length, 0);

    return {
      totalProjects: 12 + extraProjects,
      plansAnalyzed: 28 + extraProjects,
      issuesDetected: 46 + (liveIssues - initialIssues),
      issuesResolved: 39 + (liveResolved - initialResolved),
    };
  }, [backendMetrics, backendOnline, projects]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        settings,
        metrics,
        backendOnline,
        loading,
        getProject,
        refreshProjects,
        refreshProject,
        addProject,
        upsertProject,
        uploadDrawingProject,
        createSampleOnBackend,
        selectPdfPage,
        calibrateProjectScale,
        deleteProject,
        updateIssueStatus,
        applyAcceptedFixes,
        undoLastCorrection,
        resetProjectToOriginal,
        markProjectStatus,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used inside ProjectProvider");
  return ctx;
}
