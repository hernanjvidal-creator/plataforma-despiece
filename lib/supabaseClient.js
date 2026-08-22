import { createClient } from '@supabase/supabase-js';

// Variables públicas (seguras de exponer en el navegador): la seguridad real
// la dan las políticas de Row Level Security definidas en supabase/schema.sql,
// no esta clave.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

// createClient exige una URL con formato válido — si todavía no están las
// variables de entorno reales, se usa un placeholder para que la app no se
// caiga entera al cargar. Cualquier llamada real fallará (capturada donde se
// use), pero el resto de la app sigue funcionando sin Supabase configurado.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
