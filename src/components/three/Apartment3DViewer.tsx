import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PlanIssue, Scene3DData } from "@/types/plancheck";

export type CameraPreset = "perspective" | "top" | "isometric";

export interface Selected3DPart {
  id: string;
  label: string;
  dimensions: string;
  notes: string;
}

export interface Apartment3DHandle {
  resetCamera: () => void;
  setCameraPreset: (preset: CameraPreset) => void;
  exportGLB: (fileName?: string) => Promise<void>;
}

interface Apartment3DViewerProps {
  scene3d?: Scene3DData | null;
  issues?: PlanIssue[];
  showWalls: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  selectedPart: Selected3DPart | null;
  onSelectPart?: (part: Selected3DPart | null) => void;
  className?: string;
}

const CAMERA_POSITIONS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  perspective: { pos: [11.5, 9.5, 12.5], target: [0, 0.8, 0] },
  top: { pos: [0, 17, 0.01], target: [0, 0, 0] },
  isometric: { pos: [13, 12, 13], target: [0, 0.5, 0] },
};

const PARTS_META: Record<string, Selected3DPart> = {
  slab: { id: "slab", label: "Structural Floor Slab", dimensions: "12.4 m × 8.8 m × 0.24 m", notes: "Reinforced plinth with oak & ceramic finish zones." },
  walls: { id: "walls", label: "Partition & Exterior Walls", dimensions: "Height 2.75 m", notes: "Extruded from structured 2D wall coordinates." },
  staircase: { id: "staircase", label: "Staircase Core", dimensions: "Generated from stair geometry", notes: "Updates dynamically when stair correction is applied." },
  living: { id: "living", label: "Living & Dining Zone", dimensions: "5.9 m × 4.6 m", notes: "Connected to south balcony terrace with full daylighting." },
  master: { id: "master", label: "Master Bedroom Suite", dimensions: "4.2 m × 4.2 m", notes: "Passed spatial & natural ventilation checks." },
  kitchen: { id: "kitchen", label: "Kitchen & Service Zone", dimensions: "4.2 m × 5.1 m", notes: "Includes secondary egress door when correction applied." },
  roof: { id: "roof", label: "Architectural Roof Canopy", dimensions: "12.8 m × 9.2 m overhang", notes: "Translucent studio canopy for cutaway inspection." },
};

export const Apartment3DViewer = React.forwardRef<Apartment3DHandle, Apartment3DViewerProps>(
  ({ scene3d, issues = [], showWalls, showRoof, showFurniture, selectedPart, onSelectPart, className }, ref) => {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const sceneGroupRef = useRef<THREE.Group | null>(null);
    const [preset, setPreset] = useState<CameraPreset>("perspective");
    const [cameraResetTick, setCameraResetTick] = useState(0);

    const appliedKeys = new Set(
      issues
        .filter((i) => i.status === "applied" || i.status === "accepted")
        .map((i) => i.geometryFixKey)
        .filter(Boolean)
    );
    const stairWidened = scene3d?.stairs?.[0]
      ? scene3d.stairs[0].clear_width_cm >= 100
      : appliedKeys.has("widen-staircase");
    const secondaryExit = scene3d?.doors
      ? scene3d.doors.some((d) => d.id === "d-exit-2")
      : appliedKeys.has("add-secondary-exit");

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        setPreset("perspective");
        setCameraResetTick((t) => t + 1);
      },
      setCameraPreset: (next) => {
        setPreset(next);
        setCameraResetTick((t) => t + 1);
      },
      exportGLB: async (fileName = "plancheck-apartment-3d.glb") => {
        if (!sceneGroupRef.current) return;
        const exporter = new GLTFExporter();
        return new Promise<void>((resolve, reject) => {
          exporter.parse(
            sceneGroupRef.current!,
            (result) => {
              const blob =
                result instanceof ArrayBuffer
                  ? new Blob([result], { type: "model/gltf-binary" })
                  : new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              resolve();
            },
            (err) => reject(err),
            { binary: true }
          );
        });
      },
    }));

    return (
      <div className={className} style={{ width: "100%", height: "100%", minHeight: 380 }}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onPointerMissed={() => onSelectPart?.(null)}
        >
          <color attach="background" args={["#EEF2F8"]} />
          <fog attach="fog" args={["#EEF2F8", 24, 52]} />

          <CameraRig preset={preset} resetTick={cameraResetTick} controlsRef={controlsRef} />

          <ambientLight intensity={0.65} />
          <hemisphereLight args={["#ffffff", "#cbd5e1", 0.45]} />
          <directionalLight
            position={[12, 18, 10]}
            intensity={1.15}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={1}
            shadow-camera-far={45}
            shadow-camera-left={-12}
            shadow-camera-right={12}
            shadow-camera-top={12}
            shadow-camera-bottom={-12}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-10, 8, -10]} intensity={0.35} color="#bfdbfe" />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.07}
            minDistance={5}
            maxDistance={28}
            maxPolarAngle={Math.PI / 2 - 0.04}
          />

          <Grid
            position={[0, -0.02, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#cbd5e1"
            sectionSize={4}
            sectionThickness={1}
            sectionColor="#94a3b8"
            fadeDistance={30}
            fadeStrength={1.2}
          />

          <ContactShadows position={[0, 0.005, 0]} opacity={0.32} scale={26} blur={2.2} far={6} />

          <group ref={sceneGroupRef}>
            {scene3d ? (
              <GeometryDrivenApartment
                scene3d={scene3d}
                showWalls={showWalls}
                showRoof={showRoof}
                showFurniture={showFurniture}
                selectedId={selectedPart?.id ?? null}
                onSelect={(part) => onSelectPart?.(part)}
              />
            ) : (
              <FallbackDemoApartment
                showWalls={showWalls}
                showRoof={showRoof}
                showFurniture={showFurniture}
                stairWidened={stairWidened}
                secondaryExit={secondaryExit}
                selectedId={selectedPart?.id ?? null}
                onSelect={(id) => onSelectPart?.(PARTS_META[id] ?? null)}
              />
            )}
          </group>
        </Canvas>
      </div>
    );
  }
);
Apartment3DViewer.displayName = "Apartment3DViewer";

