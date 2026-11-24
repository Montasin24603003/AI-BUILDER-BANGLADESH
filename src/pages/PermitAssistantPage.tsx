import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileWarning, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner } from "@/components/app/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBangladesh } from "@/context/BangladeshContext";
import { RegulatoryAuthorityId } from "@/types/bangladesh";
import { toast } from "sonner";

const AUTH_OPTIONS: Array<{ value: RegulatoryAuthorityId; label: string }> = [
  { value: "RAJUK", label: "RAJUK (Dhaka Metro)" },
  { value: "CDA", label: "CDA (Chattogram)" },
  { value: "KDA", label: "KDA (Khulna)" },
  { value: "RDA", label: "RDA (Rajshahi)" },
  { value: "GDA", label: "GDA (Gazipur)" },
  { value: "CoxDA", label: "CoxDA (Cox's Bazar)" },
  { value: "CITY_CORP", label: "City Corporation" },
  { value: "MUNICIPALITY", label: "Pourashava / Municipality" },
];

export default function PermitAssistantPage() {
  const { activePlot, permitChecklist, togglePermitItem, resetPermitChecklistForAuthority } = useBangladesh();
  const [authority, setAuthority] = useState<RegulatoryAuthorityId>(activePlot.jurisdiction.authority);
  const [floors, setFloors] = useState<number>(activePlot.input.proposedFloors ?? 6);
  const [submissionStatus, setSubmissionStatus] = useState<string>("Preparing Documents");

  const stats = useMemo(() => {
    const total = permitChecklist.length;
    const done = permitChecklist.filter((i) => i.completed).length;
    const missingMandatory = permitChecklist.filter((i) => i.mandatory && !i.completed);
    return {
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
      missingMandatory,
    };
  }, [permitChecklist]);

  const handleRebuild = () => {
    resetPermitChecklistForAuthority(authority, floors);
    toast.success(`Checklist updated for ${authority} (${floors} stories)`);
  };

  const exportChecklist = () => {
    const lines = [
      `BUILDING APPROVAL PERMIT CHECKLIST — ${authority}`,
      `Floors: ${floors} | Readiness: ${stats.pct}% (${stats.done}/${stats.total})`,
      `Current Tracking Status: ${submissionStatus}`,
      "=======================================================",
      ...permitChecklist.map(
        (item) => `[${item.completed ? "DONE" : "MISSING"}] (${item.category}) ${item.title} — Required by: ${item.requiredBy}`
      ),
      "",
      "Note: Submit final package through the official authority portal (e.g. RAJUK ECP).",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permit-checklist-${authority.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Permit checklist exported");
  };

  return (
    <AppShell
      title="Permit & Approval Assistant"
      actions={
        <Button variant="outline" size="sm" onClick={exportChecklist}>
          <Download className="size-4" /> Export Checklist
        </Button>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ClipboardCheck className="size-6 text-primary" /> Building Approval & Permit Assistant
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prepare building permit submissions, detect missing deeds/NOCs, and track readiness for {authority}.
            </p>
          </div>
          <div className="rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold">
            Readiness: <span className="text-primary">{stats.pct}%</span> ({stats.done}/{stats.total} completed)
          </div>
        </div>

        <RegulatoryDisclaimerBanner text="PlanCheck AI helps assemble and verify your submission checklist locally. It does not file applications directly with government portals (such as RAJUK ECP) unless authorized official API integration is enabled." />

        {/* Configuration Bar */}
        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-4 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium">Approval Authority</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                value={authority}
                onChange={(e) => setAuthority(e.target.value as RegulatoryAuthorityId)}
              >
                {AUTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Number of Floors</label>
              <Input
                type="number"
                min={1}
                max={40}
                value={floors}
                onChange={(e) => setFloors(Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Local Submission Tracker</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
                value={submissionStatus}
                onChange={(e) => setSubmissionStatus(e.target.value)}
              >
                <option value="Preparing Documents">Preparing Documents</option>
                <option value="Survey & Soil Test Pending">Survey & Soil Test Pending</option>
                <option value="LUC / Clearance Submitted">LUC / Clearance Submitted</option>
                <option value="Plan Sanction Under Review">Plan Sanction Under Review</option>
                <option value="Corrections Requested">Corrections Requested</option>
              </select>
            </div>
            <Button onClick={handleRebuild} variant="secondary">
              <RefreshCw className="size-4" /> Sync Checklist Rules
            </Button>
          </CardContent>
        </Card>

        {/* Missing Document Alert */}
        {stats.missingMandatory.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-amber-900">
                <FileWarning className="size-4 text-amber-600" />
                {stats.missingMandatory.length} Mandatory Document(s) Missing Before Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {stats.missingMandatory.map((m) => (
                <span key={m.id} className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900">
                  {m.title}
                </span>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="flex items-center gap-2 p-4 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-5 text-emerald-600" />
              All mandatory documents in this checklist are marked ready for {authority} submission!
            </CardContent>
          </Card>
        )}

        {/* Checklist Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Document & Drawing Checklist</CardTitle>
            <CardDescription>Click any item to toggle completion status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {permitChecklist.map((item) => (
              <div
                key={item.id}
                onClick={() => togglePermitItem(item.id)}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                  item.completed ? "border-emerald-200 bg-emerald-50/30" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="mt-1 size-4 accent-primary"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {item.category}
                      </span>
                      {item.mandatory && (
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{item.requiredBy}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
