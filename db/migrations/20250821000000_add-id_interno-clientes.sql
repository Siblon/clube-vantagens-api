-- migrate:up
create extension if not exists "pgcrypto";

alter table public.clientes
  add column if not exists id_interno uuid;

alter table public.clientes
  alter column id_interno set default gen_random_uuid();

update public.clientes
   set id_interno = gen_random_uuid()
 where id_interno is null;

create unique index if not exists clientes_id_interno_key
  on public.clientes (id_interno);

-- migrate:down
drop index if exists clientes_id_interno_key;

alter table public.clientes
  drop column if exists id_interno;

