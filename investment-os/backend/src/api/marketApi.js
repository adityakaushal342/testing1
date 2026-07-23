// Market & macro data collector (Phase 3)
// Live source: Yahoo Finance (free, no API key). Falls back to mock values per
// key on any network/parse error, so the app always returns a full snapshot.
import { yahooChart, quoteFromMeta } from "../utils/http.js";

// Yahoo symbols for Indian indices + global commodities / FX.
const INDEX_SYMBOLS = [
  { key: "NIFTY", label: "Nifty 50", y: "^NSEI", unit: "pts" },
  { key: "SENSEX", label: "Sensex", y: "^BSESN", unit: "pts" },
  { key: "BANKNIFTY", label: "Bank Nifty", y: "^NSEBANK", unit: "pts" },
  { key: "VIX", label: "India VIX", y: "^INDIAVIX", unit: "pts" },
  { key: "USDINR", label: "USD/INR", y: "INR=X", unit: "INR" },
  { key: "GOLD", label: "Gold (USD/oz)", y: "GC=F", unit: "USD" },
  { key: "SILVER", label: "Silver (USD/oz)", y: "SI=F", unit: "USD" },
  { key: "OIL", label: "Brent Crude", y: "BZ=F", unit: "USD" },
];

// Macro figures with no free keyless API — kept as periodically-updated
// constants (change slowly). Wire a paid MACRO_API_KEY later to make live.
const MACRO_STATIC = [
  { key: "GDP", label: "GDP growth", value: 6.8, unit: "%" },
  { key: "INFLATION", label: "CPI Inflation", value: 4.9, unit: "%" },
  { key: "RBI_RATE", label: "RBI Repo Rate", value: 6.5, unit: "%" },
  { key: "FII_DII", label: "FII net (₹ cr)", value: 1240, unit: "INR cr" },
];

// Mock fallbacks per index key (used when Yahoo is unreachable).
const MOCK = {
  NIFTY: 24350.5, SENSEX: 80125.2, BANKNIFTY: 51420.0, VIX: 13.2,
  USDINR: 83.4, GOLD: 2350.0, SILVER: 28.5, OIL: 82.1,
};

export async function fetchMarketSnapshot() {
  const asOf = new Date();
  const out = [];

  for (const s of INDEX_SYMBOLS) {
    try {
      const r = await yahooChart(s.y, "5d", "1d");
      const q = quoteFromMeta(r.meta);
      out.push({ key: s.key, label: s.label, value: Number(q.price), change: q.change, changePct: q.changePct, unit: s.unit, asOf });
    } catch {
      out.push({ key: s.key, label: s.label, value: MOCK[s.key], change: 0, changePct: 0, unit: s.unit, asOf });
    }
  }

  for (const m of MACRO_STATIC) out.push({ ...m, change: 0, changePct: 0, asOf });
  return out;
}

// Sector performance: no clean free feed; derived placeholder. Kept mock.
export async function fetchSectorPerformance() {
  const asOf = new Date();
  return [
    { sector: "IT", changePct: 1.2, asOf }, { sector: "Banking", changePct: -0.3, asOf },
    { sector: "Energy", changePct: 0.8, asOf }, { sector: "FMCG", changePct: 0.4, asOf },
    { sector: "Auto", changePct: 1.5, asOf }, { sector: "Pharma", changePct: -0.6, asOf },
    { sector: "Metal", changePct: 2.1, asOf }, { sector: "Realty", changePct: -1.1, asOf },
  ];
}

export default { fetchMarketSnapshot, fetchSectorPerformance };
