import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, ArrowDownToLine, ArrowUpFromLine, Loader2, X,
  Activity, Newspaper, Sparkles, ShieldCheck, AlertTriangle, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TradingChart, type Candle } from "@/components/TradingChart";
import type { Time } from "lightweight-charts";
import { useServerFn } from "@tanstack/react-start";
import { closePosition, openPosition } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type ChartMode = "profit" | "loss" | "flat";

const ASSETS = [
  { sym: "BTC/USD", base: 67500 },
  { sym: "ETH/USD", base: 3850 },
  { sym: "SOL/USD", base: 178 },
  { sym: "XAU/USD", base: 2640 },
  { sym: "EUR/USD", base: 1.085 },
];

function seedRand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function generateCandles(asset: string, base: number, mode: ChartMode, intensity: number, seed: number, count = 120): Candle[] {
  const rand = seedRand(seed + asset.charCodeAt(0));
  const out: Candle[] = [];
  let price = base;
  const now = Math.floor(Date.now() / 1000);
  const interval = 60; // 1 min
  const drift = mode === "profit" ? 0.0008 : mode === "loss" ? -0.0008 : 0;
  for (let i = count - 1; i >= 0; i--) {
    const t = (now - i * interval) as Time;
    const vol = base * 0.004 * intensity;
    const open = price;
    const change = (rand() - 0.5) * vol * 2 + drift * base;
    const close = Math.max(0.0001, open + change);
    const high = Math.max(open, close) + rand() * vol * 0.6;
    const low = Math.min(open, close) - rand() * vol * 0.6;
    out.push({ time: t, open, high, low, close });
    price = close;
  }
  return out;
}

