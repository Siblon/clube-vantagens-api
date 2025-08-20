-- migrate:up
create table if not exists public.planos (
  id             bigserial primary key,
  nome           text unique not null,
  preco_centavos integer not null,
  ativo          boolean not null default true,
  updated_at     timestamptz not null default now()
);

insert into public.planos (nome, preco_centavos)
values
  ('basico', 4990),
  ('pro', 9990),
  ('premium', 14990)
on conflict (nome) do update set
  preco_centavos = excluded.preco_centavos,
  updated_at = now();

-- migrate:down
drop table if exists public.planos;
