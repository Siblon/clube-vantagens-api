-- migrate:up
alter table public.clientes
  add column if not exists metodo_pagamento text not null default 'pix'
    check (metodo_pagamento in ('pix','cartao_debito','cartao_credito','dinheiro'));

-- migrate:down
alter table public.clientes
  drop column if exists metodo_pagamento;
