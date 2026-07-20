#!/usr/bin/env python3
"""
QX / Pocket Option — Live Trend Helper (Learning Tool)
======================================================

Reads recent 1-minute price data for major currency pairs, computes standard
technical indicators, and prints a plain-language read of the trend:

    UP     -> trend is pointing up
    DOWN   -> trend is pointing down
    HOLD   -> market is sideways / unclear  ->  do NOT trade, study why

⚠️  IMPORTANT — read this before using it
------------------------------------------
This is an EDUCATIONAL tool to help you *understand* the market while you learn
on a demo account. It is NOT a signal bot and it does NOT predict the result of
a 2-minute binary option. No indicator can do that reliably — 2-minute expiries
are dominated by random noise, and binary payouts are below 100%, so the math
favours the broker over time. Practise on a demo account. Never risk money you
cannot afford to lose.

DATA NOTE
---------
Live prices come from a free public source (Yahoo Finance) for REAL market
pairs (e.g. EUR/USD during market hours). QX / Pocket Option "OTC" pairs use a
private synthetic feed that is NOT available anywhere outside their platform, so
this tool CANNOT read OTC pairs. Use it for real pairs only.

Requires only `requests` (pip install requests).
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Pairs to scan. Yahoo Finance FX symbols look like "EURUSD=X".
# ---------------------------------------------------------------------------
DEFAULT_PAIRS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "USDCAD=X",
    "USD/CHF": "USDCHF=X",
    "NZD/USD": "NZDUSD=X",
    "EUR/JPY": "EURJPY=X",
    "GBP/JPY": "GBPJPY=X",
    "EUR/GBP": "EURGBP=X",
}

YF_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"


# ---------------------------------------------------------------------------
# Indicator maths (pure Python, no numpy/pandas needed)
# ---------------------------------------------------------------------------
def ema(values: list[float], period: int) -> list[float]:
    """Exponential moving average. Returns a list the same length as input."""
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def rsi(values: list[float], period: int = 14) -> Optional[float]:
    """Wilder's RSI on the last `period` moves. Returns 0-100 or None."""
    if len(values) < period + 1:
        return None
    gains, losses = 0.0, 0.0
    # seed with the first `period` changes
    for i in range(1, period + 1):
        ch = values[i] - values[i - 1]
        gains += max(ch, 0.0)
        losses += max(-ch, 0.0)
    avg_gain = gains / period
    avg_loss = losses / period
    # Wilder smoothing for the rest
    for i in range(period + 1, len(values)):
        ch = values[i] - values[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(ch, 0.0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-ch, 0.0)) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def macd(values: list[float], fast: int = 12, slow: int = 26, signal: int = 9):
    """Returns (macd_line, signal_line, histogram) latest values, or (None,)*3."""
    if len(values) < slow + signal:
        return None, None, None
    ema_fast = ema(values, fast)
    ema_slow = ema(values, slow)
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
    signal_line = ema(macd_line, signal)
    hist = macd_line[-1] - signal_line[-1]
    return macd_line[-1], signal_line[-1], hist


def adx(highs: list[float], lows: list[float], closes: list[float],
        period: int = 14) -> Optional[float]:
    """Average Directional Index — measures trend STRENGTH (not direction)."""
    n = len(closes)
    if n < period * 2:
        return None
    trs, plus_dm, minus_dm = [], [], []
    for i in range(1, n):
        up = highs[i] - highs[i - 1]
        down = lows[i - 1] - lows[i]
        plus_dm.append(up if (up > down and up > 0) else 0.0)
        minus_dm.append(down if (down > up and down > 0) else 0.0)
        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )
        trs.append(tr)

    def wilder_smooth(seq: list[float]) -> list[float]:
        out = [sum(seq[:period])]
        for i in range(period, len(seq)):
            out.append(out[-1] - out[-1] / period + seq[i])
        return out

    tr_s = wilder_smooth(trs)
    plus_s = wilder_smooth(plus_dm)
    minus_s = wilder_smooth(minus_dm)

    dxs = []
    for tr, pdm, mdm in zip(tr_s, plus_s, minus_s):
        if tr == 0:
            continue
        pdi = 100 * pdm / tr
        mdi = 100 * mdm / tr
        denom = pdi + mdi
        if denom == 0:
            continue
        dxs.append(100 * abs(pdi - mdi) / denom)
    if len(dxs) < period:
        return None
    # ADX = smoothed average of DX
    adx_val = sum(dxs[:period]) / period
    for dx in dxs[period:]:
        adx_val = (adx_val * (period - 1) + dx) / period
    return adx_val


# ---------------------------------------------------------------------------
# Data fetch
# ---------------------------------------------------------------------------
def fetch_candles(symbol: str, interval: str = "1m", rng: str = "1d"):
    """Return dict with lists: open/high/low/close. Raises on failure."""
    r = requests.get(
        YF_URL.format(sym=symbol),
        params={"interval": interval, "range": rng},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=20,
    )
    r.raise_for_status()
    result = r.json()["chart"]["result"][0]
    q = result["indicators"]["quote"][0]
    # zip and drop rows with any None (gaps)
    rows = [
        (o, h, l, c)
        for o, h, l, c in zip(q["open"], q["high"], q["low"], q["close"])
        if None not in (o, h, l, c)
    ]
    if not rows:
        raise ValueError("no usable candles returned")
    o, h, l, c = map(list, zip(*rows))
    return {"open": o, "high": h, "low": l, "close": c}


