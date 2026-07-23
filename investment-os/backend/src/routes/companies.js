// Company routes (Phase 5) — list + full company page payload.
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// GET /api/companies  — list with latest quote
router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const companies = await prisma.company.findMany({
      where: q
        ? { OR: [{ symbol: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
        : undefined,
      include: { stock: true, sector: true, aiScore: true },
      orderBy: { symbol: "asc" },
      take: 100,
    });
    res.json(companies);
  } catch (e) { next(e); }
});

// GET /api/companies/:symbol — everything for the company page
router.get("/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const company = await prisma.company.findUnique({
      where: { symbol },
      include: {
        sector: true,
        stock: { include: { priceHistory: { orderBy: { date: "asc" } } } },
        quarterResults: { orderBy: [{ fiscalYear: "desc" }, { quarter: "desc" }], take: 8 },
        annualResults: { orderBy: { fiscalYear: "desc" }, take: 5 },
        shareholdings: { orderBy: { asOf: "desc" }, take: 4 },
        dividends: { orderBy: { exDate: "desc" }, take: 8 },
        news: { orderBy: { publishedAt: "desc" }, take: 10 },
        aiScore: true,
        knowledge: true,
      },
    });
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  } catch (e) { next(e); }
});

export default router;
