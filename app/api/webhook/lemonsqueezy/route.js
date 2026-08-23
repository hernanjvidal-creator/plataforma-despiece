import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';

/**
 * POST /api/webhook/lemonsqueezy
 *
 * Lemon Squeezy manda acá la confirmación de cada compra. Cualquiera puede
 * mandar un POST a esta URL, así que lo primero es verificar la firma
 * (X-Signature = HMAC-SHA256 del body crudo con el webhook signing secret)
 * antes de confiar en el contenido.
 *
 * Solo nos importa "order_created" con status "paid" — es lo único que
 * vendemos hoy (compra única del despiece detallado, no suscripciones).
 */
export async function POST(request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !supabaseAdminConfigurado) {
    return NextResponse.json({ error: 'Webhook no configurado en el servidor' }, { status: 503 });
  }

  const rawBody = await request.text();
  const firmaRecibida = Buffer.from(request.headers.get('x-signature') || '', 'hex');
  const firmaEsperada = Buffer.from(
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex'),
    'hex'
  );

  const firmaValida =
    firmaRecibida.length > 0 &&
    firmaRecibida.length === firmaEsperada.length &&
    crypto.timingSafeEqual(firmaRecibida, firmaEsperada);

  if (!firmaValida) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const evento = payload?.meta?.event_name;
  const pedidoId = payload?.meta?.custom_data?.pedido_id;
  const estadoOrden = payload?.data?.attributes?.status;
  const lemonsqueezyOrderId = payload?.data?.id;

  if (evento === 'order_created' && pedidoId && estadoOrden === 'paid') {
    const { error } = await supabaseAdmin
      .from('pedidos')
      .update({
        estado: 'pagado',
        paid_at: new Date().toISOString(),
        lemonsqueezy_order_id: lemonsqueezyOrderId ? String(lemonsqueezyOrderId) : null,
      })
      .eq('id', pedidoId)
      .eq('estado', 'pendiente');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