# ---------------------------------------------------------------------------
# Decision logic
# ---------------------------------------------------------------------------
def analyse(candles: dict) -> dict:
    """Turn raw candles into a signal + human-readable reasons."""
    close = candles["close"]
    high = candles["high"]
    low = candles["low"]
    price = close[-1]

    ema20 = ema(close, 20)[-1]
    ema50 = ema(close, 50)[-1]
    r = rsi(close, 14)
    _, _, hist = macd(close)
    adx_val = adx(high, low, close, 14)

    reasons: list[str] = []

    # EMA separation as a % of price — flat EMAs => no trend
    ema_gap_pct = abs(ema20 - ema50) / price * 100 if price else 0.0

    # --- trend strength gate (ADX) ---
    weak_trend = adx_val is not None and adx_val < 20
    flat_emas = ema_gap_pct < 0.02  # EMAs basically on top of each other
    neutral_rsi = r is not None and 45 <= r <= 55

    if weak_trend:
        reasons.append(f"ADX {adx_val:.0f} < 20 → trend weak (choppy)")
    if flat_emas:
        reasons.append("EMA20 and EMA50 almost flat/overlapping → no clear trend")
    if neutral_rsi:
        reasons.append(f"RSI {r:.0f} in 45-55 → indecision")

    bullish = ema20 > ema50 and price > ema20 and (hist is None or hist > 0)
    bearish = ema20 < ema50 and price < ema20 and (hist is None or hist < 0)

    # HOLD if the market is sideways / signals disagree
    if weak_trend or flat_emas or neutral_rsi or (not bullish and not bearish):
        signal = "HOLD"
        if not reasons:
            reasons.append("EMA / MACD signals disagree → unclear direction")
        reasons.append("→ Sideways/unclear: do NOT trade, watch why it is ranging")
    elif bullish:
        signal = "UP"
        reasons.append(f"Price > EMA20 > EMA50 and MACD momentum up")
        if adx_val is not None:
            reasons.append(f"ADX {adx_val:.0f} → trend has strength")
        if r is not None:
            reasons.append(f"RSI {r:.0f}")
    else:  # bearish
        signal = "DOWN"
        reasons.append(f"Price < EMA20 < EMA50 and MACD momentum down")
        if adx_val is not None:
            reasons.append(f"ADX {adx_val:.0f} → trend has strength")
        if r is not None:
            reasons.append(f"RSI {r:.0f}")

    return {
        "signal": signal,
        "price": price,
        "ema20": ema20,
        "ema50": ema50,
        "rsi": r,
        "adx": adx_val,
        "macd_hist": hist,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# Presentation
# ---------------------------------------------------------------------------
COLORS = {
    "UP": "\033[92m",     # green
    "DOWN": "\033[91m",   # red
    "HOLD": "\033[93m",   # yellow
    "ERR": "\033[90m",    # grey
}
BOLD = "\033[1m"
RESET = "\033[0m"


def badge(signal: str, use_color: bool) -> str:
    icon = {"UP": "🟢 UP  ", "DOWN": "🔴 DOWN", "HOLD": "🟡 HOLD", "ERR": "⚪ ERR "}.get(signal, signal)
    if not use_color:
        return icon
    return f"{COLORS.get(signal, '')}{icon}{RESET}"


def scan(pairs: dict, verbose: bool, use_color: bool) -> None:
    print(f"\n{BOLD}Pair       Signal    Price       RSI   ADX{RESET}")
    print("-" * 46)
    for name, sym in pairs.items():
        try:
            candles = fetch_candles(sym)
            a = analyse(candles)
            rsi_s = f"{a['rsi']:.0f}" if a["rsi"] is not None else " -"
            adx_s = f"{a['adx']:.0f}" if a["adx"] is not None else " -"
            print(f"{name:<10} {badge(a['signal'], use_color)}  "
                  f"{a['price']:<10.5f}  {rsi_s:>3}  {adx_s:>3}")
            if verbose:
                for reason in a["reasons"]:
                    print(f"             · {reason}")
        except Exception as e:  # noqa: BLE001 — keep scanning other pairs
            print(f"{name:<10} {badge('ERR', use_color)}  ({type(e).__name__}: {e})")
    print()


def main() -> int:
    p = argparse.ArgumentParser(
        description="Live multi-pair trend helper (educational).",
    )
    p.add_argument("--watch", type=int, metavar="SEC",
                   help="re-scan every SEC seconds (e.g. --watch 60)")
    p.add_argument("--quiet", action="store_true",
                   help="one line per pair, no reasons")
    p.add_argument("--no-color", action="store_true", help="disable ANSI colors")
    p.add_argument("--pairs", nargs="+", metavar="EURUSD",
                   help="only scan these pairs (e.g. --pairs EURUSD GBPUSD)")
    args = p.parse_args()

    pairs = DEFAULT_PAIRS
    if args.pairs:
        want = {x.upper().replace("/", "") for x in args.pairs}
        pairs = {k: v for k, v in DEFAULT_PAIRS.items()
                 if k.replace("/", "") in want}
        if not pairs:
            print("No matching pairs. Available:", ", ".join(DEFAULT_PAIRS))
            return 1

    verbose = not args.quiet
    use_color = not args.no_color and sys.stdout.isatty()

    print(f"{BOLD}QX / Pocket Option — Live Trend Helper (learning tool){RESET}")
    print("Educational only. Not a signal bot. Practise on a demo account.")

    try:
        if args.watch:
            while True:
                scan(pairs, verbose, use_color)
                print(f"(refreshing in {args.watch}s — Ctrl+C to stop)")
                time.sleep(args.watch)
        else:
            scan(pairs, verbose, use_color)
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
