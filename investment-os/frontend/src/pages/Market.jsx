// Market page (Phase 4 detail): indices, macro, commodities, sectors.
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, Change, Loading, ErrorBox } from "../components/ui.jsx";

export default function Market() {
  const { data, error, loading } = useApi(() => api.marketOverview(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const groups = {
    Indices: ["NIFTY", "SENSEX", "BANKNIFTY", "VIX"],
    Macro: ["GDP", "INFLATION", "RBI_RATE", "USDINR", "FII_DII"],
    Commodities: ["GOLD", "SILVER", "OIL"],
  };
  const byKey = Object.fromEntries((data.market || []).map((m) => [m.key, m]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Market</h1>
      {Object.entries(groups).map(([title, keys]) => (
        <Card key={title} title={title}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {keys.map((k) => byKey[k]).filter(Boolean).map((m) => (
              <div key={m.key}>
                <div className="text-xs text-slate-400">{m.label}</div>
                <div className="text-lg font-semibold">{m.unit === "INR" ? inr(m.value) : m.value}{m.unit === "%" ? "%" : ""}</div>
                {m.changePct != null && <div className="text-xs"><Change value={m.change} pct={m.changePct} /></div>}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card title="Sector Performance">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(data.sectors || []).map((s) => (
            <div key={s.sector} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-sm">
              <span>{s.sector}</span>
              <span className={s.changePct >= 0 ? "pos" : "neg"}>{s.changePct >= 0 ? "+" : ""}{s.changePct}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
