import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const OWNER_EMAIL = "simonosawaru255@gmail.com";

const requestSchema = z.object({}).optional();
const decisionSchema = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) });
const chartSchema = z.object({ userId: z.string().uuid(), mode: z.enum(["profit", "loss", "flat"]), intensity: z.number().min(0.1).max(5) });
const balanceSchema = z.object({ userId: z.string().uuid(), amount: z.number().positive().max(1_000_000), direction: z.enum(["credit", "debit"]) });
const complaintSchema = z.object({ id: z.string().uuid(), status: z.enum(["pending", "resolved"]) });
const settingSchema = z.object({ key: z.string().min(1).max(80), value: z.string().min(1).max(300) });

async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || data.user?.email?.toLowerCase() !== OWNER_EMAIL) {
    throw new Error("Admin access is restricted to the owner account");
  }
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => requestSchema.parse(input))
  .handler(async ({ context }) => {
    await assertOwner(context.userId);

    const [{ data: profiles }, { data: deposits }, { data: withdrawals }, { data: complaints }, { data: settings }, { data: transactions }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("deposits").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("complaints").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("app_settings").select("*"),
      supabaseAdmin.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const users = await Promise.all((profiles ?? []).map(async (profile) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      return { ...profile, email: data.user?.email ?? null, last_sign_in_at: data.user?.last_sign_in_at ?? null };
    }));

    return { users, deposits: deposits ?? [], withdrawals: withdrawals ?? [], complaints: complaints ?? [], settings: settings ?? [], transactions: transactions ?? [] };
  });

export const decideAdminDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { data: deposit, error: depositError } = await supabaseAdmin.from("deposits").select("*").eq("id", data.id).maybeSingle();
    if (depositError || !deposit) throw new Error("Deposit request not found");
    if (deposit.status !== "pending") return { ok: true };

    if (data.status === "approved") {
      const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", deposit.user_id).maybeSingle();
      if (profileError || !profile) throw new Error("User profile not found");
      const amount = Number(deposit.amount);
      const { error: balanceError } = await supabaseAdmin.from("profiles").update({
        account_balance: Number(profile.account_balance ?? 0) + amount,
        available_cash: Number(profile.available_cash ?? 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq("id", deposit.user_id);
      if (balanceError) throw balanceError;
      await supabaseAdmin.from("transactions").insert({ user_id: deposit.user_id, type: "deposit", amount, asset_name: `Deposit ${deposit.crypto_currency}`, status: "completed" });
    }

    const { error } = await supabaseAdmin.from("deposits").update({ status: data.status, reviewed_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const decideAdminWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => decisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).maybeSingle();
    if (withdrawalError || !withdrawal) throw new Error("Withdrawal request not found");
    if (withdrawal.status !== "pending") return { ok: true };

    if (data.status === "approved") {
      const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", withdrawal.user_id).maybeSingle();
      if (profileError || !profile) throw new Error("User profile not found");
      const amount = Number(withdrawal.amount);
      const cash = Number(profile.available_cash ?? 0);
      const balance = Number(profile.account_balance ?? 0);
      if (cash < amount || balance < amount) throw new Error("User has insufficient balance");
      const { error: balanceError } = await supabaseAdmin.from("profiles").update({
        account_balance: balance - amount,
        available_cash: cash - amount,
        updated_at: new Date().toISOString(),
      }).eq("id", withdrawal.user_id);
      if (balanceError) throw balanceError;
      await supabaseAdmin.from("transactions").insert({ user_id: withdrawal.user_id, type: "withdrawal", amount, asset_name: `Withdrawal ${withdrawal.crypto_currency}`, status: "completed" });
    }

    const { error } = await supabaseAdmin.from("withdrawals").update({ status: data.status, reviewed_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateAdminChart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => chartSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ chart_mode: data.mode, chart_intensity: data.intensity, chart_seed: Math.floor(Math.random() * 10000), updated_at: new Date().toISOString() }).eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const adjustAdminBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => balanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", data.userId).maybeSingle();
    if (profileError || !profile) throw new Error("User profile not found");
    const signedAmount = data.direction === "credit" ? data.amount : -data.amount;
    const newBalance = Number(profile.account_balance ?? 0) + signedAmount;
    const newCash = Number(profile.available_cash ?? 0) + signedAmount;
    if (newBalance < 0 || newCash < 0) throw new Error("This adjustment would make the balance negative");
    const { error } = await supabaseAdmin.from("profiles").update({ account_balance: newBalance, available_cash: newCash, updated_at: new Date().toISOString() }).eq("id", data.userId);
    if (error) throw error;
    await supabaseAdmin.from("transactions").insert({ user_id: data.userId, type: data.direction === "credit" ? "profit_credit" : "admin_debit", amount: data.amount, asset_name: data.direction === "credit" ? "Admin profit credit" : "Admin balance debit", status: "completed" });
    return { ok: true };
  });

export const updateAdminComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => complaintSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin.from("complaints").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const updateAdminSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    const { error } = await supabaseAdmin.from("app_settings").upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });