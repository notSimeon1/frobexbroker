import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  toggleAdminAiTrading,
  toggleAdminAccountMode,
  toggleAdminSuspend,
  updateAdminChart,
  updateAdminComplaint,
  updateAdminSetting,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, Check, X, TrendingUp, TrendingDown, Minus, Save, FileText, Newspaper, Ban, Bot, Users, Layers, Megaphone, Radio, Activity, DollarSign, BarChart3, Cpu, Headphones, Send, KeyRound, ScrollText, UserCog, Crown, ShieldCheck } from "lucide-react";
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
    // Check user_roles table for admin role
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          toast.error("Admin only");
          navigate({ to: "/dashboard" });
        }
      });
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
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 w-full justify-start">
          <TabsTrigger value="deposits" className="shrink-0">Deposits</TabsTrigger>
          <TabsTrigger value="proofs" className="shrink-0"><FileText className="mr-1 h-3.5 w-3.5" />Deposit Proofs</TabsTrigger>
          <TabsTrigger value="withdrawals" className="shrink-0">Withdrawals</TabsTrigger>
          <TabsTrigger value="users" className="shrink-0">Users &amp; Charts</TabsTrigger>
          <TabsTrigger value="kyc" className="shrink-0">KYC Review</TabsTrigger>
          <TabsTrigger value="news" className="shrink-0">Market News</TabsTrigger>
          <TabsTrigger value="complaints" className="shrink-0">Complaints</TabsTrigger>
          <TabsTrigger value="bots" className="shrink-0"><Bot className="mr-1 h-3.5 w-3.5" />Bots</TabsTrigger>
          <TabsTrigger value="copy" className="shrink-0"><Users className="mr-1 h-3.5 w-3.5" />Copy</TabsTrigger>
          <TabsTrigger value="premarket" className="shrink-0"><Layers className="mr-1 h-3.5 w-3.5" />Pre-Market</TabsTrigger>
          <TabsTrigger value="announcements" className="shrink-0"><Megaphone className="mr-1 h-3.5 w-3.5" />Announcements</TabsTrigger>
          <TabsTrigger value="signals" className="shrink-0"><Radio className="mr-1 h-3.5 w-3.5" />Signals</TabsTrigger>
          <TabsTrigger value="support" className="shrink-0"><Headphones className="mr-1 h-3.5 w-3.5" />Support</TabsTrigger>
          <TabsTrigger value="roles" className="shrink-0"><UserCog className="mr-1 h-3.5 w-3.5" />Roles</TabsTrigger>
          <TabsTrigger value="audit" className="shrink-0"><ScrollText className="mr-1 h-3.5 w-3.5" />Audit</TabsTrigger>
          <TabsTrigger value="settings" className="shrink-0 ml-auto bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">💼 Wallets</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits"><DepositsTab items={overviewQuery.data?.deposits} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="proofs"><DepositProofsTab items={overviewQuery.data?.deposits} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab items={overviewQuery.data?.withdrawals} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="users"><UsersTab users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="kyc"><KycTab items={overviewQuery.data?.kyc} users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="news"><NewsTab items={overviewQuery.data?.news} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="complaints"><ComplaintsTab items={overviewQuery.data?.complaints} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="settings"><SettingsTab items={overviewQuery.data?.settings} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="bots"><AdminBotsTab /></TabsContent>
        <TabsContent value="copy"><AdminCopyTab /></TabsContent>
        <TabsContent value="premarket"><AdminPreMarketTab /></TabsContent>
        <TabsContent value="announcements"><AdminAnnouncementsTab /></TabsContent>
        <TabsContent value="signals"><AdminSignalsTab /></TabsContent>
        <TabsContent value="support"><AdminSupportTab /></TabsContent>
        <TabsContent value="roles"><AdminRolesTab users={overviewQuery.data?.users} loading={overviewQuery.isLoading} refetch={overviewQuery.refetch} /></TabsContent>
        <TabsContent value="audit"><AdminAuditTab users={overviewQuery.data?.users} /></TabsContent>
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

