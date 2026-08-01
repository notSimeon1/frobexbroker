-- No schema changes. Only refresh the API layer's function/schema cache so
-- public.activate_copy_trading(_tier_id, _allocated_amount) is discoverable again.
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';