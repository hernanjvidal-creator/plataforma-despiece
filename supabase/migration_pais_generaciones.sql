-- Agrega el país del visitante a "generaciones_despiece" — hasta ahora no se
-- registraba de dónde eran los usuarios, así que no había forma de saber
-- cuántas generaciones venían de cada país. Se completa a futuro (server-side,
-- vía el header de geolocalización de Vercel), no retroactivo para filas ya
-- existentes.
-- Correr esto UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run

alter table public.generaciones_despiece add column if not exists pais text;
