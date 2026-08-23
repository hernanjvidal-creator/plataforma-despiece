import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { crearCheckoutLemonSqueezy, lemonsqueezyConfigurado } from '@/lib/lemonsqueezy';

const PRECIO_DESPIECE_CLP = Number(process.env.LEMONSQUEEZY_PRECIO_CLP || 0);

/**
 * POST /api/checkout
 * body: { accessToken, muebleId, nombre, modulo, parametros }
 *
 * Crea un pedido "pendiente" en Supabase y devuelve la URL de checkout de
 * Lemon Squeezy para ese pedido. El pedido queda "pagado" recién cuando
 * llega la confirmación por /api/webhook/lemonsqueezy — este endpoint NO
 * marca nada como pagado.
 */
export async function POST(request) {
  if (!supabaseAdminConfigurado || !lemonsqueezyConfigurado) {
    return NextResponse.json({ error: 'Pagos no configurados en el servidor todavía' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { accessToken, muebleId, nombre, modulo, parametros } = body;
  if (!accessToken) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!modulo || !parametros) {
    return NextResponse.json({ error: 'Faltan datos del mueble' }, { status: 400 });
  }

  const { data: { user }, error: errUser } = await supabase.auth.getUser(accessToken);
  if (errUser || !user) {
    return NextResponse.json({ error: 'Sesión inválida, vuelve a iniciar sesión' }, { status: 401 });
  }

  try {
    const { data: pedido, error: errPedido } = await supabaseAdmin
      .from('pedidos')
      .insert({ user_id: user.id, estado: 'pendiente', total: PRECIO_DESPIECE_CLP })
      .select()
      .single();
    if (errPedido) throw errPedido;

    const { error: errItem } = await supabaseAdmin.from('pedido_items').insert({
      pedido_id: pedido.id,
      user_id: user.id,
      mueble_id: muebleId || null,
      nombre: nombre || 'Mueble',
      modulo,
      parametros_congelados: parametros,
      precio: PRECIO_DESPIECE_CLP,
    });
    if (errItem) throw errItem;

    const origen = new URL(request.url).origin;
    const redirectUrl = `${origen}/configurador?pedidoPago=${pedido.id}${muebleId ? `&muebleId=${muebleId}` : ''}`;

    const checkoutUrl = await crearCheckoutLemonSqueezy({
      email: user.email,
      redirectUrl,
      customData: { pedido_id: pedido.id },
    });

    return NextResponse.json({ checkoutUrl, pedidoId: pedido.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
