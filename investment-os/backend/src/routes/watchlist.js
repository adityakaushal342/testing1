// Watchlist routes (Final dashboard ⭐ tab).
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

async function getOrCreateWatchlist() {
  let wl = await prisma.watchlist.findFirst();
  if (!wl) wl = await prisma.watchlist.create({ data: {} });
  return wl;
}

router.get("/", async (req, res, next) => {
  try {
    const wl = await prisma.watchlist.findFirst({
      include: { items: { include: { company: { include: { stock: true, aiScore: true } } } } },
    });
    res.json(wl || { items: [] });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const symbol = (req.body?.symbol || "").toUpperCase();
    const company = await prisma.company.findUnique({ where: { symbol } });
    if (!company) return res.status(404).json({ error: "Unknown symbol" });
    const wl = await getOrCreateWatchlist();
    const item = await prisma.watchlistItem.upsert({
      where: { watchlistId_companyId: { watchlistId: wl.id, companyId: company.id } },
      update: {},
      create: { watchlistId: wl.id, companyId: company.id },
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.delete("/:companyId", async (req, res, next) => {
  try {
    const wl = await getOrCreateWatchlist();
    await prisma.watchlistItem.deleteMany({ where: { watchlistId: wl.id, companyId: Number(req.params.companyId) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
