import React, { useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RegulatoryDisclaimerBanner, VerificationBadge } from "@/components/app/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBangladesh } from "@/context/BangladeshContext";
import { answerRegulatoryQuery } from "@/services/bangladeshEngine";
import { RegulatoryChatMessage } from "@/types/bangladesh";

const SAMPLE_QUESTIONS = [
  "How much building area can I construct on my land (FAR)?",
  "Which authority approves my building?",
  "How much setback do I need?",
  "How many parking spaces are required?",
  "What fire safety & BNBC stair rules apply?",
  "What documents are required for building approval?",
];

export default function AssistantPage() {
  const { activePlot } = useBangladesh();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<RegulatoryChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I am the **PlanCheck Regulatory AI Assistant**. I am currently synced with your active plot in **${activePlot.jurisdiction.jurisdictionLabel}** (${activePlot.jurisdiction.authority}). Ask me about FAR, setbacks, parking, BNBC 2020 fire/stair rules, or required permit documents.`,
      timestamp: "Now",
    },
  ]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: RegulatoryChatMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const reply = answerRegulatoryQuery(trimmed, {
      district: activePlot.input.district,
      upazilaOrArea: activePlot.input.upazilaOrArea,
      plotAreaSqm: activePlot.areaMetrics?.totalAreaSqm ?? null,
      roadWidthFt: activePlot.input.roadWidthFt ?? null,
    });

    setMessages((prev) => [...prev, userMsg, reply]);
    setQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(query);
  };

  return (
    <AppShell title="Regulatory AI Assistant">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Bot className="size-6 text-primary" /> Bangladesh Regulatory AI Assistant
            </h1>
            <p className="text-sm text-muted-foreground">
              Context-aware regulatory Q&amp;A citing BNBC 2020, RAJUK DMBR, and regional authorities.
            </p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-1.5 text-xs">
            Active Context: <span className="font-semibold text-primary">{activePlot.jurisdiction.authority}</span> · {activePlot.jurisdiction.jurisdictionLabel}
          </div>
        </div>

        <RegulatoryDisclaimerBanner text="Every response cites structured PRIE rules and clearly flags missing information or verification status. PlanCheck AI never fabricates legal clauses." />

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Quick Prompts */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Sparkles className="size-4 text-primary" /> Example Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="w-full rounded-lg border bg-muted/30 p-2.5 text-left text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {q}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="flex h-[560px] flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-card shadow-sm"
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content.replace(/\*\*/g, "")}</p>

                    {msg.structuredAnswer && (
                      <div className="mt-3 space-y-2 rounded-xl border bg-muted/40 p-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            {msg.structuredAnswer.applicableRegulation}
                          </span>
                          <VerificationBadge status={msg.structuredAnswer.verificationStatus} />
                        </div>
                        <div className="grid gap-1 text-muted-foreground">
                          <p><strong className="text-foreground">Authority:</strong> {msg.structuredAnswer.authority}</p>
                          <p><strong className="text-foreground">Clause:</strong> {msg.structuredAnswer.relevantClause}</p>
                          <p><strong className="text-foreground">Source:</strong> {msg.structuredAnswer.officialSource}</p>
                          <p><strong className="text-foreground">Calculation:</strong> {msg.structuredAnswer.calculationExplanation}</p>
                          {msg.structuredAnswer.missingInformation.length > 0 && (
                            <p className="text-amber-700">
                              <strong>Missing Info:</strong> {msg.structuredAnswer.missingInformation.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="mt-1.5 text-[10px] opacity-65">{msg.timestamp}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about FAR, RAJUK vs CDA, setbacks, parking, BNBC 2020..."
              />
              <Button type="submit">
                <Send className="size-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
