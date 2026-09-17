"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A stylized glass skyline standing in for Manama's waterfront — purely
 * decorative background geometry (per the 3D behaviour requirements,
 * background scenery may be static while stations/markers stay
 * interactive). Building heights and positions are a fixed, deterministic
 * layout, not randomized per render, so the scene doesn't visually shift on
 * every reload.
 */

type BuildingSpec = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  glass?: boolean;
};

const SKYLINE_LAYOUT: BuildingSpec[] = [
  { x: -15, z: -15, width: 1.4, depth: 1.4, height: 4.5 },
  { x: -12.5, z: -17, width: 1.1, depth: 1.1, height: 3.2 },
  { x: -10, z: -16, width: 1.7, depth: 1.7, height: 6.2, glass: true },
  { x: -7.2, z: -18, width: 0.9, depth: 0.9, height: 3.8 },
  { x: -4.6, z: -17, width: 1.3, depth: 1.3, height: 5.2, glass: true },
  { x: 4.6, z: -17, width: 1.3, depth: 1.3, height: 5.2, glass: true },
  { x: 7.2, z: -18, width: 0.9, depth: 0.9, height: 3.8 },
  { x: 10, z: -16, width: 1.7, depth: 1.7, height: 6.2, glass: true },
  { x: 12.5, z: -17, width: 1.1, depth: 1.1, height: 3.2 },
  { x: 15, z: -15, width: 1.4, depth: 1.4, height: 4.5 },
];

function GlassBuilding({ spec, tone }: { spec: BuildingSpec; tone: "dusk" | "dark" }) {
  const windowRef = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => spec.x * 13.37 + spec.z, [spec]);

  useFrame(({ clock }) => {
    if (windowRef.current) {
      const material = windowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 0.6 + seed) * 0.25;
    }
  });

  const bodyColor = tone === "dusk" ? (spec.glass ? "#cdd6e8" : "#a89bc4") : spec.glass ? "#3a3f6b" : "#241a3d";
  const windowColor = tone === "dusk" ? "#ffd9a0" : "#7fe0d4";

  return (
    <group position={[spec.x, spec.height / 2 - 0.12, spec.z]}>
      <mesh>
        <boxGeometry args={[spec.width, spec.height, spec.depth]} />
        <meshPhysicalMaterial
          color={bodyColor}
          metalness={0.2}
          roughness={spec.glass ? 0.08 : 0.5}
          transmission={spec.glass ? 0.6 : 0}
          thickness={0.5}
          ior={1.4}
        />
      </mesh>
      <mesh ref={windowRef} position={[0, 0, spec.depth / 2 + 0.01]}>
        <planeGeometry args={[spec.width * 0.7, spec.height * 0.75]} />
        <meshStandardMaterial color={windowColor} emissive={windowColor} emissiveIntensity={0.6} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/** Twin tapered towers nodding to Manama's harbour skyline silhouette. */
function TwinTowers({ tone }: { tone: "dusk" | "dark" }) {
  const color = tone === "dusk" ? "#b7a6d6" : "#2e2350";
  return (
    <group position={[0, 0, -14.5]}>
      {[-0.85, 0.85].map((x, i) => (
        <mesh key={i} position={[x, 3.8, 0]}>
          <cylinderGeometry args={[0.2, 0.46, 7.6, 8]} />
          <meshPhysicalMaterial color={color} metalness={0.35} roughness={0.25} transmission={0.35} thickness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 5, 0]}>
        <torusGeometry args={[0.75, 0.045, 8, 24]} />
        <meshStandardMaterial color="#51c1ad" emissive="#51c1ad" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

export function Skyline({ tone = "dusk" }: { tone?: "dusk" | "dark" }) {
  return (
    <group>
      <TwinTowers tone={tone} />
      {SKYLINE_LAYOUT.map((spec, i) => (
        <GlassBuilding key={i} spec={spec} tone={tone} />
      ))}
    </group>
  );
}
