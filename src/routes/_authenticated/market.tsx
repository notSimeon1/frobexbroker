import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchBybitCryptoPrices } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/market")({
  component: Market,
});

function Market() {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // Fetch live prices from Bybit public API every 5 seconds
  useEffect(() => {
    const getPrices = async () => {
      const data = await fetchBybitCryptoPrices(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "DOGEUSDT"]);
      if (data) {
        setLivePrices(data);
      }
    };
    getPrices();
    const interval = setInterval(getPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").order("ticker");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Merge database assets with real-time Bybit prices if available
  const updatedAssets = assets?.map((asset: any) => {
    // Map ticker symbols e.g. "BTC" -> "BTCUSDT"
    const symbolKey = `${asset.ticker.toUpperCase()}USDT`;
    if (livePrices[symbolKey]) {
      return {
        ...asset,
        current_price: livePrices[symbolKey],
      };
    }
    return asset;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Asset Marketplace</h1>
        <p className="text-sm text-muted-foreground">Browse and invest in stocks, crypto, and commodities with real-time Bybit rates.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {updatedAssets?.map((a: any) => <AssetCard key={a.id} asset={a} />)}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: any }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const positive = Number(asset.daily_change_percent) >= 0;

  const invest = async () => {
    const usd = Number(amount);
    if (!usd || usd <= 0) { toast.error("Enter a valid amount"); return; }
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc("buy_asset_atomic" as never, { _asset_id: asset.id, _usd: usd } as never);
      if (rpcErr) throw rpcErr;

      qc.invalidateQueries({ queryKey: ["holdings"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(`Bought $${usd.toFixed(2)} of ${asset.ticker}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Order failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{asset.ticker}</h3>
            <Badge variant="secondary" className="text-[10px]">{asset.asset_class}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{asset.name}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Number(asset.daily_change_percent).toFixed(2)}%
        </div>
      </div>
      <div className="mt-4 text-2xl font-bold">${Number(asset.current_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mt-4 w-full bg-gradient-hero">Invest</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Buy {asset.ticker}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amt">Amount (USD)</Label>
              <Input id="amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
              <p className="mt-1 text-xs text-muted-foreground">
                ≈ {amount && Number(amount) > 0 ? (Number(amount) / Number(asset.current_price)).toFixed(6) : "0"} {asset.ticker} @ ${Number(asset.current_price).toFixed(2)}
              </p>
            </div>
            <Button className="w-full bg-gradient-hero" onClick={invest} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
