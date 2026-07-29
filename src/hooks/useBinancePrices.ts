import { useEffect, useRef, useState } from "react";

export type Ticker = {
  symbol: string;      // e.g. "BTCUSDT"
  price: number;
  change: number;      // 24h percent
  high: number;
  low: number;
  volume: number;
  direction: "up" | "down" | "flat";
};

const DEFAULT_SYMBOLS = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","MNTUSDT","DOGEUSDT"];

// Custom hook — connects to Binance combined ticker stream and returns a live
// symbol → Ticker map with auto-reconnect and CoinGecko REST fallback for cold-start.
export function useBinancePrices(symbols: string[] = DEFAULT_SYMBOLS) {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const symsKey = symbols.join(",");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let closed = false;
    let retry = 0;
    const prev: Record<string, number> = {};

    const connect = () => {
      const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      wsRef.current = ws;
      ws.onopen = () => { retry = 0; setStatus("live"); };
      ws.onmessage = (ev) => {
        try {
          const { data } = JSON.parse(ev.data);
          if (!data || !data.s) return;
          const sym = data.s as string;
          const price = Number(data.c);
          const change = Number(data.P);
          const high = Number(data.h);
          const low = Number(data.l);
          const volume = Number(data.v);
          const previous = prev[sym] ?? price;
          const direction: Ticker["direction"] = price > previous ? "up" : price < previous ? "down" : "flat";
          prev[sym] = price;
          setTickers((t) => ({ ...t, [sym]: { symbol: sym, price, change, high, low, volume, direction } }));
        } catch { /* ignore */ }
      };
      ws.onerror = () => setStatus("error");
      ws.onclose = () => {
        if (closed) return;
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 500 * 2 ** retry);
      };
    };

    // Bybit REST fallback for immediate values (before WS ticks arrive)
    (async () => {
      try {
        const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot`);
        if (!res.ok) throw new Error("bybit failed");
        const j = await res.json();
        const list = j?.result?.list ?? [];
        const bybitMap: Record<string, { price: number; change: number }> = {};
        for (const item of list) {
          bybitMap[item.symbol] = { price: Number(item.lastPrice), change: Number(item.price24hPcnt) * 100 };
        }
        setTickers((t) => {
          const next = { ...t };
          for (const s of symbols) {
            if (next[s]) continue;
            const b = bybitMap[s];
            if (b) next[s] = { symbol: s, price: b.price, change: b.change, high: 0, low: 0, volume: 0, direction: "flat" };
          }
          return next;
        });
      } catch {
        // CoinGecko secondary fallback
        const map: Record<string, string> = { BTCUSDT: "bitcoin", ETHUSDT: "ethereum", BNBUSDT: "binancecoin", SOLUSDT: "solana", XRPUSDT: "ripple", ADAUSDT: "cardano", MNTUSDT: "mantle", DOGEUSDT: "dogecoin" };
        const ids = symbols.map((s) => map[s]).filter(Boolean).join(",");
        if (!ids) return;
        try {
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
          if (!res.ok) return;
          const j = await res.json();
          setTickers((t) => {
            const next = { ...t };
            for (const s of symbols) {
              const id = map[s]; if (!id || !j[id]) continue;
              if (!next[s]) next[s] = { symbol: s, price: j[id].usd, change: j[id].usd_24h_change ?? 0, high: 0, low: 0, volume: 0, direction: "flat" };
            }
            return next;
          });
        } catch { /* ignore */ }
      }
    })();

    connect();
    return () => { closed = true; wsRef.current?.close(); };
  }, [symsKey]);

  return { tickers, status };
}
