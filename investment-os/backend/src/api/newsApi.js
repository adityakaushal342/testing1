// News collector (Phase 3). Returns mock headlines unless NEWS_API_KEY is set.

const hasKey = () => Boolean(process.env.NEWS_API_KEY);

const MOCK = [
  { title: "Reliance Jio adds record subscribers as 5G rollout accelerates", symbol: "RELIANCE", sentiment: 0.6, source: "MarketWire" },
  { title: "TCS wins multi-year deal with European bank", symbol: "TCS", sentiment: 0.5, source: "BizToday" },
  { title: "Infosys raises FY revenue guidance on AI demand", symbol: "INFOSYS", sentiment: 0.7, source: "TechDesk" },
  { title: "Nifty hits fresh high on strong FII inflows", symbol: null, sentiment: 0.4, source: "MarketWire" },
  { title: "Crude oil slips as demand worries return", symbol: null, sentiment: -0.3, source: "CommodityLine" },
  { title: "RBI holds repo rate steady, retains stance", symbol: null, sentiment: 0.1, source: "PolicyWatch" },
];

export async function fetchNews({ symbol = null, limit = 20 } = {}) {
  if (hasKey()) {
    // TODO: real news provider call using process.env.NEWS_API_KEY
  }
  const now = Date.now();
  return MOCK.filter((n) => !symbol || n.symbol === symbol)
    .slice(0, limit)
    .map((n, i) => ({
      title: n.title,
      summary: n.title,
      url: null,
      source: n.source,
      sentiment: n.sentiment,
      symbol: n.symbol,
      publishedAt: new Date(now - i * 3600_000),
    }));
}

export default { fetchNews };
