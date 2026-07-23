// AI chat engine (Phase 11)
// -----------------------------------------------------------------------------
// Answers natural-language questions ("Why is TCS falling?", "Should I continue
// my SIP?", "Why is Infosys PE high?") using the data in the database plus the
// per-company knowledge documents.
//
// If ANTHROPIC_API_KEY is set, `answerQuestion` could forward the assembled
// context to an LLM. By default it uses a retrieval + template approach so the
// app works offline and every answer is grounded in stored data.
import prisma from "../config/prisma.js";

// Very small intent + entity extractor. Deliberately simple and explainable.
export async function answerQuestion(message) {
  const text = message.toLowerCase();

  const company = await matchCompany(text);
  const intent = classify(text);

  if (company) {
    const full = await prisma.company.findUnique({
      where: { id: company.id },
      include: { stock: true, aiScore: true, knowledge: true, news: { orderBy: { publishedAt: "desc" }, take: 5 } },
    });
    return companyAnswer(intent, full);
  }

  // generic / market questions
  return genericAnswer(intent, text);
}

async function matchCompany(text) {
  const companies = await prisma.company.findMany({ select: { id: true, symbol: true, name: true } });
  return companies.find(
    (c) => text.includes(c.symbol.toLowerCase()) || text.includes(c.name.toLowerCase().split(" ")[0]),
  );
}

function classify(text) {
  if (/(falling|down|drop|crash|fall)/.test(text)) return "why_down";
  if (/(rising|up|rally|gain|surge)/.test(text)) return "why_up";
  if (/\bpe\b|valuation|expensive|cheap/.test(text)) return "valuation";
  if (/sip|invest|buy|continue|should i/.test(text)) return "advice";
  if (/risk/.test(text)) return "risk";
  if (/midcap|smallcap|sector/.test(text)) return "sector";
  return "overview";
}

function companyAnswer(intent, c) {
  const s = c.stock;
  const ai = c.aiScore;
  const growth = (c.knowledge?.growthFactors || []).map(fName);
  const neg = (c.knowledge?.negativeFactors || []).map(fName);
  const reasons = ai?.reasons || [];

  const disclaimer = "This is a data-grounded explanation, not investment advice.";

  switch (intent) {
    case "why_down":
    case "why_up": {
      const dir = (s?.changePct ?? 0) >= 0 ? "up" : "down";
      const drivers = dir === "down" ? neg : growth;
      return {
        answer:
          `${c.symbol} is ${dir} ${Math.abs(s?.changePct ?? 0).toFixed(2)}% (₹${s?.price ?? "?"}). ` +
          `Likely relevant ${dir === "down" ? "headwinds" : "tailwinds"}: ${drivers.slice(0, 3).join(", ") || "n/a"}. ` +
          (reasons.length ? `Model notes: ${reasons.slice(0, 3).join("; ")}.` : ""),
        sources: buildSources(c),
        disclaimer,
      };
    }
    case "valuation":
      return {
        answer:
          `${c.symbol} trades at PE ${s?.pe ?? "?"} / PB ${s?.pb ?? "?"}, ROE ${s?.roe ?? "?"}%. ` +
          `A higher PE usually reflects the market pricing in growth drivers such as ${growth.slice(0, 3).join(", ") || "future earnings"}. ` +
          `Watch the risks: ${neg.slice(0, 2).join(", ") || "n/a"}.`,
        sources: buildSources(c),
        disclaimer,
      };
    case "risk":
      return {
        answer:
          `${c.symbol} risk score is ${ai?.riskScore ?? "n/a"}/100. Key risk factors: ${neg.slice(0, 4).join(", ") || "n/a"}.`,
        sources: buildSources(c),
        disclaimer,
      };
    case "advice":
      return {
        answer:
          `I can't tell you whether to buy or keep a SIP — that depends on your goals and risk tolerance. ` +
          `For ${c.symbol}: growth score ${ai?.growthScore ?? "n/a"}/100, risk ${ai?.riskScore ?? "n/a"}/100. ` +
          `Positives: ${growth.slice(0, 2).join(", ") || "n/a"}. Risks: ${neg.slice(0, 2).join(", ") || "n/a"}.`,
        sources: buildSources(c),
        disclaimer,
      };
    default:
      return {
        answer:
          `${c.name} (${c.symbol}): ₹${s?.price ?? "?"} (${(s?.changePct ?? 0).toFixed(2)}%). ` +
          (ai?.summary || "No AI summary yet — run scoring first."),
        sources: buildSources(c),
        disclaimer,
      };
  }
}

function genericAnswer(intent, text) {
  if (intent === "sector") {
    return {
      answer:
        "Sector or broad-index moves usually reflect a mix of macro factors (rates, inflation, FII/DII flows) and " +
        "sector-specific news. Check the Market Overview for today's sector performance and FII/DII data.",
      sources: [{ type: "market", ref: "/api/market/overview" }],
      disclaimer: "General explanation, not investment advice.",
    };
  }
  if (intent === "advice") {
    return {
      answer:
        "Whether to start or continue a SIP depends on your time horizon, goals and risk appetite — I won't make that call for you. " +
        "SIPs are generally designed to average cost through volatility over long horizons.",
      sources: [],
      disclaimer: "General educational information, not investment advice.",
    };
  }
  return {
    answer:
      "I can answer questions about specific companies (e.g. 'Why is TCS falling?', 'Why is Infosys PE high?') or the market. " +
      "Mention a company by name or symbol for a data-grounded answer.",
    sources: [],
    disclaimer: "General educational information, not investment advice.",
  };
}

const fName = (f) => (typeof f === "string" ? f : f.factor);

function buildSources(c) {
  const out = [{ type: "company", ref: `/api/companies/${c.symbol}` }];
  if (c.aiScore) out.push({ type: "ai_score", ref: `/api/companies/${c.symbol}` });
  if (c.news?.length) out.push({ type: "news", ref: `/api/news?symbol=${c.symbol}` });
  return out;
}

export default { answerQuestion };
