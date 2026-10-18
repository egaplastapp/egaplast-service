-- EGAPLAST Service: réplica do Sellent e operação interna por SKU.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function public.papel()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'papel', '');
$$;

revoke all on function public.papel() from public, anon;
grant execute on function public.papel() to authenticated;

create or replace function private.bloquear_cadastro_publico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'papel', '') not in ('admin', 'operador') then
    raise exception 'cadastro publico desligado';
  end if;
  return new;
end;
$$;

drop trigger if exists bloquear_cadastro_publico on auth.users;
create trigger bloquear_cadastro_publico
  before insert on auth.users
  for each row execute function private.bloquear_cadastro_publico();

create table status_sellent (
  sellent_id bigint primary key,
  code text,
  name text,
  color text,
  documento jsonb not null default '{}'::jsonb
);

create table segmentos (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table lojas (
  sellent_id bigint primary key,
  code text,
  name text,
  erp_id text,
  doc_number text,
  email text,
  phone text,
  segmento_id bigint references segmentos (sellent_id),
  documento jsonb not null default '{}'::jsonb
);

create table vendedores (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table usuarios_sellent (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table empresas (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table tipos_pedido (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table formas_pagamento (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table condicoes_pagamento (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table parceiros (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table origens (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table tipos_documento (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table escritorios (
  sellent_id bigint primary key,
  code text,
  name text,
  documento jsonb not null default '{}'::jsonb
);

create table produtos (
  sellent_id bigint primary key,
  code text,
  name text,
  unidade text,
  documento jsonb not null default '{}'::jsonb
);

create table contatos (
  sellent_id bigint primary key,
  name text,
  email text,
  phone text,
  documento jsonb not null default '{}'::jsonb
);

create table tipos_pendencia (
  codigo text primary key
);

create table perfis_aprovacao (
  codigo text primary key
);

create table pedidos (
  sellent_id bigint primary key,
  code text,
  status_id bigint references status_sellent (sellent_id),
  loja_id bigint references lojas (sellent_id),
  vendedor_id bigint references vendedores (sellent_id),
  usuario_id bigint references usuarios_sellent (sellent_id),
  empresa_id bigint references empresas (sellent_id),
  tipo_pedido_id bigint references tipos_pedido (sellent_id),
  forma_pagamento_id bigint references formas_pagamento (sellent_id),
  condicao_pagamento_id bigint references condicoes_pagamento (sellent_id),
  parceiro_id bigint references parceiros (sellent_id),
  origem_id bigint references origens (sellent_id),
  tipo_documento_id bigint references tipos_documento (sellent_id),
  escritorio_id bigint references escritorios (sellent_id),
  erp_numero text,
  erp_recusa text,
  is_integrated boolean not null default false,
  is_canceled boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  order_date timestamptz,
  amount numeric,
  amount_final numeric,
  total_products numeric,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_mobile text,
  doc_type text,
  doc_number text,
  address_city text,
  address_state text,
  address_zipcode text,
  address_street text,
  address_number text,
  address_district text,
  escritorio text,
  previsao text,
  rastreio text,
  documento jsonb not null,
  coletado_em timestamptz not null default now()
);

create index pedidos_status_idx on pedidos (status_id);
create index pedidos_updated_idx on pedidos (updated_at desc);
create index pedidos_erp_idx on pedidos (erp_numero);

create table pedido_itens (
  sellent_id bigint primary key,
  pedido_sellent_id bigint not null references pedidos (sellent_id) on delete cascade,
  produto_id bigint references produtos (sellent_id),
  code text,
  name text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  measure_unit text,
  notes text,
  documento jsonb not null
);

create index pedido_itens_pedido_idx on pedido_itens (pedido_sellent_id);

create table pedido_contatos (
  pedido_sellent_id bigint not null references pedidos (sellent_id) on delete cascade,
  contato_id bigint not null references contatos (sellent_id),
  primary key (pedido_sellent_id, contato_id)
);

create table pedido_pendencias (
  sellent_id bigint primary key,
  pedido_sellent_id bigint references pedidos (sellent_id) on delete cascade,
  approval_type text,
  reason text,
  profile_approval text,
  status text,
  ready_to_approval boolean not null default false,
  who_approval text,
  date_approval timestamptz,
  created_at timestamptz,
  documento jsonb not null
);

create index pedido_pendencias_pedido_idx on pedido_pendencias (pedido_sellent_id);

create table pedido_faturas (
  sellent_id bigint primary key,
  chave text unique,
  pedido_sellent_id bigint references pedidos (sellent_id) on delete set null,
  erp_numero text,
  invoice_number text,
  data date,
  valor numeric,
  credit_status text,
  documento jsonb not null
);

create index pedido_faturas_pedido_idx on pedido_faturas (pedido_sellent_id);
create index pedido_faturas_erp_idx on pedido_faturas (erp_numero);

create table pedido_fatura_itens (
  sellent_id bigint primary key,
  fatura_sellent_id bigint not null references pedido_faturas (sellent_id) on delete cascade,
  produto_nome text,
  quantidade numeric,
  valor numeric,
  documento jsonb not null
);

create table pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_sellent_id bigint not null references pedidos (sellent_id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  observado_em timestamptz not null default now()
);

create index pedido_eventos_pedido_idx on pedido_eventos (pedido_sellent_id, observado_em);

create table coletas (
  id bigint generated always as identity primary key,
  inicio timestamptz not null default now(),
  fim timestamptz,
  cursor_after timestamptz,
  modo text not null check (modo in ('completa', 'incremental')),
  pedidos int not null default 0,
  pendencias int not null default 0,
  faturas int not null default 0,
  erro text
);

create table areas (
  id bigint generated always as identity primary key,
  nome text not null unique,
  provisoria boolean not null default true
);

create table etapas (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  ordem int not null,
  provisoria boolean not null default true,
  area_id bigint references areas (id)
);

create table trabalhos (
  id bigint generated always as identity primary key,
  pedido_item_id bigint not null unique references pedido_itens (sellent_id) on delete cascade,
  etapa_id bigint not null references etapas (id),
  situacao text not null default 'aberto' check (situacao in ('aberto', 'concluido')),
  gatilho text not null default 'manual' check (gatilho in ('manual', 'erp')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index trabalhos_etapa_idx on trabalhos (etapa_id);

create table trabalho_eventos (
  id bigint generated always as identity primary key,
  trabalho_id bigint not null references trabalhos (id) on delete cascade,
  de_etapa_id bigint references etapas (id),
  para_etapa_id bigint not null references etapas (id),
  motivo text not null,
  autor uuid references auth.users (id),
  criado_em timestamptz not null default now()
);

create table perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  papel text not null check (papel in ('admin', 'operador')),
  area_id bigint references areas (id),
  criado_em timestamptz not null default now()
);

insert into areas (nome, provisoria) values ('Operação', true);

insert into etapas (codigo, nome, ordem, provisoria, area_id)
select marcas.codigo, marcas.nome, marcas.ordem, true, areas.id
from areas
cross join (values
  ('aguardando', 'Aguardando', 1),
  ('em_andamento', 'Em andamento', 2),
  ('pronto_para_conferencia', 'Pronto para conferência', 3)
) as marcas (codigo, nome, ordem)
where areas.nome = 'Operação';

-- Leitura para quem opera. Escrita da réplica só para admin. Operação interna para admin e operador.
grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'status_sellent','segmentos','lojas','vendedores','usuarios_sellent','empresas',
    'tipos_pedido','formas_pagamento','condicoes_pagamento','parceiros','origens',
    'tipos_documento','escritorios','produtos','contatos','tipos_pendencia','perfis_aprovacao',
    'pedidos','pedido_itens','pedido_contatos','pedido_pendencias','pedido_faturas',
    'pedido_fatura_itens','pedido_eventos','coletas'
  ]
  loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, public', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
    execute format('create policy replica_leitura on public.%I for select to authenticated using (public.papel() in (''admin'', ''operador''))', tabela);
    execute format('create policy replica_escrita on public.%I for all to authenticated using (public.papel() = ''admin'') with check (public.papel() = ''admin'')', tabela);
  end loop;
end $$;

revoke update, delete on pedido_eventos from authenticated;

alter table areas enable row level security;
alter table etapas enable row level security;
alter table trabalhos enable row level security;
alter table trabalho_eventos enable row level security;
alter table perfis enable row level security;

revoke all on areas, etapas, trabalhos, trabalho_eventos, perfis from anon, public;
grant select, insert, update, delete on areas, etapas to authenticated;
grant select, insert, update on trabalhos to authenticated;
grant select, insert on trabalho_eventos to authenticated;
grant select, insert, update on perfis to authenticated;

create policy replica_leitura on areas for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy areas_admin on areas for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
create policy replica_leitura on etapas for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy etapas_admin on etapas for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
create policy replica_leitura on trabalhos for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy trabalhos_escrita on trabalhos for all to authenticated using (public.papel() in ('admin', 'operador')) with check (public.papel() in ('admin', 'operador'));
create policy replica_leitura on trabalho_eventos for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy trabalho_eventos_insert on trabalho_eventos for insert to authenticated with check (public.papel() in ('admin', 'operador'));
create policy perfis_leitura on perfis for select to authenticated using (public.papel() = 'admin' or user_id = auth.uid());
create policy perfis_admin on perfis for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
