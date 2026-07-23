// ETF / Mutual Fund / Bond / Gold / Silver pages.
import { api } from "../api/client.js";
import { useApi, inr } from "../lib/useApi.js";
import { Card, Loading, ErrorBox } from "../components/ui.jsx";

function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-400">
          <tr>{columns.map((c) => <th key={c.key} className="py-2">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              {columns.map((c) => <td key={c.key} className="py-2">{c.render ? c.render(r) : r[c.key] ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InstrumentPage({ title, fetcher, columns, deps = [] }) {
  const { data, error, loading } = useApi(fetcher, deps);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <Card><Table columns={columns} rows={data || []} /></Card>
      )}
    </div>
  );
}

const etfCols = [
  { key: "symbol", label: "Symbol" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "nav", label: "NAV", render: (r) => inr(r.nav) },
  { key: "expenseRatio", label: "Expense %", render: (r) => `${r.expenseRatio}%` },
];

export const ETFs = () => <InstrumentPage title="ETFs" fetcher={() => api.etfs()} columns={etfCols} />;
export const Gold = () => <InstrumentPage title="Gold ETFs" fetcher={() => api.etfs("Gold ETF")} columns={etfCols} deps={["gold"]} />;
export const Silver = () => <InstrumentPage title="Silver ETFs" fetcher={() => api.etfs("Silver ETF")} columns={etfCols} deps={["silver"]} />;

export const MutualFunds = () => (
  <InstrumentPage
    title="Mutual Funds"
    fetcher={() => api.mutualFunds()}
    columns={[
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      { key: "nav", label: "NAV", render: (r) => inr(r.nav) },
      { key: "returns1Y", label: "1Y", render: (r) => `${r.returns1Y}%` },
      { key: "returns3Y", label: "3Y", render: (r) => `${r.returns3Y}%` },
      { key: "returns5Y", label: "5Y", render: (r) => `${r.returns5Y}%` },
    ]}
  />
);

export const Bonds = () => (
  <InstrumentPage
    title="Bonds"
    fetcher={() => api.bonds()}
    columns={[
      { key: "name", label: "Name" },
      { key: "issuer", label: "Issuer" },
      { key: "couponRate", label: "Coupon", render: (r) => `${r.couponRate}%` },
      { key: "yieldToMaturity", label: "YTM", render: (r) => `${r.yieldToMaturity}%` },
      { key: "rating", label: "Rating" },
      { key: "maturity", label: "Maturity", render: (r) => r.maturity ? new Date(r.maturity).toLocaleDateString() : "—" },
    ]}
  />
);
