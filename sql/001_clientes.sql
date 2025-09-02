create extension if not exists "uuid-ossp";

create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cpf text,
  telefone text,
  email text,
  plano text,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clientes_created_at on public.clientes(created_at desc);
