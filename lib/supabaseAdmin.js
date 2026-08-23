import { createClient } from '@supabase/supabase-js';

// Cliente con la service_role key de Supabase — bypassa RLS por completo.
// Solo se debe importar desde rutas de servidor (app/api/**/route.js),
// nunca desde un componente 'use client'. Se usa donde el servidor ya
// validó por su cuenta quién es el usuario (token verificado, firma de
// webhook verificada) y necesita escribir sin depender de una sesión.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdminConfigurado = Boolean(supabaseUrl && serviceRoleKey);

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
