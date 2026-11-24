import React, { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Bot,
  Box,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DraftingCompass,
  FileSearch,
  FileText,
  FolderKanban,
  Globe,
  HardHat,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjects } from "@/context/ProjectContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/projects", label: "My Projects", icon: FolderKanban },
    ],
  },
  {
    label: "CAD & Live Map",
    items: [
      { to: "/bangladesh-map", label: "Bangladesh Map", icon: Globe },
      { to: "/cad-studio", label: "AutoCAD Studio", icon: DraftingCompass },
    ],
  },
  {
    label: "Land & Regulations",
    items: [
      { to: "/plot-analysis", label: "Plot Analysis", icon: MapPin },
      { to: "/laws", label: "Building Laws", icon: BookOpen },
      { to: "/permits", label: "Permit Assistant", icon: ClipboardCheck },
      { to: "/assistant", label: "AI Assistant", icon: Bot },
    ],
  },
  {
    label: "Design & 3D",
    items: [
      { to: "/design-studio", label: "AI Design Studio", icon: Sparkles },
      { to: "/upload", label: "Plan Checker", icon: FileSearch },
      { to: "/visualize/demo-2br", label: "3D Visualization", icon: Box },
    ],
  },
  {
    label: "Engineering & Output",
    items: [
      { to: "/engineering", label: "Engineering Studio", icon: HardHat },
      { to: "/cost-estimator", label: "Cost Estimator", icon: Calculator },
      { to: "/reports", label: "Compliance Reports", icon: FileText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}) {
  const { projects, settings, backendOnline } = useProjects();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.buildingType.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const handleLogout = () => {
    toast.success("Signed out of demo workspace");
    navigate("/");
  };

  const initials = settings.architectName
    .split(" ")
    .filter((w) => !w.includes("."))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "AR";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 sticky top-0 h-screen",
          collapsed ? "w-[74px]" : "w-64"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Logo compact={collapsed} to="/dashboard" />
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-md p-1.5 text-sidebar-foreground hover:bg-white/70 hover:text-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-4 p-2.5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-white text-foreground shadow-card ring-1 ring-border [&>svg]:text-primary"
                        : "text-sidebar-foreground hover:bg-white/60 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom Demo Profile + Backend Status + Logout */}
        <div className="border-t border-sidebar-border p-2.5 space-y-2">
          {!collapsed && (
            <div className="flex items-center justify-between rounded-md border border-border bg-white/70 px-2.5 py-1.5 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", backendOnline ? "bg-emerald-600" : "bg-amber-500")} />
                {backendOnline ? "FastAPI Connected" : "Local Demo Mode"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{backendOnline ? "API" : "SIM"}</span>
            </div>
          )}
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-md border border-border bg-white p-2",
              collapsed && "justify-center"
            )}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-foreground font-mono text-[11px] font-semibold text-background">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{settings.architectName}</p>
                <p className="truncate text-[11px] text-muted-foreground">Architect Workspace</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-white/70 hover:text-foreground",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="size-3.5 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-foreground/25 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl border-r border-sidebar-border">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <Logo to="/dashboard" />
              <button type="button" onClick={() => setMobileOpen(false)} className="p-1.5 text-sidebar-foreground">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto space-y-0.5 p-2.5">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium",
                      isActive ? "bg-white text-foreground shadow-card ring-1 ring-border [&>svg]:text-primary" : "text-sidebar-foreground hover:bg-white/60 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-sidebar-border p-3 space-y-2">
              <div className="rounded-md border border-border bg-white p-2.5">
                <p className="text-xs font-semibold text-foreground">{settings.architectName}</p>
                <p className="text-[11px] text-muted-foreground">Architect Workspace</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-sidebar-foreground hover:bg-white/70 hover:text-foreground"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-card/85 px-4 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Global Search */}
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                placeholder="Search floor plans, projects..."
                className="h-9 bg-background pl-9 text-xs sm:text-sm"
              />
              {searchFocused && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border bg-card shadow-elevated">
                  {searchResults.length > 0 ? (
                    <ul className="divide-y">
                      {searchResults.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/review/${p.id}`}
                            className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-muted/60"
                          >
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.buildingType}</p>
                            </div>
                            <span className="font-mono text-xs text-primary">Open →</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3.5 py-3 text-xs text-muted-foreground">No matching projects found.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Top Navbar Links for Map & AutoCAD */}
            <div className="hidden lg:flex items-center gap-1 rounded-md border bg-secondary/50 p-0.5 mr-1">
              <NavLink
                to="/bangladesh-map"
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Globe className="size-3.5" /> Bangladesh Map
              </NavLink>
              <NavLink
                to="/cad-studio"
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <DraftingCompass className="size-3.5" /> AutoCAD
              </NavLink>
            </div>
            {actions}

            {/* Notifications */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotifOpen((o) => !o)}
                title="Notifications"
              >
                <Bell className="size-4.5 text-muted-foreground" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
              </Button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border bg-card p-3 shadow-elevated">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">Workspace Activity</span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="font-medium">Modern 2-Bedroom Apartment</p>
                      <p className="mt-0.5 text-muted-foreground">3 simulated design checks flagged for review.</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5">
                      <p className="font-medium">Family House Design</p>
                      <p className="mt-0.5 text-muted-foreground">3D apartment model ready for GLB export.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <Button type="button" variant="ghost" size="icon" onClick={() => setHelpOpen(true)} title="Demo Guide & Help">
              <HelpCircle className="size-4.5 text-muted-foreground" />
            </Button>

            {/* Profile Avatar */}
            <Link
              to="/settings"
              title="Account Settings"
              className="flex size-8 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/15"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 py-6 md:px-8">
          {title && <h1 className="mb-4 text-xl font-semibold md:hidden">{title}</h1>}
          {children}
        </main>
      </div>

      {/* Help & 60-Second Demo Walkthrough Modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> PlanCheck AI — 60-Second Demo Guide
            </DialogTitle>
            <DialogDescription>
              Follow this end-to-end flow to demonstrate 2D analysis, automated suggestions, and 3D visualization.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">1. Upload:</span> Go to <code className="font-mono text-xs">/upload</code> and click{" "}
              <span className="font-medium text-foreground">Load Sample Floor Plan</span> or drop your own PDF/PNG/JPG.
            </li>
            <li>
              <span className="font-semibold text-foreground">2. Analyze:</span> Watch the 6-stage AI parsing animation detect rooms and flag circulation/egress items.
            </li>
            <li>
              <span className="font-semibold text-foreground">3. Review &amp; Fix:</span> Inspect pins on the drawing, accept suggestions, and click{" "}
              <span className="font-medium text-foreground">Apply Fixes</span>.
            </li>
            <li>
              <span className="font-semibold text-foreground">4. Compare &amp; 3D:</span> Review the Before/After CAD diff, launch the interactive Three.js 3D apartment, and export a <code className="font-mono text-xs">.glb</code> or share link.
            </li>
          </ol>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Note: In demo mode, checks are simulated deterministically for illustration and do not constitute certified building code compliance.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
