import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bitcoin, Copy, Loader2, ShieldCheck, Timer, Upload, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/buy-bitcoin")({
  component: BuyBitcoinPage,
  head: () => ({ meta: [
    { title: "Buy Bitcoin — Frobex" },
    { name: "description", content: "Purchase Bitcoin instantly via bank transfer, Zelle, Cash App and more on Frobex." },
    { property: "og:title", content: "Buy Bitcoin — Frobex" },
    { property: "og:description", content: "Instant fiat-to-Bitcoin gateway with secure admin verification." },
  ]}),
});

type PaymentMethod = {
  id: string;
  method_key: string;
  method_name: string;
  identifier_label: string;
  recipient_name: string;
  identifier: string;
  is_active: boolean;
};

const GAS_FEE_PCT = 0.03; // 3% network + processing

function BuyBitcoinPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"loading" | "form">("loading");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(2 * 60 * 60); // 02:00:00

  useEffect(() => {
    const t = setTimeout(() => setPhase("form"), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_payment_methods").select("*").eq("is_active", true).order("sort_order");
      setMethods((data as PaymentMethod[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (phase !== "form") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const countdown = useMemo(() => {
    const h = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
    const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
    const s = String(secondsLeft % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [secondsLeft]);

  const base = parseFloat(amount) || 0;
  const gas = +(base * GAS_FEE_PCT).toFixed(2);
  const total = +(base + gas).toFixed(2);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { /* noop */ }
  };

  const submit = async () => {
    if (!user) return;
    if (base < 50) return toast.error("Minimum purchase is $50");
    if (!selected) return toast.error("Choose a payment method");
    if (!receipt) return toast.error("Upload payment receipt");
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${receipt.name}`;
      const up = await supabase.storage.from("deposit-receipts").upload(path, receipt);
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("deposit-receipts").createSignedUrl(path, 60 * 60 * 24 * 7);
      const receiptUrl = signed?.signedUrl ?? path;

      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: total,
        base_amount: base,
        gas_fee_amount: gas,
        total_payable: total,
        crypto_currency: "BTC",
        payment_method: selected.method_name,
        payment_method_key: selected.method_key,
        receipt_url: receiptUrl,
        status: "pending",
        expires_at: new Date(Date.now() + secondsLeft * 1000).toISOString(),
      });
      if (error) throw error;

      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit_request",
        amount: total,
        asset_name: `Buy BTC via ${selected.method_name}`,
        status: "pending",
      });

      toast.success("Purchase submitted — awaiting admin verification");
      setAmount(""); setReceipt(null); setSelected(null);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-hero">
              <Bitcoin className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-xl font-semibold">Generating secure payment gateway…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Encrypting your session and preparing verified merchants</p>
          <div className="mx-auto mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} className="h-full w-1/3 bg-gradient-hero" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bitcoin className="h-6 w-6 text-primary" /> Buy Bitcoin</h1>
          <p className="text-sm text-muted-foreground">Fund your account with fiat, receive BTC after verification</p>
        </div>
        <Badge variant="secondary" className="gap-1"><Timer className="h-3.5 w-3.5" /> Transfer window: <span className="font-mono">{countdown}</span></Badge>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input type="number" min={50} step="1" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Minimum $50 · Network + processing fee 3%</p>
          </div>
          <div className="space-y-2">
            <Label>You will pay</Label>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="text-lg font-bold">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">Base ${base.toFixed(2)} + Gas ${gas.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Select payment method</h2>
        {methods.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No active payment methods. Ask an admin to configure one.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {methods.map((m) => (
              <Card key={m.id} className={`cursor-pointer p-4 transition ${selected?.id === m.id ? "ring-2 ring-primary" : "hover:border-primary/50"}`} onClick={() => setSelected(m)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{m.method_name}</div>
                    <div className="text-xs text-muted-foreground">{m.identifier_label}: <span className="font-mono">{m.identifier}</span></div>
                    <div className="text-xs text-muted-foreground">Recipient: {m.recipient_name}</div>
                  </div>
                  {selected?.id === m.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={(e) => { e.stopPropagation(); copy(m.identifier); }}>
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="space-y-4 p-6">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Payment instructions</div>
                <p className="mt-1 text-muted-foreground">
                  Send exactly <span className="font-semibold text-foreground">${total.toFixed(2)}</span> to
                  <span className="font-semibold text-foreground"> {selected.recipient_name}</span> via
                  <span className="font-semibold text-foreground"> {selected.method_name}</span> ({selected.identifier})
                  within <span className="font-mono">{countdown}</span>. Upload a screenshot of the receipt below.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Upload payment receipt</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                {receipt && <p className="text-xs text-muted-foreground">{receipt.name}</p>}
              </div>

              <Button className="w-full" size="lg" disabled={submitting} onClick={submit}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Submit for verification
              </Button>
              <p className="text-center text-xs text-muted-foreground">Admin will review your receipt and credit BTC to your wallet.</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
