import React, { useRef, useState } from "react";
import { FloorPlanGeometry, LayoutTemplate, PlanIssue, UnitSystem } from "@/types/plancheck";
import { cn, formatDimensionCm } from "@/lib/utils";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloorPlanCanvasProps {
  geometry?: FloorPlanGeometry;
  layoutTemplate?: LayoutTemplate;
  uploadedPreviewUrl?: string;
  uploadedFileType?: string;
  uploadedFileName?: string;
  issues?: PlanIssue[];
  selectedIssueId?: string | null;
  onSelectIssue?: (issueId: string) => void;
  /** "original" shows unpatched plan; "corrected" applies visual fixes for accepted/applied issues */
  mode?: "original" | "corrected";
  /** Allow switching between uploaded raster preview and parsed CAD geometry */
  preferUploadedImage?: boolean;
  showMarkers?: boolean;
  showDimensions?: boolean;
  showGrid?: boolean;
  showFurniture?: boolean;
  unitSystem?: UnitSystem;
  zoom?: number;
  pan?: { x: number; y: number };
  onZoomChange?: (z: number) => void;
  onPanChange?: (p: { x: number; y: number }) => void;
  interactive?: boolean;
  scanning?: boolean;
  compact?: boolean;
  highContrastMarkers?: boolean;
  svgRef?: React.RefObject<SVGSVGElement>;
  className?: string;
}

