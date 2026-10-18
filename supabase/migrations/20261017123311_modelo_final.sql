-- Modelo final: réplica em inglês, progresso do SKU e coleta tudo-ou-nada por fonte.
-- A função privilegiada fica no schema private. O público só checa o papel e delega.

drop table if exists
  trabalho_eventos, trabalhos, etapas, areas, perfis,
  pedido_eventos, pedido_fatura_itens, pedido_faturas, pedido_pendencias,
  pedido_contatos, pedido_itens, pedidos, coletas, contatos, produtos,
  escritorios, tipos_documento, origens, parceiros, condicoes_pagamento,
  formas_pagamento, tipos_pedido, empresas, usuarios_sellent, vendedores,
  lojas, segmentos, status_sellent, tipos_pendencia, perfis_aprovacao
cascade;

create table order_statuses (
  id bigint primary key,
  code text,
  name text,
  color text,
  payload jsonb not null default '{}'::jsonb
);

create table segments (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table customers (
  id bigint primary key,
  code text,
  name text,
  erp_id text,
  doc_number text,
  email text,
  phone text,
  segment_id bigint references segments (id),
  payload jsonb not null default '{}'::jsonb
);

create table sellers (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table sellent_users (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table companies (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table order_types (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table payment_methods (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table payment_terms (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table partners (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table origins (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table document_types (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table sales_offices (
  id bigint primary key,
  code text,
  name text,
  payload jsonb not null default '{}'::jsonb
);

create table products (
  id bigint primary key,
  code text,
  name text,
  measure_unit text,
  payload jsonb not null default '{}'::jsonb
);

create table contacts (
  id bigint primary key,
  name text,
  email text,
  phone text,
  payload jsonb not null default '{}'::jsonb
);

create table approval_types (
  code text primary key
);

create table approval_profiles (
  code text primary key
);

create table orders (
  id bigint primary key,
  code text,
  status_id bigint references order_statuses (id),
  customer_id bigint references customers (id),
  seller_id bigint references sellers (id),
  sellent_user_id bigint references sellent_users (id),
  company_id bigint references companies (id),
  order_type_id bigint references order_types (id),
  payment_method_id bigint references payment_methods (id),
  payment_term_id bigint references payment_terms (id),
  partner_id bigint references partners (id),
  origin_id bigint references origins (id),
  document_type_id bigint references document_types (id),
  sales_office_id bigint references sales_offices (id),
  erp_id text,
  erp_number text,
  erp_rejection text,
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
  sales_office text,
  prevision text,
  tracking text,
  payload jsonb not null,
  collected_at timestamptz not null default now()
);

create index orders_status_idx on orders (status_id);
create index orders_updated_idx on orders (updated_at desc);
create index orders_erp_idx on orders (erp_number);

create table order_items (
  id bigint primary key,
  order_id bigint not null references orders (id) on delete cascade,
  product_id bigint references products (id),
  code text,
  name text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  measure_unit text,
  notes text,
  payload jsonb not null
);

create index order_items_order_idx on order_items (order_id);

create table order_contacts (
  order_id bigint not null references orders (id) on delete cascade,
  contact_id bigint not null references contacts (id),
  primary key (order_id, contact_id)
);

create table pendencies (
  id bigint primary key,
  order_id bigint not null references orders (id) on delete cascade,
  approval_type text references approval_types (code),
  reason text,
  profile_approval text references approval_profiles (code),
  status text,
  ready_to_approval boolean not null default false,
  who_approval text,
  date_approval timestamptz,
  created_at timestamptz,
  payload jsonb not null
);

create index pendencies_order_idx on pendencies (order_id);

create table invoices (
  id bigint primary key,
  key text unique,
  order_id bigint not null references orders (id) on delete cascade,
  invoice_number text,
  "date" date,
  value numeric,
  credit_status text,
  erp_number text,
  payload jsonb not null
);

create index invoices_order_idx on invoices (order_id);

create table invoice_items (
  id bigint primary key,
  invoice_id bigint not null references invoices (id) on delete cascade,
  qty numeric,
  net_value numeric,
  product_name text,
  payload jsonb not null
);

create index invoice_items_invoice_idx on invoice_items (invoice_id);

create table order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders (id) on delete cascade,
  field text not null,
  previous_value text,
  new_value text,
  observed_at timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, observed_at);

create table sources (
  code text primary key,
  schedule text not null check (schedule in ('once_then_daily', 'daily')),
  position int not null unique
);

create table collections (
  id bigint generated always as identity primary key,
  source text not null references sources (code),
  quantity int not null default 0,
  skipped int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  cursor timestamptz,
  error text,
  phase text check (phase is null or phase in ('downloading', 'staging', 'promoting')),
  seen int not null default 0,
  expected int,
  api_total int
);

create index collections_source_idx on collections (source, id desc);

create table areas (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table stages (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  position int not null,
  is_provisional boolean not null default true,
  area_id bigint references areas (id)
);

create table order_item_progress (
  id bigint generated always as identity primary key,
  order_item_id bigint not null unique references order_items (id) on delete cascade,
  stage_id bigint not null references stages (id),
  status text not null default 'open' check (status in ('open', 'done')),
  trigger text not null default 'manual' check (trigger in ('manual', 'erp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_item_progress_stage_idx on order_item_progress (stage_id);

create table order_item_progress_events (
  id bigint generated always as identity primary key,
  progress_id bigint not null references order_item_progress (id) on delete cascade,
  from_stage_id bigint references stages (id),
  to_stage_id bigint not null references stages (id),
  reason text not null,
  author uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  area_id bigint references areas (id)
);

insert into sources (code, schedule, position) values
  ('orders_full', 'once_then_daily', 1),
  ('pendency_list', 'daily', 2),
  ('invoices', 'daily', 3),
  ('bi_orders', 'daily', 4);

insert into areas (name) values ('Operação');

insert into stages (code, name, position, is_provisional, area_id)
select marcas.code, marcas.name, marcas.position, true, areas.id
from areas
cross join (values
  ('aguardando', 'Aguardando', 1),
  ('em_andamento', 'Em andamento', 2),
  ('pronto_para_conferencia', 'Pronto para conferência', 3)
) as marcas (code, name, position)
where areas.name = 'Operação';

insert into users (id, area_id)
select auth.users.id, areas.id
from auth.users
cross join areas
where areas.name = 'Operação'
  and coalesce(auth.users.raw_app_meta_data ->> 'papel', '') in ('admin', 'operador');

create table stg_segments (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_sellers (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_sellent_users (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_companies (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_order_types (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_payment_methods (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_payment_terms (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_partners (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_origins (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_document_types (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_sales_offices (id bigint primary key, code text, name text, payload jsonb not null);
create table stg_order_statuses (id bigint primary key, code text, name text, color text, payload jsonb not null);
create table stg_customers (
  id bigint primary key,
  code text,
  name text,
  erp_id text,
  doc_number text,
  email text,
  phone text,
  segment_id bigint,
  payload jsonb not null
);
create table stg_products (id bigint primary key, code text, name text, measure_unit text, payload jsonb not null);
create table stg_contacts (id bigint primary key, name text, email text, phone text, payload jsonb not null);
create table stg_orders (
  id bigint primary key,
  code text,
  status_id bigint,
  customer_id bigint,
  seller_id bigint,
  sellent_user_id bigint,
  company_id bigint,
  order_type_id bigint,
  payment_method_id bigint,
  payment_term_id bigint,
  partner_id bigint,
  origin_id bigint,
  document_type_id bigint,
  sales_office_id bigint,
  erp_id text,
  erp_number text,
  erp_rejection text,
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
  sales_office text,
  prevision text,
  tracking text,
  payload jsonb not null
);
create table stg_order_items (
  id bigint primary key,
  order_id bigint not null,
  product_id bigint,
  code text,
  name text,
  quantity numeric,
  unit_price numeric,
  total_price numeric,
  measure_unit text,
  notes text,
  payload jsonb not null
);
create table stg_order_contacts (
  order_id bigint not null,
  contact_id bigint not null,
  primary key (order_id, contact_id)
);
create table stg_order_events (
  id bigint generated always as identity primary key,
  order_id bigint not null,
  field text not null,
  previous_value text,
  new_value text
);
create table stg_approval_types (code text primary key);
create table stg_approval_profiles (code text primary key);
create table stg_pendencies (
  id bigint primary key,
  order_id bigint,
  approval_type text,
  reason text,
  profile_approval text,
  status text,
  ready_to_approval boolean not null default false,
  who_approval text,
  date_approval timestamptz,
  created_at timestamptz,
  payload jsonb not null
);
create table stg_invoices (
  id bigint primary key,
  key text,
  order_id bigint,
  invoice_number text,
  "date" date,
  value numeric,
  credit_status text,
  erp_number text,
  payload jsonb not null
);
create table stg_invoice_items (
  id bigint primary key,
  invoice_id bigint not null,
  qty numeric,
  net_value numeric,
  product_name text,
  payload jsonb not null
);
create table stg_bi_orders (
  id bigint generated always as identity primary key,
  code text,
  prevision text,
  tracking text
);

create or replace function private.upsert_dims(tables text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nome text;
begin
  foreach nome in array tables loop
    execute format(
      'insert into public.%I (id, code, name, payload)
       select distinct on (id) id, code, name, payload from public.%I order by id
       on conflict (id) do update
       set code = excluded.code, name = excluded.name, payload = excluded.payload',
      nome, 'stg_' || nome
    );
  end loop;
end;
$$;

create or replace function private.upsert_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into order_statuses (id, code, name, color, payload)
  select distinct on (id) id, code, name, color, payload from stg_order_statuses order by id
  on conflict (id) do update
  set code = excluded.code, name = excluded.name, color = excluded.color, payload = excluded.payload;
end;
$$;

create or replace function private.upsert_customers()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into customers (id, code, name, erp_id, doc_number, email, phone, segment_id, payload)
  select distinct on (id) id, code, name, erp_id, doc_number, email, phone, segment_id, payload
  from stg_customers order by id
  on conflict (id) do update set
    code = excluded.code, name = excluded.name, erp_id = excluded.erp_id,
    doc_number = excluded.doc_number, email = excluded.email, phone = excluded.phone,
    segment_id = excluded.segment_id, payload = excluded.payload;
end;
$$;

create or replace function private.upsert_products()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into products (id, code, name, measure_unit, payload)
  select distinct on (id) id, code, name, measure_unit, payload from stg_products order by id
  on conflict (id) do update
  set code = excluded.code, name = excluded.name, measure_unit = excluded.measure_unit, payload = excluded.payload;
end;
$$;

create or replace function private.upsert_contacts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into contacts (id, name, email, phone, payload)
  select distinct on (id) id, name, email, phone, payload from stg_contacts order by id
  on conflict (id) do update
  set name = excluded.name, email = excluded.email, phone = excluded.phone, payload = excluded.payload;
end;
$$;

create or replace function private.clear_staging(p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source = 'orders_full' then
    delete from stg_segments where true;
    delete from stg_customers where true;
    delete from stg_sellers where true;
    delete from stg_sellent_users where true;
    delete from stg_companies where true;
    delete from stg_order_types where true;
    delete from stg_payment_methods where true;
    delete from stg_payment_terms where true;
    delete from stg_partners where true;
    delete from stg_origins where true;
    delete from stg_document_types where true;
    delete from stg_sales_offices where true;
    delete from stg_products where true;
    delete from stg_contacts where true;
    delete from stg_order_statuses where true;
    delete from stg_orders where true;
    delete from stg_order_items where true;
    delete from stg_order_contacts where true;
    delete from stg_order_events where true;
  elsif p_source = 'pendency_list' then
    delete from stg_approval_types where true;
    delete from stg_approval_profiles where true;
    delete from stg_pendencies where true;
  elsif p_source = 'invoices' then
    delete from stg_segments where true;
    delete from stg_customers where true;
    delete from stg_sellers where true;
    delete from stg_invoices where true;
    delete from stg_invoice_items where true;
  elsif p_source = 'bi_orders' then
    delete from stg_bi_orders where true;
  else
    raise exception 'fonte desconhecida';
  end if;
end;
$$;

create or replace function private.exigir_coleta(p_collection bigint, p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from collections
    where id = p_collection and source = p_source and status = 'running'
  ) then
    raise exception 'coleta inválida';
  end if;
end;
$$;

create or replace function private.promote_orders(p_collection bigint, p_cursor timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quantidade int;
begin
  perform set_config('statement_timeout', '600000', true);
  perform private.exigir_coleta(p_collection, 'orders_full');
  perform private.upsert_dims(array[
    'segments', 'sellers', 'sellent_users', 'companies', 'order_types',
    'payment_methods', 'payment_terms', 'partners', 'origins', 'document_types', 'sales_offices'
  ]);
  perform private.upsert_statuses();
  perform private.upsert_customers();
  perform private.upsert_products();
  perform private.upsert_contacts();

  insert into orders (
    id, code, status_id, customer_id, seller_id, sellent_user_id, company_id, order_type_id,
    payment_method_id, payment_term_id, partner_id, origin_id, document_type_id, sales_office_id,
    erp_id, erp_number, erp_rejection, is_integrated, is_canceled, deleted_at, created_at, updated_at,
    order_date, amount, amount_final, total_products, buyer_name, buyer_email, buyer_phone, buyer_mobile,
    doc_type, doc_number, address_city, address_state, address_zipcode, address_street, address_number,
    address_district, sales_office, prevision, tracking, payload, collected_at
  )
  select
    id, code, status_id, customer_id, seller_id, sellent_user_id, company_id, order_type_id,
    payment_method_id, payment_term_id, partner_id, origin_id, document_type_id, sales_office_id,
    erp_id, erp_number, erp_rejection, is_integrated, is_canceled, deleted_at, created_at, updated_at,
    order_date, amount, amount_final, total_products, buyer_name, buyer_email, buyer_phone, buyer_mobile,
    doc_type, doc_number, address_city, address_state, address_zipcode, address_street, address_number,
    address_district, sales_office, prevision, tracking, payload, now()
  from stg_orders
  on conflict (id) do update set
    code = excluded.code, status_id = excluded.status_id, customer_id = excluded.customer_id,
    seller_id = excluded.seller_id, sellent_user_id = excluded.sellent_user_id, company_id = excluded.company_id,
    order_type_id = excluded.order_type_id, payment_method_id = excluded.payment_method_id,
    payment_term_id = excluded.payment_term_id, partner_id = excluded.partner_id, origin_id = excluded.origin_id,
    document_type_id = excluded.document_type_id, sales_office_id = excluded.sales_office_id,
    erp_id = excluded.erp_id, erp_number = excluded.erp_number, erp_rejection = excluded.erp_rejection,
    is_integrated = excluded.is_integrated, is_canceled = excluded.is_canceled, deleted_at = excluded.deleted_at,
    created_at = excluded.created_at, updated_at = excluded.updated_at, order_date = excluded.order_date,
    amount = excluded.amount, amount_final = excluded.amount_final, total_products = excluded.total_products,
    buyer_name = excluded.buyer_name, buyer_email = excluded.buyer_email, buyer_phone = excluded.buyer_phone,
    buyer_mobile = excluded.buyer_mobile, doc_type = excluded.doc_type, doc_number = excluded.doc_number,
    address_city = excluded.address_city, address_state = excluded.address_state,
    address_zipcode = excluded.address_zipcode, address_street = excluded.address_street,
    address_number = excluded.address_number, address_district = excluded.address_district,
    sales_office = excluded.sales_office,
    prevision = coalesce(excluded.prevision, orders.prevision),
    tracking = coalesce(excluded.tracking, orders.tracking),
    payload = excluded.payload, collected_at = now();
  get diagnostics quantidade = row_count;

  insert into order_items (
    id, order_id, product_id, code, name, quantity, unit_price, total_price, measure_unit, notes, payload
  )
  select id, order_id, product_id, code, name, quantity, unit_price, total_price, measure_unit, notes, payload
  from stg_order_items
  on conflict (id) do update set
    order_id = excluded.order_id, product_id = excluded.product_id, code = excluded.code, name = excluded.name,
    quantity = excluded.quantity, unit_price = excluded.unit_price, total_price = excluded.total_price,
    measure_unit = excluded.measure_unit, notes = excluded.notes, payload = excluded.payload;

  insert into order_contacts (order_id, contact_id)
  select order_id, contact_id from stg_order_contacts
  on conflict (order_id, contact_id) do nothing;

  insert into order_events (order_id, field, previous_value, new_value)
  select order_id, field, previous_value, new_value from stg_order_events;

  update collections
  set status = 'succeeded', quantity = quantidade, skipped = 0, cursor = p_cursor, finished_at = now(), error = null, phase = null
  where id = p_collection;

  perform private.clear_staging('orders_full');
  return jsonb_build_object('quantity', quantidade, 'skipped', 0);
end;
$$;

create or replace function private.promote_pendencies(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quantidade int;
  pulados int;
begin
  perform set_config('statement_timeout', '600000', true);
  perform private.exigir_coleta(p_collection, 'pendency_list');
  insert into approval_types (code)
  select code from stg_approval_types
  on conflict (code) do nothing;
  insert into approval_profiles (code)
  select code from stg_approval_profiles
  on conflict (code) do nothing;

  select count(*) into pulados
  from stg_pendencies s
  where s.order_id is null or not exists (select 1 from orders o where o.id = s.order_id);

  insert into pendencies (
    id, order_id, approval_type, reason, profile_approval, status, ready_to_approval,
    who_approval, date_approval, created_at, payload
  )
  select
    id, order_id, approval_type, reason, profile_approval, status, ready_to_approval,
    who_approval, date_approval, created_at, payload
  from stg_pendencies s
  where s.order_id is not null and exists (select 1 from orders o where o.id = s.order_id)
  on conflict (id) do update set
    order_id = excluded.order_id, approval_type = excluded.approval_type, reason = excluded.reason,
    profile_approval = excluded.profile_approval, status = excluded.status,
    ready_to_approval = excluded.ready_to_approval, who_approval = excluded.who_approval,
    date_approval = excluded.date_approval, created_at = excluded.created_at, payload = excluded.payload;
  get diagnostics quantidade = row_count;

  update collections
  set status = 'succeeded', quantity = quantidade, skipped = pulados, finished_at = now(), error = null, phase = null
  where id = p_collection;

  perform private.clear_staging('pendency_list');
  return jsonb_build_object('quantity', quantidade, 'skipped', pulados);
end;
$$;

create or replace function private.promote_invoices(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quantidade int;
  pulados int;
begin
  perform set_config('statement_timeout', '600000', true);
  perform private.exigir_coleta(p_collection, 'invoices');
  perform private.upsert_dims(array['segments', 'sellers']);
  perform private.upsert_customers();

  update stg_invoices s
  set order_id = unico.id
  from (
    select erp_number, min(id) as id
    from orders
    where erp_number is not null
    group by erp_number
    having count(*) = 1
  ) unico
  where s.erp_number = unico.erp_number
    and (
      s.order_id is null
      or not exists (select 1 from orders o where o.id = s.order_id)
    );

  select count(*) into pulados
  from stg_invoices s
  where s.order_id is null or not exists (select 1 from orders o where o.id = s.order_id);

  insert into invoices (id, key, order_id, invoice_number, "date", value, credit_status, erp_number, payload)
  select id, key, order_id, invoice_number, "date", value, credit_status, erp_number, payload
  from stg_invoices s
  where s.order_id is not null and exists (select 1 from orders o where o.id = s.order_id)
  on conflict (id) do update set
    key = excluded.key, order_id = excluded.order_id, invoice_number = excluded.invoice_number,
    "date" = excluded."date", value = excluded.value, credit_status = excluded.credit_status,
    erp_number = excluded.erp_number, payload = excluded.payload;
  get diagnostics quantidade = row_count;

  insert into invoice_items (id, invoice_id, qty, net_value, product_name, payload)
  select id, invoice_id, qty, net_value, product_name, payload
  from stg_invoice_items s
  where exists (select 1 from invoices f where f.id = s.invoice_id)
  on conflict (id) do update set
    invoice_id = excluded.invoice_id, qty = excluded.qty, net_value = excluded.net_value,
    product_name = excluded.product_name, payload = excluded.payload;

  update collections
  set status = 'succeeded', quantity = quantidade, skipped = pulados, finished_at = now(), error = null, phase = null
  where id = p_collection;

  perform private.clear_staging('invoices');
  return jsonb_build_object('quantity', quantidade, 'skipped', pulados);
end;
$$;

create or replace function private.promote_bi_orders(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quantidade int;
  pulados int;
begin
  perform set_config('statement_timeout', '600000', true);
  perform private.exigir_coleta(p_collection, 'bi_orders');

  select count(*) into pulados
  from stg_bi_orders s
  where s.code is null or not exists (select 1 from orders o where o.erp_number = s.code);

  update orders o
  set prevision = coalesce(s.prevision, o.prevision),
      tracking = coalesce(s.tracking, o.tracking)
  from stg_bi_orders s
  where o.erp_number = s.code and (s.prevision is not null or s.tracking is not null);
  get diagnostics quantidade = row_count;

  update collections
  set status = 'succeeded', quantity = quantidade, skipped = pulados, finished_at = now(), error = null, phase = null
  where id = p_collection;

  perform private.clear_staging('bi_orders');
  return jsonb_build_object('quantity', quantidade, 'skipped', pulados);
end;
$$;

revoke all on function private.upsert_dims(text[]) from public, anon, authenticated;
revoke all on function private.upsert_statuses() from public, anon, authenticated;
revoke all on function private.upsert_customers() from public, anon, authenticated;
revoke all on function private.upsert_products() from public, anon, authenticated;
revoke all on function private.upsert_contacts() from public, anon, authenticated;
revoke all on function private.clear_staging(text) from public, anon, authenticated;
revoke all on function private.exigir_coleta(bigint, text) from public, anon, authenticated;
revoke all on function private.promote_orders(bigint, timestamptz) from public, anon, authenticated;
revoke all on function private.promote_pendencies(bigint) from public, anon, authenticated;
revoke all on function private.promote_invoices(bigint) from public, anon, authenticated;
revoke all on function private.promote_bi_orders(bigint) from public, anon, authenticated;

create or replace function public.clear_staging(p_source text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  perform private.clear_staging(p_source);
end;
$$;

create or replace function public.abandon_running()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fonte text;
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  update collections
  set status = 'failed', error = 'interrompida', finished_at = now()
  where status = 'running';
  foreach fonte in array array['orders_full', 'pendency_list', 'invoices', 'bi_orders'] loop
    perform private.clear_staging(fonte);
  end loop;
end;
$$;

create or replace function public.promote_orders(p_collection bigint, p_cursor timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  return private.promote_orders(p_collection, p_cursor);
end;
$$;

create or replace function public.promote_pendencies(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  return private.promote_pendencies(p_collection);
end;
$$;

create or replace function public.promote_invoices(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  return private.promote_invoices(p_collection);
end;
$$;

create or replace function public.promote_bi_orders(p_collection bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.papel() <> 'admin' then
    raise exception 'sem permissão';
  end if;
  return private.promote_bi_orders(p_collection);
end;
$$;

revoke all on function public.clear_staging(text) from public, anon;
revoke all on function public.abandon_running() from public, anon;
revoke all on function public.promote_orders(bigint, timestamptz) from public, anon;
revoke all on function public.promote_pendencies(bigint) from public, anon;
revoke all on function public.promote_invoices(bigint) from public, anon;
revoke all on function public.promote_bi_orders(bigint) from public, anon;
grant execute on function public.clear_staging(text) to authenticated;
grant execute on function public.abandon_running() to authenticated;
grant execute on function public.promote_orders(bigint, timestamptz) to authenticated;
grant execute on function public.promote_pendencies(bigint) to authenticated;
grant execute on function public.promote_invoices(bigint) to authenticated;
grant execute on function public.promote_bi_orders(bigint) to authenticated;

grant usage, select on all sequences in schema public to authenticated;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'order_statuses','segments','customers','sellers','sellent_users','companies',
    'order_types','payment_methods','payment_terms','partners','origins','document_types',
    'sales_offices','products','contacts','approval_types','approval_profiles',
    'orders','order_items','order_contacts','pendencies','invoices','invoice_items',
    'order_events','sources','collections'
  ]
  loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, public', tabela);
    execute format('grant select, insert, update on table public.%I to authenticated', tabela);
    execute format('create policy replica_leitura on public.%I for select to authenticated using (public.papel() in (''admin'', ''operador''))', tabela);
    execute format('create policy replica_escrita on public.%I for all to authenticated using (public.papel() = ''admin'') with check (public.papel() = ''admin'')', tabela);
  end loop;

  foreach tabela in array array[
    'stg_segments','stg_sellers','stg_sellent_users','stg_companies','stg_order_types',
    'stg_payment_methods','stg_payment_terms','stg_partners','stg_origins','stg_document_types',
    'stg_sales_offices','stg_order_statuses','stg_customers','stg_products','stg_contacts',
    'stg_orders','stg_order_items','stg_order_contacts','stg_order_events','stg_approval_types',
    'stg_approval_profiles','stg_pendencies','stg_invoices','stg_invoice_items','stg_bi_orders'
  ]
  loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on table public.%I from anon, public', tabela);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', tabela);
    execute format('create policy staging_admin on public.%I for all to authenticated using (public.papel() = ''admin'') with check (public.papel() = ''admin'')', tabela);
  end loop;
end $$;

revoke update, delete on order_events from authenticated;
revoke update, delete on order_item_progress_events from authenticated;

alter table areas enable row level security;
alter table stages enable row level security;
alter table order_item_progress enable row level security;
alter table order_item_progress_events enable row level security;
alter table users enable row level security;

revoke all on areas, stages, order_item_progress, order_item_progress_events, users from anon, public;
grant select, insert, update, delete on areas, stages to authenticated;
grant select, insert, update on order_item_progress to authenticated;
grant select, insert on order_item_progress_events to authenticated;
grant select, insert, update on users to authenticated;

create policy areas_leitura on areas for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy areas_admin on areas for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
create policy stages_leitura on stages for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy stages_admin on stages for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
create policy progress_leitura on order_item_progress for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy progress_escrita on order_item_progress for all to authenticated using (public.papel() in ('admin', 'operador')) with check (public.papel() in ('admin', 'operador'));
create policy progress_eventos_leitura on order_item_progress_events for select to authenticated using (public.papel() in ('admin', 'operador'));
create policy progress_eventos_insert on order_item_progress_events for insert to authenticated with check (public.papel() in ('admin', 'operador'));
create policy users_leitura on users for select to authenticated using (public.papel() = 'admin' or id = auth.uid());
create policy users_admin on users for all to authenticated using (public.papel() = 'admin') with check (public.papel() = 'admin');
