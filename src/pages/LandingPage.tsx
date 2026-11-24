import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  FileSearch,
  Layers,
  Share2,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  Wand2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";
import { FloorPlanCanvas } from "@/components/plan/FloorPlanCanvas";
import { createDemo2BRIssues } from "@/data/mockProjects";

const FEATURES = [
  { icon: Upload, title: "Smart Drawing Upload", text: "Drop PDF, PNG or JPG plans. CAD exports and scanned sheets are both supported." },
  { icon: FileSearch, title: "AI Plan Analysis", text: "Rooms, walls, door swings, staircases, and dimensions are detected automatically." },
  { icon: ShieldAlert, title: "Intelligent Error Detection", text: "Stair widths, clearances and egress routes are checked against your rule set." },
  { icon: Wand2, title: "Automated Design Corrections", text: "Accept or dismiss each suggestion and see the revised 2D drawing update instantly." },
  { icon: Box, title: "Interactive 3D Visualization", text: "Walk clients through an extruded 3D apartment with walls, glazing, and furniture." },
  { icon: Share2, title: "Instant Sharing and Export", text: "Share a client presentation link, export GLB 3D models, and download reports." },
];

const STEPS = [
  { num: "01", title: "Upload", desc: "Drop a 2D PDF or image" },
  { num: "02", title: "Analyze", desc: "AI parses rooms & paths" },
  { num: "03", title: "Review", desc: "Inspect flagged markers" },
  { num: "04", title: "Fix", desc: "Apply suggested edits" },
  { num: "05", title: "Visualize", desc: "Explore in 3D space" },
  { num: "06", title: "Share", desc: "Send client-ready link" },
];

