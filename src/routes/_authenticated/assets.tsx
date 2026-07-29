import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBinancePrices } from "@/hooks/useBinancePrices";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, Wallet as WalletIcon } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/assets")({
  component: AssetsPage,
  head: () => ({ meta: [{ title: "Assets — Frobex" }] }),
});

const ASSET_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "MNTUSDT"];
const SYMBOL_META: Record<string, { name: string; icon: string; symbol: string }> = {
  BTCUSDT: { name: "Bitcoin", icon: "₿", symbol: "BTC" },
  ETHUSDT: { name: "Ethereum", icon: "Ξ", symbol: "ETH" },
  BNBUSDT: { name: "BNB", icon: "B", symbol: "BNB" },
  SOLUSDT: { name: "Solana", icon: "◎", symbol: "SOL" },
  XRPUSDT: { name: "XRP", icon: "✕", symbol: "XRP" },
  ADAUSDT: { name: "Cardano", icon: "₳", symbol: "ADA" },
  DOGEUSDT: { name: "Dogecoin", icon: "Ð", symbol: "DOGE" },
  MNTUSDT: { name: "Mantle", icon: "M", symbol: "MNT" },
};

function AssetsPage() {
  const { user } = useAuth();
  const { tickers } = useBinancePrices(ASSET_SYMBOLS);

  const { data: holdings } = useQuery({
    queryKey: ["my_holdings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any).from("user_holdings").select("*").eq("user_id", user.id).order("symbol", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("live_balance, demo_balance, account_mode").eq("id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const mode = (profile as any)?.account_mode as "demo" | "live" | undefined;
  const fiatBalance = mode === "demo" ? Number((profile as any)?.demo_balance ?? 0) : Number((profile as any)?.live_balance ?? 0);

  const enriched = useMemo(() => {
    return (holdings ?? []).map((h: any) => {
      const priceSymbol = `${h.symbol}USDT`;
      const price = tickers[priceSymbol]?.price ?? 0;
      const qty = Number(h.quantity ?? 0);
      const usdValue = qty * price;
      return { ...h, price, usdValue };
    });
  }, [holdings, tickers]);

  const totalCryptoValue = enriched.reduce((s: number, h: any) => s + h.usdValue, 0);
  const totalValue = fiatBalance + totalCryptoValue;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
          <WalletIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
          <p className="text-sm text-muted-foreground">Individual crypto wallet balances with live valuation.</p>
        </div>
      </div>

      <Card className="p-6 bg-morph">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Total portfolio value</div>
            <div className="mt-1 text-3xl font-black tabular-nums">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <div className="text-xs text-muted-foreground">Cash balance ({(mode ?? "live").toUpperCase()})</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">${fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="rounded-lg bg-surface p-3">
            <div className="text-xs text-muted-foreground">Crypto holdings</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-success">${totalCryptoValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><Bitcoin className="h-4 w-4 text-primary" /> Crypto wallets</h2>
        {enriched.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No crypto holdings yet. Deposit or trade to build your portfolio.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map((h: any) => {
              const meta = Object.values(SYMBOL_META).find((m) => m.symbol === h.symbol);
              return (
                <div key={h.id ?? h.symbol} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground text-sm font-bold">
                      {meta?.icon ?? h.symbol?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{h.symbol}</div>
                      <div className="text-xs text-muted-foreground">{meta?.name ?? h.symbol}</div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{h.network ?? "spot"}</Badge>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-semibold tabular-nums">{Number(h.quantity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 8 })} {h.symbol}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Live price</span>
                      <span className="font-semibold tabular-nums">${(h.price ?? 0).toLocaleString(undefined, { maximumFractionDigits: h.price < 1 ? 4 : 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-1">
                      <span className="text-muted-foreground">USD value</span>
                      <span className="font-bold tabular-nums text-success">${h.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
