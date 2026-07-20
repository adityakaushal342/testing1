# QX Broker Strategy — Analysis & Demo Journal (Learning Tool)

A single-file, offline HTML tool to **structure your technical analysis** and
**journal your demo trades** while learning the EMA 20 / EMA 50 / RSI 14 / Volume
framework.

> ⚠️ **This is an educational tool, not financial advice, and NOT an auto
> buy/sell signal generator.** 2-minute binary options are very high-risk and
> most retail traders lose money. No indicator combination guarantees accuracy on
> a 2-minute expiry.

## What it does

- **Framework explainer** — what EMA 20, EMA 50, RSI 14 and Volume each tell you.
- **Analysis checklist** — you enter what the chart currently shows; the tool
  summarizes an *analysis bias* (an observation, **not** an entry signal) and,
  most usefully, flags the **avoid / no-trade** conditions (sideways market,
  RSI 45–55, flat EMAs, news windows, low liquidity).
- **Demo trade journal** — log each demo trade (asset, direction, stake, result,
  setup, notes). Data is saved only in your browser's `localStorage`; nothing is
  sent anywhere. Export/import as JSON.
- **Honest math** — from your logged results it shows your win rate, the
  **break-even win rate** required at your payout (`1 / (1 + payout)`), your
  per-trade expectancy, and demo P/L. After 20 trades it gives a reality-check
  verdict — and it deliberately will **not** tell you to move to a real account.
- **Learning notes** — trend ID, false breakouts, combining S/R with EMA/RSI,
  and why journaling/backtesting matters.

## Why the break-even math matters

Binary payouts are below 100% (often 70–90%). So a 50% win rate loses money. At an
80% payout you need **more than 55.6%** wins just to break even; at 85%, **54.1%**.
The tool computes this from your own payout input so you can compare it to your
actual demo results.

## Usage

Open `index.html` in any modern browser — no build step, no server, no
dependencies. Works fully offline. Your journal persists in that browser.

## Live trend helper (`qx_trend_bot.py`)

A small command-line companion that reads **live 1-minute prices** for the major
currency pairs and prints a plain-language read of the trend:

- 🟢 **UP** — trend pointing up
- 🔴 **DOWN** — trend pointing down
- 🟡 **HOLD** — market is sideways / unclear → **do not trade, study why**

It combines **EMA 20 / EMA 50** (direction), **RSI 14** (momentum),
**MACD** (momentum shift) and **ADX** (trend *strength*). When ADX is weak, the
EMAs are flat, or RSI sits in the 45–55 no-man's-land, it returns **HOLD** — the
whole point being to keep you *out* of choppy, coin-flip conditions.

```bash
pip install -r requirements.txt

python3 qx_trend_bot.py                 # scan all major pairs once
python3 qx_trend_bot.py --quiet         # one line per pair, no reasons
python3 qx_trend_bot.py --watch 60      # re-scan every 60 seconds
python3 qx_trend_bot.py --pairs EURUSD GBPUSD   # only these pairs
```

## Auto 2-minute runner (`auto_2min.py`)

Runs forever and, at the start of every 2-minute candle, checks all the real
majors and prints the trend — **UP / DOWN / HOLD** — applying the same rule set,
then beeps when a pair is trade-worthy. Aligned to the 2-minute clock so each
check lands near a fresh candle.

```bash
python3 auto_2min.py            # every 2 minutes, all majors (aligned)
python3 auto_2min.py --once     # a single scan, then exit
python3 auto_2min.py --pairs EURUSD GBPUSD
python3 auto_2min.py --no-bell --no-color   # quiet, log-friendly
```

Each cycle prints a timestamp, every pair's signal, the pass/fail checklist for
any UP/DOWN pair, and a `TRADE-WORTHY:` summary line (or `All HOLD` when nothing
is clean). It reuses the same engine as `qx_trend_bot.py`, so the rules are
identical.

### What it can and cannot do

- ✅ Works on **real** market pairs (e.g. `EUR/USD` during market hours), using a
  free public price source — no API key, no login, no account risk.
- ❌ Cannot read QX / Pocket Option **OTC** pairs. Those run on a private
  synthetic feed that is not published anywhere, so no external tool can see it.
- ❌ Does **not** predict the outcome of a 2-minute binary option. Nothing can do
  that reliably — 2-minute expiries are dominated by noise, and binary payouts
  are below 100%, so the math favours the broker over time.

Use it as a **learning aid**: read the trend, compare it to what you see on the
chart, and practise on a **demo account**. It is deliberately built to say
"HOLD / don't trade" often, because most short windows are not tradeable.

## Web version (`signal.html`)

A single-file, offline web page that runs the **same trend engine in your
browser** — no install, works on a phone. Open `signal.html` in any browser.

Two modes:

- **Paste Prices** — paste recent closing prices (or full OHLC lines) from your
  chart; it computes EMA/RSI/MACD/ADX and shows a big **UP / DOWN / HOLD** verdict
  with a pass/fail rule checklist.
- **Manual Checklist** — tick what you see on your QX chart; it applies the same
  bullish / bearish / avoid rules and tells you to trade or **HOLD**. This mode
  also works for **OTC pairs**, since you read the chart yourself.

Same honest limits apply: it is a learning aid, not a signal bot, and it cannot
predict a 2-minute outcome.

## Disclaimer

This project does not provide trading signals or financial advice. Any decision to
trade real money is entirely your own. A good result over a small number of demo
trades is not evidence that a strategy is profitable — variance dominates small
samples.
