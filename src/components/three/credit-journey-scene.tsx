"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Html,
  Lightformer,
  Line,
  MeshReflectorMaterial,
  OrbitControls,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  SUBSTAGE_LABELS,
  type Department,
  type Substage,
} from "@/lib/domain/enums";
import { Skyline } from "@/components/three/skyline";
import { useReducedMotion } from "@/components/three/use-reduced-motion";

export type StationMarker = {
  id: string;
  croReference: string;
  requestType: string;
  substage: string;
  stageAgeHours: number;
  hasOpenQuery: boolean;
};

export type StationData = {
  department: Department;
  inQueue: number;
  markers: StationMarker[];
  overflowCount: number;
};

const CA_COLOR = "#7c4fc4";
const AT_COLOR = "#51c1ad";
const QUERY_COLOR = "#e0524d";

// Wider spacing so the larger stations don't touch.
const STATION_SPACING = 2.75;

function stationPosition(index: number): [number, number, number] {
  const x = (index - (DEPARTMENTS.length - 1) / 2) * STATION_SPACING;
  const z = -Math.pow(index - (DEPARTMENTS.length - 1) / 2, 2) * 0.16;
  return [x, 0, z];
}
/**
 * Recognizable, detailed glass/metal figures standing on each station.
 * Slow idle motion (gear spin, magnifier sway) is disabled under reduced
 * motion. Purely representational — none of this encodes data.
 */
