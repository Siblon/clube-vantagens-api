-- Tabelas básicas (apenas se não existirem)
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text unique not null,
  telefone text not null,
  email text,
  created_at timestamp with time zone default now()
);

create table if not exists public.transacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  plano text not null,
  forma_pagamento text not null,
  valor_original integer not null,      -- centavos
  desconto_aplicado integer not null,   -- centavos
  valor_final integer not null,         -- centavos
  status_pagamento text not null,       -- pendente|pago|cancelado
  vencimento date,
  created_at timestamp with time zone default now()
);
