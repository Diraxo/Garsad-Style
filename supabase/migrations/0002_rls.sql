-- Garsad Phase 2A — 0002_rls.sql
-- Row Level Security: the database enforces permissions, not the UI.

-- ─────────────────────────────────────────────────────────────
-- helper: is the current user an active admin?
-- security definer so it can read profiles even under RLS.
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.payment_methods       enable row level security;
alter table public.sales                 enable row level security;
alter table public.sale_items            enable row level security;
alter table public.inventory_movements   enable row level security;
alter table public.shop_settings         enable row level security;

-- ─────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_update"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (public.is_admin());
-- normal signups are handled by the handle_new_user() trigger (security definer),
-- which bypasses RLS by design — this insert policy only covers admin-initiated inserts.

-- ─────────────────────────────────────────────────────────────
-- categories — everyone active can read, only admin writes
-- ─────────────────────────────────────────────────────────────
create policy "categories_select_active_users"
  on public.categories for select
  using (public.is_active_user());

create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- products — everyone active can read, only admin writes
-- sellers NEVER get a write policy here: their only path to
-- changing quantity is the record_sale() RPC below.
-- ─────────────────────────────────────────────────────────────
create policy "products_select_active_users"
  on public.products for select
  using (public.is_active_user());

create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- payment_methods — sellers see only active ones, admin sees/writes all
-- ─────────────────────────────────────────────────────────────
create policy "payment_methods_select_active_for_sellers"
  on public.payment_methods for select
  using (active = true or public.is_admin());

create policy "payment_methods_admin_write"
  on public.payment_methods for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- sales — admin sees all, seller sees only their own.
-- NO insert/update/delete policy for anyone: all writes happen
-- through the record_sale() SECURITY DEFINER function only.
-- ─────────────────────────────────────────────────────────────
create policy "sales_select_own_or_admin"
  on public.sales for select
  using (seller_id = auth.uid() or public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- sale_items — visibility follows the parent sale
-- ─────────────────────────────────────────────────────────────
create policy "sale_items_select_via_parent_sale"
  on public.sale_items for select
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and (s.seller_id = auth.uid() or public.is_admin())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- inventory_movements — admin sees all, seller sees movements
-- they personally triggered (their own sales). No direct insert
-- policy: RESTOCK/ADJUSTMENT go through admin-only service calls
-- that still pass through RLS as admin; SALE movements are written
-- by the record_sale() function.
-- ─────────────────────────────────────────────────────────────
create policy "inventory_movements_select_own_or_admin"
  on public.inventory_movements for select
  using (user_id = auth.uid() or public.is_admin());

create policy "inventory_movements_admin_write"
  on public.inventory_movements for insert
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- shop_settings — everyone active can read, only admin writes
-- ─────────────────────────────────────────────────────────────
create policy "shop_settings_select_active_users"
  on public.shop_settings for select
  using (public.is_active_user());

create policy "shop_settings_admin_write"
  on public.shop_settings for update
  using (public.is_admin())
  with check (public.is_admin());
