// Helper de cliente (respeta RLS) para saber qué muebles guardados ya tienen
// su despiece pagado — así "Mis muebles" y el configurador no vuelven a
// cobrar por algo que el usuario ya compró.

import { supabase } from './supabaseClient';

/**
 * Devuelve el subconjunto de `muebleIds` que ya tienen al menos un
 * pedido_item asociado cuyo pedido esté en estado 'pagado'.
 */
export async function mueblesPagados(muebleIds) {
  const idsUnicos = [...new Set(muebleIds)].filter(Boolean);
  if (idsUnicos.length === 0) return new Set();

  const { data: items } = await supabase
    .from('pedido_items')
    .select('mueble_id, pedido_id')
    .in('mueble_id', idsUnicos);
  if (!items || items.length === 0) return new Set();

  const pedidoIds = [...new Set(items.map(i => i.pedido_id))];
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id')
    .in('id', pedidoIds)
    .eq('estado', 'pagado');

  const pedidoIdsPagados = new Set((pedidos || []).map(p => p.id));
  return new Set(
    items.filter(i => pedidoIdsPagados.has(i.pedido_id)).map(i => i.mueble_id)
  );
}

/** Atajo para consultar un solo mueble. */
export async function muebleEstaPagado(muebleId) {
  if (!muebleId) return false;
  const pagados = await mueblesPagados([muebleId]);
  return pagados.has(muebleId);
}
