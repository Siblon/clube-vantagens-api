alter table public.clientes
  add column if not exists id_interno text;

create unique index if not exists clientes_id_interno_key
  on public.clientes (id_interno)
  where id_interno is not null;
