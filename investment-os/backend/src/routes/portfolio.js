// Portfolio routes (Phase 6) — P/L, allocation, returns, CAGR, dividend, risk.
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// GET /api/portfolio — first portfolio with computed analytics
router.get("/", async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      include: {
        holdings: { include: { company: { include: { stock: true, aiScore: true } } } },
      },
    });
    if (!portfolio) return res.json({ holdings: [], summary: emptySummary() });
    res.json({ ...portfolio, ...analyze(portfolio.holdings) });
  } catch (e) { next(e); }
});

// POST /api/portfolio/holdings — add a holding { symbol, quantity, avgCost }
router.post("/holdings", async (req, res, next) => {
  try {
    const { symbol, quantity, avgCost } = req.body || {};
    if (!symbol || !quantity || !avgCost) return res.status(400).json({ error: "symbol, quantity, avgCost required" });
    const company = await prisma.company.findUnique({ where: { symbol: symbol.toUpperCase() } });
    if (!company) return res.status(404).json({ error: "Unknown symbol" });
    let portfolio = await prisma.portfolio.findFirst();
    if (!portfolio) portfolio = await prisma.portfolio.create({ data: {} });
    const holding = await prisma.holding.create({
      data: { portfolioId: portfolio.id, companyId: company.id, quantity: Number(quantity), avgCost: Number(avgCost) },
    });
    res.status(201).json(holding);
  } catch (e) { next(e); }
});

// DELETE /api/portfolio/holdings/:id
router.delete("/holdings/:id", async (req, res, next) => {
  try {
    await prisma.holding.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

function emptySummary() {
  return { summary: { invested: 0, current: 0, pnl: 0, pnlPct: 0, dayChange: 0 }, allocation: [] };
}

function analyze(holdings) {
  let invested = 0, current = 0, dayChange = 0, avgRisk = 0, riskCount = 0;
  const rows = holdings.map((h) => {
    const ltp = h.company.stock?.price ?? h.avgCost;
    const cost = h.avgCost * h.quantity;
    const val = ltp * h.quantity;
    const pnl = val - cost;
    invested += cost;
    current += val;
    dayChange += (h.company.stock?.change ?? 0) * h.quantity;
    if (h.company.aiScore) { avgRisk += h.company.aiScore.riskScore; riskCount++; }
    // naive CAGR from buyDate
    const years = Math.max((Date.now() - new Date(h.buyDate).getTime()) / (365 * 864e5), 0.01);
    const cagr = cost > 0 ? (Math.pow(val / cost, 1 / years) - 1) * 100 : 0;
    return {
      id: h.id,
      symbol: h.company.symbol,
      name: h.company.name,
      quantity: h.quantity,
      avgCost: h.avgCost,
      ltp,
      invested: Number(cost.toFixed(2)),
      current: Number(val.toFixed(2)),
      pnl: Number(pnl.toFixed(2)),
      pnlPct: cost ? Number(((pnl / cost) * 100).toFixed(2)) : 0,
      cagr: Number(cagr.toFixed(2)),
      riskScore: h.company.aiScore?.riskScore ?? null,
    };
  });

  const allocation = rows
    .map((r) => ({ symbol: r.symbol, weight: current ? Number(((r.current / current) * 100).toFixed(2)) : 0 }))
    .sort((a, b) => b.weight - a.weight);

  const pnl = current - invested;
  return {
    holdingsDetail: rows,
    allocation,
    summary: {
      invested: Number(invested.toFixed(2)),
      current: Number(current.toFixed(2)),
      pnl: Number(pnl.toFixed(2)),
      pnlPct: invested ? Number(((pnl / invested) * 100).toFixed(2)) : 0,
      dayChange: Number(dayChange.toFixed(2)),
      portfolioRisk: riskCount ? Number((avgRisk / riskCount).toFixed(1)) : null,
    },
  };
}

export default router;
