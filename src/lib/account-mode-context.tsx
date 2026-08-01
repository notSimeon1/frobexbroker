import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type AccountMode = "demo" | "live";

type AccountModeContextValue = {
  mode: AccountMode;
  balance: number;
  liveBalance: number;
  demoBalance: number;
  switchMode: (next: AccountMode) => Promise<void>;
  loading: boolean;
};

const AccountModeContext = createContext<AccountModeContextValue>({
  mode: "demo",
  balance: 0,
  liveBalance: 0,
  demoBalance: 0,
  switchMode: async () => {},
  loading: true,
});

export function AccountModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<AccountMode>("demo");
  const [liveBalance, setLiveBalance] = useState(0);
  const [demoBalance, setDemoBalance] = useState(10000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMode("demo");
      setLiveBalance(0);
      setDemoBalance(10000);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("account_mode, live_balance, demo_balance")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMode((data.account_mode as AccountMode) ?? "demo");
          setLiveBalance(Number(data.live_balance ?? 0));
          setDemoBalance(Number(data.demo_balance ?? 10000));
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`account_mode_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          const p = payload.new;
          if (!p) return;
          setMode((p.account_mode as AccountMode) ?? "demo");
          setLiveBalance(Number(p.live_balance ?? 0));
          setDemoBalance(Number(p.demo_balance ?? 10000));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const switchMode = async (next: AccountMode) => {
    if (!user || next === mode) return;
    const { error } = await supabase
      .from("profiles")
      .update({ account_mode: next, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMode(next);
    toast.success(`Switched to ${next.toUpperCase()} account`);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const balance = mode === "live" ? liveBalance : demoBalance;

  return (
    <AccountModeContext.Provider value={{ mode, balance, liveBalance, demoBalance, switchMode, loading }}>
      {children}
    </AccountModeContext.Provider>
  );
}

export function useAccountMode() {
  return useContext(AccountModeContext);
}
