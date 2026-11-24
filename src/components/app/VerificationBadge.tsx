import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { VerificationStatus } from "@/types/bangladesh";
import { cn } from "@/lib/utils";

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  if (status === "verified_reference") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-emerald-300/80 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-medium text-emerald-800",
          className
        )}
      >
        <CheckCircle2 className="size-3" />
        Verified Reference
      </span>
    );
  }
  if (status === "preliminary_guidance") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-foreground",
          className
        )}
      >
        <Info className="size-3 text-muted-foreground" />
        Preliminary Guidance
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      <AlertTriangle className="size-3" />
      Pending Gazette Review
    </span>
  );
}

export function RegulatoryDisclaimerBanner({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground">
      <ShieldCheck className="size-3.5 shrink-0 text-foreground/70" />
      <p className="leading-snug">
        <span className="font-medium text-foreground">Engineering &amp; Regulatory Notice: </span>
        {text ||
          "PlanCheck AI provides deterministic preliminary planning and BNBC 2020 / local authority assistance. Always verify final zoning, FAR, setbacks, and structural safety with an IAB/IEB-licensed professional and the relevant development authority."}
      </p>
    </div>
  );
}
