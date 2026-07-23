// AI scoring engine (Phase 8)
// -----------------------------------------------------------------------------
// Turns the structured inputs (financials, news, quarter result, sector,
// economy, price, shareholding) + the per-company knowledge document into a
// Growth Score, Risk Score, summary, confidence and reasons.
//
// This is a transparent, deterministic heuristic — NOT a black box. When an
// ANTHROPIC_API_KEY is present the caller may instead route to an LLM using the
// same inputs, but this engine guarantees the app works fully offline.

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * @param {object} input
 * @param {object} input.knowledge  growth/negative factor document (Phase 7)
 * @param {object} [input.financials]  { revenueGrowth, profitGrowth, roe, debtToEquity }
 * @param {object} [input.quarter]     { revenueGrowthYoY, profitGrowthYoY, beat }
 * @param {object} [input.valuation]   { pe, pb, sectorPe }
 * @param {object} [input.shareholding] { promoter, fii, dii, fiiChange, promoterChange }
 * @param {number} [input.newsSentiment]  -1..1
 * @param {number} [input.sectorTrend]    -1..1  (sector momentum)
 * @param {number} [input.priceMomentum]  -1..1  (recent price trend)
 * @returns {{growthScore:number, riskScore:number, confidence:number, summary:string, reasons:string[]}}
 */
export function scoreCompany(input = {}) {
  const {
    knowledge = { growthFactors: [], negativeFactors: [] },
    financials = {},
    quarter = {},
    valuation = {},
    shareholding = {},
    newsSentiment = 0,
    sectorTrend = 0,
    priceMomentum = 0,
  } = input;

  const reasons = [];
  let growth = 50; // neutral baseline
  let risk = 45;

  // --- Fundamentals -> growth ------------------------------------------------
  if (typeof financials.profitGrowth === "number") {
    const g = financials.profitGrowth; // %
    growth += clamp(g, -20, 20);
    reasons.push(`Profit growth ${g > 0 ? "+" : ""}${g}% YoY`);
    if (g < 0) risk += 8;
  }
  if (typeof financials.roe === "number") {
    if (financials.roe >= 18) { growth += 6; reasons.push(`Strong ROE (${financials.roe}%)`); }
    else if (financials.roe < 10) { growth -= 4; risk += 4; reasons.push(`Low ROE (${financials.roe}%)`); }
  }
  if (typeof financials.debtToEquity === "number") {
    if (financials.debtToEquity > 1.5) { risk += 12; reasons.push(`High leverage (D/E ${financials.debtToEquity})`); }
    else if (financials.debtToEquity < 0.3) { risk -= 6; reasons.push("Low debt balance sheet"); }
  }

  // --- Latest quarter --------------------------------------------------------
  if (quarter.beat === true) { growth += 6; reasons.push("Beat quarterly estimates"); }
  if (quarter.beat === false) { growth -= 6; risk += 6; reasons.push("Missed quarterly estimates"); }
  if (typeof quarter.profitGrowthYoY === "number") {
    growth += clamp(quarter.profitGrowthYoY / 3, -8, 8);
  }

  // --- Valuation -> risk -----------------------------------------------------
  if (typeof valuation.pe === "number" && typeof valuation.sectorPe === "number" && valuation.sectorPe > 0) {
    const premium = (valuation.pe - valuation.sectorPe) / valuation.sectorPe;
    if (premium > 0.4) { risk += 10; reasons.push(`Rich valuation (PE ${valuation.pe} vs sector ${valuation.sectorPe})`); }
    else if (premium < -0.2) { growth += 4; reasons.push(`Attractive valuation vs sector`); }
  }

  // --- Shareholding ----------------------------------------------------------
  if (typeof shareholding.fiiChange === "number") {
    if (shareholding.fiiChange > 0) { growth += 4; reasons.push("FII buying increased"); }
    else if (shareholding.fiiChange < 0) { risk += 5; reasons.push("FII holding reduced"); }
  }
  if (typeof shareholding.promoterChange === "number" && shareholding.promoterChange < 0) {
    risk += 8; reasons.push("Promoter reduced stake");
  }

  // --- Sentiment / momentum / sector ----------------------------------------
  growth += newsSentiment * 6;
  if (newsSentiment > 0.3) reasons.push("Positive news flow");
  if (newsSentiment < -0.3) { risk += 6; reasons.push("Negative news flow"); }

  growth += sectorTrend * 5;
  growth += priceMomentum * 4;
  if (priceMomentum < -0.4) risk += 5;

  // --- Knowledge document weighting -----------------------------------------
  // Growth factors nudge growth up, negative factors nudge risk up, scaled by
  // how many are "active" (here we treat the document as static context).
  const gCount = (knowledge.growthFactors || []).length;
  const nCount = (knowledge.negativeFactors || []).length;
  if (gCount) growth += Math.min(gCount, 6);
  if (nCount) risk += Math.min(nCount, 6);

  growth = clamp(growth);
  risk = clamp(risk);

  // --- Confidence: more inputs present => higher confidence ------------------
  const provided = [
    financials.profitGrowth, financials.roe, quarter.beat,
    valuation.pe, shareholding.fiiChange, newsSentiment, gCount,
  ].filter((v) => v !== undefined && v !== null).length;
  const confidence = clamp(0.4 + provided * 0.08, 0, 0.95);

  const summary = buildSummary({ growth, risk, reasons });

  return {
    growthScore: Math.round(growth),
    riskScore: Math.round(risk),
    confidence: Number(confidence.toFixed(2)),
    summary,
    reasons: reasons.slice(0, 8),
  };
}

function buildSummary({ growth, risk }) {
  const g = growth >= 70 ? "strong" : growth >= 55 ? "moderate" : growth >= 40 ? "neutral" : "weak";
  const r = risk >= 65 ? "high" : risk >= 45 ? "moderate" : "low";
  return `Growth outlook looks ${g} with ${r} risk (growth ${Math.round(growth)}/100, risk ${Math.round(risk)}/100).`;
}

export default { scoreCompany };
