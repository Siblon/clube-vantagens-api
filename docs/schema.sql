create table if not exists public.clientes (
  id bigserial primary key,
  nome text not null,
  cpf text not null unique,
  plano text not null,
  data_adesao timestamp not null default now(),
  status text not null
);
create table if not exists public.transacoes (
  id bigserial primary key,
  cpf text not null,
  valor_original numeric(12,2) not null,
  desconto_aplicado text not null,
  valor_final numeric(12,2) not null,
  data timestamp not null default now()
);
create index if not exists idx_clientes_cpf on public.clientes (cpf);
create index if not exists idx_transacoes_cpf on public.transacoes (cpf);
