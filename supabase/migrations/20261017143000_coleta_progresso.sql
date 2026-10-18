alter table collections add column if not exists phase text;
alter table collections add column if not exists seen int not null default 0;
alter table collections add column if not exists expected int;
alter table collections add column if not exists api_total int;
alter table collections drop constraint if exists collections_phase_check;
alter table collections add constraint collections_phase_check
  check (phase is null or phase in ('downloading', 'staging', 'promoting'));

update collections set seen = quantity where status = 'succeeded' and seen = 0 and quantity > 0;
update collections set seen = 10471 where source = 'invoices' and status = 'succeeded' and quantity = 0 and seen = 0;
update collections set seen = 20 where source = 'bi_orders' and status = 'succeeded' and seen = 0;

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
