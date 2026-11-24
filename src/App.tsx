import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ProjectProvider } from "@/context/ProjectContext";
import { BangladeshProvider } from "@/context/BangladeshContext";

import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import AnalysisPage from "@/pages/AnalysisPage";
import ReviewPage from "@/pages/ReviewPage";
import ComparisonPage from "@/pages/ComparisonPage";
import Visualize3DPage from "@/pages/Visualize3DPage";
import ShareProjectPage from "@/pages/ShareProjectPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";

import PlotAnalysisPage from "@/pages/PlotAnalysisPage";
import BuildingLawsPage from "@/pages/BuildingLawsPage";
import DesignStudioPage from "@/pages/DesignStudioPage";
import EngineeringStudioPage from "@/pages/EngineeringStudioPage";
import PermitAssistantPage from "@/pages/PermitAssistantPage";
import CostEstimatorPage from "@/pages/CostEstimatorPage";
import AssistantPage from "@/pages/AssistantPage";
import CadStudioPage from "@/pages/CadStudioPage";
import BangladeshMapPage from "@/pages/BangladeshMapPage";

export default function App() {
  return (
    <ProjectProvider>
      <BangladeshProvider>
        <BrowserRouter basename={typeof window !== "undefined" && window.location.pathname.startsWith("/app") ? "/app" : "/"}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plot-analysis" element={<PlotAnalysisPage />} />
            <Route path="/laws" element={<BuildingLawsPage />} />
            <Route path="/design-studio" element={<DesignStudioPage />} />
            <Route path="/cad-studio" element={<CadStudioPage />} />
            <Route path="/bangladesh-map" element={<BangladeshMapPage />} />
            <Route path="/engineering" element={<EngineeringStudioPage />} />
            <Route path="/permits" element={<PermitAssistantPage />} />
            <Route path="/cost-estimator" element={<CostEstimatorPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route path="/review/:id" element={<ReviewPage />} />
            <Route path="/comparison/:id" element={<ComparisonPage />} />
            <Route path="/visualize" element={<Navigate to="/visualize/demo-2br" replace />} />
            <Route path="/visualize/:id" element={<Visualize3DPage />} />
            <Route path="/project/:id" element={<ShareProjectPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </BangladeshProvider>
    </ProjectProvider>
  );
}
