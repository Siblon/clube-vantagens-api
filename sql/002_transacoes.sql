create extension if not exists "uuid-ossp";

create table if not exists public.transacoes (
  id uuid primary key default uuid_generate_v4(),
  cliente_id bigint,
  plano text,
  valor_original numeric(12,2) not null,
  desconto_aplicado numeric(5,2) not null,
  valor_final numeric(12,2) not null,
  metodo_pagamento text,
  status_pagamento text default 'pendente',
  documento text,
  email text,
  observacoes text,
  vencimento date,
  created_at timestamptz not null default now(),
  last_admin_id text,
  last_admin_nome text,
  last_admin_name text
);

create index if not exists idx_transacoes_created_at on public.transacoes(created_at desc);
create index if not exists idx_transacoes_cliente  on public.transacoes(cliente_id);
