import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  dark?: boolean;
  to?: string;
  compact?: boolean;
  className?: string;
}

export function Logo({ dark = false, to = "/", compact = false, className }: LogoProps) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-2.5 group focus:outline-none", className)}>
      <div className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-transform group-hover:scale-[1.03]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" />
          <path d="M4 11h8v9" />
          <path d="M12 4v4h8" />
          <circle cx="16.5" cy="15.5" r="1.5" className="fill-primary stroke-none" />
        </svg>
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[15px] font-semibold tracking-tight", dark ? "text-white" : "text-foreground")}>
            PlanCheck
          </span>
          <span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            BD
          </span>
        </div>
      )}
    </Link>
  );
}
