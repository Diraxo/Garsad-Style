-- Garsad Phase 2A — 0001_init_schema.sql
-- Core tables mapped 1:1 from src/types/index.ts

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles (role sits here, keyed to auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null check (role in ('admin', 'seller')),
  status      text not null default 'active' check (status in ('active', 'disabled')),
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  brand             text not null default '',
  category_id       uuid not null references public.categories(id) on delete restrict,
  sku               text not null unique,
  size              text,
  color             text,
  purchase_cost     numeric(12,2) not null check (purchase_cost >= 0),
  selling_price     numeric(12,2) not null check (selling_price > 0),
  quantity          integer not null default 0 check (quantity >= 0),
  initial_quantity  integer not null default 0 check (initial_quantity >= 0),
  description       text,
  image_url         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_id_idx on public.products(category_id);
create index products_sku_idx on public.products(sku);
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create extension if not exists pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- payment_methods
-- ─────────────────────────────────────────────────────────────
create table public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- sales / sale_items
-- ─────────────────────────────────────────────────────────────
create table public.sales (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.profiles(id),
  payment_method_id   uuid not null references public.payment_methods(id),
  total_amount        numeric(12,2) not null,
  total_profit        numeric(12,2) not null,
  created_at          timestamptz not null default now()
);
create index sales_seller_id_idx on public.sales(seller_id);
create index sales_created_at_idx on public.sales(created_at desc);

create table public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references public.sales(id) on delete cascade,
  product_id      uuid not null references public.products(id),
  quantity        integer not null check (quantity > 0),
  original_price  numeric(12,2) not null,  -- product.selling_price at time of sale
  actual_price    numeric(12,2) not null,  -- negotiated price actually charged
  purchase_cost   numeric(12,2) not null,  -- product.purchase_cost at time of sale
  profit          numeric(12,2) not null   -- (actual_price - purchase_cost) * quantity
);
create index sale_items_sale_id_idx on public.sale_items(sale_id);
create index sale_items_product_id_idx on public.sale_items(product_id);

-- ─────────────────────────────────────────────────────────────
-- inventory_movements
-- ─────────────────────────────────────────────────────────────
create table public.inventory_movements (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  type              text not null check (type in ('INITIAL_STOCK', 'SALE', 'RESTOCK', 'ADJUSTMENT')),
  quantity_change   integer not null,
  resulting_stock   integer not null,
  user_id           uuid references public.profiles(id),
  note              text,
  created_at        timestamptz not null default now()
);
create index inventory_movements_product_id_idx on public.inventory_movements(product_id);
create index inventory_movements_created_at_idx on public.inventory_movements(created_at desc);

-- ─────────────────────────────────────────────────────────────
-- shop_settings (singleton row)
-- ─────────────────────────────────────────────────────────────
create table public.shop_settings (
  id                    boolean primary key default true,
  shop_name             text not null default 'Garsad',
  logo_initial          text not null default 'G',
  phone                 text not null default '',
  address               text not null default '',
  currency              text not null default 'ETB',
  low_stock_threshold   integer not null default 5 check (low_stock_threshold >= 0),
  constraint shop_settings_singleton check (id)
);
insert into public.shop_settings (id) values (true);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger for products
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- auto-create a profile row whenever a new auth user signs up
-- role/name/status are read from the signup call's `options.data`
-- (see authService.signUp on the frontend); defaults to seller/active
-- if not provided, so no user can self-assign admin.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'seller', -- always seller on self-signup; promote to admin manually via SQL
    'active'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
