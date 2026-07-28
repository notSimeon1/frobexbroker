
-- 1) Rebalance AI trading bot tiers: $100 → $1600 entry ladder
UPDATE public.trading_bots SET status='archived' WHERE tier_key IN ('alpha_core','quant_hft','arbitrage_matrix','neural_oracle','quantum_apex');

INSERT INTO public.trading_bots (name, tier_key, capital_required, duration_days, min_roi, max_roi, win_rate, perks, status, sort_order)
VALUES
  ('Starter Scalper',     'starter',  100.00,  7,  1.5, 2.5,  78, '["Beginner friendly","Auto scalping on BTC/ETH","24/7 trading","Daily profit accrual"]'::jsonb, 'active', 1),
  ('Bronze Momentum',     'bronze',   300.00, 10,  2.0, 3.5,  82, '["Momentum + trend following","BTC/ETH/SOL/BNB coverage","Smart stop-loss","Priority support"]'::jsonb, 'active', 2),
  ('Silver Alpha',        'silver',   600.00, 14,  2.8, 4.5,  86, '["Multi-strategy engine","News-sentiment filter","Auto compounding","Weekly performance report"]'::jsonb, 'active', 3),
  ('Gold Quant',          'gold',    1000.00, 20,  3.5, 6.0,  90, '["Quantitative model suite","Cross-market arbitrage","Reduced slippage routing","Dedicated analyst"]'::jsonb, 'active', 4),
  ('Platinum Institutional','platinum',1600.00,30,  5.0, 8.5,  93, '["Institutional-grade engine","AI + human oversight","Priority withdrawal lane","Personal account manager","VIP signals bundle"]'::jsonb, 'active', 5)
ON CONFLICT DO NOTHING;

-- 2) Activate bot RPC — debits live cash, ledger insert, creates active bot row
CREATE OR REPLACE FUNCTION public.activate_bot(_bot_id uuid, _invested_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bot public.trading_bots%rowtype;
  v_profile public.profiles%rowtype;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_bot FROM public.trading_bots WHERE id = _bot_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Bot not available'; END IF;
  IF _invested_amount < v_bot.capital_required THEN
    RAISE EXCEPTION 'Minimum investment for % is $%', v_bot.name, v_bot.capital_required;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF coalesce(v_profile.available_cash,0) < _invested_amount THEN
    RAISE EXCEPTION 'Insufficient available cash. Top up your balance first.';
  END IF;

  UPDATE public.profiles
    SET available_cash = coalesce(available_cash,0) - _invested_amount,
        account_balance = coalesce(account_balance,0) - _invested_amount,
        live_balance = greatest(0, coalesce(live_balance,0) - _invested_amount),
        updated_at = now()
    WHERE id = v_uid;

  INSERT INTO public.user_active_bots (user_id, bot_id, invested_amount, activation_date, expiration_date, current_profit, status)
  VALUES (v_uid, _bot_id, _invested_amount, now(), now() + make_interval(days => v_bot.duration_days), 0, 'running')
  RETURNING id INTO v_id;

  INSERT INTO public.transactions (user_id, type, amount, asset_name, status)
  VALUES (v_uid, 'bot_activation', _invested_amount, v_bot.name || ' — activation', 'completed');

  PERFORM public.notify_user(v_uid, 'AI Bot activated',
    'Your ' || v_bot.name || ' has been activated with $' || _invested_amount::text || '. Daily profits will accrue automatically.', 'system');

  RETURN v_id;
END;
$$;

-- 3) Cancel active bot early — refunds remaining principal to available cash
CREATE OR REPLACE FUNCTION public.cancel_bot(_active_bot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ab public.user_active_bots%rowtype;
  v_botname text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_ab FROM public.user_active_bots WHERE id = _active_bot_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bot not found'; END IF;
  IF v_ab.status <> 'running' THEN RETURN; END IF;

  SELECT name INTO v_botname FROM public.trading_bots WHERE id = v_ab.bot_id;

  UPDATE public.user_active_bots SET status = 'cancelled' WHERE id = _active_bot_id;

  UPDATE public.profiles
    SET available_cash = coalesce(available_cash,0) + v_ab.invested_amount + coalesce(v_ab.current_profit,0),
        account_balance = coalesce(account_balance,0) + v_ab.invested_amount + coalesce(v_ab.current_profit,0),
        live_balance = coalesce(live_balance,0) + v_ab.invested_amount + coalesce(v_ab.current_profit,0),
        updated_at = now()
    WHERE id = v_uid;

  INSERT INTO public.transactions (user_id, type, amount, asset_name, status)
  VALUES (v_uid, 'bot_cancelled', v_ab.invested_amount + coalesce(v_ab.current_profit,0),
          coalesce(v_botname,'AI Bot') || ' — cancelled (principal + profit refunded)', 'completed');
END;
$$;

-- 4) Daily accrual — credit each running bot's owner with a random ROI within tier range
CREATE OR REPLACE FUNCTION public.accrue_daily_bot_profits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_pct numeric;
  v_profit numeric;
  v_processed int := 0;
  v_total numeric := 0;