function DepositProofsTab({ items, users, loading, refetch }: { items?: any[]; users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const decideDeposit = useServerFn(decideAdminDeposit);
  const [creditCrypto, setCreditCrypto] = useState<Record<string, string>>({});
  const [creditQty, setCreditQty] = useState<Record<string, string>>({});

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;
  const withProof = (items ?? []).filter((d: any) => d.receipt_url || d.proof_url || d.tx_hash);
  if (!withProof.length) return <Card className="p-6 text-sm text-muted-foreground">No deposit proofs uploaded yet.</Card>;

  const creditCryptoAsset = async (d: any) => {
    const sym = creditCrypto[d.id] ?? d.crypto_currency ?? "USDT";
    const qty = Number(creditQty[d.id] ?? 0);
    if (!qty || qty <= 0) return toast.error("Enter crypto quantity to credit");
    try {
      const { error } = await (supabase as any).from("user_holdings").upsert(
        { user_id: d.user_id, symbol: sym, quantity: qty, network: d.crypto_currency ?? "spot" },
        { onConflict: "user_id,symbol" },
      );
      if (error) throw error;
      await supabase.from("transactions").insert({ user_id: d.user_id, type: "deposit_credit", amount: Number(d.amount), asset_name: `${qty} ${sym}`, status: "completed" });
      await decideDeposit({ data: { id: d.id, status: "approved" } });
      toast.success(`Credited ${qty} ${sym} to user wallet`);
      setCreditQty((p) => ({ ...p, [d.id]: "" }));
      await refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Could not credit crypto");
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FileText className="h-4 w-4 text-primary" /> Deposit Proof Review</h2>
      <div className="space-y-3">
        {withProof.map((d: any) => {
          const requestUser = users?.find((u) => u.id === d.user_id);
          return (
            <div key={d.id} className="rounded-lg border border-border bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold tabular-nums">${Number(d.amount).toFixed(2)} · {d.crypto_currency}</div>
                  <div className="text-xs text-muted-foreground">{requestUser?.email ?? requestUser?.full_name ?? d.user_id}</div>
                  {d.tx_hash && <div className="text-xs text-muted-foreground break-all">tx: {d.tx_hash}</div>}
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(d.receipt_url || d.proof_url) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const storagePath = d.receipt_url || d.proof_url;
                        // If it's already a full URL, open directly
                        if (storagePath.startsWith("http")) {
                          window.open(storagePath, "_blank", "noopener,noreferrer");
                          return;
                        }
                        // Otherwise generate a signed URL from storage
                        const { data, error } = await supabase.storage
                          .from("deposit-receipts")
                          .createSignedUrl(storagePath, 3600);
                        if (error || !data?.signedUrl) {
                          toast.error("Could not generate proof URL");
                          return;
                        }
                        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <FileText className="mr-1 h-4 w-4" /> View proof
                    </Button>
                  )}
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decideDeposit({ data: { id: d.id, status: "rejected" } }).then(() => refetch())}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={() => decideDeposit({ data: { id: d.id, status: "approved" } }).then(() => refetch())}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                    </>
                  )}
                  {d.status !== "pending" && <Badge variant={d.status === "approved" ? "default" : "destructive"} className={d.status === "approved" ? "bg-success text-success-foreground" : ""}>{d.status}</Badge>}
                </div>
              </div>
              {d.status === "pending" && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Credit crypto</Label>
                    <Select value={creditCrypto[d.id] ?? d.crypto_currency ?? "USDT"} onValueChange={(v) => setCreditCrypto((p) => ({ ...p, [d.id]: v }))}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="BNB">BNB</SelectItem>
                        <SelectItem value="SOL">SOL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" step="0.000001" placeholder="0.00" value={creditQty[d.id] ?? ""} onChange={(e) => setCreditQty((p) => ({ ...p, [d.id]: e.target.value }))} />
                  </div>
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => creditCryptoAsset(d)}>Credit to wallet</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
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
  const rolesQuery = useQuery({
    queryKey: ["admin_role_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set((data ?? []).map((r: any) => r.user_id as string));
    },
    refetchInterval: 8000,
  });
  const adminIds = rolesQuery.data ?? new Set<string>();
  const reload = async () => { await Promise.all([refetch(), rolesQuery.refetch()]); };
  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

  return (
    <div className="space-y-3">
      {users?.map((u: any) => <UserRow key={u.id} user={u} isAdminUser={adminIds.has(u.id)} onChange={reload} />)}
      {!users?.length && <Card className="p-6 text-sm text-muted-foreground">No users yet.</Card>}
    </div>
  );
}

function UserRow({ user, isAdminUser, onChange }: { user: any; isAdminUser?: boolean; onChange: () => void | Promise<unknown> }) {
  const saveUserChart = useServerFn(updateAdminChart);
  const adjustBalance = useServerFn(adjustAdminBalance);
  const toggleMode = useServerFn(toggleAdminAccountMode);
  const toggleSuspend = useServerFn(toggleAdminSuspend);
  const toggleAiTrading = useServerFn(toggleAdminAiTrading);
  const [mode, setMode] = useState<string>(user.chart_mode ?? "live");
  const [intensity, setIntensity] = useState<string>(String(user.chart_intensity ?? 1));
  const [creditAmt, setCreditAmt] = useState("");

  const saveChart = async () => {
    try {
      await saveUserChart({ data: { userId: user.id, mode: mode as "profit" | "loss" | "flat" | "live", intensity: Number(intensity) || 1 } });
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

  const setAiTrading = async (checked: boolean) => {
    try {
      await toggleAiTrading({ data: { userId: user.id, enabled: checked } });
      toast.success(checked ? "AI trading enabled" : "AI trading disabled");
      await onChange();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update AI trading");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{user.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{user.email ?? user.id}</div>
          <div className="text-xs text-muted-foreground">Country: {user.country ?? "Australia"}</div>
          <div className="mt-1 text-sm tabular-nums">Live: ${Number(user.live_balance ?? 0).toFixed(2)} · Demo: ${Number(user.demo_balance ?? 0).toFixed(2)} · Cash: ${Number(user.available_cash).toFixed(2)}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={user.account_mode === "live" ? "default" : "secondary"} className={user.account_mode === "live" ? "bg-success text-success-foreground" : ""}>{String(user.account_mode ?? "demo").toUpperCase()}</Badge>
            <Badge variant={user.kyc_status === "approved" ? "default" : "outline"}>{String(user.kyc_status ?? "none").toUpperCase()} KYC</Badge>
            <Badge variant={user.ai_trading_enabled ? "default" : "outline"}>{user.ai_trading_enabled ? "AI ON" : "AI OFF"}</Badge>
            {user.is_suspended && <Badge variant="destructive">Suspended</Badge>}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
          <label className="flex items-center justify-between gap-3"><span>Live mode</span><Switch checked={user.account_mode === "live"} onCheckedChange={setAccountMode} /></label>
          <label className="flex items-center justify-between gap-3"><span>AI trading</span><Switch checked={!!user.ai_trading_enabled} onCheckedChange={setAiTrading} /></label>
          <label className="flex items-center justify-between gap-3"><span className="flex items-center gap-1"><Ban className="h-3 w-3" /> Suspend</span><Switch checked={!!user.is_suspended} onCheckedChange={setSuspended} /></label>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Admin access</span>
            <Switch
              checked={!!isAdminUser}
              disabled={user.email?.toLowerCase?.() === OWNER_EMAIL}
              onCheckedChange={async (checked) => {
                try {
                  const fn = checked ? "admin_grant_admin" : "admin_revoke_admin";
                  const { error } = await supabase.rpc(fn as never, { _target: user.id } as never);
                  if (error) throw error;
                  toast.success(checked ? "Admin access granted" : "Admin access revoked");
                  await onChange();
                } catch (err: any) {
                  toast.error(err.message ?? "Could not update role");
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Chart direction</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live"><Activity className="inline mr-1 h-3 w-3" /> Sync with live price</SelectItem>
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

// ============ ADMIN BOTS TAB ============
function AdminBotsTab() {
  const { data: bots } = useQuery({
    queryKey: ["admin_bots_list"],
    queryFn: async () => (await supabase.from("trading_bots").select("*").order("sort_order")).data ?? [],
  });
  const { data: activeBots } = useQuery({
    queryKey: ["admin_active_bots_list"],
    queryFn: async () => (await supabase.from("user_active_bots").select("*, trading_bots(name), profiles!inner(email)").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: 10000,
  });
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Bot className="h-4 w-4 text-primary" /> Bot Tiers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2">Name</th><th className="pb-2">Tier</th><th className="pb-2 text-right">Capital</th><th className="pb-2 text-right">ROI</th><th className="pb-2 text-right">Win Rate</th><th className="pb-2 text-right">Duration</th></tr>
            </thead>
            <tbody>
              {bots?.map((b: any) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="py-2 font-medium">{b.name}</td>
                  <td className="py-2"><Badge variant="secondary" className="text-[10px]">{b.tier_key}</Badge></td>
                  <td className="py-2 text-right tabular-nums">${Number(b.capital_required).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums text-success">{Number(b.min_roi).toFixed(1)}-{Number(b.max_roi).toFixed(1)}%</td>
                  <td className="py-2 text-right tabular-nums">{Number(b.win_rate).toFixed(1)}%</td>
                  <td className="py-2 text-right">{b.duration_days}d</td>
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

// ============ ADMIN COPY TRADING TAB ============
function AdminCopyTab() {
  const { data: tiers } = useQuery({
    queryKey: ["admin_copy_tiers"],
    queryFn: async () => (await supabase.from("copy_trading_tiers").select("*").order("sort_order")).data ?? [],
  });
  const { data: allocations } = useQuery({
    queryKey: ["admin_copy_allocations"],
    queryFn: async () => (await supabase.from("user_copy_allocations").select("*, copy_trading_tiers(tier_name), profiles!inner(email)").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: 10000,
  });
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Users className="h-4 w-4 text-primary" /> Copy Trading Tiers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2">Tier</th><th className="pb-2">Strategist</th><th className="pb-2 text-right">Capital</th><th className="pb-2 text-right">Win Rate</th><th className="pb-2 text-right">Monthly ROI</th></tr>
            </thead>
            <tbody>
              {tiers?.map((t: any) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2 font-medium">{t.tier_name}</td>
                  <td className="py-2">{t.strategist_name}</td>
                  <td className="py-2 text-right tabular-nums">${Number(t.required_capital).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums">{Number(t.win_rate).toFixed(1)}%</td>
                  <td className="py-2 text-right tabular-nums text-success">{Number(t.monthly_roi_min).toFixed(0)}-{Number(t.monthly_roi_max).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Activity className="h-4 w-4 text-primary" /> User Allocations</h2>
        {!allocations?.length ? <p className="text-sm text-muted-foreground">No allocations.</p> : (
          <div className="space-y-2">
            {allocations.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{a.copy_trading_tiers?.tier_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{(a.profiles as any)?.email ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">${Number(a.allocated_amount).toFixed(2)}</div>
                  <div className="text-xs text-success">+${Number(a.current_profit).toFixed(2)}</div>
                </div>
                <Badge className={a.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============ ADMIN PRE-MARKET TAB ============
function AdminPreMarketTab() {
  const { data: tokens } = useQuery({
    queryKey: ["admin_premarket_tokens"],
    queryFn: async () => (await supabase.from("pre_market_tokens").select("*").order("sort_order")).data ?? [],
  });
  const { data: allocations } = useQuery({
    queryKey: ["admin_premarket_allocations"],
    queryFn: async () => (await supabase.from("user_pre_market_allocations").select("*, pre_market_tokens(token_name, symbol), profiles!inner(email)").order("created_at", { ascending: false }).limit(50)).data ?? [],
    refetchInterval: 10000,
  });
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Layers className="h-4 w-4 text-primary" /> Pre-Market Tokens</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="pb-2">Token</th><th className="pb-2">Symbol</th><th className="pb-2 text-right">Price</th><th className="pb-2 text-right">Pool Cap</th><th className="pb-2 text-right">Min Alloc</th><th className="pb-2">TGE</th></tr>
            </thead>
            <tbody>
              {tokens?.map((t: any) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2 font-medium">{t.token_name}</td>
                  <td className="py-2"><Badge variant="secondary" className="text-[10px]">{t.symbol}</Badge></td>
                  <td className="py-2 text-right tabular-nums">${Number(t.listing_price).toFixed(4)}</td>
                  <td className="py-2 text-right tabular-nums">${Number(t.pool_cap).toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums">${Number(t.min_allocation).toLocaleString()}</td>
                  <td className="py-2 text-xs">{new Date(t.tge_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Activity className="h-4 w-4 text-primary" /> User Allocations</h2>
        {!allocations?.length ? <p className="text-sm text-muted-foreground">No allocations.</p> : (
          <div className="space-y-2">
            {allocations.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold">{a.pre_market_tokens?.token_name ?? "—"} ({a.pre_market_tokens?.symbol ?? "—"})</div>
                  <div className="text-xs text-muted-foreground">{(a.profiles as any)?.email ?? "—"}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">${Number(a.usd_invested).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{Number(a.tokens_allocated).toFixed(2)} tokens</div>
                </div>
                <Badge className="bg-primary/15 text-primary">{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============ ADMIN ANNOUNCEMENTS TAB ============
function AdminAnnouncementsTab() {
  const { data: announcements } = useQuery({
    queryKey: ["admin_announcements_list"],
    queryFn: async () => (await supabase.from("platform_announcements").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: 10000,
  });
  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Megaphone className="h-4 w-4 text-primary" /> Platform Announcements</h2>
      {!announcements?.length ? <p className="text-sm text-muted-foreground">None yet.</p> : (
        <div className="space-y-2">
          {announcements.map((a: any) => (
            <div key={a.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                {a.is_urgent && <Badge variant="destructive" className="text-[10px]">Urgent</Badge>}
                <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                <span className="font-semibold">{a.title}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{a.content}</div>
              <div className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Post new announcements from the Admin Ops page.</p>
    </Card>
  );
}

// ============ ADMIN SIGNALS TAB ============
function AdminSignalsTab() {
  const { data: signals } = useQuery({
    queryKey: ["admin_signals_list"],
    queryFn: async () => (await supabase.from("trading_signals").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: 10000,
  });
  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Radio className="h-4 w-4 text-primary" /> Trading Signals</h2>
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
              <div className="mt-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Post new signals from the Admin Ops page.</p>
    </Card>
  );
}

function AdminSupportTab() {
  const [threads, setThreads] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const loadThreads = async () => {
    const { data } = await supabase.from("support_threads").select("*").order("last_message_at", { ascending: false, nullsFirst: false });
    setThreads(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((t: any) => t.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setUsers(map);
    }
  };

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase.from("support_messages").select("*").eq("thread_id", activeId).order("created_at");
      setMessages(data ?? []);
    })();
    const ch = supabase.channel("admin-support-" + activeId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${activeId}` }, (p: any) => {
        setMessages((prev) => prev.some((x) => x.id === p.new.id) ? prev : [...prev, p.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  const reply = async () => {
    if (!text.trim() || !activeId) return;
    const active = threads.find((t) => t.id === activeId);
    if (!active) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        thread_id: activeId, user_id: active.user_id, sender: "support", body: text.trim(),
      });
      if (error) throw error;
      setText("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send");
    } finally { setSending(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="p-3 max-h-[70vh] overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Conversations</div>
          <Button size="sm" variant="ghost" onClick={loadThreads}>Refresh</Button>
        </div>
        {threads.length === 0 && <p className="text-xs text-muted-foreground">No conversations yet.</p>}
        <div className="space-y-1">
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${activeId === t.id ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-accent"}`}>
              <div className="font-semibold truncate">{users[t.user_id]?.full_name ?? t.user_id.slice(0, 8)}</div>
              <div className="text-muted-foreground">{t.subject ?? "Support"}</div>
              <div className="text-[10px] text-muted-foreground">{t.last_message_at ? new Date(t.last_message_at).toLocaleString() : new Date(t.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card className="flex h-[70vh] flex-col overflow-hidden">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation to reply.</div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto bg-background/30 p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender === "user" ? "bg-muted text-foreground rounded-bl-sm" : "bg-gradient-hero text-primary-foreground rounded-br-sm"}`}>
                    <div className="text-[10px] opacity-70 mb-0.5">{m.sender === "user" ? "User" : m.sender === "bot" ? "Bot" : "Support"}</div>
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-2">
              <Input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
                placeholder="Type a reply as support…" />
              <Button onClick={reply} disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}


// ============ ADMIN ROLES TAB — promote / demote admins ============
function AdminRolesTab({ users, loading, refetch }: { users?: any[]; loading: boolean; refetch: () => void | Promise<unknown> }) {
  const [q, setQ] = useState("");
  const rolesQuery = useQuery({
    queryKey: ["admin_role_ids_full"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id,role,created_at").eq("role", "admin");
      return data ?? [];
    },
    refetchInterval: 8000,
  });
  const adminSet = new Set((rolesQuery.data ?? []).map((r: any) => r.user_id as string));
  const reload = async () => { await Promise.all([refetch(), rolesQuery.refetch()]); };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users ?? [];
    return (users ?? []).filter((u: any) =>
      (u.email ?? "").toLowerCase().includes(term) ||
      (u.full_name ?? "").toLowerCase().includes(term) ||
      (u.country ?? "").toLowerCase().includes(term)
    );
  }, [users, q]);

  const admins = (users ?? []).filter((u: any) => adminSet.has(u.id));

  if (loading) return <Card className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></Card>;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">Role management</h2>
            <p className="text-sm text-muted-foreground">
              Promote users to admin so they get the same panel access you have.
              The Primary Super Admin (<span className="font-mono">{OWNER_EMAIL}</span>) cannot be demoted or modified by anyone else — enforced at the database level.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Current admins ({admins.length})</h3>
        </div>
        {!admins.length ? (
          <p className="text-sm text-muted-foreground">Only the primary super admin exists so far.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {admins.map((a: any) => (
              <Badge key={a.id} variant="outline" className="border-primary/40 bg-primary/5 text-primary py-1.5 px-3">
                {a.email?.toLowerCase() === OWNER_EMAIL && <Crown className="mr-1 h-3 w-3" />}
                {a.full_name ?? a.email ?? a.id.slice(0, 8)}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">All users</h3>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name, country…" className="max-w-xs" />
        </div>
        <div className="divide-y divide-border">
          {filtered.map((u: any) => {
            const isOwner = u.email?.toLowerCase() === OWNER_EMAIL;
            const isAdminUser = adminSet.has(u.id);
            return (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {isOwner && <Crown className="h-3.5 w-3.5 text-primary" />}
                    {u.full_name ?? "—"}
                    {isAdminUser && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]"><ShieldCheck className="mr-0.5 h-2.5 w-2.5" />Admin</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{u.email ?? u.id} · {u.country ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <span>Admin access</span>
                    <Switch
                      checked={isAdminUser}
                      disabled={isOwner}
                      onCheckedChange={async (checked) => {
                        try {
                          const fn = checked ? "admin_grant_admin" : "admin_revoke_admin";
                          const { error } = await supabase.rpc(fn as never, { _target: u.id } as never);
                          if (error) throw error;
                          toast.success(checked ? "Admin access granted" : "Admin access revoked");
                          await reload();
                        } catch (err: any) {
                          toast.error(err.message ?? "Could not update role");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          {!filtered.length && <p className="py-6 text-center text-sm text-muted-foreground">No users match your search.</p>}
        </div>
      </Card>
    </div>
  );
}

// ============ ADMIN AUDIT TAB — balance & role change history ============
function AdminAuditTab({ users }: { users?: any[] }) {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["admin_audit_logs"],
    queryFn: async () => (await supabase.from("admin_balance_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
    refetchInterval: 15000,
  });
  const userMap = useMemo(() => {
    const m: Record<string, any> = {};
    (users ?? []).forEach((u: any) => { m[u.id] = u; });
    return m;
  }, [users]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ScrollText className="h-4 w-4 text-primary" /> Audit log</h2>
          <p className="text-xs text-muted-foreground">Every admin credit, debit and asset adjustment — with actor, target, amount and reason.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Refresh</Button>
      </div>
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : !logs?.length ? (
        <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="pb-2">When</th>
                <th className="pb-2">Admin</th>
                <th className="pb-2">Target</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Asset</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-2 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-2 text-xs">{userMap[l.admin_id]?.email ?? l.admin_id.slice(0, 8)}</td>
                  <td className="py-2 text-xs">{userMap[l.target_user_id]?.email ?? l.target_user_id.slice(0, 8)}</td>
                  <td className="py-2"><Badge variant={l.action === "credit" ? "default" : "destructive"} className={l.action === "credit" ? "bg-success text-success-foreground text-[10px]" : "text-[10px]"}>{l.action}</Badge></td>
                  <td className="py-2 text-xs">{l.asset_symbol ?? l.balance_type}</td>
                  <td className="py-2 text-right tabular-nums text-xs">{Number(l.amount).toFixed(4)}{l.fiat_value_usd ? ` ($${Number(l.fiat_value_usd).toFixed(2)})` : ""}</td>
                  <td className="py-2 text-xs text-muted-foreground max-w-[240px] truncate">{l.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