function nextCandle(last: Candle, base: number, mode: ChartMode, intensity: number, rand: () => number): Candle {
  const drift = mode === "profit" ? 0.0008 : mode === "loss" ? -0.0008 : 0;
  const vol = base * 0.004 * intensity;
  const open = last.close;
  const close = Math.max(0.0001, open + (rand() - 0.5) * vol * 2 + drift * base);
  const high = Math.max(open, close) + rand() * vol * 0.6;
  const low = Math.min(open, close) - rand() * vol * 0.6;
  return { time: ((last.time as number) + 60) as Time, open, high, low, close };
}

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [assetSym, setAssetSym] = useState(ASSETS[0].sym);
  const asset = ASSETS.find((a) => a.sym === assetSym)!;
  const [showMA, setShowMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["profile", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["recent_tx", user.id] });
        qc.invalidateQueries({ queryKey: ["transactions", user.id] });
        const row = payload?.new;
        if (payload.eventType === "INSERT" && row && Number(row.amount) > 0) {
          const isCredit = ["deposit", "admin_credit", "referral_bonus", "trade_profit"].includes(row.type);
          if (isCredit) toast.success(`+$${Number(row.amount).toFixed(2)} · ${row.asset_name ?? row.type}`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ["my_deposits", user.id] });
        const row = payload?.new;
        if (payload.eventType === "UPDATE" && row?.status === "approved") {
          toast.success(`Deposit approved — $${Number(row.amount).toFixed(2)} credited to live balance`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  const mode = (profile?.chart_mode ?? "flat") as ChartMode;
  const intensity = Number(profile?.chart_intensity ?? 1);
  const seed = Number(profile?.chart_seed ?? 42);
  const accountMode = (profile?.account_mode ?? "demo") as "demo" | "live";
  const liveBalance = Number(profile?.live_balance ?? 0);
  const demoBalance = Number(profile?.demo_balance ?? 10000);
  const usableBalance = accountMode === "live" ? liveBalance : demoBalance;
  const kycStatus = (profile?.kyc_status ?? "none") as string;
  const isSuspended = Boolean(profile?.is_suspended);

  const switchMode = async (next: "demo" | "live") => {
    if (!user?.id || next === accountMode) return;
    if (next === "live" && kycStatus !== "approved") {
      toast.error("Complete KYC verification to trade with a live account");
      return;
    }
    if (next === "live" && isSuspended) {
      toast.error("Account suspended — contact support");
      return;
    }
    const { error } = await supabase.from("profiles").update({ account_mode: next, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`Switched to ${next.toUpperCase()} account`);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const [candles, setCandles] = useState<Candle[]>(() => generateCandles(asset.sym, asset.base, mode, intensity, seed));
  const randRef = useRef(seedRand(seed + 999));

  // Reset candles when asset / mode / seed change
  useEffect(() => {
    randRef.current = seedRand(seed + 999);
    setCandles(generateCandles(asset.sym, asset.base, mode, intensity, seed));
  }, [assetSym, mode, intensity, seed, asset.sym, asset.base]);

  // Live tick: append a new candle every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        const last = prev[prev.length - 1];
        const next = nextCandle(last, asset.base, mode, intensity, randRef.current);
        return [...prev.slice(-200), next];
      });
    }, 3000);
    return () => clearInterval(id);
  }, [asset.base, mode, intensity]);

  const lastPrice = candles[candles.length - 1]?.close ?? asset.base;
  const firstPrice = candles[0]?.close ?? asset.base;
  const changePct = ((lastPrice - firstPrice) / firstPrice) * 100;

  return (
    <div className="space-y-5 dark text-foreground">
      {/* HERO BALANCE + MODE SWITCH */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden border-0 p-5 sm:p-7 bg-gradient-hero text-primary-foreground shadow-glow">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 35%)" }} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{accountMode === "live" ? "LIVE TRADING ACCOUNT" : "DEMO PRACTICE ACCOUNT"}</span>
                {isSuspended && <Badge variant="destructive" className="ml-1">SUSPENDED</Badge>}
              </div>
              <div className="mt-1 text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
                ${usableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-xs opacity-80">
                {profile?.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {/* Mode toggle */}
              <div className="flex rounded-full bg-black/25 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() => switchMode("demo")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${accountMode === "demo" ? "bg-white text-primary shadow" : "text-white/80 hover:text-white"}`}
                >DEMO</button>
                <button
                  type="button"
                  onClick={() => switchMode("live")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${accountMode === "live" ? "bg-success text-success-foreground shadow" : "text-white/80 hover:text-white"}`}
                >LIVE</button>
              </div>
              {accountMode === "live" ? (
                <span className="text-[10px] opacity-80 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> KYC verified</span>
              ) : kycStatus !== "approved" ? (
                <Link to="/kyc" className="text-[10px] underline opacity-90 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Verify KYC for live
                </Link>
              ) : null}
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="bg-white/95 text-primary hover:bg-white"><Link to="/deposit"><ArrowDownToLine className="mr-1.5 h-4 w-4" /> Deposit</Link></Button>
            <Button asChild size="sm" variant="secondary" className="bg-black/30 text-white hover:bg-black/40"><Link to="/withdraw"><ArrowUpFromLine className="mr-1.5 h-4 w-4" /> Withdraw</Link></Button>
            <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/10"><Link to="/transactions">Activity <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
        </Card>
      </motion.div>

      {/* Mini balance cards (always show both so user sees real funds) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <BalanceCard label="Live balance" value={liveBalance} Icon={TrendingUp} accent="success" active={accountMode === "live"} />
        <BalanceCard label="Demo balance" value={demoBalance} Icon={Activity} accent="muted" active={accountMode === "demo"} />
        <BalanceCard label="Available cash" value={Number(profile?.available_cash ?? 0)} Icon={DollarSign} />
      </div>

      <Card className="p-4 sm:p-6 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Select value={assetSym} onValueChange={setAssetSym}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSETS.map((a) => <SelectItem key={a.sym} value={a.sym}>{a.sym}</SelectItem>)}
              </SelectContent>
            </Select>
            <div>
              <div className="text-2xl font-bold tabular-nums">${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className={`text-xs font-medium ${changePct >= 0 ? "text-success" : "text-destructive"}`}>
                {changePct >= 0 ? "▲" : "▼"} {changePct.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs"><Switch checked={showMA} onCheckedChange={setShowMA} /> MA(14)</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={showRSI} onCheckedChange={setShowRSI} /> RSI(14)</label>
          </div>
        </div>

        <div className="mt-4">
          <TradingChart candles={candles} showMA={showMA} showRSI={showRSI} />
        </div>

        <TradePanel asset={assetSym} price={lastPrice} balance={usableBalance} mode={accountMode} userId={user?.id} kycStatus={profile?.kyc_status ?? "none"} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><LivePositions price={lastPrice} asset={assetSym} userId={user?.id} qc={qc} /></div>
        <OrderBook price={lastPrice} />
      </div>

      <NewsTicker />
    </div>
  );
}

function BalanceCard({ label, value, Icon, accent }: { label: string; value: number; Icon: any; accent?: "success" | "muted" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === "success" ? "text-success" : accent === "muted" ? "text-muted-foreground" : "text-primary"}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">
        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </Card>
  );
}

function TradePanel({ asset, price, balance, mode, userId, kycStatus }: { asset: string; price: number; balance: number; mode: "demo" | "live"; userId?: string; kycStatus: string }) {
  const [amount, setAmount] = useState("100");
  const [leverage, setLeverage] = useState("10");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const openPositionFn = useServerFn(openPosition);

  const open = async (side: "buy" | "sell") => {
    if (!userId) return;
    const margin = Number(amount);
    const lev = Math.max(1, Math.min(100, Number(leverage)));
    if (!margin || margin <= 0) return toast.error("Enter margin amount");
    if (margin > balance) return toast.error("Insufficient balance");
    if (mode === "live" && kycStatus !== "approved") return toast.error("Complete KYC to trade live");

    setBusy(true);
    try {
      const qty = (margin * lev) / price;
      await openPositionFn({ data: { asset, side, quantity: qty, leverage: lev, margin, entryPrice: price, accountMode: mode } });
      toast.success(`${side.toUpperCase()} ${asset} @ $${price.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["transactions", userId] });
    } catch (err: any) {
      toast.error(err.message ?? "Trade failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
      <div className="space-y-1">
        <Label className="text-xs">Margin (USD)</Label>
        <Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Leverage (×)</Label>
        <Input type="number" min="1" max="100" step="1" value={leverage} onChange={(e) => setLeverage(e.target.value)} />
      </div>
      <Button onClick={() => open("sell")} disabled={busy} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
        SELL
      </Button>
      <Button onClick={() => open("buy")} disabled={busy} className="bg-success hover:bg-success/90 text-success-foreground font-bold">
        BUY
      </Button>
    </div>
  );
}

function LivePositions({ price, asset, userId, qc }: { price: number; asset: string; userId?: string; qc: ReturnType<typeof useQueryClient> }) {
  const closePositionFn = useServerFn(closePosition);
  const { data: positions } = useQuery({
    queryKey: ["positions", userId],
    queryFn: async () => {
      const { data } = await supabase.from("live_positions").select("*").eq("user_id", userId!).order("opened_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!userId,
    refetchInterval: 4000,
  });

  const close = async (p: any) => {
    const livePrice = p.asset === asset ? price : Number(p.entry_price);
    const direction = p.side === "buy" ? 1 : -1;
    const pnl = +((livePrice - Number(p.entry_price)) * Number(p.quantity) * direction).toFixed(2);
    try {
      const result = await closePositionFn({ data: { id: p.id, closePrice: livePrice } });
      const finalPnl = Number(result.pnl ?? pnl);
      toast.success(`Closed ${p.asset} · P&L ${finalPnl >= 0 ? "+" : ""}$${finalPnl.toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["transactions", userId] });
    } catch (err: any) {
      toast.error(err.message ?? "Close failed");
    }
  };

  const open = (positions ?? []).filter((p: any) => p.status === "open");

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live positions</h2>
      {!open.length ? (
        <p className="text-sm text-muted-foreground">No open positions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2">Asset</th><th className="pb-2">Side</th><th className="pb-2">Entry</th><th className="pb-2">Now</th><th className="pb-2 text-right">P&amp;L</th><th></th></tr>
            </thead>
            <tbody>
              {open.map((p: any) => {
                const livePrice = p.asset === asset ? price : Number(p.entry_price);
                const direction = p.side === "buy" ? 1 : -1;
                const pnl = (livePrice - Number(p.entry_price)) * Number(p.quantity) * direction;
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-medium">{p.asset} <span className="text-muted-foreground">×{p.leverage}</span></td>
                    <td><Badge className={p.side === "buy" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>{p.side.toUpperCase()}</Badge></td>
                    <td className="tabular-nums">${Number(p.entry_price).toFixed(2)}</td>
                    <td className="tabular-nums">${livePrice.toFixed(2)}</td>
                    <td className={`text-right tabular-nums font-semibold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </td>
                    <td className="text-right"><Button size="sm" variant="outline" onClick={() => close(p)}><X className="h-3 w-3" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function OrderBook({ price }: { price: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1200); return () => clearInterval(id); }, []);
  const rand = useMemo(() => seedRand(tick + 7), [tick]);
  const bids = Array.from({ length: 6 }, (_, i) => ({ p: price - (i + 1) * (price * 0.0004), q: (rand() * 5 + 0.2).toFixed(3) }));
  const asks = Array.from({ length: 6 }, (_, i) => ({ p: price + (i + 1) * (price * 0.0004), q: (rand() * 5 + 0.2).toFixed(3) }));
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order book</h2>
      <div className="space-y-0.5 text-xs font-mono">
        {asks.slice().reverse().map((a, i) => (
          <div key={`a${i}`} className="flex justify-between rounded bg-destructive/10 px-2 py-1">
            <span className="text-destructive">{a.p.toFixed(2)}</span><span>{a.q}</span>
          </div>
        ))}
        <div className="my-1 text-center text-sm font-bold tabular-nums">${price.toFixed(2)}</div>
        {bids.map((b, i) => (
          <div key={`b${i}`} className="flex justify-between rounded bg-success/10 px-2 py-1">
            <span className="text-success">{b.p.toFixed(2)}</span><span>{b.q}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NewsTicker() {
  const { data: news } = useQuery({
    queryKey: ["market_news"],
    queryFn: async () => {
      const { data } = await supabase.from("market_news").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 30000,
  });
  const items = news?.length ? news : [{ id: "x", title: "Markets open — Fed minutes ahead. Volatility expected on USD pairs.", impact: "medium", source: "Frobex Desk" }];
  return (
    <Card className="overflow-hidden p-3">
      <div className="flex items-center gap-3">
        <Newspaper className="h-4 w-4 shrink-0 text-primary" />
        <div className="relative flex-1 overflow-hidden">
          <motion.div
            className="flex gap-12 whitespace-nowrap text-xs"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
          >
            {[...items, ...items].map((n: any, i) => (
              <span key={`${n.id}${i}`} className="flex items-center gap-2">
                <Badge variant={n.impact === "high" ? "destructive" : "secondary"} className="text-[10px]">{n.impact}</Badge>
                <span className="font-medium">{n.title}</span>
                <span className="text-muted-foreground">— {n.source ?? "Wire"}</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </Card>
  );
}
