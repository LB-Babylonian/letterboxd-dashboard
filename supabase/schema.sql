-- Row Level Security for the dashboard tables.
-- Run in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Why this exists
-- ---------------
-- The app is a static SPA. Its Supabase anon key is inlined into the JS bundle
-- and is readable by anyone -- that is normal and expected, because the anon key
-- is a public identifier, not a password. The consequence is that RLS is the ONLY
-- thing standing between a visitor and your data. Before this file existed, the
-- admin gate was a hash comparison in React state, which anyone could flip in
-- devtools, and which did nothing at all against a direct PATCH using the key
-- from the bundle.
--
-- After this: anon can read, only a signed-in user can write.
--
-- ===========================================================================
-- STEP 1 -- do this in the dashboard BEFORE running the SQL below
-- ===========================================================================
--
--   a) Authentication -> Users -> "Add user" -> create your admin account.
--
--   b) Authentication -> Sign In / Providers -> Email -> turn OFF "Allow new
--      users to sign up".
--
--      This one is not optional. The write policies below grant access to the
--      `authenticated` role, which means ANY account that exists. Supabase
--      enables public sign-ups by default, so leaving that on lets a stranger
--      register an account and write to your tables -- exactly the hole we are
--      closing. Turn it off, or apply STEP 3 which pins access to your user id.

-- ===========================================================================
-- STEP 2 -- enable RLS and apply policies
-- ===========================================================================

do $$
declare
  t text;
  tables text[] := array[
    'pipe_data','tag_registry','subscriptions','film_metadata',
    'watchlist_data','review_data','ratings_data','top50_data'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    -- Read: the dashboard is meant to be publicly viewable.
    execute format('drop policy if exists "anon read" on public.%I', t);
    execute format(
      'create policy "anon read" on public.%I for select to anon, authenticated using (true)', t);

    -- Write: signed-in only. Covers insert/update/delete.
    execute format('drop policy if exists "authenticated write" on public.%I', t);
    execute format(
      'create policy "authenticated write" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- The old client-side password table. The app no longer reads it, and while it
-- existed any visitor could fetch the hash with the public anon key.
drop table if exists public.admin_password;

-- ===========================================================================
-- STEP 3 (recommended) -- pin writes to your specific account
-- ===========================================================================
-- Belt and braces: even if sign-ups get re-enabled by accident, only this uid
-- can write. Get it from Authentication -> Users, then uncomment and run.
--
-- do $$
-- declare
--   t text;
--   admin_uid uuid := 'PASTE-YOUR-USER-UUID-HERE';
--   tables text[] := array[
--     'pipe_data','tag_registry','subscriptions','film_metadata',
--     'watchlist_data','review_data','ratings_data','top50_data'
--   ];
-- begin
--   foreach t in array tables loop
--     execute format('drop policy if exists "authenticated write" on public.%I', t);
--     execute format(
--       'create policy "admin write" on public.%I for all to authenticated using (auth.uid() = %L) with check (auth.uid() = %L)',
--       t, admin_uid, admin_uid);
--   end loop;
-- end $$;

-- ===========================================================================
-- VERIFY
-- ===========================================================================
-- Every table should show rowsecurity = true:
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' order by tablename;
--
-- And the expected policies per table:
--
--   select tablename, policyname, roles, cmd from pg_policies
--   where schemaname = 'public' order by tablename, policyname;
--
-- Finally, confirm from the outside that anonymous writes are refused. This
-- should return 401 or 403 (it targets a nonexistent row, so it cannot damage
-- anything even if the policy is wrong):
--
--   curl -s -o /dev/null -w '%{http_code}\n' \
--     -X PATCH "$SUPABASE_URL/rest/v1/pipe_data?id=eq.999999" \
--     -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--     -H 'Content-Type: application/json' --data '{"data":"probe"}'
--
-- A 2xx here means writes are still open and something above did not apply.
