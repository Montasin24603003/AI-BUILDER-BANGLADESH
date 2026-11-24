import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppWindow,
  ArrowUpRight,
  Box,
  Columns2,
  Compass,
  DoorOpen,
  Download,
  Eraser,
  Grid3X3,
  Layers,
  Maximize2,
  MousePointer,
  Pencil,
  Ruler,
  Save,
  Square,
  SunMoon,
  Trash2,
  Undo2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import type { Apartment3DHandle } from "@/components/three/Apartment3DViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/context/ProjectContext";
import { geometryToScene3D } from "@/services/bangladeshEngine";
import {
  FloorPlanGeometry,
  GeometryDoor,
  GeometryRoom,
  GeometryStair,
  GeometryWall,
  GeometryWindow,
  PlanProject,
} from "@/types/plancheck";
import { toast } from "sonner";

const LazyApartment3DViewer = React.lazy(() =>
  import("@/components/three/Apartment3DViewer").then((m) => ({ default: m.Apartment3DViewer }))
);

type CadTool =
  | "select"
  | "wall"
  | "room"
  | "door"
  | "window"
  | "column"
  | "stair"
  | "measure"
  | "erase";

type ViewMode = "split" | "2d" | "3d";

interface CadColumn {
  id: string;
  x: number;
  y: number;
  size_m: number;
}

interface CadState {
  width_m: number;
  height_m: number;
  wall_height_m: number;
  walls: GeometryWall[];
  doors: GeometryDoor[];
  windows: GeometryWindow[];
  rooms: GeometryRoom[];
  stairs: GeometryStair[];
  columns: CadColumn[];
}

