import { useEffect, useRef, useState } from "react";

export type Ticker = {
  symbol: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: number;
  direction: "up" | "down" | "flat";
};

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "MNTUSDT", "DOGEUSDT"];

const COINGECKO_ID_MAP: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  SOLUSDT: "solana",
  XRPUSDT: "ripple",
  ADAUSDT: "cardano",
  MNTUSDT: "mantle",
  DOGEUSDT: "dogecoin",
};

const FALLBACK_PRICES: Record<string, { price: number; change: number }> = {
  BTCUSDT: { price: 118430, change: 2.14 },
  ETHUSDT: { price: 4290.55, change: 1.62 },
  BNBUSDT: { price: 715.3, change: 1.1 },
  SOLUSDT: { price: 248.9, change: -0.84 },
  XRPUSDT: { price: 2.35, change: 0.5 },
  ADAUSDT: { price: 0.92, change: -0.3 },
  MNTUSDT: { price: 0.78, change: 0.2 },
  DOGEUSDT: { price: 0.38, change: -1.2 },
};

const REFRESH_INTERVAL = 30000;

export function useBinancePrices(symbols: string[] = DEFAULT_SYMBOLS) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const prevRef = useRef<Record<string, number>>({});
  const symsKey = symbols.join(",");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const fetchPrices = async () => {
      const ids = symbols.map((s) => COINGECKO_ID_MAP[s]).filter(Boolean).join(",");
      if (!ids) return;

      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`
        );
        if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
        const json = await res.json();

        if (cancelled) return;
        setStatus("live");

        setTickers((prev) => {
          const next = { ...prev };
          for (const sym of symbols) {
            const id = COINGECKO_ID_MAP[sym];
            if (!id || !json[id]) continue;
            const price = Number(json[id].usd ?? 0);
            const change = Number(json[id].usd_24h_change ?? 0);
            const volume = Number(json[id].usd_24h_vol ?? 0);
            const previous = prevRef.current[sym] ?? price;
            const direction: Ticker["direction"] = price > previous ? "up" : price < previous ? "down" : "flat";
            prevRef.current[sym] = price;
            next[sym] = { symbol: sym, price, change, high: 0, low: 0, volume, direction };
          }
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setTickers((prev) => {
          const next = { ...prev };
          for (const sym of symbols) {
            if (next[sym]) continue;
            const fb = FALLBACK_PRICES[sym];
            if (fb) next[sym] = { symbol: sym, price: fb.price, change: fb.change, high: 0, low: 0, volume: 0, direction: "flat" };
          }
          return next;
        });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, [symsKey]);

  return { tickers, status };
}
