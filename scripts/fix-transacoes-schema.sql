-- Ajuste leve da tabela transacoes p/ MVP
alter table public.transacoes
  add column if not exists valor_liquido numeric,
  add column if not exists status_pagamento text,
  add column if not exists vencimento date,
  add column if not exists created_at timestamptz default now();

create index if not exists transacoes_cpf_idx on public.transacoes (cpf);
create index if not exists transacoes_created_idx on public.transacoes (created_at);
