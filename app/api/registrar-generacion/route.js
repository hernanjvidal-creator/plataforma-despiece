import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';

/**
 * POST /api/registrar-generacion
 * body: { modulo, userId }
 *
 * Registra en "generaciones_despiece" cada vez que alguien genera un
 * despiece (se llena desde el cliente, sin frenar la UI si falla). Pasa por
 * el servidor en vez de insertar directo desde el navegador únicamente para
 * poder leer el país del visitante desde el header de geolocalización de
 * Vercel (x-vercel-ip-country) — el navegador no tiene forma simple/gratis
 * de saber esto por sí solo.
 */
export async function POST(request) {
  if (!supabaseAdminConfigurado) {
    return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON' }, { status: 400 });
  }

  const pais = request.headers.get('x-vercel-ip-country') || null;

  const { error } = await supabaseAdmin.from('generaciones_despiece').insert({
    user_id: body.userId || null,
    modulo: body.modulo || null,
    pais,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
