import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBinancePrices } from "@/hooks/useBinancePrices";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bitcoin, Wallet as WalletIcon, Search, ArrowDownToLine, ArrowUpFromLine, PieChart } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/assets")({
  component: AssetsPage,
  head: () => ({
    meta: [
      { title: "My Assets — Frobex" },
      { name: "description", content: "Individual crypto wallets with live valuation and portfolio distribution." },
      { property: "og:title", content: "My Assets — Frobex" },
      { property: "og:description", content: "Track every crypto wallet balance in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SUPPORTED = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", decimals: 6 },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", decimals: 5 },
  { symbol: "BNB", name: "BNB", icon: "B", decimals: 4 },
  { symbol: "SOL", name: "Solana", icon: "◎", decimals: 4 },
  { symbol: "XRP", name: "XRP", icon: "✕", decimals: 2 },
  { symbol: "ADA", name: "Cardano", icon: "₳", decimals: 2 },
  { symbol: "DOGE", name: "Dogecoin", icon: "Ð", decimals: 2 },
  { symbol: "USDT", name: "Tether", icon: "₮", decimals: 2 },
];

const PRICE_SYMBOLS = SUPPORTED.filter((s) => s.symbol !== "USDT").map((s) => `${s.symbol}USDT`);

function fmt(n: number, decimals: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: Math.min(2, decimals), maximumFractionDigits: decimals });
}

function AssetsPage() {
  const { user } = useAuth();
  const { tickers } = useBinancePrices(PRICE_SYMBOLS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"value" | "name">("value");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["my_crypto_wallets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_crypto_balances")
        .select("*")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 8000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("live_balance, demo_balance, account_mode, crypto_balances")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 8000,
  });

  const mode = (profile as any)?.account_mode as "demo" | "live" | undefined;
  const fiatBalance = mode === "demo" ? Number((profile as any)?.demo_balance ?? 0) : Number((profile as any)?.live_balance ?? 0);

  const enriched = useMemo(() => {
    const jsonBalances = ((profile as any)?.crypto_balances ?? {}) as Record<string, number>;
    const rowMap = new Map<string, number>();
    (wallets ?? []).forEach((w: any) => rowMap.set(String(w.asset_symbol).toUpperCase(), Number(w.balance ?? 0)));

    return SUPPORTED.map((meta) => {
      const qty = Math.max(rowMap.get(meta.symbol) ?? 0, Number(jsonBalances[meta.symbol] ?? 0));
      const price = meta.symbol === "USDT" ? 1 : tickers[`${meta.symbol}USDT`]?.price ?? 0;
      return { ...meta, qty, price, usdValue: qty * price };
    });
  }, [wallets, profile, tickers]);

  const totalCryptoValue = enriched.reduce((s, h) => s + h.usdValue, 0);
  const totalValue = fiatBalance + totalCryptoValue;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = enriched.filter((h) => !q || `${h.symbol} ${h.name}`.toLowerCase().includes(q));
    return [...list].sort((a, b) => (sort === "value" ? b.usdValue - a.usdValue : a.symbol.localeCompare(b.symbol)));
  }, [enriched, search, sort]);

  const distribution = useMemo(
    () => enriched.filter((h) => h.usdValue > 0).sort((a, b) => b.usdValue - a.usdValue),
    [enriched],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
          <WalletIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
          <p className="text-sm text-muted-foreground">Dedicated wallets for every supported cryptocurrency, valued live.</p>
        </div>
      </div>

      <Card className="p-6 bg-morph">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Total portfolio value</div>
            {isLoading ? <Skeleton className="mt-2 h-9 w-40" /> : (
              <div className="mt-1 text-3xl font-black tabular-nums">${fmt(totalValue, 2)}</div>
            )}
          </div>
          <div className="rounded-lg bg-surface p-3">
            <div className="text-xs text-muted-foreground">Cash balance ({(mode ?? "live").toUpperCase()})</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">${fmt(fiatBalance, 2)}</div>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <div className="text-xs text-muted-foreground">Crypto holdings</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-success">${fmt(totalCryptoValue, 2)}</div>
          </div>
        </div>
      </Card>

      {distribution.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <PieChart className="h-4 w-4 text-primary" /> Portfolio distribution
          </h2>
          <div className="space-y-2">
            {distribution.map((h) => {
              const pct = totalCryptoValue > 0 ? (h.usdValue / totalCryptoValue) * 100 : 0;
              return (
                <div key={h.symbol}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{h.symbol}</span>
                    <span className="tabular-nums text-muted-foreground">{pct.toFixed(1)}% · ${fmt(h.usdValue, 2)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                    <motion.div
                      className="h-full rounded-full bg-gradient-hero"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bitcoin className="h-4 w-4 text-primary" /> Crypto wallets
          </h2>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search asset…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSort(sort === "value" ? "name" : "value")}>
            Sort: {sort === "value" ? "Value" : "Name"}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((h, i) => (
              <motion.div
                key={h.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-sm font-bold text-primary-foreground">
                    {h.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{h.symbol}</div>
                    <div className="text-xs text-muted-foreground">{h.name}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">spot</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <motion.span key={h.qty} initial={{ scale: 1.15, color: "hsl(var(--success))" }} animate={{ scale: 1 }} className="font-semibold tabular-nums">
                      {fmt(h.qty, h.decimals)} {h.symbol}
                    </motion.span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Live price</span>
                    <span className="font-semibold tabular-nums">${fmt(h.price, h.price < 1 ? 4 : 2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 text-sm">
                    <span className="text-muted-foreground">USD value</span>
                    <span className="font-bold tabular-nums text-success">${fmt(h.usdValue, 2)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/deposit"><ArrowDownToLine className="mr-1 h-3.5 w-3.5" /> Deposit</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/withdraw"><ArrowUpFromLine className="mr-1 h-3.5 w-3.5" /> Withdraw</Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
