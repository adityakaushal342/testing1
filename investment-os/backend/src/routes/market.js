// Market routes (Phase 4) — dashboard overview.
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// GET /api/market/overview — indices, macro, sectors, movers, health, news
router.get("/overview", async (req, res, next) => {
  try {
    // latest value per market key
    const rows = await prisma.marketData.findMany({ orderBy: { asOf: "desc" } });
    const latestByKey = {};
    for (const r of rows) if (!latestByKey[r.key]) latestByKey[r.key] = r;
    const market = Object.values(latestByKey);

    const sectors = await prisma.sectorPerformance.findMany({ orderBy: { asOf: "desc" }, take: 12 });

    const stocks = await prisma.stock.findMany({ include: { company: true } });
    const sorted = [...stocks].sort((a, b) => b.changePct - a.changePct);
    const topGainers = sorted.slice(0, 5).map(fmtMover);
    const topLosers = sorted.slice(-5).reverse().map(fmtMover);

    const news = await prisma.news.findMany({ orderBy: { publishedAt: "desc" }, take: 8 });

    // crude "market health" from advance/decline of loaded stocks + VIX
    const adv = stocks.filter((s) => s.changePct > 0).length;
    const dec = stocks.filter((s) => s.changePct < 0).length;
    const vix = latestByKey["VIX"]?.value ?? 14;
    const health = computeHealth(adv, dec, vix);

    res.json({ market, sectors, topGainers, topLosers, news, health });
  } catch (e) { next(e); }
});

function fmtMover(s) {
  return {
    symbol: s.company.symbol,
    name: s.company.name,
    price: s.price,
    changePct: s.changePct,
  };
}

function computeHealth(adv, dec, vix) {
  const total = adv + dec || 1;
  const breadth = adv / total; // 0..1
  let score = Math.round(breadth * 70 + (vix < 15 ? 30 : vix < 20 ? 18 : 8));
  score = Math.max(0, Math.min(100, score));
  const label = score >= 70 ? "Bullish" : score >= 45 ? "Neutral" : "Cautious";
  return { score, label, advances: adv, declines: dec, vix };
}

export default router;
