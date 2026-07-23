// Market & macro data collector (Phase 3)
// Covers: Nifty, Sensex, FII/DII, GDP, Inflation, RBI rate, USD/INR, Gold,
// Silver, Oil, VIX. Returns mock data unless MACRO_API_KEY is configured.

const hasKey = () => Boolean(process.env.MACRO_API_KEY);

// Deterministic-ish mock snapshot. In production, replace `mock*` with real
// provider calls guarded by `if (hasKey()) { ... }`.
export async function fetchMarketSnapshot() {
  if (hasKey()) {
    // TODO: call real provider using process.env.MACRO_API_KEY
    // return await realProvider();
  }
  const now = new Date();
  return [
    { key: "NIFTY", label: "Nifty 50", value: 24350.5, change: 112.3, changePct: 0.46, unit: "pts", asOf: now },
    { key: "SENSEX", label: "Sensex", value: 80125.2, change: 358.1, changePct: 0.45, unit: "pts", asOf: now },
    { key: "BANKNIFTY", label: "Bank Nifty", value: 51420.0, change: -85.4, changePct: -0.17, unit: "pts", asOf: now },
    { key: "VIX", label: "India VIX", value: 13.2, change: -0.4, changePct: -2.94, unit: "pts", asOf: now },
    { key: "FII_DII", label: "FII net (₹ cr)", value: 1240, change: 1240, changePct: 0, unit: "INR cr", asOf: now },
    { key: "GDP", label: "GDP growth", value: 6.8, change: 0, changePct: 0, unit: "%", asOf: now },
    { key: "INFLATION", label: "CPI Inflation", value: 4.9, change: -0.1, changePct: 0, unit: "%", asOf: now },
    { key: "RBI_RATE", label: "RBI Repo Rate", value: 6.5, change: 0, changePct: 0, unit: "%", asOf: now },
    { key: "USDINR", label: "USD/INR", value: 83.4, change: 0.12, changePct: 0.14, unit: "INR", asOf: now },
    { key: "GOLD", label: "Gold (10g)", value: 72500, change: 320, changePct: 0.44, unit: "INR", asOf: now },
    { key: "SILVER", label: "Silver (kg)", value: 91500, change: -450, changePct: -0.49, unit: "INR", asOf: now },
    { key: "OIL", label: "Brent Crude", value: 82.1, change: -0.6, changePct: -0.73, unit: "USD", asOf: now },
  ];
}

export async function fetchSectorPerformance() {
  const now = new Date();
  return [
    { sector: "IT", changePct: 1.2, asOf: now },
    { sector: "Banking", changePct: -0.3, asOf: now },
    { sector: "Energy", changePct: 0.8, asOf: now },
    { sector: "FMCG", changePct: 0.4, asOf: now },
    { sector: "Auto", changePct: 1.5, asOf: now },
    { sector: "Pharma", changePct: -0.6, asOf: now },
    { sector: "Metal", changePct: 2.1, asOf: now },
    { sector: "Realty", changePct: -1.1, asOf: now },
  ];
}

export default { fetchMarketSnapshot, fetchSectorPerformance };
