create table if not exists public.transacoes (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  cpf text not null,
  mp_payment_id text,
  mp_status text,
  valor numeric(12,2),
  metodo text,
  raw jsonb
);

create index if not exists transacoes_cpf_idx on public.transacoes(cpf);
create index if not exists transacoes_created_idx on public.transacoes(created_at desc);
