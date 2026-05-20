import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OWNER_EMAIL = "simonosawaru255@gmail.com";

export async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || data.user?.email?.toLowerCase() !== OWNER_EMAIL) {
    throw new Error("Admin access is restricted to the owner account");
  }
}

export async function adminGetOverview(userId: string) {
  await assertOwner(userId);
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
}

export async function adminDecideDeposit(userId: string, id: string, status: "approved" | "rejected") {
  await assertOwner(userId);
  const { data: deposit } = await supabaseAdmin.from("deposits").select("*").eq("id", id).maybeSingle();
  if (!deposit) throw new Error("Deposit request not found");
  if (deposit.status !== "pending") return { ok: true };
  if (status === "approved") {
    const { data: profile } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", deposit.user_id).maybeSingle();
    if (!profile) throw new Error("User profile not found");
    const amount = Number(deposit.amount);
    await supabaseAdmin.from("profiles").update({ account_balance: Number(profile.account_balance) + amount, available_cash: Number(profile.available_cash) + amount, updated_at: new Date().toISOString() }).eq("id", deposit.user_id);
    await supabaseAdmin.from("transactions").insert({ user_id: deposit.user_id, type: "deposit", amount, asset_name: `Deposit ${deposit.crypto_currency}`, status: "completed" });
  }
  await supabaseAdmin.from("deposits").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

export async function adminDecideWithdrawal(userId: string, id: string, status: "approved" | "rejected") {
  await assertOwner(userId);
  const { data: withdrawal } = await supabaseAdmin.from("withdrawals").select("*").eq("id", id).maybeSingle();
  if (!withdrawal) throw new Error("Withdrawal request not found");
  if (withdrawal.status !== "pending") return { ok: true };
  if (status === "approved") {
    const { data: profile } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", withdrawal.user_id).maybeSingle();
    if (!profile) throw new Error("User profile not found");
    const amount = Number(withdrawal.amount);
    const balance = Number(profile.account_balance);
    const cash = Number(profile.available_cash);
    if (cash < amount || balance < amount) throw new Error("User has insufficient balance");
    await supabaseAdmin.from("profiles").update({ account_balance: balance - amount, available_cash: cash - amount, updated_at: new Date().toISOString() }).eq("id", withdrawal.user_id);
    await supabaseAdmin.from("transactions").insert({ user_id: withdrawal.user_id, type: "withdrawal", amount, asset_name: `Withdrawal ${withdrawal.crypto_currency}`, status: "completed" });
  }
  await supabaseAdmin.from("withdrawals").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

export async function adminUpdateChart(userId: string, targetUserId: string, mode: "profit" | "loss" | "flat", intensity: number) {
  await assertOwner(userId);
  await supabaseAdmin.from("profiles").update({ chart_mode: mode, chart_intensity: intensity, chart_seed: Math.floor(Math.random() * 10000), updated_at: new Date().toISOString() }).eq("id", targetUserId);
  return { ok: true };
}

export async function adminAdjustBalance(userId: string, targetUserId: string, amount: number, direction: "credit" | "debit") {
  await assertOwner(userId);
  const { data: profile } = await supabaseAdmin.from("profiles").select("account_balance, available_cash").eq("id", targetUserId).maybeSingle();
  if (!profile) throw new Error("User profile not found");
  const signed = direction === "credit" ? amount : -amount;
  const newBalance = Number(profile.account_balance) + signed;
  const newCash = Number(profile.available_cash) + signed;
  if (newBalance < 0 || newCash < 0) throw new Error("This adjustment would make the balance negative");
  await supabaseAdmin.from("profiles").update({ account_balance: newBalance, available_cash: newCash, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  await supabaseAdmin.from("transactions").insert({ user_id: targetUserId, type: direction === "credit" ? "profit_credit" : "admin_debit", amount, asset_name: direction === "credit" ? "Admin profit credit" : "Admin balance debit", status: "completed" });
  return { ok: true };
}

export async function adminUpdateComplaint(userId: string, id: string, status: "pending" | "resolved") {
  await assertOwner(userId);
  await supabaseAdmin.from("complaints").update({ status }).eq("id", id);
  return { ok: true };
}

export async function adminUpdateSetting(userId: string, key: string, value: string) {
  await assertOwner(userId);
  await supabaseAdmin.from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return { ok: true };
}