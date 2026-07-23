// AI routes (Phase 8 scoring + Phase 11 chat).
import { Router } from "express";
import prisma from "../config/prisma.js";
import { scoreCompany } from "../ai/scoreEngine.js";
import { answerQuestion } from "../ai/chatEngine.js";

const router = Router();

// POST /api/ai/score/:symbol — recompute & persist the AI score for a company
router.post("/score/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const company = await prisma.company.findUnique({
      where: { symbol },
      include: {
        stock: true,
        knowledge: true,
        quarterResults: { orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }], take: 2 },
        shareholdings: { orderBy: { asOf: "desc" }, take: 2 },
        news: { orderBy: { publishedAt: "desc" }, take: 10 },
      },
    });
    if (!company) return res.status(404).json({ error: "Company not found" });

    const score = scoreCompany(buildInputs(company));
    const saved = await prisma.aIScore.upsert({
      where: { companyId: company.id },
      update: { ...score, generatedAt: new Date() },
      create: { companyId: company.id, ...score },
    });
    res.json(saved);
  } catch (e) { next(e); }
});

// POST /api/ai/chat  { message }  (Phase 11)
router.post("/chat", async (req, res, next) => {
  try {
    const message = (req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "message required" });
    const answer = await answerQuestion(message);
    res.json(answer);
  } catch (e) { next(e); }
});

// Shared: assemble scoreEngine inputs from a loaded company row.
export function buildInputs(company) {
  const [q0, q1] = company.quarterResults || [];
  const [sh0, sh1] = company.shareholdings || [];
  const news = company.news || [];
  const avgSentiment = news.length ? news.reduce((a, n) => a + (n.sentiment || 0), 0) / news.length : 0;

  return {
    knowledge: company.knowledge
      ? { growthFactors: company.knowledge.growthFactors, negativeFactors: company.knowledge.negativeFactors }
      : { growthFactors: [], negativeFactors: [] },
    financials: {
      roe: company.stock?.roe,
      profitGrowth: q0 && q1 && q1.netProfit ? Number((((q0.netProfit - q1.netProfit) / q1.netProfit) * 100).toFixed(1)) : undefined,
    },
    quarter: q0 && q1 ? { profitGrowthYoY: q1.netProfit ? ((q0.netProfit - q1.netProfit) / q1.netProfit) * 100 : 0 } : {},
    valuation: { pe: company.stock?.pe },
    shareholding: sh0 && sh1 ? { fiiChange: (sh0.fii ?? 0) - (sh1.fii ?? 0), promoterChange: (sh0.promoter ?? 0) - (sh1.promoter ?? 0) } : {},
    newsSentiment: avgSentiment,
    priceMomentum: company.stock ? Math.max(-1, Math.min(1, company.stock.changePct / 5)) : 0,
  };
}

export default router;
