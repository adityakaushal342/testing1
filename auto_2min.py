#!/usr/bin/env python3
"""
Auto 2-minute trend runner (educational)
========================================

Runs forever and, at the start of every 2-minute candle, checks the real QX
major pairs and prints the trend — UP / DOWN / HOLD — using exactly this rule
set:

STRONG BULLISH  -> UP (2-min)
  · Price above EMA20 and EMA50
  · EMA20 above EMA50
  · Both EMAs sloping up
  · RSI above 50 and momentum improving
  · Price bouncing from a support area
  · Market not sideways

STRONG BEARISH  -> DOWN (2-min)
  · Price below EMA20 and EMA50
  · EMA20 below EMA50
  · Both EMAs sloping down
  · RSI below 50
  · Price rejecting from a resistance area
  · Market not sideways

AVOID -> HOLD (do not trade)
  · EMAs flat
  · Price crossing EMAs repeatedly
  · RSI around 50
  · Candles small / overlapping
  · High-impact news nearby (check this yourself — the tool can't see news)

⚠️  Educational only. This is NOT a signal bot and cannot predict a 2-minute
    binary outcome. Practise on a demo account. It works on REAL pairs during
    market hours (OTC pairs have no public data, so they are not included).

Run it:
    python3 auto_2min.py            # every 2 minutes, all majors
    python3 auto_2min.py --once     # run a single scan and exit
    python3 auto_2min.py --pairs EURUSD GBPUSD
"""

from __future__ import annotations

import argparse
import time
from datetime import datetime

# Reuse the tested engine (rules live in one place: qx_trend_bot.py)
from qx_trend_bot import (
    DEFAULT_PAIRS,
    analyse,
    fetch_candles,
    badge,
    BOLD,
    RESET,
    COLORS,
)

INTERVAL = 120  # 2 minutes, in seconds


def seconds_to_next_boundary(interval: int = INTERVAL) -> float:
    """Seconds until the next aligned 2-minute mark (e.g. :00, :02, :04...)."""
    now = time.time()
    return interval - (now % interval)


def run_once(pairs: dict, use_color: bool, bell: bool) -> None:
    B = BOLD if use_color else ""
    R = RESET if use_color else ""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{B}⏱  {stamp}  —  2-min trend check{R}")
    print("-" * 52)

    actionable: list[str] = []
    holds = 0
    errors = 0

    for name, sym in pairs.items():
        try:
            a = analyse(fetch_candles(sym))
            rsi_s = f"{a['rsi']:.0f}" if a["rsi"] is not None else " -"
            adx_s = f"{a['adx']:.0f}" if a["adx"] is not None else " -"
            print(f"{name:<9} {badge(a['signal'], use_color)}  "
                  f"{a['price']:<10.5f}  RSI {rsi_s:>3}  ADX {adx_s:>3}")

            if a["signal"] in ("UP", "DOWN"):
                actionable.append(f"{name} {a['signal']}")
                # show which rules passed for an actionable trade
                for ok, label in a.get("checklist", []):
                    print(f"            {'✓' if ok else '✗'} {label}")
                # the strength line (STRONG / MODERATE …) is the first reason
                if a["reasons"]:
                    print(f"            → {a['reasons'][0]}")
            else:
                holds += 1
        except Exception as e:  # noqa: BLE001 — keep scanning other pairs
            errors += 1
            print(f"{name:<9} {badge('ERR', use_color)}  "
                  f"({type(e).__name__})")

    print("-" * 52)
    if actionable:
        line = "  ·  ".join(actionable)
        if use_color:
            line = f"{COLORS['UP']}{line}{RESET}"
        print(f"{B}TRADE-WORTHY:{R} {line}   ({holds} on HOLD)")
        if bell:
            print("\a", end="")  # terminal beep when something is actionable
    else:
        print(f"{B}All HOLD{R} — no clean trend this candle. Better to wait.")
    if errors:
        print(f"({errors} pair(s) not fetched — market may be closed / offline.)")
    print("⚠ Check for high-impact news before any trade.")


def main() -> int:
    p = argparse.ArgumentParser(
        description="Auto 2-minute trend runner (educational).")
    p.add_argument("--once", action="store_true",
                   help="run a single scan and exit")
    p.add_argument("--interval", type=int, default=INTERVAL,
                   help="seconds between scans (default 120 = 2 min)")
    p.add_argument("--no-align", action="store_true",
                   help="do not wait for the 2-minute clock boundary")
    p.add_argument("--no-color", action="store_true", help="disable colors")
    p.add_argument("--no-bell", action="store_true",
                   help="do not beep on a trade-worthy signal")
    p.add_argument("--pairs", nargs="+", metavar="EURUSD",
                   help="only scan these pairs")
    args = p.parse_args()

    pairs = DEFAULT_PAIRS
    if args.pairs:
        want = {x.upper().replace("/", "") for x in args.pairs}
        pairs = {k: v for k, v in DEFAULT_PAIRS.items()
                 if k.replace("/", "") in want}
        if not pairs:
            print("No matching pairs. Available:", ", ".join(DEFAULT_PAIRS))
            return 1

    import sys
    use_color = not args.no_color and sys.stdout.isatty()
    bell = not args.no_bell

    B = BOLD if use_color else ""
    R = RESET if use_color else ""
    print(f"{B}Auto 2-min Trend Runner — educational, not a signal bot{R}")
    print("Rules: EMA20/50 + slope, RSI(50) + momentum, support/resistance, "
          "ADX. HOLD on sideways/whipsaw/flat.")
    print("Practise on a demo account. Ctrl+C to stop.\n")

    try:
        if args.once:
            run_once(pairs, use_color, bell)
            return 0
        while True:
            run_once(pairs, use_color, bell)
            if args.no_align:
                wait = args.interval
            else:
                wait = seconds_to_next_boundary(args.interval)
            mins, secs = divmod(int(wait), 60)
            print(f"\n… next check in {mins}m {secs:02d}s "
                  f"(aligned to {args.interval // 60}-min candle). Ctrl+C to stop.")
            time.sleep(wait)
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
