// Tiny fetch wrapper around the backend API.
const BASE = "/api";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => req("/health"),
  marketOverview: () => req("/market/overview"),
  companies: (q = "") => req(`/companies${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  company: (symbol) => req(`/companies/${symbol}`),
  portfolio: () => req("/portfolio"),
  addHolding: (body) => req("/portfolio/holdings", { method: "POST", body: JSON.stringify(body) }),
  removeHolding: (id) => req(`/portfolio/holdings/${id}`, { method: "DELETE" }),
  watchlist: () => req("/watchlist"),
  addWatch: (symbol) => req("/watchlist", { method: "POST", body: JSON.stringify({ symbol }) }),
  news: (symbol) => req(`/news${symbol ? `?symbol=${symbol}` : ""}`),
  etfs: (category) => req(`/etfs${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  mutualFunds: () => req("/mutual-funds"),
  bonds: () => req("/bonds"),
  alerts: () => req("/alerts"),
  search: (q) => req(`/search?q=${encodeURIComponent(q)}`),
  chat: (message) => req("/ai/chat", { method: "POST", body: JSON.stringify({ message }) }),
  score: (symbol) => req(`/ai/score/${symbol}`, { method: "POST" }),
};

export default api;
