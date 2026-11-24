import { useMemo, useState } from "react";
import { BookOpen, Code2, Filter, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner, VerificationBadge } from "@/components/app/VerificationBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BANGLADESH_REGULATORY_RULES } from "@/data/bangladeshRules";
import { RegulatoryAuthorityId, RuleCategory } from "@/types/bangladesh";

const AUTHORITIES: Array<{ value: "ALL" | RegulatoryAuthorityId; label: string }> = [
  { value: "ALL", label: "All Authorities" },
  { value: "NATIONAL", label: "BNBC 2020 & National" },
  { value: "RAJUK", label: "RAJUK (Dhaka)" },
  { value: "CDA", label: "CDA (Chattogram)" },
  { value: "KDA", label: "KDA (Khulna)" },
  { value: "RDA", label: "RDA (Rajshahi)" },
  { value: "GDA", label: "GDA (Gazipur)" },
  { value: "CoxDA", label: "CoxDA (Cox's Bazar)" },
  { value: "MUNICIPALITY", label: "City Corp / Pourashava" },
];

const CATEGORIES: Array<"ALL" | RuleCategory> = [
  "ALL",
  "FAR",
  "Ground Coverage",
  "Setback",
  "Building Height",
  "Land Use",
  "Parking",
  "Fire Safety",
  "Ventilation",
  "Structural & Seismic",
  "Permits",
];

export default function BuildingLawsPage() {
  const [search, setSearch] = useState("");
  const [authorityFilter, setAuthorityFilter] = useState<"ALL" | RegulatoryAuthorityId>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | RuleCategory>("ALL");
  const [showJsonId, setShowJsonId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BANGLADESH_REGULATORY_RULES.filter((r) => {
      if (authorityFilter !== "ALL" && r.authority !== authorityFilter) return false;
      if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.rule_id.toLowerCase().includes(q) ||
        r.regulation.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.source_clause.toLowerCase().includes(q) ||
        r.jurisdiction.toLowerCase().includes(q)
      );
    });
  }, [search, authorityFilter, categoryFilter]);

  return (
    <AppShell title="Bangladesh Building Laws (PRIE)">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <BookOpen className="size-6 text-primary" />
              PlanCheck Regulatory Intelligence Engine (PRIE)
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Source references for BNBC 2020 and Bangladesh planning rules, with unencoded or parcel-specific requirements marked for review.
            </p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">
            {filtered.length} of {BANGLADESH_REGULATORY_RULES.length} rules indexed
          </div>
        </div>

        <RegulatoryDisclaimerBanner text="BNBC 2020 applies nationally across Bangladesh. RAJUK / Dhaka Metropolitan Building Rules apply only inside Dhaka DMDP. Regional authorities (CDA, KDA, RDA, GDA, CoxDA) and municipalities maintain distinct local schedules." />

        {/* Filter Controls */}
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rule ID, FAR, setback, BNBC clause..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 shrink-0 text-muted-foreground" />
              <select
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                value={authorityFilter}
                onChange={(e) => setAuthorityFilter(e.target.value as "ALL" | RegulatoryAuthorityId)}
              >
                {AUTHORITIES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
              <select
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "ALL" | RuleCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Rule Cards */}
        <div className="grid gap-4">
          {filtered.map((rule) => {
            const isJsonOpen = showJsonId === rule.rule_id;
            return (
              <Card key={rule.rule_id} className="transition-shadow hover:shadow-elevated">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                          {rule.rule_id}
                        </span>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                          {rule.authority}
                        </span>
                        <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-700">
                          {rule.category}
                        </span>
                        <VerificationBadge status={rule.verification_status} />
                      </div>
                      <CardTitle className="mt-2 text-base">{rule.regulation} ({rule.year})</CardTitle>
                      <CardDescription>{rule.jurisdiction} · {rule.building_type}</CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowJsonId(isJsonOpen ? null : rule.rule_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      <Code2 className="size-3.5" />
                      {isJsonOpen ? "Hide PRIE JSON" : "View PRIE JSON"}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-foreground/90">{rule.summary}</p>
                  <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-xs md:grid-cols-3">
                    <div>
                      <span className="font-semibold text-foreground">Official Source:</span>
                      <p className="mt-0.5 text-muted-foreground">{rule.source_document}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Relevant Clause:</span>
                      <p className="mt-0.5 text-muted-foreground">{rule.source_clause}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Effective / History:</span>
                      <p className="mt-0.5 text-muted-foreground">{rule.effective_from} — {rule.amendment_history}</p>
                    </div>
                  </div>
                  {rule.source_url && (
                    <a
                      className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                      href={rule.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open official source
                    </a>
                  )}
                  <div className="rounded-lg border border-blue-200/70 bg-blue-50/50 px-3 py-2 font-mono text-xs text-blue-950">
                    <span className="font-semibold">Rule Logic: </span>
                    {rule.formula_note}
                  </div>
                  {isJsonOpen && (
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-100">
                      {JSON.stringify(rule, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
