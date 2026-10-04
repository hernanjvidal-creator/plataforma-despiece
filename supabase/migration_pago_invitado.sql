-- Pago sin cuenta: un cliente puede pagar solo con su correo. El pedido nace
-- sin dueño (user_id nulo) y, cuando llega la confirmación del pago, el
-- servidor crea (o encuentra) la cuenta con ese correo y le asigna el pedido
-- y el mueble. Correr UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run

alter table public.pedidos alter column user_id drop not null;
alter table public.pedido_items alter column user_id drop not null;

alter table public.pedidos
  add column if not exists email_comprador text,
  add column if not exists guest_token text,
  add column if not exists cuenta_creada_en_compra boolean not null default false;

alter table public.pedido_items
  add column if not exists opciones_corte jsonb;

-- Busca el id de un usuario por su correo (para no recorrer toda la lista de
-- usuarios desde el servidor). Solo la puede ejecutar el servidor.
create or replace function public.usuario_id_por_correo(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;

revoke all on function public.usuario_id_por_correo(text) from public, anon, authenticated;
grant execute on function public.usuario_id_por_correo(text) to service_role;
