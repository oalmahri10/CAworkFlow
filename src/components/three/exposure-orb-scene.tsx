"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, MeshReflectorMaterial, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "@/components/three/use-reduced-motion";

/**
 * The Exposure Orb. Rotation/float are purely a modest assembly animation to
 * show the two components (group vs related-party) making up the whole —
 * amounts themselves are rendered as stable, readable HTML text, never
 * encoded in segment proportions (which would misrepresent the real ratio if
 * the geometry were ever driven decoratively). The small orbiting motes are
 * likewise decorative texture, not a count of anything.
 */
export function ExposureOrbScene({ totalLabel, formattedTotal }: { totalLabel: string; formattedTotal: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const motesRef = useRef<THREE.Group>(null);
  const reducedMotion = useReducedMotion();

  const motePositions = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const radius = 1.55 + (i % 3) * 0.12;
        return { angle, radius, y: Math.sin(i * 1.3) * 0.35, isTeal: i % 2 === 0 };
      }),
    []
  );

  useFrame((state, delta) => {
    if (groupRef.current) {
      if (!reducedMotion) groupRef.current.rotation.y += delta * 0.18;
      groupRef.current.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    }
    if (motesRef.current && !reducedMotion) {
      motesRef.current.rotation.y -= delta * 0.12;
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />
      <pointLight position={[-2, 1, 2]} intensity={0.5} color="#51c1ad" />
      <pointLight position={[2, 1, -2]} intensity={0.5} color="#552988" />

      <group ref={groupRef}>
        <mesh rotation={[0, 0, 0]}>
          <sphereGeometry args={[1.15, 64, 64, 0, Math.PI]} />
          <meshPhysicalMaterial
            color="#51c1ad"
            transparent
            opacity={0.78}
            roughness={0.08}
            metalness={0.05}
            transmission={0.4}
            thickness={0.6}
            ior={1.3}
            clearcoat={0.6}
            emissive="#51c1ad"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh rotation={[0, Math.PI, 0]}>
          <sphereGeometry args={[1.15, 64, 64, 0, Math.PI]} />
          <meshPhysicalMaterial
            color="#552988"
            transparent
            opacity={0.78}
            roughness={0.08}
            metalness={0.05}
            transmission={0.4}
            thickness={0.6}
            ior={1.3}
            clearcoat={0.6}
            emissive="#552988"
            emissiveIntensity={0.15}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.16, 0.02, 8, 64]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
        </mesh>
      </group>

      <group ref={motesRef}>
        {motePositions.map((m, i) => (
          <mesh key={i} position={[Math.cos(m.angle) * m.radius, m.y, Math.sin(m.angle) * m.radius]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial
              color={m.isTeal ? "#51c1ad" : "#552988"}
              emissive={m.isTeal ? "#51c1ad" : "#552988"}
              emissiveIntensity={0.9}
            />
          </mesh>
        ))}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <circleGeometry args={[1.9, 64]} />
        <MeshReflectorMaterial
          blur={[200, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={25}
          roughness={0.5}
          depthScale={0.6}
          minDepthThreshold={0.8}
          color="#e9def6"
          metalness={0.5}
          mirror={0.3}
        />
      </mesh>
      <mesh position={[0, -1.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.025, 8, 48]} />
        <meshStandardMaterial color="#51c1ad" emissive="#51c1ad" emissiveIntensity={0.7} />
      </mesh>

      <Html center distanceFactor={5} style={{ pointerEvents: "none" }}>
        <div className="w-40 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">{totalLabel}</div>
          <div className="text-lg font-extrabold text-primary drop-shadow-sm">{formattedTotal}</div>
        </div>
      </Html>

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.5}
        maxDistance={6}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.7}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}
