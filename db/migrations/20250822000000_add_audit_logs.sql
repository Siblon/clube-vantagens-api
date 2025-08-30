create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  route text not null,
  action text not null,
  admin_pin_hash text not null,
  client_cpf text null,
  payload jsonb null
);

create index if not exists idx_audit_logs_created_at_desc on public.audit_logs (created_at desc);
