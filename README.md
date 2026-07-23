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

## Disclaimer

This project does not provide trading signals or financial advice. Any decision to
trade real money is entirely your own. A good result over a small number of demo
trades is not evidence that a strategy is profitable — variance dominates small
samples.
