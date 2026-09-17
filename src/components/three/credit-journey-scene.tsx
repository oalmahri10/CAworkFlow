"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
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

function stationPosition(index: number): [number, number, number] {
  const x = (index - (DEPARTMENTS.length - 1) / 2) * 2.15;
  const z = -Math.pow(index - (DEPARTMENTS.length - 1) / 2, 2) * 0.18;
  return [x, 0, z];
}

/** Recognizable, glass/metal-accented geometry standing in for each department. */
function StationIcon({ department }: { department: Department }) {
  switch (department) {
    case "CORPORATE_FINANCE":
      return (
        <group position={[0, 0.55, 0]}>
          <mesh position={[-0.22, 0, 0]}>
            <boxGeometry args={[0.22, 0.55, 0.22]} />
            <meshPhysicalMaterial color="#cfc3ea" metalness={0.1} roughness={0.15} transmission={0.55} thickness={0.3} />
          </mesh>
          <mesh position={[0.05, 0.15, 0]}>
            <boxGeometry args={[0.22, 0.85, 0.22]} />
            <meshPhysicalMaterial color="#b39ee0" metalness={0.15} roughness={0.1} transmission={0.6} thickness={0.3} />
          </mesh>
          <mesh position={[0.32, -0.05, 0]}>
            <boxGeometry args={[0.2, 0.45, 0.2]} />
            <meshPhysicalMaterial color="#cfc3ea" metalness={0.1} roughness={0.15} transmission={0.55} thickness={0.3} />
          </mesh>
        </group>
      );
    case "CREDIT_REVIEW":
      return (
        <group position={[0, 0.5, 0]} rotation={[0, 0.3, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.62, 0.06]} />
            <meshPhysicalMaterial color="#f4effa" roughness={0.2} clearcoat={0.6} />
          </mesh>
          <mesh position={[0.28, -0.28, 0.08]} rotation={[0, 0, 0.7]}>
            <torusGeometry args={[0.16, 0.035, 12, 24]} />
            <meshStandardMaterial color="#7c4fc4" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0.44, -0.44, 0.08]} rotation={[0, 0, 0.7]}>
            <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
            <meshStandardMaterial color="#7c4fc4" metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      );
    case "APPROVAL_AUTHORITY":
      return (
        <group position={[0, 0.45, 0]}>
          {[-0.22, 0, 0.22].map((x, i) => (
            <group key={i} position={[x, i === 1 ? 0.08 : 0, 0]}>
              <mesh position={[0, 0.22, 0]}>
                <sphereGeometry args={[0.11, 16, 16]} />
                <meshPhysicalMaterial color="#f4effa" roughness={0.25} clearcoat={0.5} />
              </mesh>
              <mesh position={[0, -0.05, 0]}>
                <capsuleGeometry args={[0.12, 0.28, 4, 8]} />
                <meshPhysicalMaterial color="#9d7cc9" metalness={0.2} roughness={0.3} clearcoat={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "CAD":
      return (
        <group position={[0, 0.4, 0]}>
          {[0, 0.22, 0.44].map((y, i) => (
            <mesh key={i} position={[0, y, 0]}>
              <cylinderGeometry args={[0.28 - i * 0.02, 0.28 - i * 0.02, 0.16, 24]} />
              <meshPhysicalMaterial
                color={i === 1 ? "#f4effa" : "#a48bd0"}
                metalness={0.5}
                roughness={0.2}
                clearcoat={0.6}
              />
            </mesh>
          ))}
        </group>
      );
    case "OPERATIONS":
      return (
        <group position={[0, 0.55, 0]}>
          <mesh>
            <torusGeometry args={[0.26, 0.09, 12, 8]} />
            <meshStandardMaterial color="#a48bd0" metalness={0.7} roughness={0.15} />
          </mesh>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(angle) * 0.35, Math.sin(angle) * 0.35, 0]}
                rotation={[0, 0, angle]}
              >
                <boxGeometry args={[0.09, 0.09, 0.09]} />
                <meshStandardMaterial color="#7c4fc4" metalness={0.6} roughness={0.25} />
              </mesh>
            );
          })}
        </group>
      );
  }
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
    const bob = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.4 + phase) * 0.045;
    groupRef.current.position.y = position[1] + bob + (hovered ? 0.12 : 0);
    groupRef.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.6 + phase;
    const targetScale = hovered ? 1.5 : 1;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, targetScale, 8, delta);
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
        {isCA ? <boxGeometry args={[0.16, 0.16, 0.16]} /> : <coneGeometry args={[0.11, 0.2, 4]} />}
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.7 : 0.3}
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
      material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 1.5 + index) * 0.2;
    }
    if (groupRef.current) {
      liftRef.current = THREE.MathUtils.damp(liftRef.current, hovered ? 0.06 : 0, 8, delta);
      groupRef.current.position.y = position[1] + liftRef.current;
    }
  });

  const markerPositions = useMemo(() => {
    const count = data.markers.length;
    return data.markers.map((_, i) => {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      const radius = 0.85;
      return [Math.cos(angle) * radius, 0.35 + (i % 3) * 0.18, Math.sin(angle) * radius * 0.6] as [
        number,
        number,
        number,
      ];
    });
  }, [data.markers]);

  const hasQuery = data.markers.some((m) => m.hasOpenQuery);

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <mesh
        position={[0, 0.02, 0]}
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
        <cylinderGeometry args={[1.05, 1.1, 0.22, 48]} />
        <meshPhysicalMaterial
          color="#e9def6"
          metalness={0.6}
          roughness={0.18}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
          transmission={0.08}
        />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.03, 12, 48]} />
        <meshStandardMaterial color="#51c1ad" emissive="#51c1ad" emissiveIntensity={0.5} />
      </mesh>

      <StationIcon department={data.department} />

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

      <Html position={[0, -0.35, 1.15]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-[11px] font-semibold shadow-md transition ${
            hovered ? "bg-primary text-white" : "bg-white/95 text-charcoal"
          }`}
        >
          {DEPARTMENT_LABELS[data.department]}
          <div className="text-[10px] font-normal opacity-80">
            {data.inQueue} in queue{data.overflowCount > 0 ? ` (+${data.overflowCount} more)` : ""}
          </div>
        </div>
      </Html>

      {hasQuery && (
        <Html position={[0, 1.35, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
          <div className="animate-pulse rounded-full bg-[color:var(--color-danger)] px-2.5 py-1 text-[10px] font-bold text-white shadow">
            Query
          </div>
        </Html>
      )}
    </group>
  );
}

function FlowPath({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.5, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(24);
  }, [from, to]);

  return <Line points={points} color="#51c1ad" lineWidth={1.5} transparent opacity={0.55} dashed dashSize={0.12} gapSize={0.08} />;
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
}: {
  stations: StationData[];
  onSelectStation: (d: Department) => void;
  onSelectMarker: (id: string) => void;
  resetSignal: number;
  tone?: "dusk" | "dark";
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    controlsRef.current?.reset();
  }, [resetSignal]);

  return (
    <>
      <hemisphereLight args={[tone === "dusk" ? "#f5d9b8" : "#7fe0d4", tone === "dusk" ? "#3a2456" : "#180f2e", 1.1]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />
      <pointLight position={[0, 3, -2]} intensity={0.5} color="#51c1ad" />
      <pointLight position={[0, 2, 4]} intensity={0.35} color="#f0a53c" />
      <Skyline tone={tone} />
      <ReflectiveFloor tone={tone} />
      {DEPARTMENTS.map((_, i) =>
        i < DEPARTMENTS.length - 1 ? (
          <FlowPath key={i} from={stationPosition(i)} to={stationPosition(i + 1)} />
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
        minDistance={3}
        maxDistance={17}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.3, 0]}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
