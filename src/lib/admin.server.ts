import { supabaseAdmin } from "@/integrations/supabase/client.server";

const OWNER_EMAIL = "simonosawaru255@gmail.com";

async function writeActivity(userId: string, type: string, amount: number, assetName: string, status: string) {
  const { error } = await supabaseAdmin.from("transactions").insert({
    user_id: userId,
    type,
    amount,
    asset_name: assetName,
    status,
  });
  if (error) throw new Error(error.message);
}

async function updateMatchingPendingActivity(userId: string, type: string, amount: number, assetName: string, status: string) {
  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("amount", amount)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing?.id) {
    await writeActivity(userId, type, amount, assetName, status);
    return;
  }

  const { error } = await supabaseAdmin
    .from("transactions")
    .update({ asset_name: assetName, status })
    .eq("id", existing.id);
  if (error) await writeActivity(userId, type, amount, assetName, status);
}

export async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || data.user?.email?.toLowerCase() !== OWNER_EMAIL) {
    throw new Error("Admin access is restricted to the owner account");
  }
}

export async function adminGetOverview(userId: string) {
  await assertOwner(userId);
  const [
    { data: profiles },
    { data: deposits },
    { data: withdrawals },
    { data: complaints },
    { data: settings },
    { data: transactions },
    { data: kyc },
    { data: referrals },
    { data: positions },
    { data: news },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("deposits").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("withdrawals").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("complaints").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("app_settings").select("*"),
    supabaseAdmin.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("kyc_submissions").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("referral_earnings").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("live_positions").select("*").order("opened_at", { ascending: false }).limit(200),
    supabaseAdmin.from("market_news").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  const users = await Promise.all((profiles ?? []).map(async (profile) => {
    const { data } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    return { ...profile, email: data.user?.email ?? null, last_sign_in_at: data.user?.last_sign_in_at ?? null };
  }));

  return {
    users,
    deposits: deposits ?? [],
    withdrawals: withdrawals ?? [],
    complaints: complaints ?? [],
    settings: settings ?? [],
    transactions: transactions ?? [],
    kyc: kyc ?? [],
    referrals: referrals ?? [],
    positions: positions ?? [],
    news: news ?? [],
  };
}

export async function adminDecideDeposit(userId: string, id: string, status: "approved" | "rejected") {
  await assertOwner(userId);
  const { data: deposit, error: fetchError } = await supabaseAdmin.from("deposits").select("*").eq("id", id).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!deposit) throw new Error("Deposit request not found");
  if (deposit.status !== "pending") return { ok: true };

  const amount = Number(deposit.amount);
  if (status === "approved") {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("account_balance, available_cash, live_balance")
      .eq("id", deposit.user_id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("User profile not found");

    const { error: balanceError } = await supabaseAdmin.from("profiles").update({
      account_balance: Number(profile.account_balance ?? 0) + amount,
      available_cash: Number(profile.available_cash ?? 0) + amount,
      live_balance: Number(profile.live_balance ?? 0) + amount,
      updated_at: new Date().toISOString(),
    }).eq("id", deposit.user_id);
    if (balanceError) throw new Error(balanceError.message);
  }

  const { error: updateError } = await supabaseAdmin.from("deposits").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  if (updateError) throw new Error(updateError.message);
  await updateMatchingPendingActivity(deposit.user_id, "deposit_request", amount, `${status === "approved" ? "Approved" : "Rejected"} deposit ${deposit.crypto_currency}`, status);
  return { ok: true };
}

export async function adminDecideWithdrawal(userId: string, id: string, status: "approved" | "rejected") {
  await assertOwner(userId);
  const { data: withdrawal } = await supabaseAdmin.from("withdrawals").select("*").eq("id", id).maybeSingle();
  if (!withdrawal) throw new Error("Withdrawal request not found");
  if (withdrawal.status !== "pending") return { ok: true };
  const tax = Number((Number(withdrawal.amount) * 0.05).toFixed(2));
  const payout = Math.max(0, Number(withdrawal.amount) - tax);
  if (status === "approved") {
    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("account_balance, available_cash, live_balance").eq("id", withdrawal.user_id).maybeSingle();
    if (!profile) throw new Error("User profile not found");
    const amount = Number(withdrawal.amount);
    if (Number(profile.available_cash) < amount) throw new Error("User has insufficient available cash");
    await supabaseAdmin.from("profiles").update({
      account_balance: Number(profile.account_balance) - amount,
      available_cash: Number(profile.available_cash) - amount,
      live_balance: Math.max(0, Number(profile.live_balance) - amount),
      updated_at: new Date().toISOString(),
    }).eq("id", withdrawal.user_id);
    await updateMatchingPendingActivity(withdrawal.user_id, "withdrawal_request", amount, `Approved withdrawal ${withdrawal.crypto_currency} · payout $${payout.toFixed(2)} · 5% fee $${tax.toFixed(2)}`, "approved");
  } else {
    await updateMatchingPendingActivity(withdrawal.user_id, "withdrawal_request", Number(withdrawal.amount), `Rejected withdrawal ${withdrawal.crypto_currency}`, "rejected");
  }
  await supabaseAdmin.from("withdrawals").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  return { ok: true };
}

export async function adminUpdateChart(userId: string, targetUserId: string, mode: "profit" | "loss" | "flat", intensity: number) {
  await assertOwner(userId);
  await supabaseAdmin.from("profiles").update({
    chart_mode: mode, chart_intensity: intensity, chart_seed: Math.floor(Math.random() * 10000), updated_at: new Date().toISOString(),
  }).eq("id", targetUserId);
  return { ok: true };
}

export async function adminAdjustBalance(userId: string, targetUserId: string, amount: number, direction: "credit" | "debit") {
  await assertOwner(userId);
  const { data: profile } = await supabaseAdmin.from("profiles")
    .select("account_balance, available_cash, live_balance").eq("id", targetUserId).maybeSingle();
  if (!profile) throw new Error("User profile not found");
  const signed = direction === "credit" ? amount : -amount;
  const newBalance = Number(profile.account_balance) + signed;
  const newCash = Number(profile.available_cash) + signed;
  if (newBalance < 0 || newCash < 0) throw new Error("This adjustment would make the balance negative");
  await supabaseAdmin.from("profiles").update({
    account_balance: newBalance,
    available_cash: newCash,
    live_balance: Math.max(0, Number(profile.live_balance) + signed),
    updated_at: new Date().toISOString(),
  }).eq("id", targetUserId);
  await supabaseAdmin.from("transactions").insert({
    user_id: targetUserId,
    type: direction === "credit" ? "margin_bonus" : "admin_debit",
    amount,
    asset_name: direction === "credit" ? "Margin bonus credit" : "Admin balance debit",
    status: "completed",
  });
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

export async function adminToggleAccountMode(userId: string, targetUserId: string, mode: "demo" | "live") {
  await assertOwner(userId);
  const { error } = await supabaseAdmin.from("profiles").update({ account_mode: mode, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("transactions").insert({
    user_id: targetUserId,
    type: "account_mode",
    amount: 0,
    asset_name: `Account switched to ${mode.toUpperCase()}`,
    status: "completed",
  });
  return { ok: true };
}

export async function adminToggleSuspend(userId: string, targetUserId: string, suspended: boolean) {
  await assertOwner(userId);
  await supabaseAdmin.from("profiles").update({ is_suspended: suspended, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  return { ok: true };
}

export async function adminToggleAiTrading(userId: string, targetUserId: string, enabled: boolean) {
  await assertOwner(userId);
  const { error } = await supabaseAdmin.from("profiles").update({ ai_trading_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  if (error) throw new Error(error.message);
  await writeActivity(targetUserId, "ai_trading", 0, `AI trading ${enabled ? "enabled" : "disabled"} by admin`, "completed");
  return { ok: true };
}

export async function adminDecideKyc(userId: string, id: string, status: "approved" | "rejected", note?: string) {
  await assertOwner(userId);
  const { data: row } = await supabaseAdmin.from("kyc_submissions").select("user_id").eq("id", id).maybeSingle();
  if (!row) throw new Error("KYC submission not found");
  await supabaseAdmin.from("kyc_submissions").update({ status, admin_note: note ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
  await supabaseAdmin.from("profiles").update({ kyc_status: status, updated_at: new Date().toISOString() }).eq("id", row.user_id);
  return { ok: true };
}

export async function adminPostNews(userId: string, title: string, body: string, impact: "low" | "medium" | "high", source: string) {
  await assertOwner(userId);
  await supabaseAdmin.from("market_news").insert({ title, body, impact, source });
  return { ok: true };
}

export async function adminGetKycDocumentUrl(userId: string, path: string) {
  await assertOwner(userId);
  const { data, error } = await supabaseAdmin.storage.from("kyc-documents").createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return { url: data.signedUrl };
}

export async function openUserPosition(
  userId: string,
  asset: string,
  side: "buy" | "sell",
  quantity: number,
  leverage: number,
  margin: number,
  entryPrice: number,
  accountMode: "demo" | "live",
) {
  const { data, error } = await (supabaseAdmin as any).rpc("open_position_atomic", {
    _user_id: userId,
    _asset: asset,
    _side: side,
    _quantity: quantity,
    _leverage: leverage,
    _margin: margin,
    _entry_price: entryPrice,
    _account_mode: accountMode,
  });
  if (error) throw new Error(error.message);
  return { id: data as string };
}

export async function closeUserPosition(userId: string, positionId: string, closePrice: number) {
  const { data: position, error: posErr } = await supabaseAdmin
    .from("live_positions")
    .select("user_id")
    .eq("id", positionId)
    .maybeSingle();
  if (posErr) throw new Error(posErr.message);
  if (!position || position.user_id !== userId) throw new Error("Position not found");

  const { data, error } = await (supabaseAdmin as any).rpc("close_position_atomic", { _position_id: positionId, _close_price: closePrice });
  if (error) throw new Error(error.message);
  return { pnl: Number(data ?? 0) };
}
