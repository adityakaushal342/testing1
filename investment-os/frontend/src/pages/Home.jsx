// Home dashboard (Phase 4): market overview, movers, health, sectors, news.
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, StatTile, Change, Loading, ErrorBox } from "../components/ui.jsx";

const INDEX_KEYS = ["NIFTY", "SENSEX", "BANKNIFTY", "VIX"];

export default function Home() {
  const { data, error, loading } = useApi(() => api.marketOverview(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const byKey = Object.fromEntries((data.market || []).map((m) => [m.key, m]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market Overview</h1>

      {/* Indices */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {INDEX_KEYS.map((k) => {
          const m = byKey[k];
          if (!m) return null;
          return (
            <StatTile
              key={k}
              label={m.label}
              value={m.value.toLocaleString("en-IN")}
              sub={<Change value={m.change} pct={m.changePct} />}
              tone={m.changePct >= 0 ? "up" : "down"}
            />
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MarketHealth health={data.health} />
        <Movers title="Top Gainers" rows={data.topGainers} />
        <Movers title="Top Losers" rows={data.topLosers} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sector Performance">
          <ul className="space-y-2">
            {(data.sectors || []).map((s) => (
              <li key={s.sector} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{s.sector}</span>
                <span className={s.changePct >= 0 ? "pos" : "neg"}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct}%
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Today's News">
          <ul className="space-y-3">
            {(data.news || []).slice(0, 6).map((n) => (
              <li key={n.id} className="text-sm">
                <div className="text-slate-200">{n.title}</div>
                <div className="text-xs text-slate-500">{n.source}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Macro strip */}
      <Card title="Macro & Commodities">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {["USDINR", "GOLD", "SILVER", "OIL", "GDP", "INFLATION", "RBI_RATE", "FII_DII"]
            .map((k) => byKey[k])
            .filter(Boolean)
            .map((m) => (
              <div key={m.key} className="text-sm">
                <div className="text-xs text-slate-400">{m.label}</div>
                <div className="font-semibold">{m.unit === "INR" ? inr(m.value) : m.value}{m.unit === "%" ? "%" : ""}</div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function MarketHealth({ health }) {
  if (!health) return null;
  const tone = health.score >= 70 ? "text-up" : health.score >= 45 ? "text-yellow-400" : "text-down";
  return (
    <Card title="Market Health">
      <div className={`text-4xl font-bold ${tone}`}>{health.score}</div>
      <div className="mt-1 text-sm text-slate-300">{health.label}</div>
      <div className="mt-3 text-xs text-slate-400">
        Advances {health.advances} · Declines {health.declines} · VIX {health.vix}
      </div>
    </Card>
  );
}

function Movers({ title, rows = [] }) {
  return (
    <Card title={title}>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.symbol} className="flex items-center justify-between text-sm">
            <Link to={`/company/${r.symbol}`} className="text-slate-200 hover:text-brand">{r.symbol}</Link>
            <span className="flex items-center gap-2">
              <span className="text-slate-400">{inr(r.price)}</span>
              <span className={r.changePct >= 0 ? "pos" : "neg"}>{r.changePct >= 0 ? "+" : ""}{r.changePct?.toFixed(2)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
