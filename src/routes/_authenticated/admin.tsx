import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import {
  adjustAdminBalance,
  decideAdminDeposit,
  decideAdminKyc,
  decideAdminWithdrawal,
  getAdminKycUrl,
  getAdminOverview,
  postAdminNews,
  toggleAdminAccountMode,
  toggleAdminSuspend,
  updateAdminChart,
  updateAdminComplaint,
  updateAdminSetting,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, Check, X, TrendingUp, TrendingDown, Minus, Save, FileText, Newspaper, Ban } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const OWNER_EMAIL = "simonosawaru255@gmail.com";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchOverview = useServerFn(getAdminOverview);
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

  const overviewQuery = useQuery({
    queryKey: ["admin_overview", user?.id],
    queryFn: () => fetchOverview(),
    enabled: isAdmin === true,
    refetchInterval: 6000,
    retry: false,
  });

  useEffect(() => {
    if (overviewQuery.error) toast.error(overviewQuery.error.message || "Admin data could not load");
  }, [overviewQuery.error]);

  if (isAdmin === null) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-morph relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 8, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero shadow-glow"
          >
            <Shield className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight shimmer-text">Admin control center</h1>
            <p className="text-sm text-muted-foreground">Approvals, balances, charts and wallet settings.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="deposits">
        <TabsList className="flex-wrap">
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="users">Users &amp; Charts</TabsTrigger>
          <TabsTrigger value="kyc">KYC Review</TabsTrigger>
          <TabsTrigger value="news">Market News</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="settings">Wallet Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits"><DepositsTab items={overviewQuery.data?.deposits} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab items={overviewQuery.data?.withdrawals} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="users"><UsersTab users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="kyc"><KycTab items={overviewQuery.data?.kyc} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="news"><NewsTab items={overviewQuery.data?.news} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="complaints"><ComplaintsTab items={overviewQuery.data?.complaints} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="settings"><SettingsTab items={overviewQuery.data?.settings} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
      </Tabs>
    </motion.div>
  );
}

function DepositsTab({ items, users, loading, refetch }: { items?: any[]; users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const decideDeposit = useServerFn(decideAdminDeposit);
  const decide = async (d: any, status: "approved" | "rejected") => {
    try {
      await decideDeposit({ data: { id: d.id, status } });
      toast.success(`Deposit ${status}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update deposit");
    }
  };

  return <RequestList items={items} users={users} loading={loading} kind="Deposit" onDecide={decide} />;
}

function WithdrawalsTab({ items, users, loading, refetch }: { items?: any[]; users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const decideWithdrawal = useServerFn(decideAdminWithdrawal);
  const decide = async (w: any, status: "approved" | "rejected") => {
    try {
      await decideWithdrawal({ data: { id: w.id, status } });
      toast.success(`Withdrawal ${status}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update withdrawal");
    }
  };

  return <RequestList items={items} users={users} loading={loading} kind="Withdrawal" onDecide={decide} />;
}

function RequestList({ items, users, loading, kind, onDecide }: { items?: any[]; users?: any[]; loading: boolean; kind: string; onDecide: (item: any, status: "approved" | "rejected") => void | Promise<void> }) {
  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (!items?.length) return <Card className="p-6 text-sm text-muted-foreground">No {kind.toLowerCase()} requests.</Card>;
  return (
    <Card className="p-4">
      <div className="space-y-2">
        {items.map((it) => {
          const requestUser = users?.find((u) => u.id === it.user_id);
          return (
          <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-semibold tabular-nums">${Number(it.amount).toFixed(2)} · {it.crypto_currency}</div>
              <div className="text-xs text-muted-foreground truncate">{requestUser?.email ?? requestUser?.full_name ?? it.user_id}</div>
              {it.tx_hash && <div className="text-xs text-muted-foreground break-all">tx: {it.tx_hash}</div>}
              {it.wallet_address && <div className="text-xs text-muted-foreground break-all">to: {it.wallet_address}</div>}
              <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {it.status === "pending" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => onDecide(it, "rejected")}><X className="h-4 w-4" /></Button>
                  <Button size="sm" onClick={() => onDecide(it, "approved")}><Check className="h-4 w-4 mr-1" /> Approve</Button>
                </>
              ) : (
                <Badge variant={it.status === "approved" ? "default" : "destructive"} className={it.status === "approved" ? "bg-success text-success-foreground" : ""}>{it.status}</Badge>
              )}
            </div>
          </div>
        )})}
      </div>
    </Card>
  );
}