function StationIcon({ department, reducedMotion }: { department: Department; reducedMotion: boolean }) {
  const spinRef = useRef<THREE.Group>(null);
  const spinRef2 = useRef<THREE.Group>(null);
  const swayRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    if (spinRef.current) spinRef.current.rotation.z += delta * 0.5;
    if (spinRef2.current) spinRef2.current.rotation.z -= delta * 0.7;
    if (swayRef.current) swayRef.current.rotation.z = 0.7 + Math.sin(clock.elapsedTime * 0.9) * 0.08;
  });

  const glass = { metalness: 0.1, roughness: 0.08, transmission: 0.6, thickness: 0.35, clearcoat: 0.8 } as const;
  const purple = {
    color: "#7a4bd1",
    emissive: "#4a2390",
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.3,
    clearcoat: 0.7,
  } as const;
  const silver = { color: "#e6e8f2", metalness: 0.7, roughness: 0.18, emissive: "#8a8eab", emissiveIntensity: 0.2 } as const;

  switch (department) {
    case "CORPORATE_FINANCE": {
      // A mini skyline: four glass towers with lit window strips on a plinth.
      const towers: [number, number, number, number][] = [
        [-0.42, 0.62, 0.24, 0],
        [-0.12, 1.15, 0.26, 0.1],
        [0.2, 0.86, 0.24, -0.05],
        [0.48, 0.5, 0.22, 0.05],
      ];
      return (
        <group position={[0, 0.02, 0]}>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[1.25, 0.06, 0.6]} />
            <meshStandardMaterial {...silver} />
          </mesh>
          {towers.map(([x, h, w, z], i) => (
            <group key={i} position={[x, 0.06 + h / 2, z]}>
              <mesh>
                <boxGeometry args={[w, h, w]} />
                <meshPhysicalMaterial color={i % 2 ? "#b39ee0" : "#cfc3ea"} {...glass} />
              </mesh>
              {Array.from({ length: Math.max(2, Math.floor(h / 0.18)) }).map((_, j) => (
                <mesh key={j} position={[0, -h / 2 + 0.12 + j * 0.18, w / 2 + 0.005]}>
                  <planeGeometry args={[w * 0.7, 0.05]} />
                  <meshBasicMaterial color="#fff2cf" toneMapped={false} transparent opacity={0.85} />
                </mesh>
              ))}
              <mesh position={[0, h / 2 + 0.02, 0]}>
                <boxGeometry args={[w * 0.5, 0.04, w * 0.5]} />
                <meshStandardMaterial {...silver} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }
    case "CREDIT_REVIEW":
      // A document with text lines, a folded corner, and a swaying magnifier with a glass lens.
      return (
        <group position={[0, 0.05, 0]} rotation={[0, 0.25, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.7, 0.92, 0.06]} />
            <meshPhysicalMaterial color="#f7f3fc" roughness={0.25} clearcoat={0.6} />
          </mesh>
          {[0.78, 0.66, 0.54, 0.42, 0.3].map((y, i) => (
            <mesh key={i} position={[i === 4 ? -0.1 : 0, y, 0.035]}>
              <planeGeometry args={[i === 4 ? 0.3 : 0.46, 0.035]} />
              <meshBasicMaterial color={i === 0 ? "#552988" : "#b9a9d6"} />
            </mesh>
          ))}
          <mesh position={[0.28, 0.9, 0.035]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.16, 0.16]} />
            <meshBasicMaterial color="#d9c9f2" />
          </mesh>
          <group ref={swayRef} position={[0.38, 0.22, 0.14]} rotation={[0, 0, 0.7]}>
            <mesh>
              <torusGeometry args={[0.24, 0.05, 16, 32]} />
              <meshStandardMaterial {...silver} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.2, 32]} />
              <meshPhysicalMaterial color="#bfeee6" transparent opacity={0.5} {...glass} />
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.4, 12]} />
              <meshPhysicalMaterial {...purple} />
            </mesh>
          </group>
        </group>
      );
    case "APPROVAL_AUTHORITY":
      // Three seated figures behind a curved committee desk with a gavel block.
      return (
        <group position={[0, 0.02, 0]}>
          <mesh position={[0, 0.2, 0.16]}>
            <cylinderGeometry args={[0.66, 0.66, 0.34, 40, 1, false, Math.PI * 0.62, Math.PI * 0.76]} />
            <meshPhysicalMaterial {...purple} />
          </mesh>
          <mesh position={[0, 0.38, 0.16]}>
            <cylinderGeometry args={[0.7, 0.7, 0.04, 40, 1, false, Math.PI * 0.6, Math.PI * 0.8]} />
            <meshStandardMaterial {...silver} />
          </mesh>
          {[-0.34, 0, 0.34].map((x, i) => (
            <group key={i} position={[x, 0.4, -0.12]} scale={i === 1 ? 1.12 : 1}>
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.15, 24, 24]} />
                <meshPhysicalMaterial color="#f4effa" roughness={0.3} clearcoat={0.6} />
              </mesh>
              <mesh position={[0, 0.16, 0]}>
                <capsuleGeometry args={[0.17, 0.32, 6, 12]} />
                <meshPhysicalMaterial
                  color={i === 1 ? "#6a33b8" : "#9d7cc9"}
                  metalness={0.2}
                  roughness={0.3}
                  clearcoat={0.5}
                />
              </mesh>
              <mesh position={[0, 0.02, 0.12]}>
                <boxGeometry args={[0.3, 0.06, 0.1]} />
                <meshStandardMaterial {...silver} />
              </mesh>
            </group>
          ))}
          <mesh position={[0.5, 0.44, 0.34]}>
            <boxGeometry args={[0.16, 0.06, 0.1]} />
            <meshPhysicalMaterial {...purple} />
          </mesh>
        </group>
      );
    case "CAD":
      // A document/storage stack: bevelled discs with a glowing seam, plus a sheet and a seal ring.
      return (
        <group position={[0, 0.02, 0]}>
          {[0, 0.3, 0.6].map((y, i) => (
            <group key={i} position={[0, y + 0.14, 0]}>
              <mesh>
                <cylinderGeometry args={[0.46 - i * 0.03, 0.48 - i * 0.03, 0.24, 40]} />
                <meshPhysicalMaterial
                  color={i === 1 ? "#f4effa" : "#a48bd0"}
                  metalness={0.35}
                  roughness={0.22}
                  clearcoat={0.7}
                />
              </mesh>
              <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.47 - i * 0.03, 0.012, 8, 48]} />
                <meshBasicMaterial color="#51c1ad" toneMapped={false} />
              </mesh>
            </group>
          ))}
          <mesh position={[0.52, 0.5, 0.2]} rotation={[0, -0.5, 0.12]}>
            <boxGeometry args={[0.4, 0.56, 0.03]} />
            <meshPhysicalMaterial color="#f7f3fc" roughness={0.25} clearcoat={0.5} />
          </mesh>
          <mesh position={[0.52, 0.5, 0.22]} rotation={[0, -0.5, 0.12]}>
            <torusGeometry args={[0.1, 0.02, 12, 32]} />
            <meshStandardMaterial color="#f0a53c" emissive="#f0a53c" emissiveIntensity={0.5} />
          </mesh>
        </group>
      );
    case "OPERATIONS":
      // Two interlocking gears with hubs, slowly turning.
      return (
        <group position={[0, 0.02, 0]}>
          <group ref={spinRef} position={[-0.18, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Gear radius={0.42} teeth={10} thick={0.14} />
          </group>
          <group ref={spinRef2} position={[0.5, 0.42, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <Gear radius={0.26} teeth={7} thick={0.12} />
          </group>
        </group>
      );
  }
}

function Gear({ radius, teeth, thick }: { radius: number; teeth: number; thick: number }) {
  const purple = {
    color: "#7a4bd1",
    emissive: "#4a2390",
    emissiveIntensity: 0.35,
    metalness: 0.3,
    roughness: 0.3,
    clearcoat: 0.7,
  } as const;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[radius, radius, thick, 32]} />
        <meshPhysicalMaterial {...purple} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.35, radius * 0.35, thick + 0.04, 24]} />
        <meshStandardMaterial color="#e6e8f2" metalness={0.7} roughness={0.18} emissive="#8a8eab" emissiveIntensity={0.2} />
      </mesh>
      {Array.from({ length: teeth }).map((_, i) => {
        const a = (i / teeth) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * (radius + 0.06), Math.sin(a) * (radius + 0.06), 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.16, 0.13, thick]} />
            <meshPhysicalMaterial {...purple} />
          </mesh>
        );
      })}
    </group>
  );
}


