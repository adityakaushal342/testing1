// News collector (Phase 3)
// Live source: Google News RSS (free, no API key). Per-company queries + a
// general markets feed. Falls back to mock headlines on any error.
import { fetchRss, headlineSentiment } from "../utils/http.js";

const COMPANY_NAME = {
  RELIANCE: "Reliance Industries", TCS: "Tata Consultancy Services",
  INFOSYS: "Infosys", HDFCBANK: "HDFC Bank", ITC: "ITC Ltd",
};

const googleNews = (query) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

// General Indian markets feed.
const MARKET_FEED = googleNews("Indian stock market Nifty Sensex");

const MOCK = [
  { title: "Reliance Jio adds record subscribers as 5G rollout accelerates", symbol: "RELIANCE", source: "MarketWire" },
  { title: "TCS wins multi-year deal with European bank", symbol: "TCS", source: "BizToday" },
  { title: "Infosys raises FY revenue guidance on AI demand", symbol: "INFOSYS", source: "TechDesk" },
  { title: "Nifty hits fresh high on strong FII inflows", symbol: null, source: "MarketWire" },
  { title: "Crude oil slips as demand worries return", symbol: null, source: "CommodityLine" },
  { title: "RBI holds repo rate steady, retains stance", symbol: null, source: "PolicyWatch" },
];

export async function fetchNews({ symbol = null, limit = 20 } = {}) {
  try {
    const feed = symbol ? googleNews(`${COMPANY_NAME[symbol] || symbol} share`) : MARKET_FEED;
    const items = await fetchRss(feed, limit);
    if (!items.length) throw new Error("empty feed");
    return items.map((n) => ({
      title: n.title,
      summary: n.title,
      url: n.link || null,
      source: n.source || "Google News",
      sentiment: headlineSentiment(n.title),
      symbol: symbol || null,
      publishedAt: n.publishedAt,
    }));
  } catch {
    const now = Date.now();
    return MOCK.filter((n) => !symbol || n.symbol === symbol)
      .slice(0, limit)
      .map((n, i) => ({
        title: n.title, summary: n.title, url: null, source: n.source,
        sentiment: headlineSentiment(n.title), symbol: n.symbol,
        publishedAt: new Date(now - i * 3600_000),
      }));
  }
}

export default { fetchNews };
