// Portfolio page (Phase 6): profit/loss, allocation, returns, CAGR, risk.
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, StatTile, Loading, ErrorBox } from "../components/ui.jsx";

export default function Portfolio() {
  const { data, error, loading } = useApi(() => api.portfolio(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const sum = data.summary || {};
  const rows = data.holdingsDetail || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Portfolio</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Invested" value={inr(sum.invested)} />
        <StatTile label="Current" value={inr(sum.current)} />
        <StatTile label="P / L" value={inr(sum.pnl)} sub={`${sum.pnlPct >= 0 ? "+" : ""}${sum.pnlPct}%`} tone={sum.pnl >= 0 ? "up" : "down"} />
        <StatTile label="Portfolio Risk" value={sum.portfolioRisk ?? "—"} sub="0-100 (lower better)" />
      </div>

      <Card title="Holdings">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr><th className="py-2">Symbol</th><th>Qty</th><th>Avg Cost</th><th>LTP</th><th>Invested</th><th>Current</th><th>P/L</th><th>CAGR</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="py-2 font-medium">{r.symbol}</td>
                  <td>{r.quantity}</td>
                  <td>{inr(r.avgCost)}</td>
                  <td>{inr(r.ltp)}</td>
                  <td>{inr(r.invested)}</td>
                  <td>{inr(r.current)}</td>
                  <td className={r.pnl >= 0 ? "pos" : "neg"}>{inr(r.pnl)} ({r.pnlPct >= 0 ? "+" : ""}{r.pnlPct}%)</td>
                  <td className={r.cagr >= 0 ? "pos" : "neg"}>{r.cagr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Allocation">
        <div className="space-y-2">
          {(data.allocation || []).map((a) => (
            <div key={a.symbol}>
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{a.symbol}</span><span>{a.weight}%</span></div>
              <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-brand" style={{ width: `${a.weight}%` }} /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
