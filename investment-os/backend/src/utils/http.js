// Shared HTTP helpers for the free, keyless data sources.
// Uses Node 18+ global fetch. Everything here is best-effort: callers wrap it in
// try/catch and fall back to mock data, so the app never breaks when offline.

export async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (InvestmentOS)", Accept: "application/json,text/xml,*/*", ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

// Yahoo Finance chart endpoint (no API key required). Returns the raw result[0]
// which contains { meta, timestamp, indicators }.
export async function yahooChart(symbol, range = "3mo", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`yahoo ${symbol} → ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result?.meta) throw new Error(`yahoo ${symbol} → empty`);
  return result;
}

// Build a simple quote object from a Yahoo chart meta block.
export function quoteFromMeta(meta) {
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price != null && prev != null ? price - prev : 0;
  return {
    price,
    change: Number(change.toFixed(2)),
    changePct: prev ? Number(((change / prev) * 100).toFixed(2)) : 0,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    yearHigh: meta.fiftyTwoWeekHigh ?? null,
    yearLow: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
  };
}

// Fetch + parse an RSS feed into { title, link, source, publishedAt }[].
// Deliberately dependency-free (regex parse) since feeds are simple XML.
export async function fetchRss(url, limit = 15) {
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/rss+xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`rss → ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit);
  return items.map((m) => {
    const block = m[1];
    return {
      title: pick(block, "title"),
      link: pick(block, "link"),
      source: pick(block, "source") || hostOf(pick(block, "link")),
      publishedAt: parseDate(pick(block, "pubDate")),
    };
  }).filter((n) => n.title);
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
  return m ? decodeEntities(m[1].trim()) : "";
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function parseDate(s) {
  const d = s ? new Date(s) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

// Very light lexicon sentiment for headlines (-1..1). Not a model — just a hint.
const POS = ["surge", "jump", "gain", "rise", "beat", "record", "profit", "high", "wins", "raise", "growth", "up", "strong", "rally"];
const NEG = ["fall", "drop", "slump", "loss", "miss", "cut", "weak", "down", "crash", "decline", "slip", "concern", "fraud", "probe"];
export function headlineSentiment(title = "") {
  const t = title.toLowerCase();
  let s = 0;
  for (const w of POS) if (t.includes(w)) s += 1;
  for (const w of NEG) if (t.includes(w)) s -= 1;
  return Math.max(-1, Math.min(1, s / 3));
}

export default { fetchWithTimeout, yahooChart, quoteFromMeta, fetchRss, headlineSentiment };
