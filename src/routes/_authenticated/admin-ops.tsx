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
      const { error } = await supabase.rpc("admin_create_pre_market_token", {
        _token_name: tokenName.trim(),
        _symbol: symbol.trim().toUpperCase(),
        _listing_price: Number(priceUsd),
        _pool_cap: Number(supply) || 0,
        _min_allocation: 100,
        _tge_days: 14,
        _perks: "[]",
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
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data: methods, isLoading } = useQuery({
    queryKey: ["admin_payment_methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_payment_methods").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const val = (m: any, k: string) => draft[m.method_key]?.[k] ?? m[k] ?? "";
  const set = (key: string, k: string, v: any) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] ?? {}), [k]: v } }));

  const save = async (m: any) => {
    setBusy(m.method_key);
    try {
      const { error } = await supabase.rpc("admin_upsert_payment_method", {
        _method_key: m.method_key,
        _method_name: String(val(m, "method_name")),
        _identifier_label: String(val(m, "identifier_label")),
        _recipient_name: String(val(m, "recipient_name")),
        _identifier: String(val(m, "identifier")),
        _is_active: Boolean(draft[m.method_key]?.is_active ?? m.is_active),
        _sort_order: Number(val(m, "sort_order")) || 0,
      });
      if (error) throw error;
      toast.success(`${val(m, "method_name")} details updated — live on user deposit pages`);
      setDraft((d) => ({ ...d, [m.method_key]: {} }));
      qc.invalidateQueries({ queryKey: ["admin_payment_methods"] });
      qc.invalidateQueries({ queryKey: ["payment_methods_active"] });
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="h-4 w-4 text-primary" /> System payment accounts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the account details users see on the Deposit and Buy Bitcoin pages. Saving updates the live instructions instantly.
        </p>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(methods ?? []).map((m: any) => (
            <Card key={m.id} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">{m.method_key}</span>
                  <Input className="h-8 w-40" value={val(m, "method_name")} onChange={(e) => set(m.method_key, "method_name", e.target.value)} />
                </div>
                <Badge className={(draft[m.method_key]?.is_active ?? m.is_active) ? "bg-success text-success-foreground" : ""} variant={(draft[m.method_key]?.is_active ?? m.is_active) ? "default" : "secondary"}>
                  {(draft[m.method_key]?.is_active ?? m.is_active) ? "Active" : "Hidden"}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted-foreground">Field label</label>
                  <Input className="mt-1 h-9" value={val(m, "identifier_label")} onChange={(e) => set(m.method_key, "identifier_label", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Recipient / account name</label>
                  <Input className="mt-1 h-9" value={val(m, "recipient_name")} onChange={(e) => set(m.method_key, "recipient_name", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Account detail / wallet address / tag</label>
                <div className="mt-1 flex gap-2">
                  <Input className="h-9 font-mono text-xs" value={val(m, "identifier")} onChange={(e) => set(m.method_key, "identifier", e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(String(val(m, "identifier"))); toast.success("Copied"); }}>Copy</Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-xs">
                <div className="mb-1 font-semibold text-muted-foreground">User-side preview</div>
                <div className="flex justify-between"><span className="text-muted-foreground">{val(m, "identifier_label")}</span><span className="font-mono font-semibold">{val(m, "identifier") || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recipient</span><span className="font-semibold">{val(m, "recipient_name") || "—"}</span></div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => set(m.method_key, "is_active", !(draft[m.method_key]?.is_active ?? m.is_active))}>
                  {(draft[m.method_key]?.is_active ?? m.is_active) ? "Set hidden" : "Set active"}
                </Button>
                <Button size="sm" className="ml-auto bg-gradient-hero" disabled={busy === m.method_key} onClick={() => save(m)}>
                  {busy === m.method_key ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null} Save changes
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin_platform_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").order("category, key_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bots } = useQuery({
    queryKey: ["admin_ops_bots_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("trading_bots").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const { data: copyTiers } = useQuery({
    queryKey: ["admin_copy_tiers_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("copy_trading_tiers").select("*").order("sort_order");
      return data ?? [];
    },
  });

  const saveSetting = async (id: string, key: string) => {
    const newVal = editValues[key];
    if (newVal === undefined) return;
    setBusyKeys((s) => new Set(s).add(key));
    try {
      let parsedVal: any = newVal;
      if (!isNaN(Number(newVal)) && newVal.trim() !== "") parsedVal = Number(newVal);

      const { error } = await supabase.from("platform_settings").update({ value: parsedVal, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      toast.success("Setting updated");
      setEditValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
      qc.invalidateQueries({ queryKey: ["admin_platform_settings"] });
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    } finally {
      setBusyKeys((s) => { const next = new Set(s); next.delete(key); return next; });
    }
  };

  const saveBotField = async (botId: string, field: string, value: string) => {
    const key = `bot_${botId}_${field}`;
    setBusyKeys((s) => new Set(s).add(key));
    try {
      const numVal = field === "name" || field === "payout_type" ? value : Number(value);
      const { error } = await supabase.from("trading_bots").update({ [field]: numVal }).eq("id", botId);
      if (error) throw error;
      toast.success("Bot updated");
      setEditValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
      qc.invalidateQueries({ queryKey: ["admin_ops_bots_settings"] });
      qc.invalidateQueries({ queryKey: ["admin_ops_bots"] });
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    } finally {
      setBusyKeys((s) => { const next = new Set(s); next.delete(key); return next; });
    }
  };

  const saveCopyTierField = async (tierId: string, field: string, value: string) => {
    const key = `copy_${tierId}_${field}`;
    setBusyKeys((s) => new Set(s).add(key));
    try {
      const numVal = field === "tier_name" || field === "strategist_name" ? value : Number(value);
      const { error } = await supabase.from("copy_trading_tiers").update({ [field]: numVal }).eq("id", tierId);
      if (error) throw error;
      toast.success("Copy tier updated");
      setEditValues((prev) => { const next = { ...prev }; delete next[key]; return next; });
      qc.invalidateQueries({ queryKey: ["admin_copy_tiers_settings"] });
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    } finally {
      setBusyKeys((s) => { const next = new Set(s); next.delete(key); return next; });
    }
  };

  const grouped = (settings ?? []).reduce((acc: Record<string, any[]>, s: any) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><Settings className="h-4 w-4 text-primary" /> Platform Settings — All Editable Figures</h2>
        <p className="mb-4 text-sm text-muted-foreground">Edit any money amount, percentage, duration, or text value. Changes take effect immediately across the platform.</p>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-5">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{category}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s: any) => {
                const key = `setting_${s.id}`;
                const currentVal = editValues[key] ?? String(s.value);
                return (
                  <div key={s.id} className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-xs font-medium text-muted-foreground">{s.description ?? s.key_name}</div>
                    <div className="mt-2 flex gap-2">
                      <Input
                        className="h-8 text-sm"
                        value={currentVal}
                        onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyKeys.has(key) || editValues[key] === undefined}
                        onClick={() => saveSetting(s.id, key)}
                      >
                        {busyKeys.has(key) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Bot className="h-4 w-4 text-primary" /> Trading Bot Configuration</h2>
        <p className="mb-4 text-sm text-muted-foreground">Edit capital requirements, ROI ranges, durations, hourly payouts, and status for each bot tier.</p>
        <div className="space-y-3">
          {bots?.map((b: any) => (
            <div key={b.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 font-semibold">{b.name} <span className="ml-1 text-xs text-muted-foreground">({b.tier_key})</span></div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <BotField label="Capital ($)" botId={b.id} field="capital_required" value={b.capital_required} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <BotField label="Min ROI (%)" botId={b.id} field="min_roi" value={b.min_roi} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <BotField label="Max ROI (%)" botId={b.id} field="max_roi" value={b.max_roi} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <BotField label="Duration (days)" botId={b.id} field="duration_days" value={b.duration_days} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <BotField label="Hourly Payout ($)" botId={b.id} field="hourly_payout" value={b.hourly_payout} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <BotField label="Win Rate (%)" botId={b.id} field="win_rate" value={b.win_rate} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveBotField} type="number" />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Payout Type</Label>
                  <Select defaultValue={b.payout_type ?? "daily"} onValueChange={(v) => saveBotField(b.id, "payout_type", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select defaultValue={b.status} onValueChange={(v) => saveBotField(b.id, "status", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Layers className="h-4 w-4 text-primary" /> Copy Trading Tier Configuration</h2>
        <p className="mb-4 text-sm text-muted-foreground">Edit capital requirements, ROI ranges, and win rates for each copy trading tier.</p>
        <div className="space-y-3">
          {copyTiers?.map((t: any) => (
            <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 font-semibold">{t.tier_name} <span className="ml-1 text-xs text-muted-foreground">({t.tier_key})</span></div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <BotField label="Required Capital ($)" botId={t.id} field="required_capital" value={t.required_capital} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveCopyTierField} type="number" prefix="copy_" />
                <BotField label="Min Monthly ROI (%)" botId={t.id} field="monthly_roi_min" value={t.monthly_roi_min} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveCopyTierField} type="number" prefix="copy_" />
                <BotField label="Max Monthly ROI (%)" botId={t.id} field="monthly_roi_max" value={t.monthly_roi_max} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveCopyTierField} type="number" prefix="copy_" />
                <BotField label="Win Rate (%)" botId={t.id} field="win_rate" value={t.win_rate} editValues={editValues} setEditValues={setEditValues} busyKeys={busyKeys} onSave={saveCopyTierField} type="number" prefix="copy_" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BotField({ label, botId, field, value, editValues, setEditValues, busyKeys, onSave, type, prefix = "bot_" }: {
  label: string; botId: string; field: string; value: any; editValues: Record<string, string>;
  setEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>; busyKeys: Set<string>;
  onSave: (id: string, field: string, value: string) => void; type?: string; prefix?: string;
}) {
  const key = `${prefix}${botId}_${field}`;
  const currentVal = editValues[key] ?? String(value ?? "");
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1.5">
        <Input
          className="h-8 text-sm"
          type={type === "number" ? "number" : "text"}
          value={currentVal}
          onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={busyKeys.has(key) || editValues[key] === undefined}
          onClick={() => onSave(botId, field, editValues[key] ?? currentVal)}
        >
          {busyKeys.has(key) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
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
