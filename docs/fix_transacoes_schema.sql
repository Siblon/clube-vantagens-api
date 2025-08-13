-- INÍCIO: fix_transacoes_schema.sql
-- Tabela de transações: alinhar com a API
alter table public.transacoes
  add column if not exists cliente_nome       text,
  add column if not exists valor_original     numeric(12,2),
  add column if not exists desconto_aplicado  text,
  add column if not exists valor_final        numeric(12,2),
  add column if not exists plano              text,
  add column if not exists status_pagamento   text,
  add column if not exists vencimento         date,
  add column if not exists created_at         timestamptz not null default now();

create index if not exists transacoes_cpf_idx     on public.transacoes (cpf);
create index if not exists transacoes_created_idx on public.transacoes (created_at);

-- Garantir RLS OFF durante dev
alter table public.transacoes disable row level security;
-- FIM: fix_transacoes_schema.sql
