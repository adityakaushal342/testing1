// Investment OS backend entry point (Phase 1).
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import companies from "./routes/companies.js";
import market from "./routes/market.js";
import portfolio from "./routes/portfolio.js";
import instruments from "./routes/instruments.js";
import news from "./routes/news.js";
import watchlist from "./routes/watchlist.js";
import search from "./routes/search.js";
import alerts from "./routes/alerts.js";
import ai from "./routes/ai.js";

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Serve the standalone live dashboard (public/index.html) at "/".
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "investment-os", time: new Date().toISOString() }));

app.use("/api/companies", companies);
app.use("/api/market", market);
app.use("/api/portfolio", portfolio);
app.use("/api", instruments); // /api/etfs, /api/mutual-funds, /api/bonds
app.use("/api/news", news);
app.use("/api/watchlist", watchlist);
app.use("/api/search", search);
app.use("/api/alerts", alerts);
app.use("/api/ai", ai);

// 404
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal error", detail: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Investment OS API listening on http://localhost:${PORT}`));

export default app;
