// Company page (Phase 5): price, chart, returns, quarter results, financials,
// news, shareholding, dividend, PE/PB/ROE/ROCE, knowledge & AI score.
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, StatTile, Change, Loading, ErrorBox, Sparkline } from "../components/ui.jsx";

export default function Company() {
  const { symbol } = useParams();
  const { data: c, error, loading, reload } = useApi(() => api.company(symbol), [symbol]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const s = c.stock || {};
  const history = s.priceHistory || [];
  const first = history[0]?.close, last = s.price;
  const totalReturn = first ? ((last - first) / first) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <div className="text-sm text-slate-400">{c.symbol} · {c.sector?.name} · {c.exchange}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{inr(s.price)}</div>
          <div><Change value={s.change} pct={s.changePct} /></div>
        </div>
      </div>

      {/* Ratios */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="PE" value={s.pe ?? "—"} />
        <StatTile label="PB" value={s.pb ?? "—"} />
        <StatTile label="ROE" value={s.roe != null ? `${s.roe}%` : "—"} />
        <StatTile label="ROCE" value={s.roce != null ? `${s.roce}%` : "—"} />
        <StatTile label="Div Yield" value={s.dividendYield != null ? `${s.dividendYield}%` : "—"} />
      </div>

      {/* Chart + returns */}
      <Card title={`Price (last ${history.length} sessions)`}
        action={totalReturn != null && <span className={totalReturn >= 0 ? "pos" : "neg"}>{totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%</span>}>
        <Sparkline data={history} />
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>52W Low {inr(s.yearLow)}</span>
          <span>52W High {inr(s.yearHigh)}</span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* AI score + knowledge (Phase 7/8) */}
        <Card title="AI Assessment" action={<button onClick={() => api.score(symbol).then(reload)} className="text-xs text-brand hover:underline">Recompute</button>}>
          {c.aiScore ? (
            <>
              <div className="flex gap-6">
                <div><div className="text-xs text-slate-400">Growth</div><div className="text-2xl font-bold text-up">{c.aiScore.growthScore}</div></div>
                <div><div className="text-xs text-slate-400">Risk</div><div className="text-2xl font-bold text-down">{c.aiScore.riskScore}</div></div>
                <div><div className="text-xs text-slate-400">Confidence</div><div className="text-2xl font-bold">{Math.round((c.aiScore.confidence || 0) * 100)}%</div></div>
              </div>
              <p className="mt-3 text-sm text-slate-300">{c.aiScore.summary}</p>
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
                {(c.aiScore.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          ) : <p className="text-sm text-slate-400">No score yet. Click Recompute.</p>}
        </Card>

        <Card title="Knowledge (growth & risk drivers)">
          {c.knowledge ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="mb-1 text-xs font-semibold text-up">Growth factors</div>
                <ul className="space-y-1 text-slate-300">
                  {(c.knowledge.growthFactors || []).map((f, i) => <li key={i}>• {f.factor || f}</li>)}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-down">Negative factors</div>
                <ul className="space-y-1 text-slate-300">
                  {(c.knowledge.negativeFactors || []).map((f, i) => <li key={i}>• {f.factor || f}</li>)}
                </ul>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">No knowledge document.</p>}
        </Card>
      </div>

      {/* Quarter results */}
      <Card title="Quarter Results">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr><th className="py-1">Period</th><th>Revenue</th><th>Net Profit</th><th>EBITDA</th><th>EPS</th></tr>
            </thead>
            <tbody>
              {(c.quarterResults || []).map((q) => (
                <tr key={q.id} className="border-t border-slate-800">
                  <td className="py-1">Q{q.quarter} FY{q.fiscalYear}</td>
                  <td>{inr(q.revenue)}</td>
                  <td>{inr(q.netProfit)}</td>
                  <td>{inr(q.ebitda)}</td>
                  <td>{q.eps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Shareholding */}
        <Card title="Shareholding">
          {(c.shareholdings || []).slice(0, 1).map((sh) => (
            <div key={sh.id} className="grid grid-cols-2 gap-2 text-sm">
              <Row label="Promoter" value={`${sh.promoter}%`} />
              <Row label="FII" value={`${sh.fii}%`} />
              <Row label="DII" value={`${sh.dii}%`} />
              <Row label="Public" value={`${sh.public}%`} />
            </div>
          ))}
        </Card>

        {/* Dividends + news */}
        <Card title="Dividends">
          <ul className="space-y-1 text-sm">
            {(c.dividends || []).map((d) => (
              <li key={d.id} className="flex justify-between">
                <span className="text-slate-400">{new Date(d.exDate).toLocaleDateString()}</span>
                <span>{inr(d.amount)} <span className="text-xs text-slate-500">({d.type})</span></span>
              </li>
            ))}
            {(c.dividends || []).length === 0 && <li className="text-slate-500">No recent dividends.</li>}
          </ul>
        </Card>
      </div>

      <Card title="Company News">
        <ul className="space-y-2 text-sm">
          {(c.news || []).map((n) => (
            <li key={n.id}>
              <span className="text-slate-200">{n.title}</span>
              <span className="ml-2 text-xs text-slate-500">{n.source}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