export function FloorPlanCanvas({
  geometry,
  layoutTemplate = "2br-apartment",
  uploadedPreviewUrl,
  uploadedFileType,
  uploadedFileName,
  issues = [],
  selectedIssueId,
  onSelectIssue,
  mode = "original",
  preferUploadedImage,
  showMarkers = true,
  showDimensions = true,
  showGrid = true,
  showFurniture = true,
  unitSystem = "metric",
  zoom: controlledZoom,
  pan: controlledPan,
  onZoomChange,
  onPanChange,
  interactive = true,
  scanning = false,
  compact = false,
  highContrastMarkers = false,
  svgRef,
  className,
}: FloorPlanCanvasProps) {
  const [internalZoom, setInternalZoom] = useState(1);
  const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [viewSource, setViewSource] = useState<"image" | "cad">(
    preferUploadedImage === false ? "cad" : uploadedPreviewUrl ? "image" : "cad"
  );
  const dragOrigin = useRef({ x: 0, y: 0 });

  const zoom = controlledZoom ?? internalZoom;
  const pan = controlledPan ?? internalPan;

  const setZoom = (val: number) => {
    const clamped = Math.min(2.6, Math.max(0.7, Number(val.toFixed(2))));
    if (onZoomChange) onZoomChange(clamped);
    else setInternalZoom(clamped);
  };

  const setPan = (next: { x: number; y: number }) => {
    if (onPanChange) onPanChange(next);
    else setInternalPan(next);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-marker='true']")) return;
    setDragging(true);
    dragOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !interactive) return;
    setPan({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  const hasUploadedImage = Boolean(
    uploadedPreviewUrl && (uploadedFileType?.startsWith("image/") || uploadedPreviewUrl.endsWith(".png"))
  );
  const showUploadedRaster = hasUploadedImage && (preferUploadedImage ?? viewSource === "image");

  // Structured geometry flags (read from geometry if present, else fallback to applied issue flags)
  const appliedFixKeys = new Set(
    mode === "corrected"
      ? issues
          .filter((i) => i.status === "applied" || i.status === "accepted")
          .map((i) => i.geometryFixKey)
          .filter(Boolean)
      : []
  );

  const stairFromGeom = geometry?.stairs?.[0];
  const stairWidened = stairFromGeom ? stairFromGeom.modified || stairFromGeom.clear_width_cm >= 100 : appliedFixKeys.has("widen-staircase");
  const bathDoorFromGeom = geometry?.doors?.find((d) => d.id === "d-bath");
  const doorReversed = bathDoorFromGeom ? Boolean(bathDoorFromGeom.modified) : appliedFixKeys.has("reverse-door-swing");
  const exit2FromGeom = geometry?.doors?.find((d) => d.id === "d-exit-2");
  const secondaryExitAdded = exit2FromGeom ? true : appliedFixKeys.has("add-secondary-exit");
  const corridorWidened = appliedFixKeys.has("widen-corridor");

  const stairWidthLabel = stairWidened
    ? formatDimensionCm(stairFromGeom?.clear_width_cm ?? 100, unitSystem)
    : formatDimensionCm(stairFromGeom?.clear_width_cm ?? 80, unitSystem);

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border select-none",
        showGrid ? "bg-cad-grid" : "bg-[#F6F8FC]",
        interactive ? (dragging ? "cursor-grabbing" : "cursor-grab") : "",
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top-Left Layer Switcher when user uploaded a raster/PDF page */}
      {hasUploadedImage && !compact && preferUploadedImage === undefined && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-lg border bg-card/95 p-0.5 text-[11px] shadow-card backdrop-blur">
          <button
            type="button"
            onClick={() => setViewSource("image")}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition-colors",
              viewSource === "image" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Original Sheet
          </button>
          <button
            type="button"
            onClick={() => setViewSource("cad")}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition-colors",
              viewSource === "cad" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            CAD Geometry
          </button>
        </div>
      )}

      {/* Zoom & Pan toolbar */}
      {interactive && !compact && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-card backdrop-blur">
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setZoom(zoom + 0.2)} title="Zoom in">
            <Plus className="size-3.5" />
          </Button>
          <span className="min-w-[42px] text-center font-mono text-[11px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setZoom(zoom - 0.2)} title="Zoom out">
            <Minus className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={resetView} title="Reset view">
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Scale / CAD badge */}
      {!compact && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-md border bg-card/90 px-2.5 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
          <Maximize2 className="size-3 text-primary" />
          <span>
            {geometry?.scale_status === "estimated" ? "ESTIMATED SCALE · " : "SCALE 1:100 · "}
            {mode === "corrected" ? "REVISED CAD LAYER" : "ORIGINAL PLAN"}
          </span>
        </div>
      )}

      {/* Animated AI scan sweep */}
      {scanning && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div
            className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_24px_6px_rgba(32,196,216,0.45)]"
            style={{ animation: "plancheck-scan 2.4s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes plancheck-scan {
              0% { transform: translateY(10px); opacity: 0.2; }
              50% { transform: translateY(380px); opacity: 1; }
              100% { transform: translateY(10px); opacity: 0.2; }
            }
          `}</style>
        </div>
      )}

      {/* Transformable Viewport */}
      <div
        className="relative flex h-full w-full items-center justify-center p-4 transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {showUploadedRaster ? (
          <div className="relative inline-block max-h-full max-w-full overflow-hidden rounded-lg border bg-white shadow-sm">
            <img
              src={uploadedPreviewUrl}
              alt={uploadedFileName || "Uploaded architectural floor plan"}
              className="max-h-[460px] w-auto object-contain"
              draggable={false}
            />
            {mode === "corrected" && (
              <div className="pointer-events-none absolute inset-0 border-2 border-primary/40 bg-primary/[0.04]">
                <div className="absolute left-3 bottom-3 rounded bg-primary px-2 py-0.5 font-mono text-[10px] font-medium text-white shadow">
                  SIMULATED REVISION OVERLAY
                </div>
              </div>
            )}
            {showMarkers &&
              selectedIssue?.locationBox && (
                <div
                  className="pointer-events-none absolute rounded border-2 border-dashed border-primary bg-primary/10"
                  style={{
                    left: `${(selectedIssue.locationBox.x - selectedIssue.locationBox.width / 2) * 100}%`,
                    top: `${(selectedIssue.locationBox.y - selectedIssue.locationBox.height / 2) * 100}%`,
                    width: `${selectedIssue.locationBox.width * 100}%`,
                    height: `${selectedIssue.locationBox.height * 100}%`,
                  }}
                />
              )}
            {showMarkers &&
              issues.map((iss, idx) => (
                <IssuePin
                  key={iss.id}
                  issue={iss}
                  index={idx + 1}
                  selected={selectedIssueId === iss.id}
                  highContrast={highContrastMarkers}
                  onClick={() => onSelectIssue?.(iss.id)}
                />
              ))}
          </div>
        ) : (
          <div className="relative w-full max-w-[680px]">
            <svg
              ref={svgRef}
              viewBox="0 0 800 540"
              className="h-auto w-full drop-shadow-sm"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="greenHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#10B981" strokeWidth="1.2" opacity="0.4" />
                </pattern>
              </defs>

              {/* Outer Slab */}
              <rect x="44" y="44" width="712" height="452" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />

              {/* Room Polygons */}
              <rect x="54" y="54" width="236" height="206" fill="#F8FAFC" />
              <rect x="54" y="260" width="420" height="226" fill="#F1F5F9" opacity="0.6" />
              <rect x="290" y="54" width="220" height="176" fill="#F8FAFC" />
              <rect
                x="290"
                y={corridorWidened ? 222 : 230}
                width="220"
                height={corridorWidened ? 56 : 48}
                fill={corridorWidened ? "#EFF6FF" : "#F8FAFC"}
              />
              <rect x="380" y="278" width="130" height="106" fill="#EFF6FF" opacity="0.7" />
              <rect x="510" y="230" width="236" height="256" fill="#F8FAFC" />
              <rect
                x={stairWidened ? 560 : 582}
                y="54"
                width={stairWidened ? 186 : 164}
                height="176"
                fill={stairWidened ? "url(#greenHatch)" : "#F8FAFC"}
              />

              {/* Highlighted AI Change Regions when in Corrected Mode */}
              {stairWidened && (
                <rect
                  x="558"
                  y="54"
                  width="32"
                  height="176"
                  fill="#10B981"
                  fillOpacity="0.16"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
              {doorReversed && (
                <circle
                  cx="438"
                  cy="262"
                  r="42"
                  fill="#4263EB"
                  fillOpacity="0.12"
                  stroke="#4263EB"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
              {secondaryExitAdded && (
                <rect
                  x="718"
                  y="360"
                  width="46"
                  height="68"
                  rx="3"
                  fill="#10B981"
                  fillOpacity="0.16"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}

              {/* Balcony */}
              <rect x="54" y="426" width="220" height="60" fill="#ECFEFF" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="54" y1="426" x2="274" y2="426" stroke="#20C4D8" strokeWidth="2.5" strokeDasharray="6 4" />

              {/* Furniture Silhouettes */}
              {showFurniture && (
                <g stroke="#94A3B8" strokeWidth="1.2" fill="#FFFFFF" fillOpacity="0.8">
                  <rect x="78" y="84" width="110" height="128" rx="4" />
                  <rect x="86" y="90" width="42" height="24" rx="3" />
                  <rect x="138" y="90" width="42" height="24" rx="3" />
                  <rect x="58" y="88" width="16" height="24" rx="2" />
                  <rect x="194" y="88" width="16" height="24" rx="2" />

                  <rect x="330" y="72" width="96" height="114" rx="4" />
                  <rect x="342" y="78" width="72" height="22" rx="3" />

                  <rect x="82" y="294" width="150" height="52" rx="5" />
                  <rect x="112" y="362" width="88" height="36" rx="4" />

                  <rect x="278" y="346" width="78" height="110" rx="4" />
                  <circle cx="268" cy="378" r="10" />
                  <circle cx="268" cy="422" r="10" />
                  <circle cx="366" cy="378" r="10" />
                  <circle cx="366" cy="422" r="10" />

                  <rect x="462" y="286" width="40" height="86" rx="6" />
                  <ellipse cx="406" cy="312" rx="14" ry="18" />
                  <rect x="392" y="352" width="38" height="24" rx="3" />

                  <path d="M 526 244 H 734 V 474 H 684 V 292 H 526 Z" fill="#F8FAFC" />
                  <rect x="586" y="252" width="52" height="28" rx="3" />
                  <circle cx="602" cy="266" r="6" />
                  <circle cx="622" cy="266" r="6" />
                  <rect x="694" y="330" width="32" height="58" rx="3" />
                </g>
              )}

              {/* Staircase Treads */}
              <g stroke={stairWidened ? "#059669" : "#334155"} strokeWidth="1.5" fill="none">
                {Array.from({ length: 8 }).map((_, i) => {
                  const xLeft = stairWidened ? 562 : 584;
                  const yPos = 66 + i * 19;
                  return <line key={i} x1={xLeft} y1={yPos} x2="736" y2={yPos} />;
                })}
                <line
                  x1={stairWidened ? 650 : 660}
                  y1="210"
                  x2={stairWidened ? 650 : 660}
                  y2="78"
                  stroke={stairWidened ? "#059669" : "#4263EB"}
                  strokeWidth="2"
                />
                <polyline
                  points={`${(stairWidened ? 650 : 660) - 6},88 ${stairWidened ? 650 : 660},76 ${(stairWidened ? 650 : 660) + 6},88`}
                  stroke={stairWidened ? "#059669" : "#4263EB"}
                  strokeWidth="2"
                />
              </g>

              {/* Exterior Walls */}
              <g stroke="#0F172A" strokeWidth="8" strokeLinecap="square" fill="none">
                <line x1="50" y1="50" x2="120" y2="50" />
                <line x1="210" y1="50" x2="360" y2="50" />
                <line x1="450" y1="50" x2="750" y2="50" />
                <line x1="50" y1="50" x2="50" y2="140" />
                <line x1="50" y1="220" x2="50" y2="490" />
                <line x1="50" y1="490" x2="430" y2="490" />
                <line x1="495" y1="490" x2="750" y2="490" />
                <line x1="750" y1="50" x2="750" y2="365" />
                {secondaryExitAdded ? (
                  <line x1="750" y1="425" x2="750" y2="490" />
                ) : (
                  <line x1="750" y1="365" x2="750" y2="490" />
                )}
              </g>

              {/* Windows */}
              <g stroke="#20C4D8" strokeWidth="3" fill="none">
                <line x1="120" y1="50" x2="210" y2="50" />
                <line x1="360" y1="50" x2="450" y2="50" />
                <line x1="50" y1="140" x2="50" y2="220" />
              </g>

              {/* Interior Partition Walls */}
              <g stroke="#1E293B" strokeWidth="4.5" strokeLinecap="square" fill="none">
                <line x1="290" y1="54" x2="290" y2="230" />
                <line x1="54" y1="260" x2="210" y2="260" />
                <line x1="265" y1="260" x2="290" y2="260" />
                <line x1="290" y1={corridorWidened ? 222 : 230} x2="365" y2={corridorWidened ? 222 : 230} />
                <line x1="420" y1={corridorWidened ? 222 : 230} x2="510" y2={corridorWidened ? 222 : 230} />
                <line
                  x1={stairWidened ? 560 : 582}
                  y1="54"
                  x2={stairWidened ? 560 : 582}
                  y2="230"
                  stroke={stairWidened ? "#059669" : "#1E293B"}
                />
                <line x1="510" y1="230" x2="560" y2="230" />
                <line x1="380" y1="278" x2="380" y2="384" />
                <line x1="380" y1="384" x2="510" y2="384" />
                <line x1="510" y1="278" x2="510" y2="384" />
                <line x1="380" y1="278" x2="405" y2="278" />
                <line x1="460" y1="278" x2="510" y2="278" />
                <line x1="510" y1="230" x2="510" y2="340" />
              </g>

              {/* Door Swings */}
              <g fill="none" stroke="#4263EB" strokeWidth="1.5">
                <line x1="432" y1="490" x2="432" y2="432" stroke="#0F172A" strokeWidth="2.5" />
                <path d="M 432 432 A 58 58 0 0 1 490 490" strokeDasharray="3 3" />

                <line x1="210" y1="260" x2="210" y2="310" stroke="#0F172A" strokeWidth="2" />
                <path d="M 210 310 A 50 50 0 0 0 260 260" strokeDasharray="3 3" />

                <line x1="365" y1="230" x2="365" y2="180" stroke="#0F172A" strokeWidth="2" />
                <path d="M 365 180 A 50 50 0 0 1 415 230" strokeDasharray="3 3" />

                {doorReversed ? (
                  <>
                    <line x1="458" y1="278" x2="458" y2="328" stroke="#10B981" strokeWidth="2.5" />
                    <path d="M 458 328 A 50 50 0 0 1 408 278" stroke="#10B981" strokeDasharray="3 3" />
                  </>
                ) : (
                  <>
                    <line x1="406" y1="278" x2="406" y2="232" stroke="#F59E0B" strokeWidth="2.5" />
                    <path d="M 406 232 A 46 46 0 0 1 452 278" stroke="#F59E0B" strokeDasharray="3 3" />
                  </>
                )}

                {secondaryExitAdded && (
                  <>
                    <line x1="750" y1="368" x2="796" y2="368" stroke="#10B981" strokeWidth="2.5" />
                    <path d="M 796 368 A 46 46 0 0 1 750 414" stroke="#10B981" strokeDasharray="3 3" />
                    <text x="760" y="356" fill="#059669" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                      EXIT 2
                    </text>
                  </>
                )}
              </g>

              {/* Room Labels */}
              <g fontFamily="Inter, sans-serif" textAnchor="middle">
                <text x="172" y="156" fill="#0F172A" fontSize="12" fontWeight="600">
                  {layoutTemplate === "urban-compact" ? "LOFT SUITE" : "MASTER BEDROOM"}
                </text>
                <text x="172" y="172" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  {unitSystem === "metric" ? "3.6m × 3.8m" : "11'10\" × 12'6\""}
                </text>

                <text x="410" y="128" fill="#0F172A" fontSize="12" fontWeight="600">
                  {layoutTemplate === "family-house" ? "STUDY / GUEST" : "BEDROOM 02"}
                </text>
                <text x="410" y="144" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  {unitSystem === "metric" ? "3.4m × 3.2m" : "11'2\" × 10'6\""}
                </text>

                <text x="215" y="330" fill="#0F172A" fontSize="12" fontWeight="600">
                  LIVING &amp; DINING
                </text>
                <text x="215" y="346" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  {unitSystem === "metric" ? "6.2m × 4.4m" : "20'4\" × 14'5\""}
                </text>

                <text x="444" y="340" fill="#0F172A" fontSize="11" fontWeight="600">
                  BATH
                </text>

                <text x="615" y="366" fill="#0F172A" fontSize="12" fontWeight="600">
                  KITCHEN
                </text>
                <text x="615" y="382" fill="#64748B" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  {unitSystem === "metric" ? "3.2m × 3.5m" : "10'6\" × 11'6\""}
                </text>

                <text x="164" y="460" fill="#0284C7" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  BALCONY TERRACE
                </text>

                <text x="464" y="476" fill="#4263EB" fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  MAIN ENTRY
                </text>
              </g>

              {/* Dimension Lines */}
              {showDimensions && (
                <g fontFamily="JetBrains Mono, monospace" fontSize="10">
                  <line x1="50" y1="26" x2="750" y2="26" stroke="#64748B" strokeWidth="1" />
                  <line x1="50" y1="20" x2="50" y2="32" stroke="#64748B" strokeWidth="1" />
                  <line x1="750" y1="20" x2="750" y2="32" stroke="#64748B" strokeWidth="1" />
                  <rect x="360" y="17" width="80" height="16" fill="#F8FAFC" />
                  <text x="400" y="29" textAnchor="middle" fill="#475569">
                    {geometry ? `${geometry.width_m.toFixed(1)} m` : unitSystem === "metric" ? "12.40 m" : "40' 8\""}
                  </text>

                  <line
                    x1={stairWidened ? 562 : 584}
                    y1="214"
                    x2="742"
                    y2="214"
                    stroke={stairWidened ? "#10B981" : "#EF4444"}
                    strokeWidth="1.5"
                  />
                  <rect
                    x={stairWidened ? 620 : 632}
                    y="204"
                    width="64"
                    height="18"
                    rx="3"
                    fill={stairWidened ? "#ECFDF5" : "#FEF2F2"}
                    stroke={stairWidened ? "#10B981" : "#EF4444"}
                    strokeWidth="1"
                  />
                  <text
                    x={stairWidened ? 652 : 664}
                    y="217"
                    textAnchor="middle"
                    fill={stairWidened ? "#047857" : "#DC2626"}
                    fontWeight="600"
                  >
                    {stairWidthLabel}
                  </text>
                </g>
              )}
            </svg>

            {/* Normalized bounding box highlight for selected issue */}
            {showMarkers && selectedIssue?.locationBox && (
              <div
                className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary bg-primary/10 transition-all"
                style={{
                  left: `${(selectedIssue.locationBox.x - selectedIssue.locationBox.width / 2) * 100}%`,
                  top: `${(selectedIssue.locationBox.y - selectedIssue.locationBox.height / 2) * 100}%`,
                  width: `${selectedIssue.locationBox.width * 100}%`,
                  height: `${selectedIssue.locationBox.height * 100}%`,
                }}
              />
            )}

            {/* Issue Markers */}
            {showMarkers &&
              issues.map((iss, idx) => (
                <IssuePin
                  key={iss.id}
                  issue={iss}
                  index={idx + 1}
                  selected={selectedIssueId === iss.id}
                  highContrast={highContrastMarkers}
                  onClick={() => onSelectIssue?.(iss.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IssuePin({
  issue,
  index,
  selected,
  highContrast,
  onClick,
}: {
  issue: PlanIssue;
  index: number;
  selected: boolean;
  highContrast: boolean;
  onClick: () => void;
}) {
  const isResolved = issue.status === "applied" || issue.status === "accepted";
  const isDismissed = issue.status === "dismissed";

  const colorClasses = isResolved
    ? "bg-emerald-500 border-white text-white ring-emerald-400/40"
    : isDismissed
      ? "bg-slate-400 border-white text-white ring-slate-300/40"
      : issue.severity === "high"
        ? "bg-red-500 border-white text-white ring-red-500/35"
        : "bg-amber-500 border-white text-white ring-amber-400/40";

  return (
    <button
      type="button"
      data-marker="true"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ left: `${issue.markerX}%`, top: `${issue.markerY}%` }}
      title={`${issue.code}: ${issue.title}`}
      className={cn(
        "group absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold shadow-md transition-all",
        highContrast ? "size-8 text-xs ring-4" : "size-7 ring-4",
        selected ? "scale-125 ring-primary/60 z-20" : "hover:scale-110",
        colorClasses
      )}
    >
      {!isResolved && !isDismissed && issue.severity === "high" && (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-red-500/40" />
      )}
      {isResolved ? "✓" : index}
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-sans font-medium text-white shadow-lg group-hover:block">
        {issue.title}
      </span>
    </button>
  );
}

export function downloadSvgElement(svgEl: SVGSVGElement | null, filename: string) {
  if (!svgEl) return false;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgEl);
  const blob = new Blob([`<?xml version="1.0" standalone="no"?>\r\n${source}`], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
