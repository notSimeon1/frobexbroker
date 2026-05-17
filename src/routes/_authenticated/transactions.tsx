import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: Transactions,
});

function Transactions() {
  const { user } = useAuth();
  const { data: txs } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transaction Ledger</h1>
        <p className="text-sm text-muted-foreground">Complete history of your account activity.</p>
      </div>
      <Card className="p-6">
        {!txs?.length ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t: any) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-3 text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="font-medium">{t.asset_name ?? "—"}</td>
                    <td><Badge variant={t.type === "Buy" || t.type === "Deposit" ? "default" : "secondary"}>{t.type}</Badge></td>
                    <td className="text-right font-medium">${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">
                      <Badge variant="outline" className="border-success/40 text-success">{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