function UsersTab({ users, loading, refetch }: { users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

  return (
    <div className="space-y-3">
      {users?.map((u: any) => <UserRow key={u.id} user={u} onChange={refetch} />)}
      {!users?.length && <Card className="p-6 text-sm text-muted-foreground">No users yet.</Card>}
    </div>
  );
}

function UserRow({ user, onChange }: { user: any; onChange: () => void | Promise<unknown> }) {
  const saveUserChart = useServerFn(updateAdminChart);
  const adjustBalance = useServerFn(adjustAdminBalance);
  const toggleMode = useServerFn(toggleAdminAccountMode);
  const toggleSuspend = useServerFn(toggleAdminSuspend);
  const [mode, setMode] = useState<string>(user.chart_mode ?? "flat");
  const [intensity, setIntensity] = useState<string>(String(user.chart_intensity ?? 1));
  const [creditAmt, setCreditAmt] = useState("");

  const saveChart = async () => {
    try {
      await saveUserChart({ data: { userId: user.id, mode: mode as "profit" | "loss" | "flat", intensity: Number(intensity) || 1 } });
      toast.success("Chart updated");
      await onChange();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update chart");
    }
  };

  const creditProfit = async (sign: 1 | -1) => {
    const amt = Number(creditAmt);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    try {
      await adjustBalance({ data: { userId: user.id, amount: amt, direction: sign > 0 ? "credit" : "debit" } });
      toast.success(`${sign > 0 ? "Credited" : "Debited"} $${amt.toFixed(2)}`);
      setCreditAmt("");
      await onChange();
    } catch (err: any) {
      toast.error(err.message ?? "Could not adjust balance");
    }
  };

  const setAccountMode = async (checked: boolean) => {
    const nextMode = checked ? "live" : "demo";
    try {
      await toggleMode({ data: { userId: user.id, mode: nextMode } });
      toast.success(`Account switched to ${nextMode.toUpperCase()}`);
      await onChange();
    } catch (err: any) {
      toast.error(err.message ?? "Could not switch account mode");
    }
  };

  const setSuspended = async (checked: boolean) => {
    try {
      await toggleSuspend({ data: { userId: user.id, suspended: checked } });
      toast.success(checked ? "Account suspended" : "Account restored");
      await onChange();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update suspension");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{user.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{user.email ?? user.id}</div>
          <div className="mt-1 text-sm tabular-nums">Live: ${Number(user.live_balance ?? 0).toFixed(2)} · Demo: ${Number(user.demo_balance ?? 0).toFixed(2)} · Cash: ${Number(user.available_cash).toFixed(2)}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={user.account_mode === "live" ? "default" : "secondary"} className={user.account_mode === "live" ? "bg-success text-success-foreground" : ""}>{String(user.account_mode ?? "demo").toUpperCase()}</Badge>
            <Badge variant={user.kyc_status === "approved" ? "default" : "outline"}>{String(user.kyc_status ?? "none").toUpperCase()} KYC</Badge>
            {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
          <label className="flex items-center justify-between gap-3"><span>Live mode</span><Switch checked={user.account_mode === "live"} onCheckedChange={setAccountMode} /></label>
          <label className="flex items-center justify-between gap-3"><span className="flex items-center gap-1"><Ban className="h-3 w-3" /> Suspend</span><Switch checked={!!user.is_suspended} onCheckedChange={setSuspended} /></label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Chart direction</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="profit"><TrendingUp className="inline mr-1 h-3 w-3" /> Profit (up)</SelectItem>
              <SelectItem value="loss"><TrendingDown className="inline mr-1 h-3 w-3" /> Loss (down)</SelectItem>
              <SelectItem value="flat"><Minus className="inline mr-1 h-3 w-3" /> Flat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Intensity (0.1 – 5)</Label>
          <Input type="number" min={0.1} max={5} step={0.1} value={intensity} onChange={(e) => setIntensity(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={saveChart} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Save chart</Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px] space-y-1">
          <Label className="text-xs">Credit / debit (USD)</Label>
          <Input type="number" step="0.01" placeholder="100.00" value={creditAmt} onChange={(e) => setCreditAmt(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => creditProfit(-1)}>Debit</Button>
        <Button onClick={() => creditProfit(1)} className="bg-success hover:bg-success/90 text-success-foreground">Credit profit</Button>
      </div>
    </Card>
  );
}

function KycTab({ items, users, loading, refetch }: { items?: any[]; users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const decideKyc = useServerFn(decideAdminKyc);
  const getDocUrl = useServerFn(getAdminKycUrl);

  const decide = async (id: string, status: "approved" | "rejected") => {
    try {
      await decideKyc({ data: { id, status, note: status === "approved" ? "Verified by admin" : "Rejected by admin" } });
      toast.success(`KYC ${status}`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update KYC");
    }
  };

  const openDoc = async (path: string) => {
    try {
      const res = await getDocUrl({ data: { path } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message ?? "Could not open document");
    }
  };

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  const pending = (items ?? []).filter((k) => k.status === "pending");
  const rows = pending.length ? pending : (items ?? []);
  if (!rows.length) return <Card className="p-6 text-sm text-muted-foreground">No KYC submissions yet.</Card>;

  return (
    <Card className="p-4">
      <div className="space-y-2">
        {rows.map((k: any) => {
          const owner = users?.find((u) => u.id === k.user_id);
          return (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{k.full_name} · {k.document_type}</div>
                <div className="text-xs text-muted-foreground">{owner?.email ?? k.user_id} · {k.country ?? "—"} · {new Date(k.created_at).toLocaleString()}</div>
                {k.admin_note && <div className="text-xs text-muted-foreground">Note: {k.admin_note}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={k.status === "approved" ? "default" : k.status === "rejected" ? "destructive" : "secondary"}>{k.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => openDoc(k.document_url)}><FileText className="mr-1 h-4 w-4" /> View</Button>
                {k.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => decide(k.id, "rejected")}><X className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => decide(k.id, "approved")}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NewsTab({ items, loading, refetch }: { items?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const postNews = useServerFn(postAdminNews);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [impact, setImpact] = useState<"low" | "medium" | "high">("medium");
  const [source, setSource] = useState("Frobex Desk");

  const publish = async () => {
    if (!title.trim()) return toast.error("Enter a news headline");
    try {
      await postNews({ data: { title: title.trim(), body: body.trim(), impact, source: source.trim() || "Frobex Desk" } });
      toast.success("Market news published");
      setTitle(""); setBody("");
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not publish news");
    }
  };

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Newspaper className="h-4 w-4 text-primary" /> Publish market news</h2>
        <div className="space-y-2"><Label>Headline</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></div>
        <div className="space-y-2"><Label>Details</Label><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Impact</Label><Select value={impact} onValueChange={(v) => setImpact(v as "low" | "medium" | "high")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} maxLength={120} /></div>
        </div>
        <Button onClick={publish} className="w-full"><Save className="mr-1.5 h-4 w-4" /> Publish</Button>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Published ticker</h2>
        {!items?.length ? <p className="text-sm text-muted-foreground">No news yet.</p> : <div className="space-y-2">{items.map((n: any) => <div key={n.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm"><div className="flex items-center gap-2"><Badge variant={n.impact === "high" ? "destructive" : "secondary"}>{n.impact}</Badge><span className="font-semibold">{n.title}</span></div><div className="mt-1 text-xs text-muted-foreground">{n.source ?? "Wire"} · {new Date(n.created_at).toLocaleString()}</div></div>)}</div>}
      </Card>
    </div>
  );
}

function ComplaintsTab({ items, loading, refetch }: { items?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const updateComplaint = useServerFn(updateAdminComplaint);

  const setStatus = async (id: string, status: string) => {
    try {
      await updateComplaint({ data: { id, status: status as "pending" | "resolved" } });
      toast.success("Updated");
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update complaint");
    }
  };

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (!items?.length) return <Card className="p-6 text-sm text-muted-foreground">No complaints.</Card>;

  return (
    <div className="space-y-2">
      {items.map((c: any) => (
        <Card key={c.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{c.subject}</div>
              <div className="text-xs text-muted-foreground">{c.name} · {c.email} · {new Date(c.created_at).toLocaleString()}</div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{c.message}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Badge variant={c.status === "resolved" ? "default" : "secondary"} className={c.status === "resolved" ? "bg-success text-success-foreground" : ""}>{c.status}</Badge>
              {c.status !== "resolved" && <Button size="sm" onClick={() => setStatus(c.id, "resolved")}>Mark resolved</Button>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab({ items, loading, refetch }: { items?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const updateSetting = useServerFn(updateAdminSetting);
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    if (items) {
      const m: Record<string, string> = {};
      items.forEach((r: any) => { m[r.key] = r.value; });
      setVals(m);
    }
  }, [items]);

  const save = async (key: string) => {
    try {
      await updateSetting({ data: { key, value: vals[key] } });
      toast.success("Saved");
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save setting");
    }
  };

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

  const labels: Record<string, string> = {
    deposit_wallet_usdt: "USDT (default) deposit address",
    deposit_wallet_usdt_bep20: "USDT BEP20 (BSC) deposit address",
    deposit_wallet_usdt_trc20: "USDT TRC20 (Tron) deposit address",
    deposit_wallet_btc: "BTC deposit address",
    deposit_wallet_eth: "ETH (ERC20) deposit address",
  };

  return (
    <Card className="p-6 space-y-4">
      {Object.keys(vals).map((k) => (
        <div key={k} className="space-y-2">
          <Label>{labels[k] ?? k}</Label>
          <div className="flex gap-2">
            <Input value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            <Button onClick={() => save(k)}><Save className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
