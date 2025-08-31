-- migrate:up
create table if not exists public.admins (
  id bigserial primary key,
  nome text not null,
  pin text not null unique,
  pin_hash text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists admins_pin_idx on public.admins(pin_hash);

alter table if exists public.audit_logs
  add column if not exists admin_id bigint,
  add column if not exists admin_nome text;

alter table if exists public.clientes
  add column if not exists last_admin_id bigint,
  add column if not exists last_admin_nome text;

-- migrate:down
drop table if exists public.admins;

alter table if exists public.audit_logs
  drop column if exists admin_id,
  drop column if exists admin_nome;

alter table if exists public.clientes
  drop column if exists last_admin_id,
  drop column if exists last_admin_nome;
