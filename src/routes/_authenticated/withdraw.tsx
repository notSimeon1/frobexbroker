import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { CircleCheck as CheckCircle2, Clock, Circle as XCircle, Loader as Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/withdraw")({
  component: WithdrawPage,
});

function WithdrawPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [wallet, setWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("available_cash").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawals, refetch } = useQuery({
    queryKey: ["my_withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const available = Number(profile?.available_cash ?? 0);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > available) return toast.error("Amount exceeds available balance");
    if (!wallet.trim()) return toast.error("Enter your wallet address");
    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user!.id, amount: amt, crypto_currency: currency, wallet_address: wallet.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "withdrawal_request",
      amount: amt,
      asset_name: `Pending withdrawal ${currency}`,
      status: "pending",
    });
    toast.success("Withdrawal request submitted");
    setAmount(""); setWallet(""); refetch();
    navigate({ to: "/support" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Withdraw funds</h1>
        <p className="text-sm text-muted-foreground">Request a payout to your crypto wallet. Funds are sent after processing.</p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="rounded-lg bg-surface p-3 text-sm">
          Available: <span className="font-semibold tabular-nums">${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

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

        <div className="space-y-2">
          <Label>Your wallet address</Label>
          <Input placeholder="Destination address" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit withdrawal request
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Your withdrawal history</h2>
        {!withdrawals?.length ? (
          <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold tabular-nums">${Number(w.amount).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">· {w.crypto_currency}</span></div>
                  <div className="text-xs text-muted-foreground break-all">{w.wallet_address}</div>
                </div>
                <StatusBadge status={w.status} />
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
