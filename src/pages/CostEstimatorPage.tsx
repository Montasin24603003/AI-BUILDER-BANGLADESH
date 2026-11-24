import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner } from "@/components/app/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBangladesh } from "@/context/BangladeshContext";
import { calculateConstructionCost } from "@/services/bangladeshEngine";
import { CostEstimateInput } from "@/types/bangladesh";
import { toast } from "sonner";

const DEFAULT_RATES = {
  cementPerBagBdt: 550,
  steelPerTonBdt: 98000,
  brickPerPieceBdt: 13.5,
  sandPerCftBdt: 55,
  labourPerSqftBdt: 420,
};

function formatCompactBdt(amount: number) {
  if (amount >= 10000000) {
    return `BDT ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `BDT ${(amount / 100000).toFixed(2)} Lac`;
  }
  return `BDT ${amount.toLocaleString()}`;
}

export default function CostEstimatorPage() {
  const { activePlot } = useBangladesh();
  const seededArea = activePlot.parameters?.maxAllowableFloorAreaSqft ?? 9000;

  const [input, setInput] = useState<CostEstimateInput>({
    totalBuiltUpSqft: seededArea,
    floors: activePlot.input.proposedFloors ?? 6,
    finishTier: "Mid-Range",
    foundationType: "Isolated Footing",
    rates: { ...DEFAULT_RATES },
  });

  const breakdown = useMemo(() => calculateConstructionCost(input), [input]);

  const exportCsv = () => {
    const rows = [
      ["Item", "Estimated Quantity", "Estimated Cost (BDT)"],
      ["Cement", `${breakdown.materials.cementBags} bags`, breakdown.materials.cementCostBdt],
      ["MS Rod / Steel", `${breakdown.materials.steelTons} Tons`, breakdown.materials.steelCostBdt],
      ["Bricks", `${breakdown.materials.bricksCount} pcs`, breakdown.materials.bricksCostBdt],
      ["Sand", `${breakdown.materials.sandCft} cft`, breakdown.materials.sandCostBdt],
      ["Stone Aggregate", `${breakdown.materials.aggregateCft} cft`, breakdown.materials.aggregateCostBdt],
      ["Labour", `${input.totalBuiltUpSqft} sqft`, breakdown.trades.labourBdt],
      ["Electrical Materials & Works", "-", breakdown.trades.electricalBdt],
      ["Plumbing & Sanitary", "-", breakdown.trades.plumbingSanitaryBdt],
      ["Finishing (Tiles/Paint/Doors)", "-", breakdown.trades.finishingBdt],
      ["Foundation Surcharge", input.foundationType, breakdown.trades.foundationSurchargeBdt],
      ["TOTAL ESTIMATE", "", breakdown.totalEstimatedBdt],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plancheck-bd-cost-estimate.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("BOQ cost estimate exported as CSV");
  };

  return (
    <AppShell
      title="AI Construction Cost Estimator"
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" /> Export BOQ (.csv)
        </Button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border-b pb-3">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Bangladesh Construction Cost Estimator
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Estimate preliminary material quantities and construction budget in BDT with customizable local market rates.
          </p>
        </div>

        <RegulatoryDisclaimerBanner text="Preliminary planning estimate based on standard Bangladesh RCC thumb rules. Market volatility, piling depth, and custom interior finishes can shift final BOQ costs. Consult a quantity surveyor before tendering." />

        <div className="grid gap-5 lg:grid-cols-[350px_1fr]">
          {/* Inputs & Editable Market Rates */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Project Specs &amp; Local Rates</CardTitle>
              <CardDescription className="text-xs">Adjust total built-up area and local BDT unit prices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium">Built-Up Area (sq ft)</label>
                  <Input
                    className="h-8 text-xs font-mono"
                    type="number"
                    min={200}
                    value={input.totalBuiltUpSqft}
                    onChange={(e) => setInput({ ...input, totalBuiltUpSqft: Number(e.target.value) || 500 })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Floors</label>
                  <Input
                    className="h-8 text-xs font-mono"
                    type="number"
                    min={1}
                    max={30}
                    value={input.floors}
                    onChange={(e) => setInput({ ...input, floors: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-medium">Finishing Tier</label>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    value={input.finishTier}
                    onChange={(e) =>
                      setInput({ ...input, finishTier: e.target.value as CostEstimateInput["finishTier"] })
                    }
                  >
                    <option value="Standard">Standard</option>
                    <option value="Mid-Range">Mid-Range</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Foundation Type</label>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                    value={input.foundationType}
                    onChange={(e) =>
                      setInput({ ...input, foundationType: e.target.value as CostEstimateInput["foundationType"] })
                    }
                  >
                    <option value="Isolated Footing">Isolated Footing</option>
                    <option value="Mat / Raft">Mat / Raft</option>
                    <option value="Pile Foundation">Pile Foundation</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2.5">
                <p className="text-xs font-semibold text-foreground">Editable Market Unit Prices (BDT)</p>
                <div className="grid grid-cols-2 gap-2.5 items-end">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Cement (BDT/bag)</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      value={input.rates.cementPerBagBdt}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          rates: { ...input.rates, cementPerBagBdt: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Steel Rod (BDT/Ton)</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      value={input.rates.steelPerTonBdt}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          rates: { ...input.rates, steelPerTonBdt: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Brick (BDT/pc)</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      step="0.5"
                      value={input.rates.brickPerPieceBdt}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          rates: { ...input.rates, brickPerPieceBdt: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Sand (BDT/cft)</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      value={input.rates.sandPerCftBdt}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          rates: { ...input.rates, sandPerCftBdt: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">Labour (BDT/sq ft)</label>
                    <Input
                      className="h-8 text-xs font-mono"
                      type="number"
                      value={input.rates.labourPerSqftBdt}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          rates: { ...input.rates, labourPerSqftBdt: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => setInput((prev) => ({ ...prev, rates: { ...DEFAULT_RATES } }))}
                  >
                    <RotateCcw className="size-3" /> Reset Rates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary & Cost Breakdown */}
          <div className="space-y-4">
            {/* Unified 3-Card KPI Strip */}
            <div className="grid divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x rounded-lg border bg-card">
              <div className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Estimated Total Budget
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatCompactBdt(breakdown.totalEstimatedBdt)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  BDT {breakdown.totalEstimatedBdt.toLocaleString()}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Unit Construction Rate
                </p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  BDT {breakdown.costPerSqftBdt.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">/ sq ft</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {input.finishTier} Finish · {input.foundationType}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Estimation Range (-8% / +12%)
                </p>
                <p className="mt-1.5 font-display text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {(breakdown.rangeMinBdt / 100000).toFixed(1)}L – {(breakdown.rangeMaxBdt / 100000).toFixed(1)}L
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">BDT variance envelope</p>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Material Quantities &amp; Trade Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-y bg-secondary/50 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-2.5">Cost Component</th>
                        <th className="px-4 py-2.5">Estimated Quantity</th>
                        <th className="px-4 py-2.5 w-36">Share</th>
                        <th className="px-5 py-2.5 text-right">Estimated Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {[
                        {
                          label: "Cement (50 kg bags)",
                          qty: `${breakdown.materials.cementBags.toLocaleString()} bags`,
                          amount: breakdown.materials.cementCostBdt,
                        },
                        {
                          label: "MS Rod / Rebar Steel",
                          qty: `${breakdown.materials.steelTons} Metric Tons`,
                          amount: breakdown.materials.steelCostBdt,
                        },
                        {
                          label: "1st Class Bricks",
                          qty: `${breakdown.materials.bricksCount.toLocaleString()} pcs`,
                          amount: breakdown.materials.bricksCostBdt,
                        },
                        {
                          label: "Sand (Sylhet + Local)",
                          qty: `${breakdown.materials.sandCft.toLocaleString()} cft`,
                          amount: breakdown.materials.sandCostBdt,
                        },
                        {
                          label: "Stone Aggregate / Khoa",
                          qty: `${breakdown.materials.aggregateCft.toLocaleString()} cft`,
                          amount: breakdown.materials.aggregateCostBdt,
                        },
                        {
                          label: "Civil & Mason Labour",
                          qty: `${input.totalBuiltUpSqft.toLocaleString()} sq ft`,
                          amount: breakdown.trades.labourBdt,
                        },
                        {
                          label: "Electrical Materials & Wiring",
                          qty: "Package",
                          amount: breakdown.trades.electricalBdt,
                        },
                        {
                          label: "Plumbing & Sanitary",
                          qty: "Package",
                          amount: breakdown.trades.plumbingSanitaryBdt,
                        },
                        {
                          label: "Finishing (Tiles, Paint, Doors, Windows)",
                          qty: `${input.finishTier} Tier`,
                          amount: breakdown.trades.finishingBdt,
                        },
                        ...(breakdown.trades.foundationSurchargeBdt > 0
                          ? [
                              {
                                label: "Foundation Complexity Surcharge",
                                qty: input.foundationType,
                                amount: breakdown.trades.foundationSurchargeBdt,
                              },
                            ]
                          : []),
                      ].map((row) => {
                        const pct = breakdown.totalEstimatedBdt > 0
                          ? Math.round((row.amount / breakdown.totalEstimatedBdt) * 100)
                          : 0;
                        return (
                          <tr key={row.label} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-5 py-2.5 font-medium text-foreground">{row.label}</td>
                            <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground">{row.qty}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary/80"
                                    style={{ width: `${Math.min(100, Math.max(2, pct * 2))}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono tabular-nums">
                              <span className="font-medium text-foreground">BDT {row.amount.toLocaleString()}</span>
                              <span className="ml-1.5 text-[11px] text-muted-foreground">
                                ({(row.amount / 100000).toFixed(2)} Lac)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-card px-4 py-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Calculation Assumptions: </span>
              {breakdown.assumptions.join(" ")}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
