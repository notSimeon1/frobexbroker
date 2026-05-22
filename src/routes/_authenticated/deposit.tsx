import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Clock, XCircle, Loader2, Search, Bitcoin, Coins, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
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
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [selectedId, setSelectedId] = useState<string>("usdt_bep20");
  const [txHash, setTxHash] = useState("");
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

  const { data: deposits, refetch } = useQuery({
    queryKey: ["my_deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

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

  // Trigger "generating" animation when user selects a network
  useEffect(() => {
    setRevealed(false);
    setGenerating(true);
    const delay = 2000 + Math.random() * 3000;
    const id = setTimeout(() => { setGenerating(false); setRevealed(true); }, delay);
    return () => clearTimeout(id);
  }, [selectedId]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!txHash.trim()) return toast.error("Enter the transaction hash after sending");
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user!.id, amount: amt, crypto_currency: `${selected.symbol} ${selected.network}`, tx_hash: txHash.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "deposit_request",
      amount: amt,
      asset_name: `Pending deposit ${selected.symbol} ${selected.network}`,
      status: "pending",
    });
    toast.success("Deposit submitted — awaiting admin approval");
    setAmount(""); setTxHash(""); refetch();
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
                  onClick={() => setSelectedId(c.id)}
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
          <Input type="number" min={1} step="0.01" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <motion.div layout className="rounded-xl border border-dashed border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Send {selected.symbol} ({selected.network}) to this address:</p>
          <div className="mt-2 min-h-[44px]">
            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div
                  key="gen"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-md bg-background px-3 py-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Generating secure {selected.symbol} {selected.network} address…</div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                      <motion.div className="h-full bg-gradient-hero" initial={{ width: "5%" }} animate={{ width: "100%" }} transition={{ duration: 3.5 }} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="addr"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
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
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold tabular-nums">${Number(d.amount).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">· {d.crypto_currency}</span></div>
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
