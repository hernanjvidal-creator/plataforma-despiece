import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';

const EVENTOS_VALIDOS = new Set([
  'desbloquear_clic',
  'login_para_comprar',
  'login_para_guardar',
  'compra_retomada',
  'checkout_redirigido',
  'mueble_guardado',
  'registro_completado',
  'vista_previa_3d',
]);

/**
 * POST /api/registrar-evento
 * body: { evento, modulo?, userId? }
 *
 * Registra un paso del embudo de compra en "eventos_embudo". Solo acepta
 * eventos de una lista cerrada, y nunca falla "en voz alta": si algo sale
 * mal, la compra del cliente no se ve afectada.
 */
export async function POST(request) {
  if (!supabaseAdminConfigurado) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!EVENTOS_VALIDOS.has(body?.evento)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('eventos_embudo').insert({
    evento: body.evento,
    modulo: typeof body.modulo === 'string' ? body.modulo.slice(0, 40) : null,
    user_id: typeof body.userId === 'string' ? body.userId : null,
    pais: request.headers.get('x-vercel-ip-country') || null,
  });

  return NextResponse.json({ ok: !error });
}