function CameraRig({
  preset,
  resetTick,
  controlsRef,
}: {
  preset: CameraPreset;
  resetTick: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const cfg = CAMERA_POSITIONS[preset];
    camera.position.set(...cfg.pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...cfg.target);
      controlsRef.current.update();
    } else {
      camera.lookAt(...cfg.target);
    }
  }, [preset, resetTick, camera, controlsRef]);

  return <PerspectiveCamera makeDefault position={[11.5, 9.5, 12.5]} fov={40} />;
}

/**
 * Renders the 3D apartment directly from structured backend Scene3DData generated from FloorPlanGeometry.
 */
function GeometryDrivenApartment({
  scene3d,
  showWalls,
  showRoof,
  showFurniture,
  selectedId,
  onSelect,
}: {
  scene3d: Scene3DData;
  showWalls: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  selectedId: string | null;
  onSelect: (part: Selected3DPart | null) => void;
}) {
  const { footprint, walls, rooms, doors, windows, stairs, roof } = scene3d;
  const slabH = footprint.slab_thickness_m;

  const pickPart = (part: Selected3DPart) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(part);
  };

  return (
    <group>
      {/* Structural Slab */}
      <mesh
        position={[0, slabH / 2, 0]}
        receiveShadow
        castShadow
        onClick={pickPart({
          id: "slab",
          label: "Structural Floor Slab",
          dimensions: `${footprint.width_m} m × ${footprint.depth_m} m × ${slabH} m`,
          notes: "Generated directly from structured floor footprint.",
        })}
      >
        <boxGeometry args={[footprint.width_m, slabH, footprint.depth_m]} />
        <meshStandardMaterial color={selectedId === "slab" ? "#60A5FA" : "#CBD5E1"} roughness={0.85} />
      </mesh>

      {/* Room Floor Zones */}
      {rooms.map((r) => {
        const isWet = r.category === "bathroom" || r.category === "kitchen";
        const isBalcony = r.category === "balcony";
        const baseColor = isBalcony ? "#B8D8E3" : isWet ? "#E2E8F0" : "#D6B28D";
        const color = selectedId === r.id ? "#60A5FA" : baseColor;
        return (
          <mesh
            key={r.id}
            position={[r.cx, slabH + 0.015, r.cz]}
            receiveShadow
            onClick={pickPart({
              id: r.id,
              label: r.name,
              dimensions: `${r.width} m × ${r.depth} m (${r.area_sqm} m²)`,
              notes: `Category: ${r.category} · Measurement: ${r.measurement_status}`,
            })}
          >
            <boxGeometry args={[Math.max(0.2, r.width - 0.08), 0.03, Math.max(0.2, r.depth - 0.08)]} />
            <meshStandardMaterial color={color} roughness={isWet ? 0.45 : 0.65} />
          </mesh>
        );
      })}

      {/* Extruded Walls from Structured Geometry */}
      {showWalls &&
        walls.map((w) => {
          const baseWallColor = w.modified ? "#A7F3D0" : w.is_exterior ? "#E2E8F0" : "#F8FAFC";
          const color = selectedId === w.id ? "#60A5FA" : baseWallColor;
          return (
            <mesh
              key={w.id}
              position={[w.cx, slabH + w.height / 2, w.cz]}
              rotation={[0, w.rotation_y, 0]}
              castShadow
              receiveShadow
              onClick={pickPart({
                id: w.id,
                label: w.label,
                dimensions: `Length ${w.length} m · Height ${w.height} m · Thickness ${w.thickness} m`,
                notes: w.modified ? "Modified by accepted AI correction." : "Original structural wall.",
              })}
            >
              <boxGeometry args={[w.length, w.height, w.thickness]} />
              <meshStandardMaterial color={color} roughness={0.75} />
            </mesh>
          );
        })}

      {/* Doors from Structured Geometry */}
      {showWalls &&
        doors.map((d) => (
          <group
            key={d.id}
            position={[d.cx, slabH + d.height / 2, d.cz]}
            rotation={[0, d.rotation_y, 0]}
            onClick={pickPart({
              id: d.id,
              label: d.label,
              dimensions: `Width ${d.width} m × Height ${d.height} m`,
              notes: d.modified ? "Adjusted by AI correction." : d.is_exit ? "Egress door." : "Interior door.",
            })}
          >
            {/* Door Frame */}
            <mesh castShadow>
              <boxGeometry args={[d.width + 0.08, d.height + 0.06, 0.25]} />
              <meshStandardMaterial color={d.is_exit ? (d.modified ? "#10B981" : "#3B82F6") : "#475569"} roughness={0.45} />
            </mesh>
            {/* Open Door Leaf */}
            <mesh position={[-d.width / 2, 0, -d.width * 0.45]} rotation={[0, -0.45, 0]} castShadow>
              <boxGeometry args={[0.05, d.height - 0.05, d.width * 0.9]} />
              <meshStandardMaterial color={d.modified ? "#34D399" : "#93C5FD"} roughness={0.4} />
            </mesh>
          </group>
        ))}

      {/* Windows from Structured Geometry */}
      {showWalls &&
        windows.map((win) => (
          <group
            key={win.id}
            position={[win.cx, slabH + win.sill_m + win.height / 2, win.cz]}
            rotation={[0, win.rotation_y, 0]}
          >
            <mesh>
              <boxGeometry args={[win.width, win.height, 0.25]} />
              <meshStandardMaterial color="#38BDF8" transparent opacity={0.42} roughness={0.1} metalness={0.1} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.05, win.height, 0.27]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        ))}

      {/* Staircase Steps from Structured Geometry */}
      {stairs.map((st) => (
        <group
          key={st.id}
          position={[st.cx, slabH + 0.02, st.cz]}
          onClick={pickPart({
            id: st.id,
            label: "Staircase Core",
            dimensions: `Clear width ${st.clear_width_cm} cm · ${st.steps} steps`,
            notes: st.modified ? "Widened from 80 cm to 100 cm via accepted fix." : "Detected at 80 cm clear width.",
          })}
        >
          {Array.from({ length: st.steps }).map((_, idx) => {
            const stepDepth = st.length / st.steps;
            const zPos = st.length / 2 - stepDepth * (idx + 0.5);
            return (
              <mesh key={idx} position={[0, 0.12 + idx * 0.22, zPos]} castShadow receiveShadow>
                <boxGeometry args={[Math.max(0.8, st.width * 0.65), 0.18, stepDepth * 0.92]} />
                <meshStandardMaterial
                  color={selectedId === st.id ? "#4263EB" : st.modified ? "#A7F3D0" : "#E2E8F0"}
                  roughness={0.5}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Furniture */}
      {showFurniture && <StandardApartmentFurniture />}

      {/* Roof Canopy */}
      {showRoof && (
        <group
          position={[0, roof.elevation_m, 0]}
          onClick={pickPart(PARTS_META.roof)}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[roof.width_m, 0.16, roof.depth_m]} />
            <meshStandardMaterial
              color={selectedId === "roof" ? "#60A5FA" : "#E2E8F0"}
              transparent
              opacity={0.55}
              roughness={0.3}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StandardApartmentFurniture() {
  return (
    <group>
      {/* Master Bed */}
      <group position={[-4.2, 0.27, -2.5]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.35, 2.2]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.42, 0.15]} castShadow>
          <boxGeometry args={[1.8, 0.18, 1.75]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
        </mesh>
      </group>
      {/* Bedroom 2 Bed */}
      <group position={[0.1, 0.27, -2.7]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.35, 2.0]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.42, 0.1]} castShadow>
          <boxGeometry args={[1.4, 0.16, 1.65]} />
          <meshStandardMaterial color="#DBEAFE" roughness={0.8} />
        </mesh>
      </group>
      {/* Living Sofa & Table */}
      <group position={[-3.8, 0.27, 1.4]}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.42, 0.95]} />
          <meshStandardMaterial color="#64748B" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.2, 1.05]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.32, 0.65]} />
          <meshStandardMaterial color="#9A7B56" roughness={0.5} />
        </mesh>
      </group>
      {/* Kitchen Counter */}
      <group position={[4.3, 0.27, 2.2]}>
        <mesh position={[0.1, 0.45, -1.35]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.9, 0.7]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
        </mesh>
        <mesh position={[0.1, 0.92, -1.35]} castShadow>
          <boxGeometry args={[3.24, 0.05, 0.74]} />
          <meshStandardMaterial color="#334155" roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function FallbackDemoApartment({
  showWalls,
  showRoof,
  showFurniture,
  stairWidened,
  secondaryExit,
  selectedId,
  onSelect,
}: {
  showWalls: boolean;
  showRoof: boolean;
  showFurniture: boolean;
  stairWidened: boolean;
  secondaryExit: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const wallH = 2.75;
  const wallColor = selectedId === "walls" ? "#93C5FD" : "#F8FAFC";
  const exteriorWallColor = selectedId === "walls" ? "#60A5FA" : "#E2E8F0";
  const pick = (id: string) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(id);
  };
  const stairWidth = stairWidened ? 1.55 : 1.2;

  return (
    <group>
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow onClick={pick("slab")}>
        <boxGeometry args={[12.4, 0.24, 8.8]} />
        <meshStandardMaterial color={selectedId === "slab" ? "#60A5FA" : "#CBD5E1"} roughness={0.85} />
      </mesh>
      <mesh position={[-1.4, 0.25, 0]} receiveShadow onClick={pick("living")}>
        <boxGeometry args={[9.2, 0.03, 8.4]} />
        <meshStandardMaterial color={selectedId === "living" ? "#93C5FD" : "#D6B28D"} roughness={0.65} />
      </mesh>
      <mesh position={[4.1, 0.255, 2.0]} receiveShadow onClick={pick("kitchen")}>
        <boxGeometry args={[3.9, 0.03, 4.4]} />
        <meshStandardMaterial color={selectedId === "kitchen" ? "#93C5FD" : "#E2E8F0"} roughness={0.45} />
      </mesh>
      <group position={[4.7, 0.26, -2.4]} onClick={pick("staircase")}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <mesh key={idx} position={[0, 0.12 + idx * 0.22, 1.3 - idx * 0.34]} castShadow receiveShadow>
            <boxGeometry args={[stairWidth, 0.18, 0.32]} />
            <meshStandardMaterial
              color={selectedId === "staircase" ? "#4263EB" : stairWidened ? "#A7F3D0" : "#E2E8F0"}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>
      {showWalls && (
        <group onClick={pick("walls")}>
          <WallSegment position={[0, wallH / 2 + 0.25, -4.3]} size={[12.4, wallH, 0.2]} color={exteriorWallColor} />
          <WallSegment position={[-6.1, wallH / 2 + 0.25, 0]} size={[0.2, wallH, 8.8]} color={exteriorWallColor} />
          <WallSegment position={[0, wallH / 2 + 0.25, 4.3]} size={[12.4, wallH, 0.2]} color={exteriorWallColor} />
          <WallSegment position={[6.1, wallH / 2 + 0.25, -1.2]} size={[0.2, wallH, 6.2]} color={exteriorWallColor} />
          {secondaryExit && (
            <mesh position={[6.5, 1.3, 2.95]} rotation={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[0.9, 2.1, 0.06]} />
              <meshStandardMaterial color="#10B981" roughness={0.4} />
            </mesh>
          )}
          <WallSegment position={[-1.8, wallH / 2 + 0.25, -2.3]} size={[0.14, wallH, 4.0]} color={wallColor} />
          <WallSegment
            position={[stairWidened ? 3.55 : 3.85, wallH / 2 + 0.25, -2.35]}
            size={[0.14, wallH, 3.9]}
            color={stairWidened ? "#A7F3D0" : wallColor}
          />
        </group>
      )}
      {showFurniture && <StandardApartmentFurniture />}
      {showRoof && (
        <mesh position={[0, wallH + 0.35, 0]} onClick={pick("roof")}>
          <boxGeometry args={[12.8, 0.16, 9.2]} />
          <meshStandardMaterial color="#E2E8F0" transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}

function WallSegment({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}
