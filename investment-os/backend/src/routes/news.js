// News routes (Phase 4 / 9).
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const symbol = req.query.symbol?.toUpperCase();
    const where = symbol ? { company: { symbol } } : undefined;
    const news = await prisma.news.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: Number(req.query.limit) || 30,
      include: { company: { select: { symbol: true, name: true } } },
    });
    res.json(news);
  } catch (e) { next(e); }
});

export default router;
