-- Esquema de base de datos — Plataforma de Despiece
-- Correr esto una vez en: Supabase Dashboard → SQL Editor → New query → Run
--
-- No crea usuarios (eso lo maneja Supabase Auth solo, tabla auth.users).
-- Solo agrega las tablas propias de la app.

-- ---------- Muebles guardados por cada cliente ("carpeta" de diseños) ----------
create table public.muebles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default 'Mueble sin nombre',
  modulo text not null,
  parametros jsonb not null,
  foto_espacio_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.muebles enable row level security;

create policy "select_propios_muebles"
  on public.muebles for select
  using (auth.uid() = user_id);

create policy "insert_propios_muebles"
  on public.muebles for insert
  with check (auth.uid() = user_id);

create policy "update_propios_muebles"
  on public.muebles for update
  using (auth.uid() = user_id);

create policy "delete_propios_muebles"
  on public.muebles for delete
  using (auth.uid() = user_id);

create or replace function public.actualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger muebles_updated_at
  before update on public.muebles
  for each row execute function public.actualizar_updated_at();

-- ---------- Pedidos (se deja preparado para la fase de pago) ----------
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  estado text not null default 'pendiente', -- 'pendiente' | 'pagado' | 'cancelado'
  total numeric,
  lemonsqueezy_order_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.pedidos enable row level security;

create policy "select_propios_pedidos"
  on public.pedidos for select
  using (auth.uid() = user_id);

create policy "insert_propios_pedidos"
  on public.pedidos for insert
  with check (auth.uid() = user_id);

-- Copia congelada de los parámetros al momento de pagar, para que una edición
-- posterior al mueble guardado no cambie lo que el cliente ya compró.
create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  mueble_id uuid references public.muebles(id) on delete set null,
  nombre text not null,
  modulo text not null,
  parametros_congelados jsonb not null,
  precio numeric not null default 0
);

alter table public.pedido_items enable row level security;

create policy "select_items_propios_pedidos"
  on public.pedido_items for select
  using (
    exists (
      select 1 from public.pedidos
      where pedidos.id = pedido_items.pedido_id
      and pedidos.user_id = auth.uid()
    )
  );

-- ---------- Storage: bucket para las fotos del espacio del cliente ----------
-- 1. Crear el bucket manualmente: Dashboard → Storage → New bucket → nombre
--    "fotos-espacio" → Private (no marcar "Public bucket").
-- 2. Correr las políticas de abajo para que cada usuario solo pueda subir/ver
--    sus propias fotos (se guardan en una carpeta con su user_id).
create policy "subir_propias_fotos"
  on storage.objects for insert
  with check (bucket_id = 'fotos-espacio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ver_propias_fotos"
  on storage.objects for select
  using (bucket_id = 'fotos-espacio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar_propias_fotos"
  on storage.objects for delete
  using (bucket_id = 'fotos-espacio' and (storage.foldername(name))[1] = auth.uid()::text);
