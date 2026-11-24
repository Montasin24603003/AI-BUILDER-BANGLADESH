import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "upload", label: "Upload", path: () => "/upload" },
  { key: "analysis", label: "Analyze", path: (id: string) => `/analysis/${id}` },
  { key: "review", label: "Review & Fix", path: (id: string) => `/review/${id}` },
  { key: "comparison", label: "Compare", path: (id: string) => `/comparison/${id}` },
  { key: "visualize", label: "3D View", path: (id: string) => `/visualize/${id}` },
  { key: "share", label: "Share", path: (id: string) => `/project/${id}` },
] as const;

export type WorkflowStepKey = (typeof STEPS)[number]["key"];

export function WorkflowStepper({
  activeStep,
  projectId = "demo-2br",
}: {
  activeStep: WorkflowStepKey;
  projectId?: string;
}) {
  const activeIdx = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <nav aria-label="Analysis workflow" className="mb-5 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1.5 rounded-xl border bg-card px-3 py-2 shadow-card">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx;
          const isCurrent = idx === activeIdx;
          const isClickable = step.key === "upload" || Boolean(projectId);
          return (
            <li key={step.key} className="flex items-center gap-1.5">
              {isClickable ? (
                <Link
                  to={step.path(projectId)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    isCurrent
                      ? "bg-primary text-white shadow-sm"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full font-mono text-[10px]",
                      isCurrent
                        ? "bg-white/20 text-white"
                        : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="size-2.5" /> : idx + 1}
                  </span>
                  <span>{step.label}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground">
                  {step.label}
                </span>
              )}
              {idx < STEPS.length - 1 && <span className="text-border">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
