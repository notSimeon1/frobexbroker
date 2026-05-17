import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type ChartMode = "profit" | "loss";

function generateSeries(mode: ChartMode, base = 10000) {
  const points = 30;
  const arr: { day: string; value: number }[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    const drift = mode === "profit" ? 1 : -1;
    const jitter = (Math.sin(i * 0.7) + Math.cos(i * 1.3)) * 30;
    v += drift * (60 + Math.abs(jitter)) + jitter;
    arr.push({ day: `D${i + 1}`, value: Math.max(100, Math.round(v)) });
  }
  return arr;
}

function Dashboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<ChartMode>("profit");

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

  useEffect(() => {
    if (profile?.chart_mode === "profit" || profile?.chart_mode === "loss") {
      setMode(profile.chart_mode);
    }
  }, [profile?.chart_mode]);

  const series = useMemo(() => generateSeries(mode, Number(profile?.account_balance ?? 10000)), [mode, profile?.account_balance]);

  const changePercent = useMemo(() => {
    if (series.length < 2) return 0;
    const first = series[0].value, last = series[series.length - 1].value;
    return ((last - first) / first) * 100;
  }, [series]);

  const setChartMode = async (m: ChartMode) => {
    setMode(m);
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ chart_mode: m, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) toast.error("Failed to save preference"); else refetchProfile();
  };

  const isProfit = mode === "profit";
  const accent = isProfit ? "var(--color-success)" : "var(--color-destructive)";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Here's your portfolio overview.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Account balance</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-bold">${Number(profile?.account_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Available cash</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-bold">${Number(profile?.available_cash ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">P&amp;L (30d)</span>
            {isProfit ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>
          <div className={`mt-2 text-3xl font-bold ${isProfit ? "text-success" : "text-destructive"}`}>
            {isProfit ? "+" : ""}{changePercent.toFixed(2)}%
          </div>
        </Card>
      </div>

      {/* Chart + simulator */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Portfolio performance</h2>
            <p className="text-xs text-muted-foreground">30-day simulated trend</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Chart Simulator</span>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setChartMode(v as ChartMode)} size="sm">
              <ToggleGroupItem value="profit" className="data-[state=on]:bg-success data-[state=on]:text-success-foreground">
                <TrendingUp className="mr-1 h-3.5 w-3.5" /> Profit
              </ToggleGroupItem>
              <ToggleGroupItem value="loss" className="data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground">
                <TrendingDown className="mr-1 h-3.5 w-3.5" /> Loss
              </ToggleGroupItem>
            </ToggleGroup>
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
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Holdings */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Your holdings</h2>
        {!holdings?.length ? (
          <p className="text-sm text-muted-foreground">No holdings yet. Visit the <a href="/market" className="text-primary underline">market</a> to invest.</p>
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
                      <td>{Number(h.quantity).toFixed(4)}</td>
                      <td>${Number(h.average_buy_price).toFixed(2)}</td>
                      <td className="text-right font-medium">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
