// Watchlist page (⭐ tab).
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, Loading, ErrorBox } from "../components/ui.jsx";

export default function Watchlist() {
  const { data, error, loading } = useApi(() => api.watchlist(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const items = data.items || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing on your watchlist yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr><th className="py-2">Symbol</th><th>Name</th><th>Price</th><th>Change</th><th>Growth</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-800">
                  <td className="py-2"><Link className="text-brand" to={`/company/${it.company.symbol}`}>{it.company.symbol}</Link></td>
                  <td className="text-slate-300">{it.company.name}</td>
                  <td>{inr(it.company.stock?.price)}</td>
                  <td className={it.company.stock?.changePct >= 0 ? "pos" : "neg"}>
                    {it.company.stock ? `${it.company.stock.changePct}%` : "—"}
                  </td>
                  <td className="text-up">{it.company.aiScore?.growthScore ?? "—"}</td>
                  <td className="text-down">{it.company.aiScore?.riskScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
