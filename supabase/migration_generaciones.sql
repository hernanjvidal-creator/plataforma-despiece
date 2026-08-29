-- Registro de cada vez que se genera un despiece (botón "Generar despiece"),
-- para medir uso real de la plataforma — a diferencia de "muebles" (que solo
-- se llena si el cliente además guarda el diseño), esto captura a cualquiera
-- que llegue a ver su despiece, se lo guarde o no.
-- Correr esto UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run

create table public.generaciones_despiece (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  modulo text not null,
  created_at timestamptz not null default now()
);

alter table public.generaciones_despiece enable row level security;

-- Cualquiera puede registrar una generación (incluso sin cuenta) — pero
-- nadie puede leer los registros de otros desde el cliente; solo se lee con
-- la service_role key (dashboard de Supabase o el panel de admin).
create policy "insertar_generacion"
  on public.generaciones_despiece for insert
  with check (true);
