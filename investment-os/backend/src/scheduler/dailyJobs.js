// Daily automation (Phase 12)
// -----------------------------------------------------------------------------
// Every morning: fetch market, fetch news, update financials, recompute AI
// scores, generate summaries, and raise alerts (the "send notification" step is
// modelled as writing Alert rows).
//
// Run standalone:  npm run scheduler
// Or import { runMorningRoutine } and call it from anywhere.
import "dotenv/config";
import cron from "node-cron";
import prisma from "../config/prisma.js";
import { fetchMarketSnapshot, fetchSectorPerformance } from "../api/marketApi.js";
import { fetchQuote, fetchQuarterResults, fetchShareholding } from "../api/stockApi.js";
import { fetchNews } from "../api/newsApi.js";
import { scoreCompany } from "../ai/scoreEngine.js";
import { buildInputs } from "../routes/ai.js";
import { runAlertRules } from "../utils/alertRules.js";

export async function runMorningRoutine() {
  const log = (m) => console.log(`[scheduler ${new Date().toISOString()}] ${m}`);
  log("morning routine started");

  // 1. Fetch market + sectors
  const market = await fetchMarketSnapshot();
  for (const m of market) {
    await prisma.marketData.upsert({
      where: { key_asOf: { key: m.key, asOf: m.asOf } },
      update: m,
      create: m,
    });
  }
  const sectors = await fetchSectorPerformance();
  for (const s of sectors) {
    await prisma.sectorPerformance.upsert({
      where: { sector_asOf: { sector: s.sector, asOf: s.asOf } },
      update: s,
      create: s,
    });
  }
  log(`market updated (${market.length} keys, ${sectors.length} sectors)`);

  // 2..4. Per company: quote, quarter results, shareholding, news, AI score
  const companies = await prisma.company.findMany({ include: { stock: true } });
  for (const c of companies) {
    const quote = await fetchQuote(c.symbol);
    await prisma.stock.upsert({
      where: { companyId: c.id },
      update: quote,
      create: { companyId: c.id, ...quote },
    });

    const news = await fetchNews({ symbol: c.symbol, limit: 5 });
    for (const n of news) {
      await prisma.news.create({ data: { ...n, companyId: c.id, symbol: undefined } }).catch(() => {});
    }

    // recompute AI score
    const loaded = await prisma.company.findUnique({
      where: { id: c.id },
      include: {
        stock: true, knowledge: true,
        quarterResults: { orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }], take: 2 },
        shareholdings: { orderBy: { asOf: "desc" }, take: 2 },
        news: { orderBy: { publishedAt: "desc" }, take: 10 },
      },
    });
    const score = scoreCompany(buildInputs(loaded));
    await prisma.aIScore.upsert({
      where: { companyId: c.id },
      update: { ...score, generatedAt: new Date() },
      create: { companyId: c.id, ...score },
    });
  }
  log(`updated ${companies.length} companies + AI scores`);

  // 5. Alerts (== "send notification")
  const alerts = await runAlertRules();
  log(`raised ${alerts.length} alerts`);

  log("morning routine complete");
  return { companies: companies.length, alerts: alerts.length };
}

// Lighter hourly refresh: update market snapshot, quotes and alerts so the live
// dashboard (served at "/") always shows fresh data on its hourly poll.
export async function runHourlyRefresh() {
  const log = (m) => console.log(`[scheduler ${new Date().toISOString()}] ${m}`);
  log("hourly refresh started");

  const market = await fetchMarketSnapshot();
  for (const m of market) {
    await prisma.marketData.upsert({ where: { key_asOf: { key: m.key, asOf: m.asOf } }, update: m, create: m });
  }

  const companies = await prisma.company.findMany();
  for (const c of companies) {
    const quote = await fetchQuote(c.symbol);
    await prisma.stock.upsert({ where: { companyId: c.id }, update: quote, create: { companyId: c.id, ...quote } });
  }

  const alerts = await runAlertRules();
  log(`hourly refresh done (${market.length} market keys, ${companies.length} quotes, ${alerts.length} alerts)`);
  return { market: market.length, companies: companies.length, alerts: alerts.length };
}

// When run directly, arm both schedules and run once now.
const isMain = process.argv[1] && process.argv[1].endsWith("dailyJobs.js");
if (isMain) {
  // Full morning routine: 08:30 Asia/Kolkata, Mon-Fri
  cron.schedule("30 8 * * 1-5", () => runMorningRoutine().catch(console.error), { timezone: "Asia/Kolkata" });
  // Hourly data refresh at minute 0, every hour
  cron.schedule("0 * * * *", () => runHourlyRefresh().catch(console.error), { timezone: "Asia/Kolkata" });
  console.log("Scheduler armed: full routine weekdays 08:30 IST + hourly refresh at :00. Running once now...");
  runMorningRoutine().catch(console.error);
}

export default { runMorningRoutine };
