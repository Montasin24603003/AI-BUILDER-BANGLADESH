import { useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProjects } from "@/context/ProjectContext";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData } = useProjects();
  const [name, setName] = useState(settings.architectName);
  const [studio, setStudio] = useState(settings.studioName);
  const [email, setEmail] = useState(settings.email);

  const handleSaveProfile = () => {
    updateSettings({
      architectName: name.trim() || settings.architectName,
      studioName: studio.trim() || settings.studioName,
      email: email.trim() || settings.email,
    });
    toast.success("Profile preferences saved");
  };

  const handleReset = () => {
    resetDemoData();
    toast.success("Workspace restored to initial demo state");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your demo architect profile, measurement units, and workspace preferences.
          </p>
        </div>

        {/* Demo Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Profile</CardTitle>
            <CardDescription>Displayed on shared client architectural presentations and exported reports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Architect Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Studio / Firm</label>
                <Input value={studio} onChange={(e) => setStudio(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button size="sm" onClick={handleSaveProfile}>
              <Save className="size-3.5" /> Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Units & Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Units &amp; Display Preferences</CardTitle>
            <CardDescription>Choose how room dimensions and floor areas are formatted across 2D &amp; 3D views.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Measurement System</p>
                <p className="text-xs text-muted-foreground">Switch between Metric (m / cm / m²) and Imperial (ft / in / sq ft).</p>
              </div>
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ unitSystem: "metric" });
                    toast.success("Switched units to Metric (m / cm)");
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.unitSystem === "metric" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Metric (m / cm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ unitSystem: "imperial" });
                    toast.success("Switched units to Imperial (ft / in)");
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.unitSystem === "imperial" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Imperial (ft / sq ft)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">Show Architectural CAD Grid by Default</p>
                <p className="text-xs text-muted-foreground">Displays millimeter-inspired blueprint grid lines behind 2D plans.</p>
              </div>
              <Switch
                checked={settings.showGridDefault}
                onCheckedChange={(checked) => updateSettings({ showGridDefault: checked })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">High-Contrast Issue Markers</p>
                <p className="text-xs text-muted-foreground">Enlarges issue pins on dense architectural sheets.</p>
              </div>
              <Switch
                checked={settings.highContrastMarkers}
                onCheckedChange={(checked) => updateSettings({ highContrastMarkers: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analysis Complete Alerts</p>
                <p className="text-xs text-muted-foreground">Notify when simulated 2D parsing finishes.</p>
              </div>
              <Switch
                checked={settings.notifications.analysisComplete}
                onCheckedChange={(val) =>
                  updateSettings({ notifications: { ...settings.notifications, analysisComplete: val } })
                }
              />
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">High-Severity Issue Highlights</p>
                <p className="text-xs text-muted-foreground">Show alert badges for circulation or egress checks.</p>
              </div>
              <Switch
                checked={settings.notifications.issueAlerts}
                onCheckedChange={(val) =>
                  updateSettings({ notifications: { ...settings.notifications, issueAlerts: val } })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* About & Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> About PlanCheck AI
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-xs text-muted-foreground max-w-lg">
              <p className="font-medium text-foreground">PlanCheck AI — Architectural Inspection &amp; 3D Studio (Demo v1.0)</p>
              <p>
                Built with React, TypeScript, Tailwind CSS, and Three.js / React Three Fiber. All automated checks in this
                preview run deterministically on the client for demonstration and are ready to connect to a FastAPI backend.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="size-3.5" /> Reset Demo Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
