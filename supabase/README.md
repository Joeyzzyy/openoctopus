# Supabase bootstrap order

If you use the Supabase SQL Editor in the dashboard, run the files in this order:

1. `dashboard_bootstrap.sql`
2. `orchestration_bootstrap.sql`
3. `clear_request_records_for_api_key.sql`

If you use local `psql`, you may concatenate them yourself or apply them one by one.
