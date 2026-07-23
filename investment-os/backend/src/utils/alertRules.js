// Alert rules (Phase 9). Evaluates DB state and emits Alert rows for:
//  - Quarter result released (recent reportedAt)
//  - Dividend announced (recent exDate)
//  - FII buying increased / Promoter sold shares (shareholding delta)
//  - New news
//  - Large price move
import prisma from "../config/prisma.js";

const DAY = 864e5;

export async function runAlertRules() {
  const created = [];
  const now = Date.now();

  // Avoid duplicating alerts already created in the last 24h for the same message.
  const recent = await prisma.alert.findMany({ where: { createdAt: { gte: new Date(now - DAY) } } });
  const seen = new Set(recent.map((a) => `${a.type}:${a.message}`));

  const add = async (type, companyId, message, meta) => {
    if (seen.has(`${type}:${message}`)) return;
    const a = await prisma.alert.create({ data: { type, companyId, message, meta } });
    seen.add(`${type}:${message}`);
    created.push(a);
  };

  // Quarter results reported in last 7 days
  const qResults = await prisma.quarterResult.findMany({
    where: { reportedAt: { gte: new Date(now - 7 * DAY) } },
    include: { company: true },
  });
  for (const q of qResults) {
    await add("QUARTER_RESULT", q.companyId, `${q.company.symbol} Q${q.quarter} FY${q.fiscalYear} results released`, { revenue: q.revenue, netProfit: q.netProfit });
  }

  // Dividends with ex-date in the last 7 days
  const divs = await prisma.dividend.findMany({
    where: { exDate: { gte: new Date(now - 7 * DAY) } },
    include: { company: true },
  });
  for (const d of divs) {
    await add("DIVIDEND", d.companyId, `${d.company.symbol} announced ₹${d.amount} ${d.type} dividend`, { amount: d.amount });
  }

  // Shareholding deltas: FII up / promoter down (latest vs previous)
  const companies = await prisma.company.findMany({
    include: { shareholdings: { orderBy: { asOf: "desc" }, take: 2 } },
  });
  for (const c of companies) {
    const [cur, prev] = c.shareholdings;
    if (cur && prev) {
      if ((cur.fii ?? 0) - (prev.fii ?? 0) > 0.5) {
        await add("FII_BUYING", c.id, `FII buying increased in ${c.symbol} (${prev.fii}% → ${cur.fii}%)`, {});
      }
      if ((prev.promoter ?? 0) - (cur.promoter ?? 0) > 0.5) {
        await add("PROMOTER_SOLD", c.id, `Promoter reduced stake in ${c.symbol} (${prev.promoter}% → ${cur.promoter}%)`, {});
      }
    }
  }

  // Large single-day price moves (>4%)
  const stocks = await prisma.stock.findMany({ include: { company: true } });
  for (const s of stocks) {
    if (Math.abs(s.changePct) >= 4) {
      const dir = s.changePct > 0 ? "surged" : "fell";
      await add("PRICE_MOVE", s.companyId, `${s.company.symbol} ${dir} ${s.changePct.toFixed(1)}% today`, { changePct: s.changePct });
    }
  }

  // Recent news
  const news = await prisma.news.findMany({
    where: { publishedAt: { gte: new Date(now - DAY) }, companyId: { not: null } },
    include: { company: true },
    take: 20,
  });
  for (const n of news) {
    await add("NEWS", n.companyId, `${n.company.symbol}: ${n.title}`, { url: n.url });
  }

  return created;
}

export default { runAlertRules };
