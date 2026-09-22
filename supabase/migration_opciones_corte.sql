-- Guarda junto a cada mueble qué plancha de melamina (país/formato) eligió
-- el cliente para el plano de corte — antes no se guardaba, así que al
-- reabrir un mueble guardado desde "Mis muebles" el corte se regeneraba
-- siempre con la plancha de Chile (1830x2500), sin importar cuál se haya
-- usado originalmente.
-- Correr esto UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run

alter table public.muebles add column if not exists opciones_corte jsonb;
