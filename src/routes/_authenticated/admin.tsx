import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import {
  adjustAdminBalance,
  decideAdminDeposit,
  decideAdminWithdrawal,
  getAdminOverview,
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
import { Loader2, Shield, Check, X, TrendingUp, TrendingDown, Minus, Save } from "lucide-react";
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
    queryFn: () => fetchOverview({ data: {} }),
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
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="settings">Wallet Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits"><DepositsTab items={overviewQuery.data?.deposits} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab items={overviewQuery.data?.withdrawals} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="users"><UsersTab users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="complaints"><ComplaintsTab items={overviewQuery.data?.complaints} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="settings"><SettingsTab items={overviewQuery.data?.settings} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
      </Tabs>
    </motion.div>
  );
}

function DepositsTab() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin_deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const decide = async (d: any, status: "approved" | "rejected") => {
    if (status === "approved") {
      // Credit user
      const { data: profile } = await supabase.from("profiles").select("account_balance, available_cash").eq("id", d.user_id).maybeSingle();
      const newBal = Number(profile?.account_balance ?? 0) + Number(d.amount);
      const newCash = Number(profile?.available_cash ?? 0) + Number(d.amount);
      const { error: pErr } = await supabase.from("profiles").update({ account_balance: newBal, available_cash: newCash, updated_at: new Date().toISOString() }).eq("id", d.user_id);
      if (pErr) return toast.error(pErr.message);
      await supabase.from("transactions").insert({
        user_id: d.user_id, type: "deposit", amount: d.amount, asset_name: `Deposit ${d.crypto_currency}`, status: "completed",
      });
    }
    const { error } = await supabase.from("deposits").update({ status, reviewed_at: new Date().toISOString() }).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(`Deposit ${status}`); refetch();
  };

  return <RequestList items={data} loading={isLoading} kind="Deposit" onDecide={decide} />;
}

function WithdrawalsTab() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin_withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const decide = async (w: any, status: "approved" | "rejected") => {
    if (status === "approved") {
      const { data: profile } = await supabase.from("profiles").select("account_balance, available_cash").eq("id", w.user_id).maybeSingle();
      const cash = Number(profile?.available_cash ?? 0);
      if (cash < Number(w.amount)) return toast.error("User has insufficient balance");
      await supabase.from("profiles").update({
        account_balance: Number(profile?.account_balance ?? 0) - Number(w.amount),
        available_cash: cash - Number(w.amount),
        updated_at: new Date().toISOString(),
      }).eq("id", w.user_id);
      await supabase.from("transactions").insert({
        user_id: w.user_id, type: "withdrawal", amount: w.amount, asset_name: `Withdrawal ${w.crypto_currency}`, status: "completed",
      });
    }
    const { error } = await supabase.from("withdrawals").update({ status, reviewed_at: new Date().toISOString() }).eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`); refetch();
  };

  return <RequestList items={data} loading={isLoading} kind="Withdrawal" onDecide={decide} />;
}

function RequestList({ items, loading, kind, onDecide }: { items?: any[]; loading: boolean; kind: string; onDecide: (item: any, status: "approved" | "rejected") => void }) {
  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (!items?.length) return <Card className="p-6 text-sm text-muted-foreground">No {kind.toLowerCase()} requests.</Card>;
  return (
    <Card className="p-4">
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-semibold tabular-nums">${Number(it.amount).toFixed(2)} · {it.crypto_currency}</div>
              <div className="text-xs text-muted-foreground truncate">User: {it.user_id}</div>
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
        ))}
      </div>
    </Card>
  );
}

function UsersTab() {
  const { data: users, refetch, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

  return (
    <div className="space-y-3">
      {users?.map((u: any) => <UserRow key={u.id} user={u} onChange={refetch} />)}
      {!users?.length && <Card className="p-6 text-sm text-muted-foreground">No users yet.</Card>}
    </div>
  );
}

function UserRow({ user, onChange }: { user: any; onChange: () => void }) {
  const [mode, setMode] = useState<string>(user.chart_mode ?? "flat");
  const [intensity, setIntensity] = useState<string>(String(user.chart_intensity ?? 1));
  const [creditAmt, setCreditAmt] = useState("");

  const saveChart = async () => {
    const { error } = await supabase.from("profiles").update({
      chart_mode: mode, chart_intensity: Number(intensity) || 1, chart_seed: Math.floor(Math.random() * 10000), updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Chart updated"); onChange();
  };

  const creditProfit = async (sign: 1 | -1) => {
    const amt = Number(creditAmt) * sign;
    if (!amt) return toast.error("Enter amount");
    const { data: p } = await supabase.from("profiles").select("account_balance, available_cash").eq("id", user.id).maybeSingle();
    const newBal = Number(p?.account_balance ?? 0) + amt;
    const newCash = Number(p?.available_cash ?? 0) + amt;
    if (newCash < 0 || newBal < 0) return toast.error("Would go negative");
    await supabase.from("profiles").update({ account_balance: newBal, available_cash: newCash, updated_at: new Date().toISOString() }).eq("id", user.id);
    await supabase.from("transactions").insert({
      user_id: user.id, type: sign > 0 ? "profit_credit" : "loss_debit", amount: Math.abs(amt), asset_name: sign > 0 ? "Profit credit" : "Loss adjustment", status: "completed",
    });
    toast.success(`${sign > 0 ? "Credited" : "Debited"} $${Math.abs(amt).toFixed(2)}`);
    setCreditAmt(""); onChange();
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{user.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{user.id}</div>
          <div className="mt-1 text-sm tabular-nums">Balance: ${Number(user.account_balance).toFixed(2)} · Cash: ${Number(user.available_cash).toFixed(2)}</div>
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

function ComplaintsTab() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin_complaints"],
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: string) => {
    await supabase.from("complaints").update({ status }).eq("id", id);
    toast.success("Updated"); refetch();
  };

  if (isLoading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  if (!data?.length) return <Card className="p-6 text-sm text-muted-foreground">No complaints.</Card>;

  return (
    <div className="space-y-2">
      {data.map((c: any) => (
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

function SettingsTab() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["app_settings_admin"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      return data ?? [];
    },
  });

  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((r: any) => { m[r.key] = r.value; });
      setVals(m);
    }
  }, [data]);

  const save = async (key: string) => {
    const { error } = await supabase.from("app_settings").update({ value: vals[key], updated_at: new Date().toISOString() }).eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Saved"); refetch();
  };

  if (isLoading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

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
