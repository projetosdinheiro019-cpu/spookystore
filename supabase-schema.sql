-- Spooky Store / Supabase
-- Execute this file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  old_price_cents integer,
  badge text,
  image_url text,
  active boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  status text not null default 'pending_payment',
  payment_status text not null default 'pending',
  panterapay_transaction_id text unique,
  payment_expires_at timestamptz,
  paid_at timestamptz,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,
  shipping_cep text not null,
  shipping_street text not null,
  shipping_number text not null,
  shipping_complement text,
  shipping_neighborhood text not null,
  shipping_city text not null,
  shipping_state text not null,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents integer not null,
  coupon_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null,
  product_name text not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity > 0),
  total_cents integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  transaction_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


create or replace function public.mark_order_paid(p_order_id uuid, p_transaction_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  item record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.payment_status = 'paid' then return; end if;

  for item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    update public.products
      set stock = stock - item.quantity, updated_at = now()
      where id = item.product_id and stock >= item.quantity;
    if not found then raise exception 'insufficient_stock'; end if;
  end loop;

  update public.orders
    set payment_status = 'paid', status = 'paid', panterapay_transaction_id = coalesce(p_transaction_id, panterapay_transaction_id), paid_at = now(), updated_at = now()
    where id = p_order_id;
end;
$$;

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payment_events_transaction_id_idx on public.payment_events(transaction_id);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

-- The storefront server uses the service-role key. No public client access is needed for checkout.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in the browser.

insert into public.products (id,name,category,price_cents,old_price_cents,badge,image_url,stock)
values
(1,'Fantasia Bruxa Preta Magic','fantasia',14990,17990,'Destaque','https://images.pexels.com/photos/5600005/pexels-photo-5600005.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(2,'Fantasia Vampira Vitoriana','fantasia',18990,22990,'Oferta','https://images.pexels.com/photos/20485655/pexels-photo-20485655.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(3,'Kit 30 Enfeites Halloween','decoracao',4999,6990,'Mais vendido','https://images.pexels.com/photos/5477530/pexels-photo-5477530.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(4,'Varal LED de Abóboras','decoracao',3890,4990,'Novo','https://images.pexels.com/photos/6495932/pexels-photo-6495932.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(5,'Máscara Jason Premium','mascara',3600,4990,'Destaque','https://images.pexels.com/photos/12725754/pexels-photo-12725754.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(6,'Máscara Bruxa Verde Realista','mascara',8690,9990,'Premium','https://images.pexels.com/photos/29344308/pexels-photo-29344308.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(7,'Tiara Halloween com Caveira','acessorio',1890,2490,'Oferta','https://images.pexels.com/photos/9740338/pexels-photo-9740338.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(8,'Kit Enfeites Aranha & Morcego','decoracao',2890,3990,'Kit','https://images.pexels.com/photos/5477591/pexels-photo-5477591.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(9,'Fantasia Mulher-Gato','fantasia',12349,15990,'Popular','https://images.pexels.com/photos/5600063/pexels-photo-5600063.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(10,'Fantasia Pennywise','fantasia',19990,25690,'Destaque','https://images.pexels.com/photos/13070402/pexels-photo-13070402.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(11,'Fantasia Fantasma Clássica','fantasia',11990,14990,'Novo','https://images.pexels.com/photos/14023737/pexels-photo-14023737.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(12,'Enfeite Caveira com Véu','decoracao',5690,6990,'Premium','https://images.pexels.com/photos/14009001/pexels-photo-14009001.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(13,'Capa Vampiro Premium','fantasia',8990,11990,'Novo','https://images.pexels.com/photos/14241337/pexels-photo-14241337.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(14,'Chapéu de Bruxa Premium','acessorio',3490,4490,'Favorito','https://images.pexels.com/photos/27914105/pexels-photo-27914105.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(15,'Lanterna LED Abóbora','decoracao',4490,5990,'Novo','https://images.pexels.com/photos/14562304/pexels-photo-14562304.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(16,'Máscara Caveira Dark','mascara',3990,5490,'Oferta','https://images.pexels.com/photos/29030549/pexels-photo-29030549.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(17,'Colar Choker Gótico','acessorio',2990,3990,'Best seller','https://images.pexels.com/photos/9740338/pexels-photo-9740338.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(18,'Luz Neon Ghost','decoracao',7990,9990,'Premium','https://images.pexels.com/photos/18884940/pexels-photo-18884940.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(19,'Kit Presilhas Morcego','acessorio',2490,3290,'Oferta','https://images.pexels.com/photos/33815324/pexels-photo-33815324.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(20,'Fantasia Rainha Sombria','fantasia',16990,21990,'Premium','https://images.pexels.com/photos/5600071/pexels-photo-5600071.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(21,'Castiçal Gótico 3 Braços','decoracao',6490,8490,'Destaque','https://images.pexels.com/photos/10113123/pexels-photo-10113123.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(22,'Máscara Fantasma Branca','mascara',2490,3490,'Oferta','https://images.pexels.com/photos/29344308/pexels-photo-29344308.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(23,'Capa com Capuz Sombria','fantasia',7990,9990,'Novo','https://images.pexels.com/photos/5407942/pexels-photo-5407942.jpeg?auto=compress&cs=tinysrgb&w=1200',50),
(24,'Kit 6 Velas LED','decoracao',3290,4490,'Kit','https://images.pexels.com/photos/14059510/pexels-photo-14059510.jpeg?auto=compress&cs=tinysrgb&w=1200',50)
on conflict (id) do update set name=excluded.name, category=excluded.category, price_cents=excluded.price_cents, old_price_cents=excluded.old_price_cents, badge=excluded.badge, image_url=excluded.image_url;
