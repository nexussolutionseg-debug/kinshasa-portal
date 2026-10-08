-- =============================================================================
-- READ-ONLY: snapshot of the live database structure (no data, no secrets).
-- Changes nothing. Paste in Supabase → SQL Editor → Run. The result is ONE
-- cell of JSON: copy it into supabase/tools/snapshot.json (or send it to the
-- developer). It is used to write supabase/migrations/00000000000000_baseline.sql
-- (the tables that existed before any migration was tracked) and to verify
-- that every applied migration matches the live database.
-- =============================================================================
select jsonb_pretty(jsonb_build_object(
  'taken_at', now(),
  'tables', (
    select jsonb_agg(jsonb_build_object(
      'table', c.table_name,
      'columns', (select jsonb_agg(jsonb_build_object(
                    'name', col.column_name, 'type', col.data_type, 'nullable', col.is_nullable,
                    'default', col.column_default) order by col.ordinal_position)
                  from information_schema.columns col
                  where col.table_schema = 'public' and col.table_name = c.table_name),
      'rls', (select relrowsecurity from pg_class where oid = ('public.' || quote_ident(c.table_name))::regclass)
    ) order by c.table_name)
    from information_schema.tables c
    where c.table_schema = 'public' and c.table_type = 'BASE TABLE'
  ),
  'constraints', (
    select jsonb_agg(jsonb_build_object('table', conrelid::regclass::text, 'name', conname, 'def', pg_get_constraintdef(oid)) order by conrelid::regclass::text, conname)
    from pg_constraint where connamespace = 'public'::regnamespace
  ),
  'indexes', (
    select jsonb_agg(jsonb_build_object('table', tablename, 'def', indexdef) order by tablename, indexname)
    from pg_indexes where schemaname = 'public'
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) order by tablename, policyname)
    from pg_policies where schemaname in ('public', 'storage')
  ),
  'functions', (
    select jsonb_agg(jsonb_build_object('name', p.proname, 'def', pg_get_functiondef(p.oid)) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  ),
  'triggers', (
    select jsonb_agg(jsonb_build_object('table', event_object_table, 'name', trigger_name, 'timing', action_timing, 'event', event_manipulation, 'action', action_statement))
    from information_schema.triggers where trigger_schema = 'public'
  ),
  'grants', (
    select jsonb_agg(jsonb_build_object('table', table_name, 'grantee', grantee, 'privilege', privilege_type) order by table_name, grantee, privilege_type)
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
  ),
  'buckets', (select jsonb_agg(jsonb_build_object('id', id, 'public', public)) from storage.buckets)
)) as snapshot;
