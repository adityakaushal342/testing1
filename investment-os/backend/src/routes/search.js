// Search route (Phase 10) — companies, ETFs, mutual funds in one query.
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ companies: [], etfs: [], mutualFunds: [] });
    const like = { contains: q, mode: "insensitive" };

    const [companies, etfs, mutualFunds] = await Promise.all([
      prisma.company.findMany({
        where: { OR: [{ symbol: like }, { name: like }] },
        select: { symbol: true, name: true, sector: { select: { name: true } } },
        take: 10,
      }),
      prisma.eTF.findMany({ where: { OR: [{ symbol: like }, { name: like }] }, take: 5 }),
      prisma.mutualFund.findMany({ where: { name: like }, take: 5 }),
    ]);

    res.json({
      companies: companies.map((c) => ({ type: "company", symbol: c.symbol, name: c.name, sector: c.sector?.name })),
      etfs: etfs.map((e) => ({ type: "etf", symbol: e.symbol, name: e.name, category: e.category })),
      mutualFunds: mutualFunds.map((m) => ({ type: "mf", code: m.code, name: m.name, category: m.category })),
    });
  } catch (e) { next(e); }
});

export default router;
