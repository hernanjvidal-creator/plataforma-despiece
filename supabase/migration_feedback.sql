-- Feedback de usuarios (fase de validación, plataforma gratis)
-- Correr esto UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- (es aparte de schema.sql porque ese ya se corrió antes en producción)

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  mensaje text not null,
  calificacion smallint check (calificacion between 1 and 5),
  pagina text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Cualquiera puede dejar feedback (incluso sin cuenta) — pero nadie puede
-- leer el feedback de otros desde el cliente; solo se lee con la
-- service_role key (dashboard de Supabase o un script de administración).
create policy "insertar_feedback"
  on public.feedback for insert
  with check (true);
