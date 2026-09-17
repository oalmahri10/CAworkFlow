"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Boxes, Grid3x3 } from "lucide-react";
import { WebglErrorBoundary } from "@/components/three/webgl-error-boundary";

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Shared wrapper for every interactive 3D scene in the app (Credit Journey,
 * Exposure Orb, Query Pattern Map, Application Flow, Process Replay). It:
 *   - always offers a manual "2D view" toggle so the 2D/table alternative is
 *     reachable on demand, not only after a failure;
 *   - auto-falls-back to 2D if WebGL is unavailable or the context is lost;
 *   - pauses the render loop when the tab is hidden;
 *   - caps devicePixelRatio for predictable performance on office hardware.
 * Both the 3D and 2D presentations receive the same `children`/`fallback`
 * data — see each scene's usage for how the data is shared.
 */
export function SceneFrame({
  height = 420,
  children,
  fallback,
  label,
  cameraPosition = [0, 4.8, 9.5],
  fov = 42,
  interactionHint,
  dark = false,
}: {
  height?: number;
  children: React.ReactNode;
  fallback: React.ReactNode;
  label: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  /** Short interaction hint shown as a plain HTML overlay (not 3D-space text, which sizes unreliably). */
  interactionHint?: string;
  dark?: boolean;
}) {
  const [supported, setSupported] = useState(true);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setSupported(detectWebgl());
  }, []);

  useEffect(() => {
    function onVisibility() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const dpr = useMemo<[number, number]>(
    () => [1, typeof window === "undefined" ? 1.5 : Math.min(2, window.devicePixelRatio || 1)],
    []
  );

  const show3d = supported && view === "3d";

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setView("3d")}
          disabled={!supported}
          className={`focus-ring flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            show3d ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/60"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          aria-pressed={show3d}
        >
          <Boxes className="h-3 w-3" /> 3D
        </button>
        <button
          type="button"
          onClick={() => setView("2d")}
          className={`focus-ring flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            !show3d ? "bg-primary text-white" : "bg-[color:var(--color-light-grey)] text-charcoal/60"
          }`}
          aria-pressed={!show3d}
        >
          <Grid3x3 className="h-3 w-3" /> Table
        </button>
      </div>

      {!supported && (
        <p className="mb-2 text-xs text-charcoal/50">
          3D acceleration is unavailable in this browser — showing the equivalent table view for {label}.
        </p>
      )}

      <div style={{ height }} className="relative overflow-hidden rounded-xl">
        {show3d ? (
          <WebglErrorBoundary fallback={fallback}>
            <Canvas
              dpr={dpr}
              frameloop={visible ? "always" : "never"}
              gl={{ powerPreference: "low-power", antialias: true }}
              camera={{ position: cameraPosition, fov }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener("webglcontextlost", (e) => {
                  e.preventDefault();
                  setSupported(false);
                });
              }}
            >
              {children}
            </Canvas>
          </WebglErrorBoundary>
        ) : (
          fallback
        )}

        {show3d && interactionHint && (
          <div
            className={`pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-medium ${
              dark ? "bg-white/10 text-white/70" : "bg-white/80 text-charcoal/60"
            }`}
          >
            {interactionHint}
          </div>
        )}
      </div>
    </div>
  );
}
