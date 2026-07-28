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
import { Cpu, Loader as Loader2, Megaphone, Radio, Layers, CreditCard, Settings, Save, Activity, DollarSign, Users, TrendingUp, Shield, Zap, Bot, ChartBar as BarChart3, Globe, Lock, Gauge, Bell, Database } from "lucide-react";
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
    setIsAdmin(false);
    toast.error("Admin only");
    navigate({ to: "/dashboard" });
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

  const { data: announcements } = useQuery({
    queryKey: ["admin_announcements"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_announcements").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const publish = async () => {
    if (!title.trim()) return toast.error("Enter a title");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_post_announcement" as never, {
        _title: title.trim(), _content: content.trim(), _category: category, _is_urgent: urgent,
      } as never);
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
          <div className="flex items-end space-y-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm w-full">
              <span>Urgent</span><Switch checked={urgent} onCheckedChange={setUrgent} />
            </label>
          </div>
        </div>
        <Button onClick={publish} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Publish</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Recent Announcements</h2>
        {!announcements?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
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

  const { data: signals } = useQuery({
    queryKey: ["admin_signals"],
    queryFn: async () => {
      const { data } = await supabase.from("trading_signals").select("*").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const publish = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_post_signal" as never, {
        _asset_pair: pair, _direction: dir,
        _entry_low: Number(entryLow), _entry_high: Number(entryHigh),
        _tp1: Number(tp1) || null, _tp2: Number(tp2) || null, _tp3: Number(tp3) || null,
        _sl: Number(sl), _leverage: lev, _confidence: Number(conf),
      } as never);
      if (error) throw error;
      toast.success("Signal posted");
      setEntryLow(""); setEntryHigh(""); setTp1(""); setTp2(""); setTp3(""); setSl("");
      qc.invalidateQueries({ queryKey: ["admin_signals"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post signal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Radio className="h-4 w-4 text-primary" /> Post Trading Signal</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Asset Pair</Label><Input value={pair} onChange={(e) => setPair(e.target.value)} /></div>
          <div className="space-y-2"><Label>Direction</Label>
            <Select value={dir} onValueChange={setDir}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="long">Long</SelectItem><SelectItem value="short">Short</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Entry Low</Label><Input type="number" value={entryLow} onChange={(e) => setEntryLow(e.target.value)} /></div>
          <div className="space-y-2"><Label>Entry High</Label><Input type="number" value={entryHigh} onChange={(e) => setEntryHigh(e.target.value)} /></div>
          <div className="space-y-2"><Label>TP 1</Label><Input type="number" value={tp1} onChange={(e) => setTp1(e.target.value)} /></div>
          <div className="space-y-2"><Label>TP 2</Label><Input type="number" value={tp2} onChange={(e) => setTp2(e.target.value)} /></div>
          <div className="space-y-2"><Label>TP 3</Label><Input type="number" value={tp3} onChange={(e) => setTp3(e.target.value)} /></div>
          <div className="space-y-2"><Label>Stop Loss</Label><Input type="number" value={sl} onChange={(e) => setSl(e.target.value)} /></div>
          <div className="space-y-2"><Label>Leverage</Label><Input value={lev} onChange={(e) => setLev(e.target.value)} /></div>
          <div className="space-y-2"><Label>Confidence %</Label><Input type="number" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
        </div>
        <Button onClick={publish} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Post Signal</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Active Signals</h2>
        {!signals?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="space-y-2">
            {signals.map((s: any) => (
              <div key={s.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className={s.direction === "long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>{s.direction}</Badge>
                  <span className="font-semibold">{s.asset_pair}</span>
                  <Badge variant="secondary" className="text-[10px]">{s.leverage}</Badge>
                  <span className="text-xs text-muted-foreground">{Number(s.confidence).toFixed(0)}% confidence</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Entry: {s.entry_low} - {s.entry_high} · SL: {s.stop_loss}</div>
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
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [price, setPrice] = useState("");
  const [poolCap, setPoolCap] = useState("");
  const [minAlloc, setMinAlloc] = useState("100");
  const [tgeDays, setTgeDays] = useState("14");
  const [perks, setPerks] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: tokens } = useQuery({
    queryKey: ["admin_premarket"],
    queryFn: async () => {
      const { data } = await supabase.from("pre_market_tokens").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  const create = async () => {
    if (!name.trim() || !symbol.trim()) return toast.error("Enter token name and symbol");
    setBusy(true);
    try {
      const perksArr = perks.split("\n").map((p) => p.trim()).filter(Boolean);
      const { error } = await supabase.rpc("admin_create_pre_market_token" as never, {
        _token_name: name.trim(), _symbol: symbol.trim().toUpperCase(),
        _listing_price: Number(price), _pool_cap: Number(poolCap),
        _min_allocation: Number(minAlloc), _tge_days: Number(tgeDays),
        _perks: JSON.stringify(perksArr),
      } as never);
      if (error) throw error;
      toast.success("Pre-market token created");
      setName(""); setSymbol(""); setPrice(""); setPoolCap(""); setPerks("");
      qc.invalidateQueries({ queryKey: ["admin_premarket"] });
      qc.invalidateQueries({ queryKey: ["pre_market_tokens"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create token");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Layers className="h-4 w-4 text-primary" /> Create Pre-Market Token</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Token Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Symbol</Label><Input value={symbol} onChange={(e) => setSymbol(e.target.value)} /></div>
          <div className="space-y-2"><Label>Listing Price</Label><Input type="number" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="space-y-2"><Label>Pool Cap (USD)</Label><Input type="number" value={poolCap} onChange={(e) => setPoolCap(e.target.value)} /></div>
          <div className="space-y-2"><Label>Min Allocation</Label><Input type="number" value={minAlloc} onChange={(e) => setMinAlloc(e.target.value)} /></div>
          <div className="space-y-2"><Label>TGE Days</Label><Input type="number" value={tgeDays} onChange={(e) => setTgeDays(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Perks (one per line)</Label><Textarea rows={3} value={perks} onChange={(e) => setPerks(e.target.value)} /></div>
        <Button onClick={create} disabled={busy} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Create Token</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Pre-Market Tokens</h2>
        {!tokens?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
          <div className="space-y-2">
            {tokens.map((t: any) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.token_name} ({t.symbol})</span>
                  <Badge variant={t.is_active ? "default" : "secondary"} className="text-[10px]">{t.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Price: ${Number(t.listing_price).toFixed(4)} · Pool: ${Number(t.pool_cap).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PaymentsTab() {
  const qc = useQueryClient();
  const [methods, setMethods] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["admin_payment_methods"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_payment_methods").select("*").order("sort_order");
      return data ?? [];
    },
  });

  useEffect(() => { if (data) setMethods(data); }, [data]);

  const save = async (m: any) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_upsert_payment_method" as never, {
        _method_key: m.method_key, _method_name: m.method_name,
        _identifier_label: m.identifier_label, _recipient_name: m.recipient_name,
        _identifier: m.identifier, _is_active: m.is_active, _sort_order: m.sort_order,
      } as never);
      if (error) throw error;
      toast.success("Payment method saved");
      qc.invalidateQueries({ queryKey: ["admin_payment_methods"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const update = (idx: number, field: string, value: any) => {
    setMethods((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-4 w-4 text-primary" /> Payment Methods</h2>
      {!methods.length ? <p className="text-sm text-muted-foreground">Loading...</p> : methods.map((m, idx) => (
        <div key={m.id} className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">Method Name</Label><Input value={m.method_name} onChange={(e) => update(idx, "method_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Identifier Label</Label><Input value={m.identifier_label} onChange={(e) => update(idx, "identifier_label", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Recipient Name</Label><Input value={m.recipient_name} onChange={(e) => update(idx, "recipient_name", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Identifier</Label><Input value={m.identifier} onChange={(e) => update(idx, "identifier", e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><Switch checked={m.is_active} onCheckedChange={(v) => update(idx, "is_active", v)} /> Active</label>
            <Button size="sm" onClick={() => save(m)} disabled={busy}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*").order("category, key_name");
      return data ?? [];
    },
  });

  useEffect(() => { if (data) setSettings(data); }, [data]);

  const save = async (s: any) => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_update_platform_setting" as never, {
        _key_name: s.key_name, _value: JSON.stringify(s.value),
      } as never);
      if (error) throw error;
      toast.success("Setting updated");
      qc.invalidateQueries({ queryKey: ["platform_settings"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  const update = (idx: number, value: string) => {
    setSettings((prev) => prev.map((s, i) => i === idx ? { ...s, value } : s));
  };

  return (
    <Card className="p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings className="h-4 w-4 text-primary" /> Platform Settings</h2>
      {!settings.length ? <p className="text-sm text-muted-foreground">Loading...</p> : settings.map((s, idx) => (
        <div key={s.id} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{s.category} / {s.key_name}</Label>
            <Input value={s.value} onChange={(e) => update(idx, e.target.value)} />
            {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
          </div>
          <Button size="sm" onClick={() => save(s)} disabled={busy}><Save className="h-3.5 w-3.5" /></Button>
        </div>
      ))}
    </Card>
  );
}

function BotsTab() {
  const { data: bots } = useQuery({
    queryKey: ["admin_bots"],
    queryFn: async () => {
      const { data } = await supabase.from("trading_bots").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: activeBots } = useQuery({
    queryKey: ["admin_active_bots"],
    queryFn: async () => {
      const { data } = await supabase.from("user_active_bots").select("*, trading_bots(name), profiles!inner(email)").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Bot className="h-4 w-4 text-primary" /> Trading Bot Tiers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2">Name</th><th className="pb-2">Tier</th><th className="pb-2 text-right">Capital</th><th className="pb-2 text-right">ROI</th><th className="pb-2 text-right">Win Rate</th></tr>
            </thead>
            <tbody>
              {bots?.map((b: any) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="py-2 font-medium">{b.name}</td>
                  <td className="py-2"><Badge variant="secondary" className="text-[10px]">{b.tier_key}</Badge></td>
                  <td className="py-2 text-right tabular-nums">${Number(b.capital_required).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-success">{Number(b.min_roi).toFixed(1)}-{Number(b.max_roi).toFixed(1)}%</td>
                  <td className="py-2 text-right tabular-nums">{Number(b.win_rate).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Activity className="h-4 w-4 text-primary" /> Active Bot Subscriptions</h2>
        {!activeBots?.length ? <p className="text-sm text-muted-foreground">No active bots.</p> : (
          <div className="space-y-2">
            {activeBots.map((ab: any) => (
              <div key={ab.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{ab.trading_bots?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{(ab.profiles as any)?.email ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">${Number(ab.invested_amount).toFixed(2)}</div>
                  <div className="text-xs text-success">+${Number(ab.current_profit).toFixed(2)}</div>
                </div>
                <Badge className={ab.status === "running" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>{ab.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricsTab() {
  const { data: bots } = useQuery({
    queryKey: ["admin_bots"],
    queryFn: async () => (await supabase.from("trading_bots").select("*")).data ?? [],
  });
  const { data: users } = useQuery({
    queryKey: ["admin_metrics_users"],
    queryFn: async () => (await supabase.from("profiles").select("account_balance, available_cash, live_balance, demo_balance")).data ?? [],
  });
  const { data: txCount } = useQuery({
    queryKey: ["admin_metrics_tx"],
    queryFn: async () => (await supabase.from("transactions").select("id", { count: "exact", head: true })).count ?? 0,
  });
  const { data: activeBots } = useQuery({
    queryKey: ["admin_metrics_active_bots"],
    queryFn: async () => (await supabase.from("user_active_bots").select("*", { count: "exact", head: true })).count ?? 0,
  });

  const totalBalance = (users ?? []).reduce((s: number, u: any) => s + Number(u.account_balance ?? 0), 0);
  const totalLive = (users ?? []).reduce((s: number, u: any) => s + Number(u.live_balance ?? 0), 0);
  const totalDemo = (users ?? []).reduce((s: number, u: any) => s + Number(u.demo_balance ?? 0), 0);

  const stats = [
    { label: "Total Users", value: (users ?? []).length, icon: Users, color: "text-primary" },
    { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, color: "text-success" },
    { label: "Live Balance", value: `$${totalLive.toFixed(2)}`, icon: TrendingUp, color: "text-success" },
    { label: "Demo Balance", value: `$${totalDemo.toFixed(2)}`, icon: Activity, color: "text-muted-foreground" },
    { label: "Total Transactions", value: txCount ?? 0, icon: Database, color: "text-primary" },
    { label: "Active Bots", value: activeBots ?? 0, icon: Bot, color: "text-primary" },
    { label: "Bot Tiers", value: (bots ?? []).length, icon: Cpu, color: "text-primary" },
    { label: "Platform Status", value: "Online", icon: Globe, color: "text-success" },
  ];

  const features = [
    { icon: Shield, label: "KYC Management" },
    { icon: Lock, label: "Account Suspension" },
    { icon: Gauge, label: "Chart Direction Control" },
    { icon: Bot, label: "AI Trading Toggle" },
    { icon: DollarSign, label: "Balance Credit/Debit" },
    { icon: Users, label: "User Management" },
    { icon: Megaphone, label: "Announcements" },
    { icon: Radio, label: "Signal Broadcasting" },
    { icon: Layers, label: "Pre-Market Token Creation" },
    { icon: CreditCard, label: "Payment Method Config" },
    { icon: Settings, label: "Platform Settings" },
    { icon: Bell, label: "Deposit/Withdrawal Approvals" },
    { icon: Activity, label: "Transaction Ledger" },
    { icon: BarChart3, label: "Platform Metrics" },
    { icon: Zap, label: "Account Mode Switching" },
    { icon: TrendingUp, label: "Bot Profit Monitoring" },
    { icon: Cpu, label: "Bot Tier Management" },
    { icon: Globe, label: "Multi-Asset Support" },
    { icon: Database, label: "Referral Tracking" },
    { icon: Shield, label: "Complaint Resolution" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
                </div>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Platform Feature Checklist (20+ Professional Features)</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <f.icon className="h-3.5 w-3.5 text-success" />
              {f.label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
