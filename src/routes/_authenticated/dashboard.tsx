import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Wallet, DollarSign, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type ChartMode = "profit" | "loss" | "flat";

// Deterministic PRNG so chart reproduces same baseline per user, then we animate the tail.
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateSeries(mode: ChartMode, base: number, seed: number, intensity: number, tick: number) {
  const points = 40;
  const rand = seededRandom(seed + Math.floor(tick / 8));
  const out: { day: string; value: number }[] = [];
  let v = Math.max(base, 100);
  for (let i = 0; i < points; i++) {
    const drift = mode === "profit" ? 1 : mode === "loss" ? -1 : 0;
    const jitter = (rand() - 0.5) * 60 * intensity;
    const wave = Math.sin((i + tick * 0.25) * 0.55) * 25 * intensity;
    v += drift * (40 + Math.abs(jitter)) * intensity + jitter + wave;
    v = Math.max(50, v);
    out.push({ day: `T${i + 1}`, value: Math.round(v) });
  }
  return out;
}

function Dashboard() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);

  // Live tick — chart "moves" every 1.2s
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setTick(tickRef.current);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 8000,
  });

  const { data: holdings } = useQuery({
    queryKey: ["holdings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select("*, assets(ticker, name, current_price)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const mode = (profile?.chart_mode ?? "flat") as ChartMode;
  const intensity = Number(profile?.chart_intensity ?? 1);
  const seed = Number(profile?.chart_seed ?? 42);
  const balance = Number(profile?.account_balance ?? 0);

  const series = useMemo(
    () => generateSeries(mode, balance > 0 ? balance : 1000, seed, intensity, tick),
    [mode, balance, seed, intensity, tick]
  );

  const changePercent = useMemo(() => {
    if (series.length < 2) return 0;
    const first = series[0].value, last = series[series.length - 1].value;
    return ((last - first) / first) * 100;
  }, [series]);

  const isProfit = mode === "profit";
  const isLoss = mode === "loss";
  const accent = isProfit ? "var(--color-success)" : isLoss ? "var(--color-destructive)" : "var(--color-primary)";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Live portfolio overview.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/deposit"><ArrowDownToLine className="mr-1.5 h-4 w-4" /> Deposit</Link></Button>
          <Button asChild size="sm"><Link to="/withdraw"><ArrowUpFromLine className="mr-1.5 h-4 w-4" /> Withdraw</Link></Button>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Account balance", value: balance, Icon: Wallet },
          { label: "Available cash", value: Number(profile?.available_cash ?? 0), Icon: DollarSign },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 hover:shadow-elegant transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <c.Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums">
                ${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </Card>
          </motion.div>
        ))}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">P&amp;L (live)</span>
              {isProfit ? <TrendingUp className="h-4 w-4 text-success" /> : isLoss ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className={`mt-2 text-3xl font-bold tabular-nums ${isProfit ? "text-success" : isLoss ? "text-destructive" : "text-foreground"}`}>
              {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
            </div>
          </Card>
        </motion.div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Portfolio performance</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live market feed
            </p>
          </div>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} fill="url(#grad)" isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Your holdings</h2>
        {!holdings?.length ? (
          <p className="text-sm text-muted-foreground">No holdings yet. Visit the <Link to="/market" className="text-primary underline">market</Link> to invest.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="pb-2">Asset</th><th className="pb-2">Quantity</th><th className="pb-2">Avg buy</th><th className="pb-2 text-right">Current value</th></tr>
              </thead>
              <tbody>
                {holdings.map((h: any) => {
                  const value = Number(h.quantity) * Number(h.assets?.current_price ?? 0);
                  return (
                    <tr key={h.id} className="border-t border-border">
                      <td className="py-3 font-medium">{h.assets?.ticker} <span className="text-muted-foreground font-normal">· {h.assets?.name}</span></td>
                      <td className="tabular-nums">{Number(h.quantity).toFixed(4)}</td>
                      <td className="tabular-nums">${Number(h.average_buy_price).toFixed(2)}</td>
                      <td className="text-right font-medium tabular-nums">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
