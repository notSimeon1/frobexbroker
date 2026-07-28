import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bot, Loader as Loader2, TrendingUp, Clock, CircleCheck as CheckCircle2, Zap, Cpu, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/ai-bots")({
  component: AiBotsPage,
  head: () => ({
    meta: [
      { title: "AI Trading Bots — Frobex" },
      { name: "description", content: "Automated AI trading bots with daily profit accrual." },
    ],
  }),
});

function AiBotsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: bots } = useQuery({
    queryKey: ["trading_bots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trading_bots").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("account_balance, available_cash").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: activeBots } = useQuery({
    queryKey: ["my_active_bots", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_active_bots")
        .select("*, trading_bots(name, tier_key)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const balance = Number(profile?.account_balance ?? 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Trading Bots</h1>
            <p className="text-sm text-muted-foreground">
              Automated algorithmic trading with daily profit accrual. Choose a tier, invest, and let the bot trade for you.
            </p>
          </div>
        </div>
      </motion.div>

      <Card className="border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Available Balance</div>
            <div className="text-2xl font-bold tabular-nums">${balance.toFixed(2)}</div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/deposit">Top up balance <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </Card>

      {/* Active Bots */}
      {activeBots && activeBots.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Your Active Bots
          </h2>
          {activeBots.map((ab: any) => (
            <Card key={ab.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{ab.trading_bots?.name ?? "Bot"}</div>
                  <div className="text-xs text-muted-foreground">
                    Invested: ${Number(ab.invested_amount).toFixed(2)} · Expires: {new Date(ab.expiration_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-success tabular-nums">+${Number(ab.current_profit).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Current profit</div>
                  </div>
                  <Badge className={ab.status === "running" ? "bg-success/20 text-success border-success/40" : "bg-muted text-muted-foreground"}>
                    {ab.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bot Tiers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bots?.map((bot: any, i: number) => (
          <BotCard key={bot.id} bot={bot} balance={balance} index={i} />
        ))}
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  starter: "from-slate-600 to-slate-800",
  bronze: "from-amber-700 to-amber-900",
  silver: "from-gray-400 to-gray-600",
  gold: "from-yellow-500 to-yellow-700",
  platinum: "from-cyan-500 to-blue-700",
};

function BotCard({ bot, balance, index }: { bot: any; balance: number; index: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(bot.capital_required));
  const [busy, setBusy] = useState(false);

  const gradient = TIER_COLORS[bot.tier_key] ?? "from-primary to-primary/80";
  const minRoi = Number(bot.min_roi);
  const maxRoi = Number(bot.max_roi);
  const dailyEstimate = (Number(bot.capital_required) * ((minRoi + maxRoi) / 2)) / 100;

  const activate = async () => {
    const usd = Number(amount);
    if (!usd || usd < bot.capital_required) {
      toast.error(`Minimum investment is $${bot.capital_required}`);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("activate_bot" as never, {
        _bot_id: bot.id,
        _invested_amount: usd,
      } as never);
      if (error) throw error;
      toast.success(`${bot.name} activated! Daily profits will accrue automatically.`);
      qc.invalidateQueries({ queryKey: ["my_active_bots"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="relative overflow-hidden border-border/70">
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">{bot.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[10px] uppercase">{bot.tier_key}</Badge>
                <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
                  <TrendingUp className="mr-1 h-2.5 w-2.5" /> {bot.win_rate}% win rate
                </Badge>
              </div>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-lg`}>
              <Cpu className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface p-3">
              <div className="text-xs text-muted-foreground">Capital Required</div>
              <div className="text-xl font-bold tabular-nums">${Number(bot.capital_required).toLocaleString()}</div>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <div className="text-xs text-muted-foreground">Daily ROI Range</div>
              <div className="text-xl font-bold tabular-nums text-success">{minRoi.toFixed(1)}-{maxRoi.toFixed(1)}%</div>
            </div>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Est. daily profit:</span>
              <span className="font-bold text-success tabular-nums">~${dailyEstimate.toFixed(2)}/day</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Duration: {bot.duration_days} days</span>
            </div>
          </div>

          <ul className="space-y-1.5">
            {(bot.perks as string[]).map((perk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {perk}
              </li>
            ))}
          </ul>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className={`w-full bg-gradient-to-r ${gradient} text-white hover:opacity-90`}>
                <Bot className="mr-2 h-4 w-4" /> Activate Bot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Activate {bot.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-surface p-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Available balance:</span><span className="font-bold tabular-nums">${balance.toFixed(2)}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-muted-foreground">Daily ROI:</span><span className="font-bold text-success">{minRoi.toFixed(1)}-{maxRoi.toFixed(1)}%</span></div>
                  <div className="flex justify-between mt-1"><span className="text-muted-foreground">Duration:</span><span className="font-bold">{bot.duration_days} days</span></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Investment amount (USD)</label>
                  <Input
                    type="number"
                    min={bot.capital_required}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Minimum: ${bot.capital_required}</p>
                </div>
                <Button onClick={activate} disabled={busy} className="w-full bg-gradient-hero">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Confirm activation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </motion.div>
  );
}
