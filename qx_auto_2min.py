#!/usr/bin/env python3
"""
QX Auto 2-minute Trend Runner — SINGLE FILE (educational)
=========================================================

Everything is in this ONE file — no other file to import. Just run it:

    python qx_auto_2min.py            (terminal)
    or paste it into a single Google Colab / Jupyter cell and run.

It checks the real QX major pairs every 2 minutes and prints the trend
(UP / DOWN / HOLD) using this rule set:

  STRONG BULLISH -> UP (2-min)
    Price above EMA20 & EMA50 · EMA20 above EMA50 · both EMAs sloping up ·
    RSI above 50 and improving · price bouncing from support · not sideways
  STRONG BEARISH -> DOWN (2-min)
    Price below EMA20 & EMA50 · EMA20 below EMA50 · both EMAs sloping down ·
    RSI below 50 · price rejecting from resistance · not sideways
  AVOID -> HOLD (do not trade)
    EMAs flat · price crossing EMAs repeatedly · RSI ~50 ·
    small/overlapping candles · high-impact news nearby (check yourself)

⚠️  Educational only. NOT a signal bot. It cannot predict a 2-minute binary
    outcome. Practise on a demo account. Works on REAL pairs during market
    hours; OTC pairs have no public data and are not included.

Needs the `requests` package:  pip install requests
(in Colab it's already installed.)

------------------------------------------------------------------
SETTINGS — change these if you want:
"""
RUN_ONCE = False      # True  = ek baar chala ke ruk jao
                      # False = har 2 minute auto (Ctrl+C / stop se roko)
INTERVAL = 120        # seconds between checks (120 = 2 minutes)
ALIGN_TO_CLOCK = True # True = 2-min candle boundary pe aligned
ONLY_PAIRS = None     # None = saare 7 pairs; ya list do e.g. ["EUR/USD","GBP/USD"]
BELL = True           # actionable signal pe terminal beep
# ------------------------------------------------------------------

import sys
import time
from datetime import datetime

import requests

# The real (non-OTC) major pairs on QX. Yahoo FX symbols look like "EURUSD=X".
PAIRS = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "USD/CHF": "USDCHF=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "USDCAD=X",
    "NZD/USD": "NZDUSD=X",
}
YF_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"


# ============================ indicators ============================
def ema(values, period):
    if not values:
        return []
    k = 2 / (period + 1)
    out = [values[0]]
    for v in values[1:]:
        out.append(v * k + out[-1] * (1 - k))
    return out


def rsi(values, period=14):
    if len(values) < period + 1:
        return None
    gains = losses = 0.0
    for i in range(1, period + 1):
        ch = values[i] - values[i - 1]
        gains += max(ch, 0.0)
        losses += max(-ch, 0.0)
    avg_gain, avg_loss = gains / period, losses / period
    for i in range(period + 1, len(values)):
        ch = values[i] - values[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(ch, 0.0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-ch, 0.0)) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - 100.0 / (1.0 + rs)


def macd(values, fast=12, slow=26, signal=9):
    if len(values) < slow + signal:
        return None
    ef, es = ema(values, fast), ema(values, slow)
    macd_line = [f - s for f, s in zip(ef, es)]
    sig = ema(macd_line, signal)
    return macd_line[-1] - sig[-1]


def adx(highs, lows, closes, period=14):
    n = len(closes)
    if n < period * 2:
        return None
    trs, plus_dm, minus_dm = [], [], []
    for i in range(1, n):
        up = highs[i] - highs[i - 1]
        down = lows[i - 1] - lows[i]
        plus_dm.append(up if (up > down and up > 0) else 0.0)
        minus_dm.append(down if (down > up and down > 0) else 0.0)
        trs.append(max(highs[i] - lows[i],
                       abs(highs[i] - closes[i - 1]),
                       abs(lows[i] - closes[i - 1])))

    def smooth(seq):
        out = [sum(seq[:period])]
        for i in range(period, len(seq)):
            out.append(out[-1] - out[-1] / period + seq[i])
        return out

    tr_s, plus_s, minus_s = smooth(trs), smooth(plus_dm), smooth(minus_dm)
    dxs = []
    for tr, pdm, mdm in zip(tr_s, plus_s, minus_s):
        if tr == 0:
            continue
        pdi, mdi = 100 * pdm / tr, 100 * mdm / tr
        if pdi + mdi == 0:
            continue
        dxs.append(100 * abs(pdi - mdi) / (pdi + mdi))
    if len(dxs) < period:
        return None
    val = sum(dxs[:period]) / period
    for dx in dxs[period:]:
        val = (val * (period - 1) + dx) / period
    return val


