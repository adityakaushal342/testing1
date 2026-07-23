// ETF / Mutual Fund / Bond routes (dashboard tabs).
import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

router.get("/etfs", async (req, res, next) => {
  try {
    const category = req.query.category;
    res.json(await prisma.eTF.findMany({ where: category ? { category } : undefined, orderBy: { symbol: "asc" } }));
  } catch (e) { next(e); }
});

router.get("/mutual-funds", async (req, res, next) => {
  try {
    res.json(await prisma.mutualFund.findMany({ orderBy: { name: "asc" } }));
  } catch (e) { next(e); }
});

router.get("/bonds", async (req, res, next) => {
  try {
    res.json(await prisma.bond.findMany({ orderBy: { name: "asc" } }));
  } catch (e) { next(e); }
});

export default router;
