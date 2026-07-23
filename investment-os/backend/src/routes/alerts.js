// Alerts routes (Phase 9). Lists alerts + a rule-runner that generates them.
import { Router } from "express";
import prisma from "../config/prisma.js";
import { runAlertRules } from "../utils/alertRules.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: Number(req.query.limit) || 50,
      include: { company: { select: { symbol: true, name: true } } },
    });
    res.json(alerts);
  } catch (e) { next(e); }
});

// POST /api/alerts/run — evaluate alert rules and persist any new alerts
router.post("/run", async (req, res, next) => {
  try {
    const created = await runAlertRules();
    res.json({ created: created.length, alerts: created });
  } catch (e) { next(e); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const alert = await prisma.alert.update({ where: { id: Number(req.params.id) }, data: { read: true } });
    res.json(alert);
  } catch (e) { next(e); }
});

export default router;
