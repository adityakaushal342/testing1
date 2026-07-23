// Seed script — populates demo data across all tables and loads the Phase 7
// knowledge documents from src/knowledge/*.json.
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { scoreCompany } from "../src/ai/scoreEngine.js";
import { buildInputs } from "../src/routes/ai.js";
import { fetchQuote, fetchPriceHistory, fetchQuarterResults, fetchShareholding } from "../src/api/stockApi.js";
import { fetchMarketSnapshot, fetchSectorPerformance } from "../src/api/marketApi.js";
import { fetchNews } from "../src/api/newsApi.js";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, "..", "src", "knowledge");

const COMPANIES = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy", isin: "INE002A01018" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", sector: "IT", isin: "INE467B01029" },
  { symbol: "INFOSYS", name: "Infosys Ltd", sector: "IT", isin: "INE009A01021" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking", isin: "INE040A01034" },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG", isin: "INE154A01025" },
];

const SECTORS = ["Energy", "IT", "Banking", "FMCG", "Auto", "Pharma", "Metal", "Realty"];

async function main() {
  console.log("Seeding Investment OS...");

  // Sectors
  const sectorMap = {};
  for (const name of SECTORS) {
    const s = await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name, slug: name.toLowerCase() },
    });
    sectorMap[name] = s.id;
  }

  // Load knowledge documents keyed by symbol
  const knowledge = {};
  for (const file of readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(join(KNOWLEDGE_DIR, file), "utf8"));
    knowledge[doc.symbol] = doc;
  }

  // Companies + stock + fundamentals + knowledge + AI score
  for (const c of COMPANIES) {
    const company = await prisma.company.upsert({
      where: { symbol: c.symbol },
      update: { name: c.name, sectorId: sectorMap[c.sector], isin: c.isin },
      create: { symbol: c.symbol, name: c.name, isin: c.isin, sectorId: sectorMap[c.sector] },
    });

    // Stock quote + price history
    const quote = await fetchQuote(c.symbol);
    const stock = await prisma.stock.upsert({
      where: { companyId: company.id },
      update: quote,
      create: { companyId: company.id, ...quote },
    });
    const history = await fetchPriceHistory(c.symbol, 60);
    for (const p of history) {
      await prisma.pricePoint.upsert({
        where: { stockId_date: { stockId: stock.id, date: p.date } },
        update: p,
        create: { stockId: stock.id, ...p },
      });
    }

    // Quarter results
    const quarters = await fetchQuarterResults(c.symbol);
    for (const q of quarters) {
      await prisma.quarterResult.upsert({
        where: { companyId_fiscalYear_quarter: { companyId: company.id, fiscalYear: q.fiscalYear, quarter: q.quarter } },
        update: q,
        create: { companyId: company.id, ...q },
      });
    }

    // Shareholding (two snapshots so alert deltas work)
    const sh = await fetchShareholding(c.symbol);
    const prevDate = new Date(sh.asOf); prevDate.setMonth(prevDate.getMonth() - 3);
    await prisma.shareholding.upsert({
      where: { companyId_asOf: { companyId: company.id, asOf: sh.asOf } },
      update: sh, create: { companyId: company.id, ...sh },
    });
    await prisma.shareholding.upsert({
      where: { companyId_asOf: { companyId: company.id, asOf: prevDate } },
      update: {}, create: { companyId: company.id, asOf: prevDate, promoter: sh.promoter, fii: (sh.fii ?? 0) - 0.8, dii: sh.dii, public: sh.public },
    });

    // Dividend
    await prisma.dividend.create({
      data: { companyId: company.id, exDate: new Date(), amount: Number((stock.price * 0.01).toFixed(2)), type: "final" },
    }).catch(() => {});

    // News
    const news = await fetchNews({ symbol: c.symbol, limit: 3 });
    for (const n of news) {
      const { symbol, ...rest } = n;
      await prisma.news.create({ data: { ...rest, companyId: company.id } }).catch(() => {});
    }

    // Knowledge document (Phase 7)
    const kdoc = knowledge[c.symbol];
    if (kdoc) {
      await prisma.knowledge.upsert({
        where: { companyId: company.id },
        update: { growthFactors: kdoc.growthFactors, negativeFactors: kdoc.negativeFactors, moat: kdoc.moat, data: kdoc },
        create: { companyId: company.id, growthFactors: kdoc.growthFactors, negativeFactors: kdoc.negativeFactors, moat: kdoc.moat, data: kdoc },
      });
    }

    // AI score (Phase 8)
    const loaded = await prisma.company.findUnique({
      where: { id: company.id },
      include: {
        stock: true, knowledge: true,
        quarterResults: { orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }], take: 2 },
        shareholdings: { orderBy: { asOf: "desc" }, take: 2 },
        news: { orderBy: { publishedAt: "desc" }, take: 10 },
      },
    });
    const score = scoreCompany(buildInputs(loaded));
    await prisma.aIScore.upsert({
      where: { companyId: company.id },
      update: { ...score }, create: { companyId: company.id, ...score },
    });

    console.log(`  ✓ ${c.symbol}  growth ${score.growthScore} / risk ${score.riskScore}`);
  }

  // Market snapshot + sectors
  for (const m of await fetchMarketSnapshot()) {
    await prisma.marketData.upsert({ where: { key_asOf: { key: m.key, asOf: m.asOf } }, update: m, create: m });
  }
  for (const s of await fetchSectorPerformance()) {
    await prisma.sectorPerformance.upsert({ where: { sector_asOf: { sector: s.sector, asOf: s.asOf } }, update: s, create: s });
  }

  // General market news (no company)
  for (const n of (await fetchNews({ limit: 6 })).filter((x) => !x.symbol)) {
    const { symbol, ...rest } = n;
    await prisma.news.create({ data: rest }).catch(() => {});
  }

  // ETFs / Mutual funds / Bonds
  await seedInstruments();

  // Portfolio + watchlist demo
  await seedPortfolio();

  console.log("Seed complete.");
}

