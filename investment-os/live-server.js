// Investment OS — zero-dependency live server.
// -----------------------------------------------------------------------------
// The standalone HTML file can't reliably fetch Yahoo Finance directly because
// browsers block cross-origin requests (CORS) and public CORS proxies are
// flaky. This tiny server fixes that: it fetches Yahoo/Google SERVER-SIDE (no
// CORS at all) and serves the dashboard from the same origin, so live data just
// works.
//
// Requirements: Node 18+ (built-in fetch). NO npm install, NO database.
// Run:  node live-server.js       (then open the printed URL)
//
// It exposes a narrow, host-allowlisted proxy at /proxy?url=... used only by the
// dashboard for Yahoo Finance quotes and Google News RSS.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 4300;

// Locate the dashboard HTML. Prefer standalone-dashboard.html, but fall back to
// any .html in this folder (handles renamed/duplicated downloads like
// "standalone-dashboard (1).html").
function findDashboardHtml() {
  const preferred = path.join(__dirname, "standalone-dashboard.html");
  if (fs.existsSync(preferred)) return preferred;
  let files = [];
  try { files = fs.readdirSync(__dirname).filter((f) => f.toLowerCase().endsWith(".html")); } catch {}
  if (!files.length) return null;
  const score = (n) => { n = n.toLowerCase(); let s = 0; if (n.includes("standalone")) s += 2; if (n.includes("dashboard")) s += 2; return s; };
  files.sort((a, b) => score(b) - score(a));
  return path.join(__dirname, files[0]);
}

// Only these hosts may be proxied (prevents this from being an open proxy).
const ALLOWED_HOSTS = new Set([
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "news.google.com",
]);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // --- narrow proxy for the dashboard --------------------------------------
  if (url.pathname === "/proxy") {
    const target = url.searchParams.get("url");
    let parsed;
    try { parsed = new URL(target); } catch { return send(res, 400, "text/plain", "bad url"); }
    if (!ALLOWED_HOSTS.has(parsed.hostname)) return send(res, 403, "text/plain", "host not allowed");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0 (InvestmentOS)" }, signal: ctrl.signal });
      clearTimeout(t);
      const body = await r.text();
      res.writeHead(r.status, {
        "content-type": r.headers.get("content-type") || "text/plain",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      });
      res.end(body);
    } catch (e) {
      send(res, 502, "text/plain", "upstream error: " + e.message);
    }
    return;
  }

  // --- health check ---------------------------------------------------------
  if (url.pathname === "/health") return send(res, 200, "application/json", JSON.stringify({ ok: true }));

  // --- serve the dashboard --------------------------------------------------
  const htmlFile = findDashboardHtml();
  if (!htmlFile) {
    let listing = "";
    try { listing = fs.readdirSync(__dirname).join(", "); } catch {}
    return send(res, 500, "text/plain",
      "No dashboard .html found in this folder:\n  " + __dirname +
      "\nPut standalone-dashboard.html here (next to this server file).\nFiles currently here: " + listing);
  }
  try {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(htmlFile));
  } catch (e) {
    send(res, 500, "text/plain", "Could not read " + path.basename(htmlFile) + ": " + e.message);
  }
});

function send(res, code, type, body) {
  res.writeHead(code, { "content-type": type, "access-control-allow-origin": "*" });
  res.end(body);
}

server.listen(PORT, () => {
  console.log("\n  📊 Investment OS live dashboard running:");
  console.log(`  →  http://localhost:${PORT}\n`);
  console.log("  Open that URL in your browser. Live data comes from Yahoo Finance");
  console.log("  (fetched here on the server, so no CORS/proxy issues). Ctrl+C to stop.\n");
});
