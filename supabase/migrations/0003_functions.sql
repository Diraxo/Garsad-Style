-- Garsad Phase 2A — 0003_functions.sql
-- Atomic, race-safe mutations. These are the ONLY way inventory/sales
-- data changes — no table in this app is written to by two separate
-- unprotected client calls.

-- ─────────────────────────────────────────────────────────────
-- record_sale — the seller checkout operation.
-- Locks the product row, verifies stock, and only then writes
-- sale + sale_items + product.quantity + inventory_movement.
-- Runs as SECURITY DEFINER so it can update products (which has
-- no seller write policy) — but it re-checks the caller's own
-- role/status itself, so it isn't an open door.
-- ─────────────────────────────────────────────────────────────
create or replace function public.record_sale(
  p_product_id        uuid,
  p_quantity          integer,
  p_actual_price      numeric,
  p_payment_method_id uuid
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id     uuid := auth.uid();
  v_caller_status text;
  v_product       public.products%rowtype;
  v_pm_active     boolean;
  v_sale          public.sales%rowtype;
  v_profit        numeric(12,2);
begin
  if v_caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select status into v_caller_status from public.profiles where id = v_caller_id;
  if v_caller_status is distinct from 'active' then
    raise exception 'Your account is not active';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be at least 1';
  end if;
  if p_actual_price is null or p_actual_price <= 0 then
    raise exception 'Enter a valid sale price';
  end if;

  select active into v_pm_active from public.payment_methods where id = p_payment_method_id;
  if v_pm_active is null then
    raise exception 'Payment method not found';
  elsif v_pm_active = false then
    raise exception 'This payment method is disabled';
  end if;

  -- Row lock: two concurrent sellers selling the same product will
  -- serialize here, so the second one sees the already-decremented
  -- quantity instead of racing on stale data.
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;
  if v_product.quantity < p_quantity then
    raise exception 'Only % unit(s) left in stock', v_product.quantity;
  end if;

  v_profit := (p_actual_price - v_product.purchase_cost) * p_quantity;

  insert into public.sales (seller_id, payment_method_id, total_amount, total_profit)
  values (v_caller_id, p_payment_method_id, p_actual_price * p_quantity, v_profit)
  returning * into v_sale;

  insert into public.sale_items
    (sale_id, product_id, quantity, original_price, actual_price, purchase_cost, profit)
  values
    (v_sale.id, v_product.id, p_quantity, v_product.selling_price, p_actual_price, v_product.purchase_cost, v_profit);

  update public.products
    set quantity = quantity - p_quantity
    where id = v_product.id;

  insert into public.inventory_movements
    (product_id, type, quantity_change, resulting_stock, user_id, note)
  values
    (v_product.id, 'SALE', -p_quantity, v_product.quantity - p_quantity, v_caller_id, 'Sale ' || v_sale.id);

  return v_sale;
end;
$$;

grant execute on function public.record_sale(uuid, integer, numeric, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- restock_product — admin-only, adds stock and logs the movement
-- atomically in one call instead of two unprotected client writes.
-- ─────────────────────────────────────────────────────────────
create or replace function public.restock_product(
  p_product_id uuid,
  p_amount     integer,
  p_note       text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_product   public.products%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can restock products';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Restock amount must be greater than zero';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  update public.products
    set quantity = quantity + p_amount
    where id = p_product_id
    returning * into v_product;

  insert into public.inventory_movements
    (product_id, type, quantity_change, resulting_stock, user_id, note)
  values
    (p_product_id, 'RESTOCK', p_amount, v_product.quantity, v_caller_id, coalesce(p_note, 'Manual restock'));

  return v_product;
end;
$$;

grant execute on function public.restock_product(uuid, integer, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- adjust_product_stock — admin-only, sets stock to an exact value
-- (used for corrections) and logs the delta as an ADJUSTMENT.
-- ─────────────────────────────────────────────────────────────
create or replace function public.adjust_product_stock(
  p_product_id  uuid,
  p_new_quantity integer,
  p_note        text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_product   public.products%rowtype;
  v_delta     integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can adjust stock';
  end if;
  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'Stock cannot be negative';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  v_delta := p_new_quantity - v_product.quantity;

  update public.products set quantity = p_new_quantity where id = p_product_id
    returning * into v_product;

  insert into public.inventory_movements
    (product_id, type, quantity_change, resulting_stock, user_id, note)
  values
    (p_product_id, 'ADJUSTMENT', v_delta, p_new_quantity, v_caller_id, coalesce(p_note, 'Manual adjustment'));

  return v_product;
end;
$$;

grant execute on function public.adjust_product_stock(uuid, integer, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- create_product_with_stock — admin-only, creates a product and its
-- INITIAL_STOCK movement atomically.
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_product_with_stock(
  p_name             text,
  p_brand            text,
  p_category_id      uuid,
  p_sku              text,
  p_size             text,
  p_color            text,
  p_purchase_cost    numeric,
  p_selling_price    numeric,
  p_quantity         integer,
  p_description      text,
  p_image_url        text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_product   public.products%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create products';
  end if;

  insert into public.products
    (name, brand, category_id, sku, size, color, purchase_cost, selling_price, quantity, initial_quantity, description, image_url)
  values
    (p_name, p_brand, p_category_id, p_sku, p_size, p_color, p_purchase_cost, p_selling_price, p_quantity, p_quantity, p_description, p_image_url)
  returning * into v_product;

  insert into public.inventory_movements
    (product_id, type, quantity_change, resulting_stock, user_id, note)
  values
    (v_product.id, 'INITIAL_STOCK', p_quantity, p_quantity, v_caller_id, 'Initial stock intake');

  return v_product;
end;
$$;

grant execute on function public.create_product_with_stock(
  text, text, uuid, text, text, text, numeric, numeric, integer, text, text
) to authenticated;