async function seedInstruments() {
  const etfs = [
    { symbol: "GOLDBEES", name: "Nippon India Gold ETF", category: "Gold ETF", nav: 62.3, aum: 12000, expenseRatio: 0.5 },
    { symbol: "SILVERBEES", name: "Nippon India Silver ETF", category: "Silver ETF", nav: 88.1, aum: 3200, expenseRatio: 0.5 },
    { symbol: "NIFTYBEES", name: "Nippon India Nifty 50 ETF", category: "Index ETF", nav: 265.4, aum: 18000, expenseRatio: 0.05 },
  ];
  for (const e of etfs) await prisma.eTF.upsert({ where: { symbol: e.symbol }, update: e, create: e });

  const funds = [
    { code: "MF001", name: "Bluechip Equity Fund", category: "Equity", nav: 78.2, returns1Y: 22.1, returns3Y: 18.4, returns5Y: 16.0 },
    { code: "MF002", name: "Balanced Advantage Fund", category: "Hybrid", nav: 45.6, returns1Y: 14.2, returns3Y: 12.1, returns5Y: 11.3 },
    { code: "MF003", name: "Corporate Bond Fund", category: "Debt", nav: 32.1, returns1Y: 7.8, returns3Y: 6.9, returns5Y: 7.2 },
  ];
  for (const f of funds) await prisma.mutualFund.upsert({ where: { code: f.code }, update: f, create: f });

  const bonds = [
    { isin: "IN0020230012", name: "7.18% GOI 2033", issuer: "Government of India", couponRate: 7.18, yieldToMaturity: 7.05, maturity: new Date("2033-04-14"), rating: "SOV" },
    { isin: "INE001A08123", name: "HDFC 8.10% 2027", issuer: "HDFC Ltd", couponRate: 8.10, yieldToMaturity: 7.9, maturity: new Date("2027-06-30"), rating: "AAA" },
  ];
  for (const b of bonds) await prisma.bond.upsert({ where: { isin: b.isin }, update: b, create: b });
}

async function seedPortfolio() {
  const portfolio = (await prisma.portfolio.findFirst()) || (await prisma.portfolio.create({ data: {} }));
  const picks = [
    { symbol: "RELIANCE", quantity: 10, avgCost: 2500 },
    { symbol: "TCS", quantity: 5, avgCost: 3600 },
    { symbol: "INFOSYS", quantity: 15, avgCost: 1450 },
  ];
  for (const p of picks) {
    const company = await prisma.company.findUnique({ where: { symbol: p.symbol } });
    if (!company) continue;
    const exists = await prisma.holding.findFirst({ where: { portfolioId: portfolio.id, companyId: company.id } });
    if (!exists) {
      await prisma.holding.create({ data: { portfolioId: portfolio.id, companyId: company.id, quantity: p.quantity, avgCost: p.avgCost } });
    }
  }

  const watchlist = (await prisma.watchlist.findFirst()) || (await prisma.watchlist.create({ data: {} }));
  for (const sym of ["HDFCBANK", "ITC"]) {
    const company = await prisma.company.findUnique({ where: { symbol: sym } });
    if (company) {
      await prisma.watchlistItem.upsert({
        where: { watchlistId_companyId: { watchlistId: watchlist.id, companyId: company.id } },
        update: {}, create: { watchlistId: watchlist.id, companyId: company.id },
      });
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
