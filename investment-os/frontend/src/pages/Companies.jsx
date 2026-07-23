// Companies list + search (Phase 5 / 10).
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, Loading, ErrorBox } from "../components/ui.jsx";

export default function Companies() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useApi(() => api.companies(q), [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Companies</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Reliance, TCS, Infosys…"
        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="py-2">Symbol</th><th>Name</th><th>Sector</th><th>Price</th><th>Change</th><th>Growth</th><th>Risk</th></tr>
              </thead>
              <tbody>
                {(data || []).map((c) => (
                  <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="py-2"><Link className="text-brand" to={`/company/${c.symbol}`}>{c.symbol}</Link></td>
                    <td className="text-slate-300">{c.name}</td>
                    <td className="text-slate-400">{c.sector?.name || "—"}</td>
                    <td>{inr(c.stock?.price)}</td>
                    <td className={c.stock?.changePct >= 0 ? "pos" : "neg"}>
                      {c.stock ? `${c.stock.changePct >= 0 ? "+" : ""}${c.stock.changePct}%` : "—"}
                    </td>
                    <td className="text-up">{c.aiScore?.growthScore ?? "—"}</td>
                    <td className="text-down">{c.aiScore?.riskScore ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