export default function LandingPage() {
  const [heroMode, setHeroMode] = useState<"original" | "corrected">("original");
  const demoIssues = createDemo2BRIssues().map((iss) =>
    heroMode === "corrected" ? { ...iss, status: "applied" as const } : iss
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link to="/bangladesh-map" className="font-medium text-foreground transition-colors hover:text-primary">
              Bangladesh Map
            </Link>
            <Link to="/cad-studio" className="font-medium text-foreground transition-colors hover:text-primary">
              AutoCAD Studio
            </Link>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How It Works</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Sign In</Link>
            </Button>
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90" asChild>
              <Link to="/upload">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-background">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[0.92fr_1.18fr] lg:py-20">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground shadow-card">
              <span className="size-1.5 rounded-full bg-primary" />
              BNBC 2020 · RAJUK · Regional Authorities
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight leading-[1.04] text-foreground md:text-[56px]">
              Design Smarter.
              <br />
              Build Legally.
              <br />
              <span className="text-primary">Build Safer.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-[17px]">
              Record a plot location, review cited Bangladesh building rules, explore schematic 2D/3D concepts, and organize preliminary engineering inputs.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90" asChild>
                <Link to="/plot-analysis">
                  Analyze Your Plot
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/upload">Check Floor Plan</Link>
              </Button>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Open Workspace →
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="size-3.5 text-success" /> PDF, PNG &amp; JPG support
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="size-3.5 text-success" /> Interactive 3D viewer
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 className="size-3.5 text-success" /> GLB &amp; report export
              </span>
            </div>
          </motion.div>

          {/* Hero Architectural Visualization Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-xl border bg-card shadow-elevated">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/50 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-medium text-background">
                    CAD
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Dhaka / Residential / <strong className="font-medium text-foreground">modern-2br-apartment.pdf</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-md border bg-card p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHeroMode("original")}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      heroMode === "original" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    2D Inspection
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroMode("corrected")}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      heroMode === "corrected" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    AI Corrected
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12">
                <div className="sm:col-span-8 border-b sm:border-b-0 sm:border-r p-2 bg-cad-grid">
                  <FloorPlanCanvas
                    issues={demoIssues}
                    mode={heroMode}
                    interactive={false}
                    compact
                    showMarkers
                    className="border-0 bg-transparent"
                  />
                </div>
                {/* Isometric 3D Architectural Preview Panel */}
                <div className="sm:col-span-4 flex flex-col justify-between bg-[#141517] p-4 text-white">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">
                        3D Extrusion
                      </span>
                      <Layers className="size-3.5 text-zinc-400" />
                    </div>
                    <p className="mt-1 font-mono text-xs text-zinc-300">109.6 m² · 6 Zones</p>
                  </div>

                  {/* Stylized Vector Isometric 3D Apartment Cutaway */}
                  <div className="my-4 flex items-center justify-center">
                    <svg viewBox="0 0 220 170" className="w-full max-w-[190px] drop-shadow-lg">
                      {/* Base Slab */}
                      <polygon points="110,145 20,102 110,60 200,102" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
                      {/* Warm Wood Interior Floor */}
                      <polygon points="110,138 30,100 110,64 190,100" fill="#B48A60" opacity="0.9" />
                      {/* Back Left Wall */}
                      <polygon points="30,100 30,52 110,16 110,64" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
                      {/* Back Right Wall */}
                      <polygon points="110,64 110,16 190,52 190,100" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
                      {/* Partition Wall */}
                      <polygon points="75,80 75,38 118,58 118,100" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
                      {/* Window Glazing Highlight */}
                      <polygon points="48,78 48,54 78,40 78,64" fill="#20C4D8" opacity="0.65" />
                      {/* Staircase Core Highlight */}
                      <polygon
                        points="146,84 146,54 176,68 176,98"
                        fill={heroMode === "corrected" ? "#10B981" : "#4263EB"}
                        opacity="0.75"
                      />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Model status</span>
                      <span className="font-mono text-emerald-400">READY</span>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full h-8 text-xs" asChild>
                      <Link to="/visualize/demo-2br">Launch Interactive 3D →</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Integrated CAD Artboard Inspector Footer */}
              <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0 sm:divide-x border-t bg-secondary/40 text-[11px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 sm:block">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={`size-1.5 rounded-full ${heroMode === "corrected" ? "bg-success" : "bg-destructive"}`} />
                    Staircase Core
                  </div>
                  <p className="mt-0.5 font-mono font-medium text-foreground">
                    {heroMode === "corrected" ? "100 cm · adjusted" : "80 cm → 100 cm target"}
                  </p>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 sm:block">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-success" />
                    Master Bedroom
                  </div>
                  <p className="mt-0.5 font-mono font-medium text-foreground">4.2 m × 4.2 m (17.6 m²)</p>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 sm:block">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Inspection Mode
                  </div>
                  <p className="mt-0.5 font-mono font-medium text-foreground">
                    {heroMode === "corrected" ? "Deterministic CAD Diff · Applied" : "Deterministic CAD Diff"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20">
        <SectionTitle eyebrow="Features" title="Everything between a 2D drawing and a confident decision" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-elevated"
            >
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="scroll-mt-20 border-y bg-card py-20">
        <div className="mx-auto max-w-7xl px-5">
          <SectionTitle eyebrow="How it works" title="From floor plan upload to interactive 3D in six steps" />
          <ol className="mt-12 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border bg-background p-5 shadow-card">
                <span className="font-mono text-xs font-semibold text-primary">{s.num}</span>
                <p className="mt-2 font-semibold">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full border bg-card p-0.5 text-muted-foreground lg:block" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust / Solutions Section */}
      <section id="solutions" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20">
        <SectionTitle eyebrow="Solutions" title="Built for architects, residential designers, and their clients" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, t: "Faster architectural reviews", d: "Complete first-pass spatial & circulation checks in seconds, not hours." },
            { icon: ShieldAlert, t: "Early issue detection", d: "Catch narrow stairs, tight door swings, and egress gaps before site work." },
            { icon: Users, t: "Client-friendly visualization", d: "Translate technical CAD lines into a 3D model clients immediately grasp." },
            { icon: Workflow, t: "Simplified design workflows", d: "Upload, inspect, compare revisions, and share reports in one workspace." },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border bg-card p-6 shadow-card">
              <x.icon className="size-5 text-accent" />
              <p className="mt-4 font-semibold">{x.t}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-20">
        <SectionTitle eyebrow="Pricing" title="Start with the interactive hackathon demo" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-8 shadow-card">
            <p className="text-sm font-medium text-muted-foreground">Interactive Demo</p>
            <p className="mt-2 text-4xl font-semibold">Free</p>
            <p className="mt-1 text-xs text-muted-foreground">Full client-side preview with simulated inspection checks</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Sample plans & simulated AI analysis", "Before & After CAD comparison", "Interactive Three.js 3D viewer & GLB export", "Shareable client presentation route"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-7 w-full" asChild>
              <Link to="/upload">Launch Demo Workspace</Link>
            </Button>
          </div>
          <div className="rounded-xl border border-primary/35 bg-card p-8 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">Studio Pro</p>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                FastAPI Roadmap
              </span>
            </div>
            <p className="mt-2 text-4xl font-semibold">Coming Soon</p>
            <p className="mt-1 text-xs text-muted-foreground">For architecture firms &amp; multi-project engineering teams</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Live vision-model CAD parsing API", "Configurable regional rule sets", "Multi-floor BIM & IFC export", "Team review comments & version history"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-7 w-full" asChild>
              <Link to="/dashboard">Preview Studio Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-sidebar px-8 py-16 text-center shadow-elevated">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Make every floor plan smarter.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-sidebar-foreground">
            Run the full 2D analysis, review, and 3D apartment visualization workflow in under 60 seconds.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/upload">
              Start Your First Analysis
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center">
          <Logo />
          <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground md:ml-auto">
            <a href="#features" className="hover:text-foreground">Product</a>
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link to="/project/demo-2br" className="hover:text-foreground">Sample Presentation</Link>
            <a href="#how" className="hover:text-foreground">Documentation</a>
            <a href="mailto:hello@plancheck.ai" className="hover:text-foreground">Contact</a>
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 PlanCheck AI. Demo findings are simulated.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-2.5 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
    </div>
  );
}
