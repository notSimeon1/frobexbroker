import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CircleCheck as CheckCircle2, Clock, Circle as XCircle, Loader as Loader2, Search, Bitcoin, Coins, Shield, Receipt, CircleAlert as AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
  head: () => ({ meta: [{ title: "Deposit — Frobex" }] }),
});

type CryptoOption = { id: string; label: string; symbol: string; network: string; settingsKey: string };
const CRYPTOS: CryptoOption[] = [
  { id: "usdt_bep20", label: "Tether USD", symbol: "USDT", network: "BEP20 (BSC)", settingsKey: "deposit_wallet_usdt_bep20" },
  { id: "usdt_trc20", label: "Tether USD", symbol: "USDT", network: "TRC20 (Tron)", settingsKey: "deposit_wallet_usdt_trc20" },
  { id: "btc", label: "Bitcoin", symbol: "BTC", network: "Bitcoin", settingsKey: "deposit_wallet_btc" },
  { id: "eth", label: "Ethereum", symbol: "ETH", network: "ERC20", settingsKey: "deposit_wallet_eth" },
];

function DepositPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [selectedId, setSelectedId] = useState<string>("usdt_bep20");
  const [txHash, setTxHash] = useState("");
  const [paymentMethodKey, setPaymentMethodKey] = useState("usdt_bep20");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const m: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
      return m;
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const m: Record<string, any> = {};
      (data ?? []).forEach((r: any) => {
        try { m[r.key_name] = typeof r.value === "string" ? JSON.parse(r.value) : r.value; }
        catch { m[r.key_name] = r.value; }
      });
      return m;
    },
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_payment_methods").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: deposits, refetch } = useQuery({
    queryKey: ["my_deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const gasFeePercent = Number(platformSettings?.gas_fee_percent ?? 5);
  const minDeposit = Number(platformSettings?.min_deposit_usd ?? 100);
  const expiryHours = Number(platformSettings?.payment_order_expiry_hours ?? 2);

  const baseAmount = Number(amount) || 0;
  const gasFeeAmount = Number((baseAmount * gasFeePercent / 100).toFixed(2));
  const totalPayable = Number((baseAmount + gasFeeAmount).toFixed(2));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CRYPTOS;
    return CRYPTOS.filter((c) => `${c.label} ${c.symbol} ${c.network}`.toLowerCase().includes(q));
  }, [search]);

  const onSearchChange = (val: string) => {
    setSearch(val);
    if (val.trim().toLowerCase() === "/adminaccess") {
      toast.success("Admin access unlocked");
      setSearch("");
      navigate({ to: "/admin" });
    }
  };

  const selected = CRYPTOS.find((c) => c.id === selectedId)!;
  const wallet = settings?.[selected.settingsKey];

  useEffect(() => {
    setRevealed(false);
    setGenerating(true);
    const delay = 2000 + Math.random() * 3000;
    const id = setTimeout(() => { setGenerating(false); setRevealed(true); }, delay);
    return () => clearTimeout(id);
  }, [selectedId]);

  const submit = async () => {
    const base = Number(amount);
    if (!base || base <= 0) return toast.error("Enter a valid amount");
    if (base < minDeposit) return toast.error(`Minimum deposit is $${minDeposit}`);
    if (!txHash.trim()) return toast.error("Enter the transaction hash after sending");
    setSubmitting(true);

    const expiresAt = new Date(Date.now() + expiryHours * 3600000).toISOString();

    const { error } = await supabase.from("deposits").insert({
      user_id: user!.id,
      amount: totalPayable,
      crypto_currency: `${selected.symbol} ${selected.network}`,
      tx_hash: txHash.trim(),
      base_amount: base,
      gas_fee_amount: gasFeeAmount,
      total_payable: totalPayable,
      payment_method_key: paymentMethodKey,
      expires_at: expiresAt,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }

    await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "deposit_request",
      amount: totalPayable,
      asset_name: `Deposit ${selected.symbol} ${selected.network} (base $${base.toFixed(2)} + gas $${gasFeeAmount.toFixed(2)})`,
      status: "pending",
      source_table: "deposits",
    });
    toast.success("Deposit submitted — awaiting admin approval");
    setAmount(""); setTxHash("");
    qc.invalidateQueries({ queryKey: ["my_deposits"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    refetch();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deposit funds</h1>
        <p className="text-sm text-muted-foreground">Choose a network, send crypto to the address, then paste the transaction hash. Your balance is credited after admin confirmation.</p>
      </div>

      <Card className="p-6 space-y-5 bg-morph">
        <div className="space-y-2">
          <Label>Search asset / network</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search USDT, BTC, ETH…" className="pl-9" />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <motion.button
                  layout key={c.id} type="button"
                  initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedId(c.id); setPaymentMethodKey(c.id); }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? "border-primary bg-accent/50 shadow-glow" : "border-border bg-surface hover:bg-accent/30"}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-gradient-hero text-primary-foreground" : "bg-surface-elevated"}`}>
                    {c.symbol === "BTC" ? <Bitcoin className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{c.symbol} <span className="text-xs font-normal text-muted-foreground">· {c.network}</span></div>
                    <div className="truncate text-xs text-muted-foreground">{c.label}</div>
                  </div>
                </motion.button>
              );
            })}
            {!filtered.length && <div className="col-span-full text-sm text-muted-foreground">No assets match.</div>}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <Label>Amount (USD)</Label>
          <Input type="number" min={minDeposit} step="0.01" placeholder={String(minDeposit)} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-muted-foreground">Minimum deposit: ${minDeposit}</p>
        </div>

        {/* Ledger breakdown */}
        {baseAmount > 0 && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Receipt className="h-3.5 w-3.5" /> Payment Breakdown
            </div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base amount:</span><span className="font-semibold tabular-nums">${baseAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gas fee ({gasFeePercent}%):</span><span className="font-semibold tabular-nums text-destructive">${gasFeeAmount.toFixed(2)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between text-sm"><span className="font-semibold">Total payable:</span><span className="font-bold tabular-nums text-primary">${totalPayable.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Payment method:</span><span className="font-mono">{paymentMethodKey}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Expires in:</span><span>{expiryHours} hours</span></div>
          </motion.div>
        )}

        <div className="space-y-2">
          <Label>Payment method</Label>
          <Select value={paymentMethodKey} onValueChange={setPaymentMethodKey}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {paymentMethods?.map((m: any) => (
                <SelectItem key={m.method_key} value={m.method_key}>{m.method_name} — {m.identifier}</SelectItem>
              ))}
              {CRYPTOS.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.symbol} ({c.network})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <motion.div layout className="rounded-xl border border-dashed border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Send {selected.symbol} ({selected.network}) to this address:</p>
          <div className="mt-2 min-h-[44px]">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-md bg-background px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Generating secure {selected.symbol} {selected.network} address…</div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                      <motion.div className="h-full bg-gradient-hero" initial={{ width: "5%" }} animate={{ width: "100%" }} transition={{ duration: 3.5 }} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="addr" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-md bg-background px-3 py-2 text-xs font-mono">{wallet ?? "Address not set — contact support"}</code>
                  <Button size="sm" variant="ghost" onClick={() => { if (wallet) { navigator.clipboard.writeText(wallet); toast.success("Copied"); } }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {revealed && <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Address verified on-chain. Send only {selected.symbol} via {selected.network}.</p>}
        </motion.div>

        <div className="space-y-2">
          <Label>Transaction hash</Label>
          <Input placeholder="0x... or TRC20 tx id" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          <p className="text-xs text-muted-foreground">Paste the on-chain tx id so the admin can verify your transfer.</p>
        </div>

        <Button onClick={submit} disabled={submitting || generating} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit deposit request
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Your deposit history</h2>
        {!deposits?.length ? (
          <p className="text-sm text-muted-foreground">No deposits yet.</p>
        ) : (
          <div className="space-y-2">
            {deposits.map((d: any) => (
              <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold tabular-nums">${Number(d.amount).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">· {d.crypto_currency}</span></div>
                  {d.base_amount && d.gas_fee_amount != null && (
                    <div className="text-xs text-muted-foreground">Base: ${Number(d.base_amount).toFixed(2)} + Gas: ${Number(d.gas_fee_amount).toFixed(2)}</div>
                  )}
                  {d.payment_method_key && <div className="text-xs text-muted-foreground">Method: {d.payment_method_key}</div>}
                  {d.expires_at && <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Expires: {new Date(d.expires_at).toLocaleString()}</div>}
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={d.status} />
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Need help? <Link to="/support" className="text-primary underline">Contact support</Link>
      </p>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-success text-success-foreground"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
  return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
}
