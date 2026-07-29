import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus, Wifi, WifiOff, Loader2, Search } from "lucide-react";
import { useBinancePrices } from "@/hooks/useBinancePrices";

export const Route = createFileRoute("/_authenticated/market")({
  component: Market,
});

const SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "MATICUSDT", "LTCUSDT", "DOTUSDT",
  "AVAXUSDT", "LINKUSDT", "UNIUSDT", "SHIBUSDT", "MNTUSDT",
  "TRXUSDT", "NEARUSDT", "FTMUSDT", "SANDUSDT", "MANAUSDT",
];

const LABEL: Record<string, string> = {
  BTCUSDT: "Bitcoin",      ETHUSDT: "Ethereum",      BNBUSDT: "BNB",
  SOLUSDT: "Solana",       XRPUSDT: "XRP",           ADAUSDT: "Cardano",
  DOGEUSDT: "Dogecoin",    MATICUSDT: "Polygon",      LTCUSDT: "Litecoin",
  DOTUSDT: "Polkadot",     AVAXUSDT: "Avalanche",     LINKUSDT: "Chainlink",
  UNIUSDT: "Uniswap",      SHIBUSDT: "Shiba Inu",     MNTUSDT: "Mantle",
  TRXUSDT: "TRON",         NEARUSDT: "NEAR Protocol", FTMUSDT: "Fantom",
  SANDUSDT: "The Sandbox", MANAUSDT: "Decentraland",
};

function ticker(sym: string) {
  return sym.replace("USDT", "");
}

function Market() {
  const { tickers, status } = useBinancePrices(SYMBOLS);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SYMBOLS;
    return SYMBOLS.filter((s) =>
      s.toLowerCase().includes(q) || (LABEL[s] ?? "").toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Crypto Market</h1>
          <p className="text-sm text-muted-foreground">Real-time prices streamed from Binance — auto-reconnects on any network issue.</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coin (BTC, Ethereum…)"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No coins match your search.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((sym) => {
            const t = tickers[sym];
            return <CoinCard key={sym} sym={sym} ticker={t} />;
          })}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: "connecting" | "live" | "error" }) {
  if (status === "live")
    return (
      <Badge className="gap-1.5 bg-success/20 text-success border-success/30">
        <Wifi className="h-3 w-3" /> Live
      </Badge>
    );
  if (status === "error")
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <WifiOff className="h-3 w-3" /> Reconnecting…
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
    </Badge>
  );
}

function CoinCard({ sym, ticker: t }: { sym: string; ticker: any }) {
  const pct = t ? Number(t.change) : 0;
  const positive = pct > 0;
  const zero = pct === 0 || !t;

  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold">{ticker(sym)}</span>
            <span className="text-[10px] text-muted-foreground font-medium">USDT</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{LABEL[sym] ?? sym}</p>
        </div>
        {zero ? (
          <Minus className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        ) : positive ? (
          <ArrowUpRight className="mt-0.5 h-4 w-4 text-success shrink-0" />
        ) : (
          <ArrowDownRight className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
        )}
      </div>

      <div className="mt-3">
        {t ? (
          <>
            <div className="text-xl font-bold tabular-nums">
              ${Number(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: t.price < 1 ? 6 : 2 })}
            </div>
            <div className={`mt-0.5 text-sm font-medium tabular-nums ${positive ? "text-success" : zero ? "text-muted-foreground" : "text-destructive"}`}>
              {positive ? "+" : ""}{pct.toFixed(2)}%
            </div>
            {t.high > 0 && (
              <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                <span>H: <span className="tabular-nums">{Number(t.high).toLocaleString(undefined, { maximumFractionDigits: t.high < 1 ? 6 : 2 })}</span></span>
                <span>L: <span className="tabular-nums">{Number(t.low).toLocaleString(undefined, { maximumFractionDigits: t.low < 1 ? 6 : 2 })}</span></span>
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        )}
      </div>
    </Card>
  );
}
