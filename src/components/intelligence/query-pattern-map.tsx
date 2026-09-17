"use client";

/**
 * A deterministic radial layout of applications with repeated query
 * activity (not a physics-simulated force graph, and not a 3D scene — an
 * intentional 2D scope reduction for this secondary widget; see the
 * README). Node size and color reflect actual query counts on real
 * records; selecting one opens its Credit Passport.
 */
export function QueryPatternMap({
  nodes,
  onSelect,
}: {
  nodes: { id: string; croReference: string; queries: number }[];
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return <p className="text-xs text-white/40">No repeat query activity to map.</p>;
  }

  const maxQueries = Math.max(1, ...nodes.map((n) => n.queries));
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 24;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block" width="100%" height={220}>
      <circle cx={center} cy={center} r={4} fill="#f0a53c" />
      {nodes.map((n, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const intensity = n.queries / maxQueries;
        const r = 5 + intensity * 9;
        const color = intensity > 0.66 ? "#f0a53c" : intensity > 0.33 ? "#8a6bb0" : "#51c1ad";
        return (
          <g key={n.id}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="#4a3568" strokeWidth={1} />
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={color}
              className="cursor-pointer"
              onClick={() => onSelect(n.id)}
            >
              <title>{n.croReference} — {n.queries} quer{n.queries === 1 ? "y" : "ies"}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