function Marker({
  marker,
  position,
  onSelect,
  phase,
  reducedMotion,
}: {
  marker: StationMarker;
  position: [number, number, number];
  onSelect: (id: string) => void;
  phase: number;
  reducedMotion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(1);
  const isCA = marker.requestType === "CA";

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const bob = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.4 + phase) * 0.05;
    groupRef.current.position.y = position[1] + bob + (hovered ? 0.14 : 0);
    groupRef.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.6 + phase;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, hovered ? 1.5 : 1, 8, delta);
    groupRef.current.scale.setScalar(scaleRef.current);
  });

  const color = marker.hasOpenQuery ? QUERY_COLOR : isCA ? CA_COLOR : AT_COLOR;

  return (
    <group ref={groupRef} position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(marker.id);
        }}
      >
        {isCA ? <boxGeometry args={[0.2, 0.2, 0.2]} /> : <coneGeometry args={[0.14, 0.26, 4]} />}
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.35}
          metalness={0.3}
          roughness={0.15}
          clearcoat={0.8}
          transmission={0.15}
        />
      </mesh>
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="w-48 rounded-lg bg-white/95 p-2.5 text-[11px] shadow-lg ring-1 ring-black/5">
            <div className="font-bold text-primary">{marker.croReference}</div>
            <div className="text-charcoal/70">{marker.requestType} · {SUBSTAGE_LABELS[marker.substage as Substage] ?? marker.substage}</div>
            <div className="text-charcoal/50">Stage age: {Math.round(marker.stageAgeHours)}h</div>
            {marker.hasOpenQuery && <div className="mt-0.5 font-semibold text-[color:var(--color-danger)]">Query in progress</div>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Station({
  data,
  index,
  onSelectStation,
  onSelectMarker,
  reducedMotion,
}: {
  data: StationData;
  index: number;
  onSelectStation: (d: Department) => void;
  onSelectMarker: (id: string) => void;
  reducedMotion: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const position = stationPosition(index);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const liftRef = useRef(0);

  useFrame(({ clock }, delta) => {
    if (ringRef.current) {
      const material = ringRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 1.5 + index) * 0.35;
    }
    if (groupRef.current) {
      liftRef.current = THREE.MathUtils.damp(liftRef.current, hovered ? 0.08 : 0, 8, delta);
      groupRef.current.position.y = position[1] + liftRef.current;
    }
  });

  const markerPositions = useMemo(() => {
    const count = data.markers.length;
    return data.markers.map((_, i) => {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = 1.1;
      return [Math.cos(angle) * radius, 0.5 + (i % 3) * 0.22, Math.sin(angle) * radius * 0.6] as [number, number, number];
    });
  }, [data.markers]);

  const hasQuery = data.markers.some((m) => m.hasOpenQuery);

  return (
    <group ref={groupRef} position={position}>
      {/* Deep-purple drum body, matching the reference's purple metallic pedestals. */}
      <mesh
        position={[0, 0.16, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStation(data.department);
        }}
      >
        <cylinderGeometry args={[1.3, 1.36, 0.5, 64]} />
        {/* Low metalness + emissive so the brand purple reads vividly even
            without an environment to reflect (metallic PBR alone renders
            near-black). */}
        <meshPhysicalMaterial
          color="#6a33b8"
          emissive="#552988"
          emissiveIntensity={0.55}
          metalness={0.15}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      {/* Chrome base rim and chrome top plate. */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[1.42, 1.42, 0.08, 64]} />
        <meshStandardMaterial color="#cfd3e4" metalness={0.6} roughness={0.2} emissive="#6f7390" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.08, 64]} />
        <meshStandardMaterial color="#e3e6f3" metalness={0.6} roughness={0.15} emissive="#8a8eab" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.035, 12, 64]} />
        <meshStandardMaterial color="#51c1ad" emissive="#51c1ad" emissiveIntensity={1} toneMapped={false} />
      </mesh>

      <group position={[0, 0.3, 0]} scale={1.35}>
        <StationIcon department={data.department} reducedMotion={reducedMotion} />
      </group>

      {markerPositions.map((pos, i) => (
        <Marker
          key={data.markers[i].id}
          marker={data.markers[i]}
          position={pos}
          onSelect={onSelectMarker}
          phase={index * 1.7 + i * 0.9}
          reducedMotion={reducedMotion}
        />
      ))}

      <Html position={[0, -0.25, 1.5]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div
          className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-center text-[12px] font-bold shadow-lg transition ${
            hovered ? "bg-primary text-white" : "bg-white/95 text-charcoal"
          }`}
        >
          {DEPARTMENT_LABELS[data.department]}
          <div className="text-[10px] font-medium opacity-75">
            {data.inQueue} in queue{data.overflowCount > 0 ? ` (+${data.overflowCount} more)` : ""}
          </div>
        </div>
      </Html>

      {hasQuery && (
        <Html position={[0, 1.8, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="animate-pulse rounded-full bg-[color:var(--color-danger)] px-2.5 py-1 text-[10px] font-bold text-white shadow">
            Query
          </div>
        </Html>
      )}
    </group>
  );
}

/** A glowing conduit between two stations, with a travelling light pulse. */
function FlowPath({
  from,
  to,
  reducedMotion,
}: {
  from: [number, number, number];
  to: [number, number, number];
  reducedMotion: boolean;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(from[0], from[1] + 0.42, from[2]);
    const end = new THREE.Vector3(to[0], to[1] + 0.42, to[2]);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.55, 0));
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [from, to]);

  const tubeGeometry = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.05, 12, false), [curve]);
  const haloGeometry = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.11, 12, false), [curve]);
  const points = useMemo(() => curve.getPoints(30), [curve]);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 2.2 - from[0]) * 0.6;
    }
    if (pulseRef.current && !reducedMotion) {
      const t = (clock.elapsedTime * 0.35 + from[0] * 0.13) % 1;
      const p = curve.getPoint(t);
      pulseRef.current.position.copy(p);
    }
  });

  return (
    <group>
      {/* Soft outer halo */}
      <mesh geometry={haloGeometry}>
        <meshBasicMaterial color="#51c1ad" transparent opacity={0.16} toneMapped={false} />
      </mesh>
      {/* Bright core tube */}
      <mesh ref={glowRef} geometry={tubeGeometry}>
        <meshStandardMaterial color="#7fe6d6" emissive="#51c1ad" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* Directional dash overlay */}
      <Line points={points} color="#ffffff" lineWidth={1.2} transparent opacity={0.9} dashed dashSize={0.12} gapSize={0.18} />
      {/* Travelling light pulse */}
      {!reducedMotion && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function ReflectiveFloor({ tone }: { tone: "dusk" | "dark" }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
      <planeGeometry args={[30, 20]} />
      <MeshReflectorMaterial
        blur={[400, 120]}
        resolution={512}
        mixBlur={1}
        mixStrength={35}
        roughness={0.55}
        depthScale={1}
        minDepthThreshold={0.85}
        maxDepthThreshold={1.3}
        color={tone === "dusk" ? "#6c56a3" : "#241a3d"}
        metalness={0.65}
        mirror={0.35}
      />
    </mesh>
  );
}

export function CreditJourneyScene({
  stations,
  onSelectStation,
  onSelectMarker,
  resetSignal,
  tone = "dusk",
  photoBackdrop = false,
}: {
  stations: StationData[];
  onSelectStation: (d: Department) => void;
  onSelectMarker: (id: string) => void;
  resetSignal: number;
  tone?: "dusk" | "dark";
  /**
   * When true, the scene renders on a transparent canvas over a photographic
   * backdrop supplied by the parent (the marble hall + skyline reference
   * image), so no procedural skyline/floor is drawn — only contact shadows
   * for grounding.
   */
  photoBackdrop?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetSignal]);

  return (
    <>
      <hemisphereLight args={[tone === "dusk" ? "#f5d9b8" : "#7fe0d4", tone === "dusk" ? "#3a2456" : "#180f2e", 1.1]} />
      {/* Procedural, fully local environment (no remote HDRI) so chrome and
          clearcoat surfaces have something to reflect. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff1dc" position={[0, 6, -6]} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#d9c7f4" position={[-8, 3, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#bfeee6" position={[8, 3, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#ffffff" position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={4} />
      </Environment>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 5]} intensity={1.4} />
      <pointLight position={[0, 3, -2]} intensity={0.6} color="#51c1ad" />
      <pointLight position={[0, 2.5, 5]} intensity={0.45} color="#f0a53c" />

      {!photoBackdrop && <Skyline tone={tone} />}
      {!photoBackdrop && <ReflectiveFloor tone={tone} />}
      {photoBackdrop && (
        <ContactShadows position={[0, -0.11, 0]} opacity={0.5} scale={22} blur={2.4} far={3} color="#2a1a40" />
      )}

      {DEPARTMENTS.map((_, i) =>
        i < DEPARTMENTS.length - 1 ? (
          <FlowPath key={i} from={stationPosition(i)} to={stationPosition(i + 1)} reducedMotion={reducedMotion} />
        ) : null
      )}
      {stations.map((s, i) => (
        <Station
          key={s.department}
          data={s}
          index={i}
          onSelectStation={onSelectStation}
          onSelectMarker={onSelectMarker}
          reducedMotion={reducedMotion}
        />
      ))}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={5}
        maxDistance={18}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.4, 0]}
        autoRotate={!reducedMotion && !photoBackdrop}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