BEGIN
  FOR r IN
    SELECT ab.id, ab.user_id, ab.invested_amount, ab.current_profit, ab.expiration_date,
           tb.name, tb.min_roi, tb.max_roi
    FROM public.user_active_bots ab
    JOIN public.trading_bots tb ON tb.id = ab.bot_id
    WHERE ab.status = 'running'
  LOOP
    v_pct := round((r.min_roi + (r.max_roi - r.min_roi) * random())::numeric, 2);
    v_profit := round((r.invested_amount * v_pct / 100.0)::numeric, 2);

    UPDATE public.user_active_bots
      SET current_profit = coalesce(current_profit,0) + v_profit,
          status = CASE WHEN now() >= r.expiration_date THEN 'completed' ELSE 'running' END
      WHERE id = r.id;

    UPDATE public.profiles
      SET available_cash = coalesce(available_cash,0) + v_profit,
          account_balance = coalesce(account_balance,0) + v_profit,
          live_balance = coalesce(live_balance,0) + v_profit,
          updated_at = now()
      WHERE id = r.user_id;

    INSERT INTO public.transactions (user_id, type, amount, asset_name, status, source_table, source_id)
    VALUES (r.user_id, 'bot_profit', v_profit,
            r.name || ' — daily profit +' || v_pct::text || '%', 'completed', 'user_active_bots', r.id);

    PERFORM public.notify_user(r.user_id, 'AI Bot earnings credited',
      'Your ' || r.name || ' has credited $' || v_profit::text || ' (+' || v_pct::text || '%) to your account.', 'credit');

    v_processed := v_processed + 1;
    v_total := v_total + v_profit;
  END LOOP;

  -- Auto-complete expired bots and refund principal
  UPDATE public.profiles p
    SET available_cash = coalesce(available_cash,0) + ab.invested_amount,
        account_balance = coalesce(account_balance,0) + ab.invested_amount,
        live_balance = coalesce(live_balance,0) + ab.invested_amount,
        updated_at = now()
    FROM public.user_active_bots ab
    WHERE ab.user_id = p.id AND ab.status = 'completed' AND ab.expiration_date <= now()
      AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.source_table='user_active_bots' AND t.source_id=ab.id AND t.type='bot_principal_return');

  INSERT INTO public.transactions (user_id, type, amount, asset_name, status, source_table, source_id)
  SELECT ab.user_id, 'bot_principal_return', ab.invested_amount, tb.name || ' — principal returned', 'completed', 'user_active_bots', ab.id
  FROM public.user_active_bots ab
  JOIN public.trading_bots tb ON tb.id = ab.bot_id
  WHERE ab.status = 'completed' AND ab.expiration_date <= now()
    AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.source_table='user_active_bots' AND t.source_id=ab.id AND t.type='bot_principal_return');

  RETURN jsonb_build_object('processed', v_processed, 'total_credited', v_total, 'ran_at', now());
END;
$$;

-- 5) Schedule the daily accrual via pg_cron (runs every 24h at 00:05 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('accrue-daily-bot-profits');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'accrue-daily-bot-profits',
  '5 0 * * *',
  $$ SELECT public.accrue_daily_bot_profits(); $$
);
