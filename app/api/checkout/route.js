import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { crearCheckoutLemonSqueezy, lemonsqueezyConfigurado } from '@/lib/lemonsqueezy';

// Solo informativo (queda guardado en pedidos/pedido_items) — lo que
// realmente cobra Lemon Squeezy lo define la variante en su propio dashboard.
const PRECIO_DESPIECE_USD = Number(process.env.LEMONSQUEEZY_PRECIO_USD || 0);

/**
 * POST /api/checkout
 *
 * Dos formas de uso:
 *  - Un solo mueble (el que se está editando en el configurador, guardado o
 *    no): body: { accessToken, muebleId?, nombre, modulo, parametros }
 *  - Carrito de varios muebles ya guardados (desde "Mis muebles"):
 *    body: { accessToken, muebleIds: [id1, id2, ...] }
 *
 * En ambos casos crea UN pedido "pendiente" en Supabase (con uno o varios
 * pedido_items) y devuelve la URL de checkout de Lemon Squeezy, cobrando
 * cantidad × precio. El pedido queda "pagado" recién cuando llega la
 * confirmación por /api/webhook/lemonsqueezy — este endpoint NO marca nada
 * como pagado.
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

  const { accessToken, muebleId, nombre, modulo, parametros, muebleIds } = body;
  if (!accessToken) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const esCarrito = Array.isArray(muebleIds) && muebleIds.length > 0;
  if (!esCarrito && (!modulo || !parametros)) {
    return NextResponse.json({ error: 'Faltan datos del mueble' }, { status: 400 });
  }

  const { data: { user }, error: errUser } = await supabase.auth.getUser(accessToken);
  if (errUser || !user) {
    return NextResponse.json({ error: 'Sesión inválida, vuelve a iniciar sesión' }, { status: 401 });
  }

  try {
    // Arma la lista de items a cobrar: o el mueble único que llega en el
    // body (config actual, puede no estar guardado todavía), o los muebles
    // ya guardados del carrito (se releen de Supabase, nunca se confía en
    // datos de precio/contenido que mande el cliente para algo ya guardado).
    let items;
    if (esCarrito) {
      const idsUnicos = [...new Set(muebleIds)];
      const { data: muebles, error: errMuebles } = await supabaseAdmin
        .from('muebles')
        .select('id, nombre, modulo, parametros')
        .eq('user_id', user.id)
        .in('id', idsUnicos);
      if (errMuebles) throw errMuebles;
      if (!muebles || muebles.length !== idsUnicos.length) {
        return NextResponse.json({ error: 'Algunos muebles del carrito no existen o no son tuyos' }, { status: 400 });
      }

      const yaPagados = await idsYaPagados(idsUnicos, user.id);
      if (yaPagados.size > 0) {
        return NextResponse.json({ error: 'Algunos muebles del carrito ya fueron comprados — recarga "Mis muebles" antes de reintentar.' }, { status: 400 });
      }

      items = muebles.map(m => ({
        mueble_id: m.id,
        nombre: m.nombre,
        modulo: m.modulo,
        parametros_congelados: m.parametros,
      }));
    } else {
      items = [{
        mueble_id: muebleId || null,
        nombre: nombre || 'Mueble',
        modulo,
        parametros_congelados: parametros,
      }];
    }

    const total = PRECIO_DESPIECE_USD * items.length;
    const { data: pedido, error: errPedido } = await supabaseAdmin
      .from('pedidos')
      .insert({ user_id: user.id, estado: 'pendiente', total })
      .select()
      .single();
    if (errPedido) throw errPedido;

    const { error: errItems } = await supabaseAdmin.from('pedido_items').insert(
      items.map(item => ({
        pedido_id: pedido.id,
        user_id: user.id,
        mueble_id: item.mueble_id,
        nombre: item.nombre,
        modulo: item.modulo,
        parametros_congelados: item.parametros_congelados,
        precio: PRECIO_DESPIECE_USD,
      }))
    );
    if (errItems) throw errItems;

    const origen = new URL(request.url).origin;
    const redirectUrl = esCarrito
      ? `${origen}/mis-muebles?pedidoPago=${pedido.id}`
      : `${origen}/configurador?pedidoPago=${pedido.id}${muebleId ? `&muebleId=${muebleId}` : ''}`;

    const checkoutUrl = await crearCheckoutLemonSqueezy({
      email: user.email,
      redirectUrl,
      customData: { pedido_id: pedido.id },
      cantidad: items.length,
    });

    return NextResponse.json({ checkoutUrl, pedidoId: pedido.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// De una lista de mueble_id, cuáles ya tienen un pedido_item propio cuyo
// pedido esté "pagado" — para no dejar cobrar dos veces por el mismo mueble.
async function idsYaPagados(muebleIds, userId) {
  const { data: items } = await supabaseAdmin
    .from('pedido_items')
    .select('mueble_id, pedido_id')
    .eq('user_id', userId)
    .in('mueble_id', muebleIds);
  if (!items || items.length === 0) return new Set();

  const pedidoIds = [...new Set(items.map(i => i.pedido_id))];
  const { data: pedidosPagados } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .in('id', pedidoIds)
    .eq('estado', 'pagado');

  const pedidoIdsPagados = new Set((pedidosPagados || []).map(p => p.id));
  return new Set(items.filter(i => pedidoIdsPagados.has(i.pedido_id)).map(i => i.mueble_id));
}
