// Small shared UI primitives.
export function Card({ title, children, className = "", action }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-slate-300">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, tone }) {
  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-slate-100";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {sub != null && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Change({ value, pct }) {
  const up = (value ?? pct ?? 0) >= 0;
  return (
    <span className={up ? "pos" : "neg"}>
      {up ? "▲" : "▼"} {pct != null ? `${Math.abs(pct).toFixed(2)}%` : Math.abs(value).toFixed(2)}
    </span>
  );
}

export function Loading({ label = "Loading…" }) {
  return <div className="p-6 text-sm text-slate-400">{label}</div>;
}

export function ErrorBox({ error }) {
  return (
    <div className="card border-down/40 text-sm text-down">
      Couldn't load data: {String(error?.message || error)}
      <div className="mt-1 text-xs text-slate-400">Is the backend running on :4000? Try <code>npm run dev</code> in /backend.</div>
    </div>
  );
}

// Sparkline SVG from a series of numbers.
export function Sparkline({ data = [], width = 480, height = 120 }) {
  if (!data.length) return null;
  const xs = data.map((d) => (typeof d === "number" ? d : d.close));
  const min = Math.min(...xs), max = Math.max(...xs);
  const range = max - min || 1;
  const pts = xs
    .map((v, i) => `${(i / (xs.length - 1)) * width},${height - ((v - min) / range) * height}`)
    .join(" ");
  const up = xs[xs.length - 1] >= xs[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={up ? "#16a34a" : "#dc2626"} strokeWidth="2" />
    </svg>
  );
}
