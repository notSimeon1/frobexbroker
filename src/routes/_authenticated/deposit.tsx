import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

function DepositPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const wallet = currency === "BTC" ? settings?.deposit_wallet_btc : settings?.deposit_wallet_usdt;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!txHash.trim()) return toast.error("Enter the transaction hash after sending");
    setSubmitting(true);
    const { error } = await supabase.from("deposits").insert({
      user_id: user!.id, amount: amt, crypto_currency: currency, tx_hash: txHash.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deposit submitted — awaiting admin approval");
    setAmount(""); setTxHash(""); refetch();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deposit funds</h1>
        <p className="text-sm text-muted-foreground">Send crypto to the address below, submit the transaction hash, and your balance will be credited after admin confirmation.</p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input type="number" min={1} step="0.01" placeholder="100.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-surface p-4">
          <p className="text-xs font-medium text-muted-foreground">Send {currency} to this address:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-background px-3 py-2 text-xs font-mono">{wallet ?? "Loading..."}</code>
            <Button size="sm" variant="ghost" onClick={() => { if (wallet) { navigator.clipboard.writeText(wallet); toast.success("Copied"); } }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Transaction hash</Label>
          <Input placeholder="0x... or TRC20 tx id" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          <p className="text-xs text-muted-foreground">Paste the on-chain tx id so the admin can verify your transfer.</p>
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full">
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
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold tabular-nums">${Number(d.amount).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">· {d.crypto_currency}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={d.status} />
              </div>
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
