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
  const { data: deposit } = await supabaseAdmin.from("deposits").select("*").eq("id", id).maybeSingle();
  if (!deposit) throw new Error("Deposit request not found");
  if (deposit.status !== "pending") return { ok: true };

  if (status === "approved") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("account_balance, available_cash, live_balance, account_mode, referred_by")
      .eq("id", deposit.user_id)
      .maybeSingle();
    if (!profile) throw new Error("User profile not found");
    const amount = Number(deposit.amount);

    // Credit user (live + legacy fields)
    await supabaseAdmin.from("profiles").update({
      account_balance: Number(profile.account_balance) + amount,
      available_cash: Number(profile.available_cash) + amount,
      live_balance: Number(profile.live_balance) + amount,
      updated_at: new Date().toISOString(),
    }).eq("id", deposit.user_id);

    await supabaseAdmin.from("transactions").insert({
      user_id: deposit.user_id,
      type: "deposit",
      amount,
      asset_name: `Deposit ${deposit.crypto_currency}`,
      status: "completed",
    });

    // Auto referral payout 20%
    if (profile.referred_by) {
      const bonus = +(amount * 0.2).toFixed(2);
      const { data: refProfile } = await supabaseAdmin
        .from("profiles")
        .select("account_balance, available_cash, live_balance")
        .eq("id", profile.referred_by)
        .maybeSingle();
      if (refProfile) {
        await supabaseAdmin.from("profiles").update({
          account_balance: Number(refProfile.account_balance) + bonus,
          available_cash: Number(refProfile.available_cash) + bonus,
          live_balance: Number(refProfile.live_balance) + bonus,
          updated_at: new Date().toISOString(),
        }).eq("id", profile.referred_by);

        await supabaseAdmin.from("referral_earnings").insert({
          referrer_id: profile.referred_by,
          referred_user_id: deposit.user_id,
          deposit_id: deposit.id,
          amount: bonus,
        });
        await supabaseAdmin.from("transactions").insert({
          user_id: profile.referred_by,
          type: "referral_bonus",
          amount: bonus,
          asset_name: "Referral commission (20%)",
          status: "completed",
        });
      }
    }
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
    await supabaseAdmin.from("transactions").insert({
      user_id: withdrawal.user_id, type: "withdrawal", amount,
      asset_name: `Withdrawal ${withdrawal.crypto_currency}`, status: "completed",
    });
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
  await supabaseAdmin.from("profiles").update({ account_mode: mode, updated_at: new Date().toISOString() }).eq("id", targetUserId);
  return { ok: true };
}

export async function adminToggleSuspend(userId: string, targetUserId: string, suspended: boolean) {
  await assertOwner(userId);
  await supabaseAdmin.from("profiles").update({ is_suspended: suspended, updated_at: new Date().toISOString() }).eq("id", targetUserId);
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
