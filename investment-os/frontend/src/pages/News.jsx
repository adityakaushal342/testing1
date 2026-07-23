// News page (Phase 4 / 9).
import { api } from "../api/client.js";
import { useApi } from "../lib/useApi.js";
import { Card, Loading, ErrorBox } from "../components/ui.jsx";

export default function News() {
  const { data, error, loading } = useApi(() => api.news(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">News</h1>
      <Card>
        <ul className="divide-y divide-slate-800">
          {(data || []).map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-200">{n.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {n.source} · {new Date(n.publishedAt).toLocaleString()}
                    {n.company && <span className="ml-2 text-brand">{n.company.symbol}</span>}
                  </div>
                </div>
                {n.sentiment != null && (
                  <span className={`text-xs ${n.sentiment >= 0 ? "pos" : "neg"}`}>
                    {n.sentiment >= 0 ? "▲" : "▼"} {Math.abs(n.sentiment).toFixed(2)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
