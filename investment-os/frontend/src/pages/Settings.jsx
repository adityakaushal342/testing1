// Settings page (placeholder) + backend health check.
import { api } from "../api/client.js";
import { useApi } from "../lib/useApi.js";
import { Card } from "../components/ui.jsx";

export default function Settings() {
  const { data, error } = useApi(() => api.health(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card title="Backend status">
        {error ? (
          <p className="text-sm text-down">Backend unreachable: {error.message}</p>
        ) : data ? (
          <p className="text-sm text-up">Connected · {data.service} · {new Date(data.time).toLocaleString()}</p>
        ) : (
          <p className="text-sm text-slate-400">Checking…</p>
        )}
      </Card>
      <Card title="About">
        <p className="text-sm text-slate-300">
          Investment OS — research dashboard for Indian markets. AI scores and summaries are
          model-generated opinions, not investment advice.
        </p>
      </Card>
    </div>
  );
}
