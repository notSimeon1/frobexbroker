import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Loader as Loader2, Megaphone, Radio, Layers, CreditCard, Settings, Save, Activity, DollarSign, Users, TrendingUp, Bot, ChartBar as BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const OWNER_EMAIL = "simonosawaru255@gmail.com";

export const Route = createFileRoute("/_authenticated/admin-ops")({
  component: AdminOpsPage,
  head: () => ({ meta: [{ title: "Admin Ops — Frobex" }] }),
});

function AdminOpsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.email?.toLowerCase() === OWNER_EMAIL) {
      setIsAdmin(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (data) {
          setIsAdmin(true);
          return;
        }
      } catch (e) {
        console.warn("admin check failed", e);
      }
      setIsAdmin(false);
      toast.error("Admin only");
      navigate({ to: "/dashboard" });
    })();
  }, [user, navigate]);

  if (isAdmin === null) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-morph relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
            <Cpu className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight shimmer-text">Admin Operations</h1>
            <p className="text-sm text-muted-foreground">Advanced platform controls: announcements, signals, pre-market, payments, and settings.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="announcements">
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 w-full justify-start">
          <TabsTrigger value="announcements" className="shrink-0"><Megaphone className="mr-1.5 h-3.5 w-3.5" />Announcements</TabsTrigger>
          <TabsTrigger value="signals" className="shrink-0"><Radio className="mr-1.5 h-3.5 w-3.5" />Signals</TabsTrigger>
          <TabsTrigger value="premarket" className="shrink-0"><Layers className="mr-1.5 h-3.5 w-3.5" />Pre-Market</TabsTrigger>
          <TabsTrigger value="payments" className="shrink-0"><CreditCard className="mr-1.5 h-3.5 w-3.5" />Payments</TabsTrigger>
          <TabsTrigger value="settings" className="shrink-0"><Settings className="mr-1.5 h-3.5 w-3.5" />Settings</TabsTrigger>
          <TabsTrigger value="bots" className="shrink-0"><Bot className="mr-1.5 h-3.5 w-3.5" />Bots</TabsTrigger>
          <TabsTrigger value="metrics" className="shrink-0 ml-auto bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="signals"><SignalsTab /></TabsContent>
        <TabsContent value="premarket"><PreMarketTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="bots"><BotsTab /></TabsContent>
        <TabsContent value="metrics"><MetricsTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}

function AnnouncementsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin_announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_announcements").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const publish = async () => {
    if (!title.trim()) return toast.error("Enter a title");
    setBusy(true);
    try {
      const { error } = await supabase.from("platform_announcements").insert({
        title: title.trim(), content: content.trim(), category, is_urgent: urgent,
      });
      if (error) throw error;
      toast.success("Announcement published");
      setTitle(""); setContent(""); setUrgent(false);
      qc.invalidateQueries({ queryKey: ["admin_announcements"] });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Megaphone className="h-4 w-4 text-primary" /> Post Announcement</h2>
        <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></div>
        <div className="space-y-2"><Label>Content</Label><Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm w-full">
              <span>Urgent</span><Switch checked={urgent} onCheckedChange={setUrgent} />
            </label>
          </div>
        </div>
        <Button onClick={publish} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Publish</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent Announcements</h2>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
        !announcements?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  {a.is_urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                  <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                  <span className="font-semibold">{a.title}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SignalsTab() {
  const qc = useQueryClient();
  const [pair, setPair] = useState("BTC/USDT");
  const [dir, setDir] = useState("long");
  const [entryLow, setEntryLow] = useState("");
  const [entryHigh, setEntryHigh] = useState("");
  const [tp1, setTp1] = useState("");
  const [tp2, setTp2] = useState("");
  const [tp3, setTp3] = useState("");
  const [sl, setSl] = useState("");
  const [lev, setLev] = useState("10x");
  const [conf, setConf] = useState("90");
  const [busy, setBusy] = useState(false);

  const { data: signals, isLoading } = useQuery({
    queryKey: ["admin_signals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trading_signals").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const publish = async () => {
    if (!entryLow || !entryHigh || !sl) return toast.error("Fill entry range and stop loss");
    setBusy(true);
    try {
      const { error } = await supabase.from("trading_signals").insert({
        asset_pair: pair, direction: dir,
        entry_low: Number(entryLow), entry_high: Number(entryHigh),
        tp_1: Number(tp1) || null, tp_2: Number(tp2) || null, tp_3: Number(tp3) || null,
        stop_loss: Number(sl), leverage: lev, confidence: Number(conf),
        status: "active",
      });
      if (error) throw error;
      toast.success("Signal posted");
      setEntryLow(""); setEntryHigh(""); setTp1(""); setTp2(""); setTp3(""); setSl("");
      qc.invalidateQueries({ queryKey: ["admin_signals"] });
      qc.invalidateQueries({ queryKey: ["signals"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post signal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Radio className="h-4 w-4 text-primary" /> Post Signal</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Pair</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Direction</Label>
            <Select value={dir} onValueChange={setDir}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Entry low</Label><Input type="number" value={entryLow} onChange={(e) => setEntryLow(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-2"><Label>Entry high</Label><Input type="number" value={entryHigh} onChange={(e) => setEntryHigh(e.target.value)} placeholder="0.00" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2"><Label>TP1</Label><Input type="number" value={tp1} onChange={(e) => setTp1(e.target.value)} placeholder="optional" /></div>
          <div className="space-y-2"><Label>TP2</Label><Input type="number" value={tp2} onChange={(e) => setTp2(e.target.value)} placeholder="optional" /></div>
          <div className="space-y-2"><Label>TP3</Label><Input type="number" value={tp3} onChange={(e) => setTp3(e.target.value)} placeholder="optional" /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2"><Label>Stop loss</Label><Input type="number" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-2"><Label>Leverage</Label>
            <Select value={lev} onValueChange={setLev}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1x","2x","5x","10x","20x","50x","100x"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Confidence %</Label><Input type="number" value={conf} onChange={(e) => setConf(e.target.value)} placeholder="90" /></div>
        </div>
        <Button onClick={publish} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Post Signal</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent Signals</h2>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
        !signals?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="space-y-2">
            {signals.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={s.direction === "long" ? "default" : "destructive"} className={s.direction === "long" ? "bg-success text-success-foreground" : ""}>{s.direction?.toUpperCase()}</Badge>
                  <span className="font-semibold">{s.asset_pair}</span>
                  <span className="text-xs text-muted-foreground">{s.leverage}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Entry: {s.entry_low}–{s.entry_high} · SL: {s.stop_loss} · {s.confidence}% conf</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PreMarketTab() {
  const qc = useQueryClient();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [supply, setSupply] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["admin_premarket_tokens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pre_market_tokens").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    if (!tokenName.trim() || !symbol.trim() || !priceUsd) return toast.error("Fill all fields");
    setBusy(true);
    try {
      const { error } = await supabase.from("pre_market_tokens").insert({
        token_name: tokenName.trim(), symbol: symbol.trim().toUpperCase(),
        listing_price: Number(priceUsd), pool_cap: Number(supply) || 0,
      });
      if (error) throw error;
      toast.success("Pre-market token listed");
      setTokenName(""); setSymbol(""); setPriceUsd(""); setSupply("");
      qc.invalidateQueries({ queryKey: ["admin_premarket_tokens"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to list token");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Layers className="h-4 w-4 text-primary" /> List Pre-Market Token</h2>
        <div className="space-y-2"><Label>Token name</Label><Input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="e.g. Frobex Gold" /></div>
        <div className="space-y-2"><Label>Symbol</Label><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. FXG" maxLength={12} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-2"><Label>Total supply</Label><Input type="number" value={supply} onChange={(e) => setSupply(e.target.value)} placeholder="1000000" /></div>
        </div>
        <Button onClick={create} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> List Token</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Active Pre-Market Tokens</h2>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
        !tokens?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="space-y-2">
            {tokens.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold">{t.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{t.token_name}</span>
                </div>
                <span className="font-semibold tabular-nums">${Number(t.listing_price).toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentsTab() {
  const { data: deposits, isLoading: depLoading } = useQuery({
    queryKey: ["admin_ops_deposits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: withdrawals, isLoading: wdLoading } = useQuery({
    queryKey: ["admin_ops_withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = async (table: "deposits" | "withdrawals", id: string, status: string) => {
    try {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(`${table === "deposits" ? "Deposit" : "Withdrawal"} ${status}`);
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-4 w-4 text-primary" /> Recent Deposits</h2>
        {depLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
        !deposits?.length ? <p className="text-sm text-muted-foreground">None.</p> : (
          <div className="space-y-2">
            {deposits.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold tabular-nums">${Number(d.amount).toFixed(2)}</span>
                  <span className="ml-2 text-muted-foreground">{d.crypto_currency}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "pending" ? "secondary" : d.status === "approved" ? "default" : "destructive"} className={d.status === "approved" ? "bg-success text-success-foreground" : ""}>{d.status}</Badge>
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decide("deposits", d.id, "rejected")}>Reject</Button>
                      <Button size="sm" onClick={() => decide("deposits", d.id, "approved")}>Approve</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-4 w-4 text-primary" /> Recent Withdrawals</h2>
        {wdLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
        !withdrawals?.length ? <p className="text-sm text-muted-foreground">None.</p> : (
          <div className="space-y-2">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold tabular-nums">${Number(w.amount).toFixed(2)}</span>
                  <span className="ml-2 text-muted-foreground">{w.wallet_address?.slice(0, 12)}…</span>
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={w.status === "pending" ? "secondary" : w.status === "approved" ? "default" : "destructive"} className={w.status === "approved" ? "bg-success text-success-foreground" : ""}>{w.status}</Badge>
                  {w.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decide("withdrawals", w.id, "rejected")}>Reject</Button>
                      <Button size="sm" onClick={() => decide("withdrawals", w.id, "approved")}>Approve</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: profile } = useQuery({
    queryKey: ["admin_profile_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("ai_trading_enabled, signals_lifetime, preferred_currency").limit(1).maybeSingle();
      return data;
    },
  });

  return (
    <Card className="space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings className="h-4 w-4 text-primary" /> Platform Settings</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">AI Trading</div>
          <div className="mt-1 font-semibold">{profile?.ai_trading_enabled ? "Enabled" : "Disabled"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Signals Access</div>
          <div className="mt-1 font-semibold">{profile?.signals_lifetime ? "Lifetime" : "Trial"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Preferred Currency</div>
          <div className="mt-1 font-semibold">{profile?.preferred_currency ?? "USD"}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Owner Email</div>
          <div className="mt-1 font-semibold">{OWNER_EMAIL}</div>
        </div>
      </div>
    </Card>
  );
}

function BotsTab() {
  const { data: bots, isLoading } = useQuery({
    queryKey: ["admin_ops_bots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trading_bots").select("*").order("capital_required", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleBot = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("trading_bots").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success("Bot updated");
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Bot className="h-4 w-4 text-primary" /> Trading Bot Tiers</h2>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
      !bots?.length ? <p className="text-sm text-muted-foreground">No bot tiers configured.</p> : (
        <div className="space-y-2">
          {bots.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <div>
                <span className="font-semibold">{b.name}</span>
                <span className="ml-2 text-muted-foreground">${Number(b.capital_required).toLocaleString()}</span>
                <span className="ml-2 text-xs text-muted-foreground">{b.min_roi}-{b.max_roi}% ROI</span>
              </div>
              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <Switch checked={b.status === "active"} onCheckedChange={(v) => toggleBot(b.id, v ? "active" : "inactive")} />
              </label>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MetricsTab() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin_ops_metrics"],
    queryFn: async () => {
      const [users, deposits, withdrawals, bots] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("deposits").select("id, amount, status"),
        supabase.from("withdrawals").select("id, amount, status"),
        supabase.from("user_active_bots").select("id", { count: "exact", head: true }),
      ]);
      const totalDeposits = (deposits.data ?? []).reduce((s: number, d: any) => s + Number(d.amount), 0);
      const totalWithdrawals = (withdrawals.data ?? []).reduce((s: number, w: any) => s + Number(w.amount), 0);
      const pendingDeposits = (deposits.data ?? []).filter((d: any) => d.status === "pending").length;
      const pendingWithdrawals = (withdrawals.data ?? []).filter((w: any) => w.status === "pending").length;
      return {
        totalUsers: users.count ?? 0,
        activeBots: bots.count ?? 0,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const cards = [
    { label: "Total Users", value: metrics?.totalUsers ?? 0, icon: Users, color: "text-primary" },
    { label: "Active Bot Subs", value: metrics?.activeBots ?? 0, icon: Bot, color: "text-success" },
    { label: "Total Deposits", value: `$${(metrics?.totalDeposits ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: "text-success" },
    { label: "Total Withdrawals", value: `$${(metrics?.totalWithdrawals ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: "text-destructive" },
    { label: "Pending Deposits", value: metrics?.pendingDeposits ?? 0, icon: Activity, color: "text-warning" },
    { label: "Pending Withdrawals", value: metrics?.pendingWithdrawals ?? 0, icon: Activity, color: "text-warning" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-2xl font-bold tabular-nums">{c.value}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
