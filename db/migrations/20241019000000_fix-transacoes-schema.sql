-- migrate:up
-- Ajuste leve da tabela transacoes p/ MVP
alter table public.transacoes
  add column if not exists valor_liquido numeric,
  add column if not exists status_pagamento text,
  add column if not exists vencimento date,
  add column if not exists created_at timestamptz default now();

create index if not exists transacoes_cpf_idx on public.transacoes (cpf);
create index if not exists transacoes_created_idx on public.transacoes (created_at);

-- migrate:down
alter table public.transacoes
  drop column if exists valor_liquido,
  drop column if exists status_pagamento,
  drop column if exists vencimento,
  drop column if exists created_at;

drop index if exists transacoes_cpf_idx;
drop index if exists transacoes_created_idx;