def slope_pct(series, lookback=5):
    if len(series) < lookback + 1 or series[-1 - lookback] == 0:
        return None
    return (series[-1] - series[-1 - lookback]) / abs(series[-1 - lookback]) * 100


def whipsaw_count(close, ema_series, bars=15):
    n = min(bars, len(close), len(ema_series))
    if n < 3:
        return 0
    diffs = [close[-i] - ema_series[-i] for i in range(1, n + 1)]
    return sum(1 for a, b in zip(diffs, diffs[1:]) if (a > 0) != (b > 0))


def small_overlapping(high, low, recent=5, base=30):
    if len(high) < base:
        return False
    rng = [h - l for h, l in zip(high, low)]
    avg_recent = sum(rng[-recent:]) / recent
    avg_base = sum(rng[-base:]) / base
    return avg_base > 0 and avg_recent < 0.6 * avg_base


def near_support(price, low, window=20, tol_pct=0.05):
    if len(low) < window:
        return False
    lo = min(low[-window:])
    return lo > 0 and (price - lo) / price * 100 <= tol_pct


def near_resistance(price, high, window=20, tol_pct=0.05):
    if len(high) < window:
        return False
    hi = max(high[-window:])
    return hi > 0 and (hi - price) / price * 100 <= tol_pct


# ============================ data fetch ============================
def fetch_candles(symbol, interval="1m", rng="1d"):
    r = requests.get(YF_URL.format(sym=symbol),
                     params={"interval": interval, "range": rng},
                     headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
    r.raise_for_status()
    result = r.json()["chart"]["result"][0]
    q = result["indicators"]["quote"][0]
    rows = [(o, h, l, c) for o, h, l, c in
            zip(q["open"], q["high"], q["low"], q["close"])
            if None not in (o, h, l, c)]
    if not rows:
        raise ValueError("no usable candles")
    o, h, l, c = map(list, zip(*rows))
    return {"open": o, "high": h, "low": l, "close": c}


# ============================ decision ============================
def analyse(candles):
    close, high, low = candles["close"], candles["high"], candles["low"]
    price = close[-1]
    e20s, e50s = ema(close, 20), ema(close, 50)
    e20, e50 = e20s[-1], e50s[-1]
    r = rsi(close, 14)
    r_prev = rsi(close[:-3], 14) if len(close) > 20 else None
    adx_val = adx(high, low, close, 14)
    s20, s50 = slope_pct(e20s), slope_pct(e50s)
    gap = abs(e20 - e50) / price * 100 if price else 0.0
    whips = whipsaw_count(close, e20s)

    weak = adx_val is not None and adx_val < 20
    flat = gap < 0.02 or (s20 is not None and abs(s20) < 0.005)
    neutral = r is not None and 45 <= r <= 55
    whipy = whips >= 4
    tiny = small_overlapping(high, low)
    sideways = weak or flat or neutral or whipy or tiny

    r_up = r is not None and r > 50
    r_dn = r is not None and r < 50
    r_imp = r is not None and r_prev is not None and r > r_prev
    r_fall = r is not None and r_prev is not None and r < r_prev
    e_up = s20 is not None and s20 > 0 and s50 is not None and s50 > 0
    e_dn = s20 is not None and s20 < 0 and s50 is not None and s50 < 0

    bull = price > e20 and price > e50 and e20 > e50 and e_up and r_up
    bear = price < e20 and price < e50 and e20 < e50 and e_dn and r_dn

    def C(ok, label):
        return (ok, label)

    bull_list = [
        C(price > e20 and price > e50, "Price above EMA20 & EMA50"),
        C(e20 > e50, "EMA20 above EMA50"),
        C(e_up, "Both EMAs sloping up"),
        C(r_up, f"RSI above 50 (RSI {r:.0f})" if r is not None else "RSI above 50"),
        C(r_imp, "RSI momentum improving"),
        C(near_support(price, low), "Near support (possible bounce)"),
        C(not sideways, "Market not sideways"),
    ]
    bear_list = [
        C(price < e20 and price < e50, "Price below EMA20 & EMA50"),
        C(e20 < e50, "EMA20 below EMA50"),
        C(e_dn, "Both EMAs sloping down"),
        C(r_dn, f"RSI below 50 (RSI {r:.0f})" if r is not None else "RSI below 50"),
        C(r_fall, "RSI momentum weakening"),
        C(near_resistance(price, high), "Near resistance (possible reject)"),
        C(not sideways, "Market not sideways"),
    ]
    avoid_list = [
        C(flat, "EMAs flat"),
        C(whipy, f"Price crossing EMAs repeatedly ({whips}x)"),
        C(neutral, "RSI around 50"),
        C(tiny, "Candles small / overlapping"),
        C(weak, f"Weak trend (ADX {adx_val:.0f})" if adx_val is not None else "Weak trend (ADX)"),
    ]

    if sideways or (not bull and not bear):
        signal, checklist = "HOLD", avoid_list
        strength = "Sideways / avoid conditions active"
    elif bull:
        passed = sum(1 for ok, _ in bull_list if ok)
        signal, checklist = "UP", bull_list
        strength = f"{'STRONG' if passed >= 6 else 'MODERATE'} bullish · {passed}/7"
    else:
        passed = sum(1 for ok, _ in bear_list if ok)
        signal, checklist = "DOWN", bear_list
        strength = f"{'STRONG' if passed >= 6 else 'MODERATE'} bearish · {passed}/7"

    return {"signal": signal, "price": price, "rsi": r, "adx": adx_val,
            "whips": whips, "strength": strength, "checklist": checklist}


# ============================ display ============================
COLORS = {"UP": "\033[92m", "DOWN": "\033[91m", "HOLD": "\033[93m", "ERR": "\033[90m"}
BOLD, RESET = "\033[1m", "\033[0m"
USE_COLOR = sys.stdout.isatty()  # auto-off in notebooks/log files


def badge(sig):
    icon = {"UP": "UP  ", "DOWN": "DOWN", "HOLD": "HOLD", "ERR": "ERR "}.get(sig, sig)
    dot = {"UP": "🟢", "DOWN": "🔴", "HOLD": "🟡", "ERR": "⚪"}.get(sig, "")
    text = f"{dot} {icon}"
    return f"{COLORS.get(sig,'')}{text}{RESET}" if USE_COLOR else text


def run_once(pairs):
    B = BOLD if USE_COLOR else ""
    R = RESET if USE_COLOR else ""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{B}⏱  {stamp}  —  2-min trend check{R}")
    print("-" * 52)
    actionable, holds, errors = [], 0, 0
    for name, sym in pairs.items():
        try:
            a = analyse(fetch_candles(sym))
            rsi_s = f"{a['rsi']:.0f}" if a["rsi"] is not None else " -"
            adx_s = f"{a['adx']:.0f}" if a["adx"] is not None else " -"
            print(f"{name:<9} {badge(a['signal'])}  {a['price']:<10.5f}  "
                  f"RSI {rsi_s:>3}  ADX {adx_s:>3}")
            if a["signal"] in ("UP", "DOWN"):
                actionable.append(f"{name} {a['signal']}")
                for ok, label in a["checklist"]:
                    print(f"            {'✓' if ok else '✗'} {label}")
                print(f"            → {a['strength']}")
            else:
                holds += 1
        except Exception as e:
            errors += 1
            print(f"{name:<9} {badge('ERR')}  ({type(e).__name__})")
    print("-" * 52)
    if actionable:
        print(f"{B}TRADE-WORTHY:{R} " + "  ·  ".join(actionable) + f"   ({holds} on HOLD)")
        if BELL:
            print("\a", end="")
    else:
        print(f"{B}All HOLD{R} — no clean trend this candle. Better to wait.")
    if errors:
        print(f"({errors} pair(s) not fetched — market may be closed / offline.)")
    print("⚠ Check for high-impact news before any trade.")


def seconds_to_next_boundary(interval):
    return interval - (time.time() % interval)


def main():
    pairs = PAIRS
    if ONLY_PAIRS:
        want = {x.upper().replace("/", "") for x in ONLY_PAIRS}
        pairs = {k: v for k, v in PAIRS.items() if k.replace("/", "") in want} or PAIRS

    once = RUN_ONCE or ("--once" in sys.argv)
    B = BOLD if USE_COLOR else ""
    R = RESET if USE_COLOR else ""
    print(f"{B}QX Auto 2-min Trend Runner — educational, not a signal bot{R}")
    print("Rules: EMA20/50 + slope, RSI(50) + momentum, support/resistance, ADX.")
    print("Practise on a demo account. Stop with Ctrl+C (or the stop button).\n")

    try:
        if once:
            run_once(pairs)
            return
        while True:
            run_once(pairs)
            wait = INTERVAL if not ALIGN_TO_CLOCK else seconds_to_next_boundary(INTERVAL)
            m, s = divmod(int(wait), 60)
            print(f"\n… next check in {m}m {s:02d}s. Stop with Ctrl+C.")
            time.sleep(wait)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
