// Stock / company fundamentals collector (Phase 3)
// Live source: Yahoo Finance chart API (free, no key) for price + history.
// Quarter results & shareholding have no reliable free keyless feed, so they
// stay mock. PE/PB/ROE (not in the chart endpoint) use the SEED fallback.
import { yahooChart, quoteFromMeta } from "../utils/http.js";

// Our symbol -> NSE/Yahoo ticker (most are identical; a few differ).
const YAHOO_MAP = { INFOSYS: "INFY" };
const nse = (symbol) => `${YAHOO_MAP[symbol] || symbol}.NS`;

// Ratio fallbacks + mock prices (used when Yahoo is unreachable).
const SEED = {
  RELIANCE: { price: 2945.6, change: 18.2, changePct: 0.62, pe: 24.5, pb: 2.1, roe: 9.2, roce: 10.1, dividendYield: 0.4 },
  TCS:      { price: 4120.0, change: -22.5, changePct: -0.54, pe: 29.8, pb: 13.5, roe: 46.0, roce: 58.0, dividendYield: 1.3 },
  INFOSYS:  { price: 1685.3, change: 9.8, changePct: 0.58, pe: 26.1, pb: 8.2, roe: 31.0, roce: 40.0, dividendYield: 2.1 },
  HDFCBANK: { price: 1642.0, change: 4.1, changePct: 0.25, pe: 18.9, pb: 2.7, roe: 16.5, roce: 7.8, dividendYield: 1.1 },
  ITC:      { price: 445.2, change: 1.3, changePct: 0.29, pe: 27.0, pb: 7.5, roe: 28.0, roce: 34.0, dividendYield: 2.8 },
};

export async function fetchQuote(symbol) {
  const ratios = SEED[symbol] || { pe: null, pb: null, roe: null, roce: null, dividendYield: null };
  try {
    const r = await yahooChart(nse(symbol), "5d", "1d");
    const q = quoteFromMeta(r.meta);
    return {
      symbol,
      price: Number(q.price),
      change: q.change,
      changePct: q.changePct,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      yearHigh: q.yearHigh,
      yearLow: q.yearLow,
      volume: q.volume ? Math.round(q.volume) : null,
      // Valuation ratios aren't in the chart feed → keep known/fallback values.
      pe: ratios.pe, pb: ratios.pb, roe: ratios.roe, roce: ratios.roce, dividendYield: ratios.dividendYield,
    };
  } catch {
    const base = SEED[symbol] || { price: 100, change: 0, changePct: 0, pe: 20, pb: 3, roe: 15, roce: 18, dividendYield: 1 };
    return {
      symbol, ...base,
      dayHigh: base.price * 1.01, dayLow: base.price * 0.99,
      yearHigh: base.price * 1.35, yearLow: base.price * 0.7, volume: 1_500_000,
    };
  }
}

export async function fetchPriceHistory(symbol, days = 60) {
  const range = days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y";
  try {
    const r = await yahooChart(nse(symbol), range, "1d");
    const ts = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    const out = [];
    for (let i = 0; i < ts.length; i++) {
      if (q.close?.[i] == null) continue;
      out.push({
        date: new Date(ts[i] * 1000),
        open: round(q.open?.[i] ?? q.close[i]),
        high: round(q.high?.[i] ?? q.close[i]),
        low: round(q.low?.[i] ?? q.close[i]),
        close: round(q.close[i]),
        volume: q.volume?.[i] ? Math.round(q.volume[i]) : null,
      });
    }
    if (out.length) return out.slice(-days);
    throw new Error("empty history");
  } catch {
    return syntheticHistory(symbol, days);
  }
}

const round = (n) => Number(Number(n).toFixed(2));

// Deterministic synthetic OHLC fallback (no RNG so it is reproducible).
function syntheticHistory(symbol, days) {
  const base = SEED[symbol]?.price || 100;
  const out = [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const wave = Math.sin(i / 6) * base * 0.02;
    const drift = base * 0.15 * (i / days);
    const close = round(base * 0.85 + drift + wave);
    const open = round(close - wave / 2);
    out.push({ date: d, open, high: round(Math.max(open, close) * 1.006), low: round(Math.min(open, close) * 0.994), close, volume: 1_000_000 + i * 5000 });
  }
  return out;
}

// --- No free keyless feed below: kept as mock ------------------------------

export async function fetchQuarterResults(symbol) {
  const now = new Date();
  const fy = now.getFullYear();
  const scale = (SEED[symbol]?.price || 100) * 100;
  return [1, 2, 3, 4].map((q) => ({
    fiscalYear: fy, quarter: q,
    revenue: Math.round(scale * (1 + q * 0.03)),
    netProfit: Math.round(scale * 0.14 * (1 + q * 0.04)),
    ebitda: Math.round(scale * 0.22 * (1 + q * 0.03)),
    eps: Number((5 + q * 0.4).toFixed(2)),
    reportedAt: new Date(fy, q * 3, 15),
  }));
}

export async function fetchShareholding(symbol) {
  const now = new Date();
  const map = {
    RELIANCE: { promoter: 50.3, fii: 22.1, dii: 15.4, public: 12.2 },
    TCS: { promoter: 71.8, fii: 12.3, dii: 9.1, public: 6.8 },
    INFOSYS: { promoter: 14.7, fii: 33.2, dii: 36.1, public: 16.0 },
  };
  return { asOf: now, ...(map[symbol] || { promoter: 40, fii: 25, dii: 20, public: 15 }) };
}

export default { fetchQuote, fetchPriceHistory, fetchQuarterResults, fetchShareholding };