const TEMPLATES: Record<string, { label: string; state: CadState }> = {
  "classic-2br": {
    label: "Classic 2BR Dhaka Flat",
    state: {
      width_m: 12.4,
      height_m: 8.8,
      wall_height_m: 2.9,
      walls: [
        { id: "w1", x1: 0.6, y1: 0.6, x2: 11.8, y2: 0.6, thickness: 0.22, is_exterior: true },
        { id: "w2", x1: 11.8, y1: 0.6, x2: 11.8, y2: 8.2, thickness: 0.22, is_exterior: true },
        { id: "w3", x1: 11.8, y1: 8.2, x2: 0.6, y2: 8.2, thickness: 0.22, is_exterior: true },
        { id: "w4", x1: 0.6, y1: 8.2, x2: 0.6, y2: 0.6, thickness: 0.22, is_exterior: true },
        { id: "w5", x1: 6.0, y1: 0.6, x2: 6.0, y2: 8.2, thickness: 0.14, is_exterior: false },
        { id: "w6", x1: 0.6, y1: 4.4, x2: 11.8, y2: 4.4, thickness: 0.14, is_exterior: false },
        { id: "w7", x1: 9.2, y1: 0.6, x2: 9.2, y2: 4.4, thickness: 0.14, is_exterior: false },
      ],
      doors: [
        { id: "d1", x: 3.2, y: 8.2, width: 1.05, angle_deg: 0, swing: "inward-left", label: "Main Entry", is_exit: true },
        { id: "d2", x: 4.8, y: 4.4, width: 0.9, angle_deg: 0, swing: "inward-right", label: "Master Door" },
        { id: "d3", x: 7.4, y: 4.4, width: 0.9, angle_deg: 0, swing: "inward-left", label: "Bed 2 Door" },
      ],
      windows: [
        { id: "win1", x: 3.0, y: 0.6, width: 1.8, angle_deg: 0, sill_m: 0.85, label: "South Window" },
        { id: "win2", x: 7.6, y: 0.6, width: 1.6, angle_deg: 0, sill_m: 0.85, label: "East Window" },
        { id: "win3", x: 8.8, y: 8.2, width: 1.8, angle_deg: 0, sill_m: 0.85, label: "North Window" },
      ],
      rooms: [
        { id: "r1", name: "Living & Dining", category: "living", x: 0.75, y: 4.55, width: 5.1, height: 3.5, area_sqm: 17.8, measurement_status: "verified" },
        { id: "r2", name: "Master Bedroom", category: "bedroom", x: 0.75, y: 0.75, width: 5.1, height: 3.5, area_sqm: 17.8, measurement_status: "verified" },
        { id: "r3", name: "Kitchen & Utility", category: "kitchen", x: 6.15, y: 0.75, width: 2.9, height: 3.5, area_sqm: 10.2, measurement_status: "verified" },
        { id: "r4", name: "Bedroom 2", category: "bedroom", x: 6.15, y: 4.55, width: 5.5, height: 3.5, area_sqm: 19.2, measurement_status: "verified" },
      ],
      stairs: [
        { id: "st1", x: 9.4, y: 0.8, width: 2.2, length: 3.3, steps: 16, direction: "up", clear_width_cm: 110 },
      ],
      columns: [
        { id: "c1", x: 0.6, y: 0.6, size_m: 0.35 },
        { id: "c2", x: 6.0, y: 0.6, size_m: 0.35 },
        { id: "c3", x: 11.8, y: 0.6, size_m: 0.35 },
        { id: "c4", x: 0.6, y: 4.4, size_m: 0.35 },
        { id: "c5", x: 6.0, y: 4.4, size_m: 0.35 },
        { id: "c6", x: 11.8, y: 4.4, size_m: 0.35 },
        { id: "c7", x: 0.6, y: 8.2, size_m: 0.35 },
        { id: "c8", x: 6.0, y: 8.2, size_m: 0.35 },
        { id: "c9", x: 11.8, y: 8.2, size_m: 0.35 },
      ],
    },
  },
  "classic-villa": {
    label: "Classic Courtyard Villa",
    state: {
      width_m: 15.0,
      height_m: 11.0,
      wall_height_m: 3.1,
      walls: [
        { id: "v1", x1: 1, y1: 1, x2: 14, y2: 1, thickness: 0.25, is_exterior: true },
        { id: "v2", x1: 14, y1: 1, x2: 14, y2: 10, thickness: 0.25, is_exterior: true },
        { id: "v3", x1: 14, y1: 10, x2: 1, y2: 10, thickness: 0.25, is_exterior: true },
        { id: "v4", x1: 1, y1: 10, x2: 1, y2: 1, thickness: 0.25, is_exterior: true },
        { id: "v5", x1: 5.5, y1: 1, x2: 5.5, y2: 10, thickness: 0.15, is_exterior: false },
        { id: "v6", x1: 10.0, y1: 1, x2: 10.0, y2: 10, thickness: 0.15, is_exterior: false },
        { id: "v7", x1: 1, y1: 5.5, x2: 5.5, y2: 5.5, thickness: 0.15, is_exterior: false },
      ],
      doors: [
        { id: "vd1", x: 7.75, y: 10, width: 1.2, angle_deg: 0, swing: "inward-left", label: "Grand Entry", is_exit: true },
        { id: "vd2", x: 5.5, y: 3.2, width: 0.9, angle_deg: 90, swing: "inward-left", label: "Suite Door" },
        { id: "vd3", x: 10.0, y: 7.5, width: 0.9, angle_deg: 90, swing: "inward-right", label: "Dining Door" },
      ],
      windows: [
        { id: "vw1", x: 3.2, y: 1, width: 2.0, angle_deg: 0, sill_m: 0.8, label: "North Glazing" },
        { id: "vw2", x: 12.0, y: 1, width: 2.0, angle_deg: 0, sill_m: 0.8, label: "Garden Window" },
        { id: "vw3", x: 14, y: 5.5, width: 2.4, angle_deg: 90, sill_m: 0.75, label: "East Bay" },
      ],
      rooms: [
        { id: "vr1", name: "Central Atrium / Lounge", category: "living", x: 5.65, y: 1.15, width: 4.2, height: 8.7, area_sqm: 36.5, measurement_status: "verified" },
        { id: "vr2", name: "Master Suite", category: "bedroom", x: 1.15, y: 1.15, width: 4.2, height: 4.2, area_sqm: 17.6, measurement_status: "verified" },
        { id: "vr3", name: "Family Kitchen", category: "kitchen", x: 10.15, y: 5.5, width: 3.7, height: 4.35, area_sqm: 16.1, measurement_status: "verified" },
      ],
      stairs: [{ id: "vs1", x: 10.2, y: 1.2, width: 3.5, length: 2.6, steps: 16, direction: "up", clear_width_cm: 125 }],
      columns: [
        { id: "vc1", x: 1, y: 1, size_m: 0.35 },
        { id: "vc2", x: 5.5, y: 1, size_m: 0.35 },
        { id: "vc3", x: 10, y: 1, size_m: 0.35 },
        { id: "vc4", x: 14, y: 1, size_m: 0.35 },
        { id: "vc5", x: 1, y: 10, size_m: 0.35 },
        { id: "vc6", x: 5.5, y: 10, size_m: 0.35 },
        { id: "vc7", x: 10, y: 10, size_m: 0.35 },
        { id: "vc8", x: 14, y: 10, size_m: 0.35 },
      ],
    },
  },
  "garment-bay": {
    label: "Garments / Commercial Floor Bay",
    state: {
      width_m: 18.0,
      height_m: 12.0,
      wall_height_m: 3.6,
      walls: [
        { id: "g1", x1: 0.8, y1: 0.8, x2: 17.2, y2: 0.8, thickness: 0.25, is_exterior: true },
        { id: "g2", x1: 17.2, y1: 0.8, x2: 17.2, y2: 11.2, thickness: 0.25, is_exterior: true },
        { id: "g3", x1: 17.2, y1: 11.2, x2: 0.8, y2: 11.2, thickness: 0.25, is_exterior: true },
        { id: "g4", x1: 0.8, y1: 11.2, x2: 0.8, y2: 0.8, thickness: 0.25, is_exterior: true },
        { id: "g5", x1: 13.5, y1: 0.8, x2: 13.5, y2: 11.2, thickness: 0.15, is_exterior: false },
      ],
      doors: [
        { id: "gd1", x: 2.8, y: 11.2, width: 1.6, angle_deg: 0, swing: "outward-left", label: "Fire Exit 1", is_exit: true },
        { id: "gd2", x: 11.5, y: 11.2, width: 1.6, angle_deg: 0, swing: "outward-right", label: "Fire Exit 2", is_exit: true },
      ],
      windows: [
        { id: "gw1", x: 4.5, y: 0.8, width: 3.5, angle_deg: 0, sill_m: 1.0, label: "Ventilation Strip" },
        { id: "gw2", x: 9.8, y: 0.8, width: 3.5, angle_deg: 0, sill_m: 1.0, label: "Ventilation Strip" },
      ],
      rooms: [
        { id: "gr1", name: "Main Production / Mall Bay", category: "other", x: 1.0, y: 1.0, width: 12.3, height: 10.0, area_sqm: 123.0, measurement_status: "verified" },
        { id: "gr2", name: "Core & Washrooms", category: "bathroom", x: 13.7, y: 5.5, width: 3.3, height: 5.5, area_sqm: 18.1, measurement_status: "verified" },
      ],
      stairs: [{ id: "gs1", x: 13.8, y: 1.1, width: 3.0, length: 4.0, steps: 18, direction: "up", clear_width_cm: 150 }],
      columns: [
        { id: "gc1", x: 0.8, y: 0.8, size_m: 0.45 },
        { id: "gc2", x: 6.2, y: 0.8, size_m: 0.45 },
        { id: "gc3", x: 11.6, y: 0.8, size_m: 0.45 },
        { id: "gc4", x: 17.2, y: 0.8, size_m: 0.45 },
        { id: "gc5", x: 0.8, y: 6.0, size_m: 0.45 },
        { id: "gc6", x: 6.2, y: 6.0, size_m: 0.45 },
        { id: "gc7", x: 11.6, y: 6.0, size_m: 0.45 },
        { id: "gc8", x: 17.2, y: 6.0, size_m: 0.45 },
        { id: "gc9", x: 0.8, y: 11.2, size_m: 0.45 },
        { id: "gc10", x: 6.2, y: 11.2, size_m: 0.45 },
        { id: "gc11", x: 11.6, y: 11.2, size_m: 0.45 },
        { id: "gc12", x: 17.2, y: 11.2, size_m: 0.45 },
      ],
    },
  },
  blank: {
    label: "Blank Drafting Sheet (16m × 12m)",
    state: {
      width_m: 16.0,
      height_m: 12.0,
      wall_height_m: 3.0,
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
      stairs: [],
      columns: [],
    },
  },
};

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function CadStudioPage() {
  const navigate = useNavigate();
  const { addProject } = useProjects();
  const viewer3DRef = useRef<Apartment3DHandle | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [projectTitle, setProjectTitle] = useState("AutoCAD Custom Design 01");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [darkModelspace, setDarkModelspace] = useState(true);
  const [tool, setTool] = useState<CadTool>("wall");
  const [snapStep, setSnapStep] = useState<number>(0.5);
  const [orthoMode, setOrthoMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [roomCategory, setRoomCategory] = useState<GeometryRoom["category"]>("bedroom");

  const [layers, setLayers] = useState({
    walls: true,
    doors: true,
    windows: true,
    columns: true,
    rooms: true,
    dims: true,
  });

  const [cad, setCad] = useState<CadState>(() => structuredClone(TEMPLATES["classic-2br"].state));
  const [history, setHistory] = useState<CadState[]>([]);

  // Drawing interaction state
  const [draftStart, setDraftStart] = useState<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [measureResult, setMeasureResult] = useState<{ p1: { x: number; y: number }; p2: { x: number; y: number } } | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [commandLog, setCommandLog] = useState<string>("Ready. Select Wall (W) and click two points, or type command below.");

  const pushHistory = useCallback((next: CadState) => {
    setHistory((prev) => [structuredClone(cad), ...prev.slice(0, 24)]);
    setCad(next);
  }, [cad]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const [latest, ...rest] = history;
    setCad(latest);
    setHistory(rest);
    setDraftStart(null);
    setCommandLog("Undo applied.");
  }, [history]);

  // Keyboard shortcuts like AutoCAD
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === "Escape") {
        setDraftStart(null);
        setMeasureResult(null);
        setTool("select");
      } else if (e.key === "F8") {
        e.preventDefault();
        setOrthoMode((o) => !o);
      } else if (e.key.toLowerCase() === "w") setTool("wall");
      else if (e.key.toLowerCase() === "d") setTool("door");
      else if (e.key.toLowerCase() === "n") setTool("window");
      else if (e.key.toLowerCase() === "c") setTool("column");
      else if (e.key.toLowerCase() === "r") setTool("room");
      else if (e.key.toLowerCase() === "s") setTool("stair");
      else if (e.key.toLowerCase() === "m") setTool("measure");
      else if (e.key.toLowerCase() === "x") setTool("erase");
      else if (e.key.toLowerCase() === "v") setTool("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo]);

  const snapCoord = useCallback(
    (val: number) => Math.round(val / snapStep) * snapStep,
    [snapStep]
  );

  const clientToMeters = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * cad.width_m;
      const rawY = ((e.clientY - rect.top) / rect.height) * cad.height_m;
      let x = Math.max(0, Math.min(cad.width_m, snapCoord(rawX)));
      let y = Math.max(0, Math.min(cad.height_m, snapCoord(rawY)));

      if (orthoMode && draftStart && (tool === "wall" || tool === "measure")) {
        const dx = Math.abs(x - draftStart.x);
        const dy = Math.abs(y - draftStart.y);
        if (dx >= dy) y = draftStart.y;
        else x = draftStart.x;
      }
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    },
    [cad.width_m, cad.height_m, snapCoord, orthoMode, draftStart, tool]
  );

  const handleCanvasMove = (e: React.MouseEvent<SVGSVGElement>) => {
    setCursorPos(clientToMeters(e));
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const pt = clientToMeters(e);

    if (tool === "wall") {
      if (!draftStart) {
        setDraftStart(pt);
        setCommandLog(`WALL start (${pt.x}m, ${pt.y}m) — click endpoint.`);
      } else {
        const dist = Math.hypot(pt.x - draftStart.x, pt.y - draftStart.y);
        if (dist >= 0.25) {
          const isEdge =
            draftStart.x <= 0.8 || draftStart.y <= 0.8 || pt.x >= cad.width_m - 0.8 || pt.y >= cad.height_m - 0.8;
          const nextWall: GeometryWall = {
            id: uid("wall"),
            x1: draftStart.x,
            y1: draftStart.y,
            x2: pt.x,
            y2: pt.y,
            thickness: isEdge ? 0.22 : 0.14,
            is_exterior: isEdge,
          };
          pushHistory({ ...cad, walls: [...cad.walls, nextWall] });
          setCommandLog(`Placed wall ${dist.toFixed(2)}m. Click next point or Esc.`);
        }
        setDraftStart(null);
      }
      return;
    }

    if (tool === "room") {
      if (!draftStart) {
        setDraftStart(pt);
        setCommandLog(`ROOM corner 1 (${pt.x}m, ${pt.y}m) — click opposite corner.`);
      } else {
        const x = Math.min(draftStart.x, pt.x);
        const y = Math.min(draftStart.y, pt.y);
        const w = Math.abs(pt.x - draftStart.x);
        const h = Math.abs(pt.y - draftStart.y);
        if (w >= 0.8 && h >= 0.8) {
          const labelMap: Record<GeometryRoom["category"], string> = {
            bedroom: "Bedroom",
            living: "Living Hall",
            kitchen: "Kitchen",
            bathroom: "Bath / WC",
            corridor: "Corridor",
            balcony: "Balcony",
            staircase: "Stair Core",
            other: "Commercial / Garment Zone",
          };
          const nextRoom: GeometryRoom = {
            id: uid("room"),
            name: `${labelMap[roomCategory]}`,
            category: roomCategory,
            x,
            y,
            width: Number(w.toFixed(2)),
            height: Number(h.toFixed(2)),
            area_sqm: Number((w * h).toFixed(1)),
            measurement_status: "verified",
          };
          pushHistory({ ...cad, rooms: [...cad.rooms, nextRoom] });
          setCommandLog(`Created ${nextRoom.name} (${nextRoom.area_sqm} m²).`);
        }
        setDraftStart(null);
      }
      return;
    }

    if (tool === "door") {
      const nextDoor: GeometryDoor = {
        id: uid("door"),
        x: pt.x,
        y: pt.y,
        width: 0.95,
        angle_deg: orthoMode ? 0 : 90,
        swing: "inward-left",
        label: "Door",
      };
      pushHistory({ ...cad, doors: [...cad.doors, nextDoor] });
      setCommandLog(`Placed Door at (${pt.x}m, ${pt.y}m).`);
      return;
    }

    if (tool === "window") {
      const nextWin: GeometryWindow = {
        id: uid("win"),
        x: pt.x,
        y: pt.y,
        width: 1.5,
        angle_deg: 0,
        sill_m: 0.85,
        label: "Window",
      };
      pushHistory({ ...cad, windows: [...cad.windows, nextWin] });
      setCommandLog(`Placed Window at (${pt.x}m, ${pt.y}m).`);
      return;
    }

    if (tool === "column") {
      const nextCol: CadColumn = {
        id: uid("col"),
        x: pt.x,
        y: pt.y,
        size_m: 0.35,
      };
      pushHistory({ ...cad, columns: [...cad.columns, nextCol] });
      setCommandLog(`Placed RCC Column at (${pt.x}m, ${pt.y}m).`);
      return;
    }

    if (tool === "stair") {
      const nextStair: GeometryStair = {
        id: uid("stair"),
        x: pt.x,
        y: pt.y,
        width: 2.2,
        length: 3.2,
        steps: 16,
        direction: "up",
        clear_width_cm: 110,
      };
      pushHistory({ ...cad, stairs: [...cad.stairs, nextStair] });
      setCommandLog(`Placed Staircase Core at (${pt.x}m, ${pt.y}m).`);
      return;
    }

    if (tool === "measure") {
      if (!draftStart) {
        setDraftStart(pt);
        setMeasureResult(null);
      } else {
        setMeasureResult({ p1: draftStart, p2: pt });
        const d = Math.hypot(pt.x - draftStart.x, pt.y - draftStart.y);
        setCommandLog(`DIST = ${d.toFixed(2)} m (${(d * 3.28084).toFixed(2)} ft)`);
        setDraftStart(null);
      }
    }
  };

  // Convert live CAD state to FloorPlanGeometry & Scene3DData
  const floorGeometry: FloorPlanGeometry = useMemo(
    () => ({
      width_m: cad.width_m,
      height_m: cad.height_m,
      wall_height_m: cad.wall_height_m,
      is_simulated_demo_geometry: false,
      scale_status: "verified",
      scale_note: "Live AutoCAD Studio parametric sheet",
      walls: cad.walls,
      doors: cad.doors,
      windows: cad.windows,
      rooms: cad.rooms,
      stairs: cad.stairs,
      dimensions: [],
      annotations: [],
    }),
    [cad]
  );

  const scene3d = useMemo(() => geometryToScene3D(floorGeometry), [floorGeometry]);

  const totalRoomArea = useMemo(
    () => Number(cad.rooms.reduce((sum, r) => sum + r.area_sqm, 0).toFixed(1)),
    [cad.rooms]
  );

  const runCommandLine = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput.trim();
    if (!raw) return;
    const parts = raw.toUpperCase().split(/\s+/);
    const cmd = parts[0];

    if (cmd === "WALL" && parts.length === 3) {
      const [x1, y1] = parts[1].split(",").map(Number);
      const [x2, y2] = parts[2].split(",").map(Number);
      if ([x1, y1, x2, y2].every((n) => !Number.isNaN(n))) {
        pushHistory({
          ...cad,
          walls: [...cad.walls, { id: uid("wall"), x1, y1, x2, y2, thickness: 0.2, is_exterior: false }],
        });
        setCommandLog(`WALL added (${x1},${y1}) -> (${x2},${y2}).`);
      }
    } else if (cmd === "ORTHO") {
      setOrthoMode((o) => !o);
      setCommandLog(`ORTHO toggled ${!orthoMode ? "ON" : "OFF"}.`);
    } else if (cmd === "GRID") {
      setShowGrid((g) => !g);
      setCommandLog(`GRID toggled ${!showGrid ? "ON" : "OFF"}.`);
    } else if (cmd === "CLEAR") {
      pushHistory({ ...cad, walls: [], doors: [], windows: [], rooms: [], stairs: [], columns: [] });
      setCommandLog("Sheet cleared.");
    } else if (cmd === "EXPORT" && parts[1] === "DXF") {
      exportDxf();
    } else {
      setCommandLog(`Unknown command "${raw}". Try: WALL 1,1 10,1 | ORTHO | GRID | CLEAR | EXPORT DXF`);
    }
    setCommandInput("");
  };

  const exportDxf = () => {
    const lines: string[] = ["0", "SECTION", "2", "ENTITIES"];
    const addLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
      lines.push(
        "0", "LINE", "8", layer,
        "10", x1.toFixed(3), "20", (cad.height_m - y1).toFixed(3), "30", "0.0",
        "11", x2.toFixed(3), "21", (cad.height_m - y2).toFixed(3), "31", "0.0"
      );
    };
    cad.walls.forEach((w) => addLine("A-WALL", w.x1, w.y1, w.x2, w.y2));
    cad.columns.forEach((c) => {
      const h = c.size_m / 2;
      addLine("S-COLS", c.x - h, c.y - h, c.x + h, c.y - h);
      addLine("S-COLS", c.x + h, c.y - h, c.x + h, c.y + h);
      addLine("S-COLS", c.x + h, c.y + h, c.x - h, c.y + h);
      addLine("S-COLS", c.x - h, c.y + h, c.x - h, c.y - h);
    });
    lines.push("0", "ENDSEC", "0", "EOF");
    const blob = new Blob([lines.join("\n")], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported AutoCAD .DXF vector file");
  };

  const saveToProjects = () => {
    const id = `cad-${Date.now().toString(36)}`;
    const proj: PlanProject = {
      id,
      name: projectTitle,
      buildingType: "AutoCAD Studio Design",
      lastModified: "Just now",
      updatedAtIso: new Date().toISOString(),
      status: "3D Ready",
      layoutTemplate: "2br-apartment",
      fileName: `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.dxf`,
      fileSize: `${cad.walls.length} walls`,
      fileType: "application/dxf",
      scaleCalibrated: true,
      referenceWidthM: cad.width_m,
      totalAreaSqm: totalRoomArea || Number((cad.width_m * cad.height_m * 0.7).toFixed(1)),
      roomCount: cad.rooms.length,
      issues: [],
      passedChecks: [],
      originalGeometry: floorGeometry,
      currentGeometry: floorGeometry,
      isSample: false,
    };
    addProject(proj);
    toast.success("CAD design saved to My Projects");
    navigate(`/visualize/${id}`);
  };

  const toolItems: Array<{ id: CadTool; label: string; key: string; icon: typeof MousePointer }> = [
    { id: "select", label: "Select", key: "V", icon: MousePointer },
    { id: "wall", label: "Wall", key: "W", icon: Pencil },
    { id: "room", label: "Room", key: "R", icon: Square },
    { id: "door", label: "Door", key: "D", icon: DoorOpen },
    { id: "window", label: "Window", key: "N", icon: AppWindow },
    { id: "column", label: "Column", key: "C", icon: Columns2 },
    { id: "stair", label: "Stair", key: "S", icon: ArrowUpRight },
    { id: "measure", label: "Tape", key: "M", icon: Ruler },
    { id: "erase", label: "Erase", key: "X", icon: Eraser },
  ];

  return (
    <AppShell
      title="AutoCAD 2D/3D Studio"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportDxf}>
            <Download className="size-3.5" /> Export .DXF
          </Button>
          <Button size="sm" onClick={saveToProjects}>
            <Save className="size-3.5" /> Save &amp; Open 3D
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[1480px] space-y-3">
        {/* Top CAD Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Input
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="h-8 w-52 text-xs font-semibold"
            />
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              defaultValue="classic-2br"
              onChange={(e) => {
                const tpl = TEMPLATES[e.target.value];
                if (tpl) {
                  pushHistory(structuredClone(tpl.state));
                  setCommandLog(`Loaded template: ${tpl.label}`);
                }
              }}
            >
              {Object.entries(TEMPLATES).map(([k, v]) => (
                <option key={k} value={k}>
                  Template: {v.label}
                </option>
              ))}
            </select>
            {tool === "room" && (
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={roomCategory}
                onChange={(e) => setRoomCategory(e.target.value as GeometryRoom["category"])}
              >
                <option value="bedroom">Room Type: Bedroom</option>
                <option value="living">Room Type: Living Hall</option>
                <option value="kitchen">Room Type: Kitchen</option>
                <option value="bathroom">Room Type: Bath / WC</option>
                <option value="corridor">Room Type: Corridor</option>
                <option value="other">Room Type: Commercial / Garment Bay</option>
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={history.length === 0}
              onClick={handleUndo}
            >
              <Undo2 className="size-3.5" /> Undo
            </Button>
            <Button
              type="button"
              variant={orthoMode ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-mono"
              onClick={() => setOrthoMode((o) => !o)}
              title="Lock drawing to 0° / 90° (F8)"
            >
              ORTHO {orthoMode ? "ON" : "OFF"}
            </Button>
            <Button
              type="button"
              variant={showGrid ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowGrid((g) => !g)}
            >
              <Grid3X3 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDarkModelspace((d) => !d)}
              title="Toggle Classic Dark Modelspace vs Paper Space"
            >
              <SunMoon className="size-3.5" /> {darkModelspace ? "Model" : "Paper"}
            </Button>

            {/* Segmented 2D / Split / 3D Switcher */}
            <div className="ml-1 flex items-center rounded-md border bg-secondary/60 p-0.5 text-xs">
              {(["2d", "split", "3d"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium uppercase transition-colors ${
                    viewMode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "2d" ? "Classic 2D" : m === "split" ? "2D + 3D" : "3D View"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Drafting Workbench */}
        <div className="grid gap-3 lg:grid-cols-[58px_1fr_240px]">
          {/* Left Vertical AutoCAD Tool Strip */}
          <div className="flex flex-row lg:flex-col gap-1 rounded-lg border bg-card p-1.5 overflow-x-auto">
            {toolItems.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTool(t.id);
                  setDraftStart(null);
                }}
                title={`${t.label} (${t.key})`}
                className={`flex flex-col items-center justify-center rounded-md py-2 px-2 text-[10px] font-medium transition-colors shrink-0 ${
                  tool === t.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <t.icon className="size-4" />
                <span className="mt-0.5">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Center Viewport: 2D / Split / 3D */}
          <div className={`grid gap-3 ${viewMode === "split" ? "lg:grid-cols-2" : "grid-cols-1"}`}>
            {viewMode !== "3d" && (
              <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-1.5 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Compass className="size-3.5 text-primary" />
                    X: {cursorPos.x.toFixed(2)}m · Y: {cursorPos.y.toFixed(2)}m · Snap {snapStep}m
                  </span>
                  <span className="text-muted-foreground">
                    Sheet {cad.width_m}m × {cad.height_m}m
                  </span>
                </div>

                <div
                  className={`relative flex-1 min-h-[470px] flex items-center justify-center p-3 ${
                    darkModelspace ? "bg-[#0d111a]" : "bg-[#fafaf8]"
                  }`}
                >
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${cad.width_m} ${cad.height_m}`}
                    onMouseMove={handleCanvasMove}
                    onClick={handleCanvasClick}
                    className="h-full max-h-[500px] w-full cursor-crosshair select-none"
                  >
                    {/* Grid */}
                    {showGrid && (
                      <>
                        {Array.from({ length: Math.floor(cad.width_m) + 1 }).map((_, i) => (
                          <line
                            key={`gx-${i}`}
                            x1={i}
                            y1={0}
                            x2={i}
                            y2={cad.height_m}
                            stroke={darkModelspace ? "rgba(56,189,248,0.12)" : "rgba(37,99,235,0.10)"}
                            strokeWidth="0.025"
                          />
                        ))}
                        {Array.from({ length: Math.floor(cad.height_m) + 1 }).map((_, i) => (
                          <line
                            key={`gy-${i}`}
                            x1={0}
                            y1={i}
                            x2={cad.width_m}
                            y2={i}
                            stroke={darkModelspace ? "rgba(56,189,248,0.12)" : "rgba(37,99,235,0.10)"}
                            strokeWidth="0.025"
                          />
                        ))}
                      </>
                    )}

                    {/* Room Zones */}
                    {layers.rooms &&
                      cad.rooms.map((r) => (
                        <g
                          key={r.id}
                          onClick={(e) => {
                            if (tool === "erase") {
                              e.stopPropagation();
                              pushHistory({ ...cad, rooms: cad.rooms.filter((item) => item.id !== r.id) });
                            }
                          }}
                        >
                          <rect
                            x={r.x}
                            y={r.y}
                            width={r.width}
                            height={r.height}
                            fill={darkModelspace ? "rgba(37,99,235,0.12)" : "rgba(37,99,235,0.08)"}
                            stroke={darkModelspace ? "rgba(96,165,250,0.45)" : "rgba(37,99,235,0.35)"}
                            strokeWidth="0.04"
                            strokeDasharray="0.16 0.08"
                          />
                          <text
                            x={r.x + r.width / 2}
                            y={r.y + r.height / 2}
                            textAnchor="middle"
                            fontSize="0.34"
                            fontWeight="600"
                            fill={darkModelspace ? "#e2e8f0" : "#1e293b"}
                          >
                            {r.name}
                          </text>
                          <text
                            x={r.x + r.width / 2}
                            y={r.y + r.height / 2 + 0.42}
                            textAnchor="middle"
                            fontSize="0.25"
                            fill={darkModelspace ? "#94a3b8" : "#64748b"}
                          >
                            {r.area_sqm} m²
                          </text>
                        </g>
                      ))}

                    {/* Stairs */}
                    {cad.stairs.map((st) => (
                      <g
                        key={st.id}
                        onClick={(e) => {
                          if (tool === "erase") {
                            e.stopPropagation();
                            pushHistory({ ...cad, stairs: cad.stairs.filter((s) => s.id !== st.id) });
                          }
                        }}
                      >
                        <rect
                          x={st.x}
                          y={st.y}
                          width={st.width}
                          height={st.length}
                          fill={darkModelspace ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)"}
                          stroke="#10b981"
                          strokeWidth="0.06"
                        />
                        {Array.from({ length: 8 }).map((_, idx) => {
                          const y = st.y + ((idx + 1) * st.length) / 9;
                          return <line key={idx} x1={st.x} y1={y} x2={st.x + st.width} y2={y} stroke="#10b981" strokeWidth="0.03" />;
                        })}
                      </g>
                    ))}

                    {/* Walls */}
                    {layers.walls &&
                      cad.walls.map((w) => (
                        <line
                          key={w.id}
                          x1={w.x1}
                          y1={w.y1}
                          x2={w.x2}
                          y2={w.y2}
                          stroke={darkModelspace ? "#f8fafc" : "#0f172a"}
                          strokeWidth={w.thickness}
                          strokeLinecap="square"
                          onClick={(e) => {
                            if (tool === "erase") {
                              e.stopPropagation();
                              pushHistory({ ...cad, walls: cad.walls.filter((item) => item.id !== w.id) });
                            }
                          }}
                        />
                      ))}

                    {/* Doors */}
                    {layers.doors &&
                      cad.doors.map((d) => (
                        <g
                          key={d.id}
                          onClick={(e) => {
                            if (tool === "erase") {
                              e.stopPropagation();
                              pushHistory({ ...cad, doors: cad.doors.filter((item) => item.id !== d.id) });
                            }
                          }}
                        >
                          <rect
                            x={d.x - d.width / 2}
                            y={d.y - 0.14}
                            width={d.width}
                            height={0.28}
                            fill={darkModelspace ? "#0d111a" : "#fafaf8"}
                            stroke="#f59e0b"
                            strokeWidth="0.05"
                          />
                          <path
                            d={`M ${d.x - d.width / 2} ${d.y} A ${d.width} ${d.width} 0 0 1 ${d.x + d.width / 2} ${d.y - d.width * 0.7}`}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="0.04"
                            strokeDasharray="0.1 0.06"
                          />
                        </g>
                      ))}

                    {/* Windows */}
                    {layers.windows &&
                      cad.windows.map((win) => (
                        <rect
                          key={win.id}
                          x={win.x - win.width / 2}
                          y={win.y - 0.11}
                          width={win.width}
                          height={0.22}
                          fill="#38bdf8"
                          fillOpacity={0.75}
                          stroke="#0284c7"
                          strokeWidth="0.04"
                          onClick={(e) => {
                            if (tool === "erase") {
                              e.stopPropagation();
                              pushHistory({ ...cad, windows: cad.windows.filter((item) => item.id !== win.id) });
                            }
                          }}
                        />
                      ))}

                    {/* RCC Columns */}
                    {layers.columns &&
                      cad.columns.map((c) => (
                        <rect
                          key={c.id}
                          x={c.x - c.size_m / 2}
                          y={c.y - c.size_m / 2}
                          width={c.size_m}
                          height={c.size_m}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="0.04"
                          onClick={(e) => {
                            if (tool === "erase") {
                              e.stopPropagation();
                              pushHistory({ ...cad, columns: cad.columns.filter((item) => item.id !== c.id) });
                            }
                          }}
                        />
                      ))}

                    {/* Rubber-band preview when drawing Wall / Room / Measure */}
                    {draftStart && tool === "wall" && (
                      <g>
                        <line
                          x1={draftStart.x}
                          y1={draftStart.y}
                          x2={cursorPos.x}
                          y2={cursorPos.y}
                          stroke="#38bdf8"
                          strokeWidth="0.16"
                          strokeDasharray="0.2 0.1"
                        />
                        <text
                          x={(draftStart.x + cursorPos.x) / 2}
                          y={(draftStart.y + cursorPos.y) / 2 - 0.25}
                          textAnchor="middle"
                          fontSize="0.32"
                          fill="#38bdf8"
                          fontWeight="700"
                        >
                          {Math.hypot(cursorPos.x - draftStart.x, cursorPos.y - draftStart.y).toFixed(2)} m
                        </text>
                      </g>
                    )}

                    {draftStart && tool === "room" && (
                      <rect
                        x={Math.min(draftStart.x, cursorPos.x)}
                        y={Math.min(draftStart.y, cursorPos.y)}
                        width={Math.abs(cursorPos.x - draftStart.x)}
                        height={Math.abs(cursorPos.y - draftStart.y)}
                        fill="rgba(56,189,248,0.15)"
                        stroke="#38bdf8"
                        strokeWidth="0.06"
                        strokeDasharray="0.2 0.1"
                      />
                    )}

                    {(draftStart && tool === "measure") || measureResult ? (
                      <g>
                        {(() => {
                          const p1 = measureResult ? measureResult.p1 : draftStart!;
                          const p2 = measureResult ? measureResult.p2 : cursorPos;
                          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                          return (
                            <>
                              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#eab308" strokeWidth="0.06" strokeDasharray="0.15 0.08" />
                              <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 0.25} textAnchor="middle" fontSize="0.34" fill="#eab308" fontWeight="700">
                                {dist.toFixed(2)} m ({(dist * 3.28084).toFixed(1)} ft)
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    ) : null}

                    {/* Snap crosshair */}
                    <circle cx={cursorPos.x} cy={cursorPos.y} r="0.11" fill="none" stroke="#38bdf8" strokeWidth="0.04" />
                  </svg>
                </div>
              </div>
            )}

            {viewMode !== "2d" && (
              <div className="flex flex-col overflow-hidden rounded-lg border bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-mono text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Box className="size-3.5 text-cyan-400" /> Live 3D Extrusion ({cad.wall_height_m}m height)
                  </span>
                  <button
                    type="button"
                    onClick={() => viewer3DRef.current?.exportGLB(`${projectTitle}.glb`)}
                    className="text-cyan-400 hover:underline"
                  >
                    Export .GLB
                  </button>
                </div>
                <div className="flex-1 min-h-[470px]">
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center text-xs text-slate-400">
                        Initializing 3D Viewport...
                      </div>
                    }
                  >
                    <LazyApartment3DViewer
                      ref={viewer3DRef}
                      scene3d={scene3d}
                      showWalls={layers.walls}
                      showRoof={false}
                      showFurniture
                      selectedPart={null}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>

          {/* Right Dock: Layers & Properties */}
          <div className="space-y-3 rounded-lg border bg-card p-3 h-fit">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Layers className="size-3.5 text-primary" /> CAD Layers
              </p>
              <div className="mt-2 space-y-1.5 text-xs">
                {[
                  { key: "walls", label: "A-WALL (Walls)", count: cad.walls.length },
                  { key: "doors", label: "A-DOOR (Doors)", count: cad.doors.length },
                  { key: "windows", label: "A-WIND (Windows)", count: cad.windows.length },
                  { key: "columns", label: "S-COLS (RCC Columns)", count: cad.columns.length },
                  { key: "rooms", label: "A-ROOM (Zones)", count: cad.rooms.length },
                ].map((ly) => {
                  const active = layers[ly.key as keyof typeof layers];
                  return (
                    <button
                      key={ly.key}
                      type="button"
                      onClick={() =>
                        setLayers((prev) => ({ ...prev, [ly.key]: !prev[ly.key as keyof typeof layers] }))
                      }
                      className="flex w-full items-center justify-between rounded border px-2.5 py-1.5 text-left hover:bg-secondary/50"
                    >
                      <span className={active ? "font-medium text-foreground" : "line-through text-muted-foreground"}>
                        {ly.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{ly.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t pt-3 space-y-2.5 text-xs">
              <p className="flex items-center gap-1.5 font-semibold">
                <Maximize2 className="size-3.5 text-primary" /> Sheet &amp; Extrusion
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">Snap (m)</label>
                  <select
                    className="h-7 w-full rounded border bg-background px-1.5 text-xs font-mono"
                    value={snapStep}
                    onChange={(e) => setSnapStep(Number(e.target.value))}
                  >
                    <option value={0.25}>0.25 m</option>
                    <option value={0.5}>0.50 m</option>
                    <option value={1.0}>1.00 m</option>
                  </select>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">Wall Ht (m)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min={2.4}
                    max={6.0}
                    className="h-7 text-xs font-mono"
                    value={cad.wall_height_m}
                    onChange={(e) => setCad({ ...cad, wall_height_m: Number(e.target.value) || 2.9 })}
                  />
                </div>
              </div>

              <div className="rounded bg-secondary/50 p-2 font-mono text-[11px] space-y-0.5">
                <p>Zone Area: <strong>{totalRoomArea} m²</strong></p>
                <p>Stairs: <strong>{cad.stairs.length}</strong> · Doors: <strong>{cad.doors.length}</strong></p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  pushHistory({ ...cad, walls: [], doors: [], windows: [], rooms: [], stairs: [], columns: [] });
                  setCommandLog("Cleared all CAD entities.");
                }}
              >
                <Trash2 className="size-3" /> Clear Sheet
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom AutoCAD Command Line */}
        <form onSubmit={runCommandLine} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-[#141517] px-3.5 py-2 text-xs text-zinc-100">
          <span className="font-mono text-[11px] text-emerald-400 shrink-0">CAD:&gt;</span>
          <input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type command (e.g. WALL 1,1 10,1 | ORTHO | GRID | CLEAR | EXPORT DXF)..."
            className="flex-1 bg-transparent font-mono text-xs text-white placeholder:text-zinc-500 focus:outline-none"
          />
          <span className="font-mono text-[11px] text-zinc-400 truncate max-w-md">{commandLog}</span>
        </form>
      </div>
    </AppShell>
  );
}
