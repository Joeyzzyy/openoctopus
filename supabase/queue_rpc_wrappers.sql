-- Public RPC wrappers for Supabase Queues / pgmq
-- Run this after orchestration_bootstrap.sql

create or replace function public.queue_send(
  queue_name text,
  msg jsonb,
  delay integer default 0
)
returns bigint
language sql
security definer
set search_path = public, pgmq
as $$
  select pgmq.send(queue_name := queue_name, msg := msg, delay := delay);
$$;

create or replace function public.queue_read(
  queue_name text,
  vt integer default 30,
  qty integer default 1
)
returns jsonb
language sql
security definer
set search_path = public, pgmq
as $$
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  from pgmq.read(queue_name := queue_name, vt := vt, qty := qty) as t;
$$;

create or replace function public.queue_delete(
  queue_name text,
  message_id bigint
)
returns boolean
language sql
security definer
set search_path = public, pgmq
as $$
  select pgmq.delete(queue_name := queue_name, msg_id := message_id);
$$;
