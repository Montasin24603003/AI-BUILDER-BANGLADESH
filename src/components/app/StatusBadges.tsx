import { Badge } from "@/components/ui/badge";
import { IssueSeverity, IssueStatus, ProjectStatus } from "@/types/plancheck";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles, XCircle } from "lucide-react";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  switch (status) {
    case "3D Ready":
      return (
        <Badge variant="success">
          <CheckCircle2 className="size-3" />
          3D Ready
        </Badge>
      );
    case "Corrections Applied":
      return (
        <Badge variant="default">
          <Sparkles className="size-3" />
          Corrections Applied
        </Badge>
      );
    case "Needs Review":
      return (
        <Badge variant="warning">
          <AlertTriangle className="size-3" />
          Needs Review
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  if (severity === "high") {
    return (
      <Badge variant="destructive">
        <AlertCircle className="size-3" />
        High Severity
      </Badge>
    );
  }
  if (severity === "medium") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="size-3" />
        Medium
      </Badge>
    );
  }
  return <Badge variant="outline">Low</Badge>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  switch (status) {
    case "applied":
      return (
        <Badge variant="success">
          <CheckCircle2 className="size-3" />
          Applied
        </Badge>
      );
    case "accepted":
      return (
        <Badge variant="default">
          <CheckCircle2 className="size-3" />
          Accepted
        </Badge>
      );
    case "dismissed":
      return (
        <Badge variant="secondary">
          <XCircle className="size-3" />
          Dismissed
        </Badge>
      );
    default:
      return <Badge variant="outline">Open</Badge>;
  }
}

export function SimulatedNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
        <Info className="size-3 shrink-0 text-amber-600" />
        Simulated Demo Analysis
      </span>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground">
      <Info className="size-3.5 shrink-0 text-foreground/70" />
      <p className="leading-snug">
        <span className="font-medium text-foreground">Simulated Demo Results:</span> All geometry detections, dimensions, and suggested fixes
        below are deterministic demo outputs for architectural preview only. They do not represent certified code compliance
        (including Bangladesh National Building Code) or stamped engineering approval.
      </p>
    </div>
  );
}
