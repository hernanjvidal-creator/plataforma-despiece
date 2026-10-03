-- Pasos del embudo de compra (clic en "Desbloquear", ir a iniciar sesión,
-- retomar la compra, redirección al pago, etc.), para ver en el panel de
-- admin dónde se cae la gente. Se escribe solo desde el servidor
-- (/api/registrar-evento, con service role), así que no lleva políticas:
-- nadie puede leer ni escribir esta tabla desde el navegador.
-- Correr UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run

create table public.eventos_embudo (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  modulo text,
  user_id uuid references auth.users(id) on delete set null,
  pais text,
  created_at timestamptz not null default now()
);

create index eventos_embudo_created_at_idx on public.eventos_embudo (created_at);

alter table public.eventos_embudo enable row level security;
