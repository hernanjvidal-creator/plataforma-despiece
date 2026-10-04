// Cumplimiento de un pedido hecho sin cuenta: cuando el pago se confirma, se
// busca (o se crea) la cuenta con el correo del comprador y se le asignan el
// pedido y el mueble. Es idempotente: si Lemon Squeezy reenvía el webhook, no
// duplica nada. Solo para uso del servidor (usa service role).

import { supabaseAdmin } from './supabaseAdmin';

async function buscarUsuarioPorCorreo(email) {
  const { data } = await supabaseAdmin.rpc('usuario_id_por_correo', { p_email: email });
  return data || null;
}

export async function cumplirPedidoInvitado(pedidoId, emailComprador) {
  const email = (emailComprador || '').trim().toLowerCase();
  if (!email) throw new Error('El pago no trae el correo del comprador');

  const { data: pedido, error: errPedido } = await supabaseAdmin
    .from('pedidos').select('id, user_id').eq('id', pedidoId).single();
  if (errPedido) throw errPedido;
  if (pedido.user_id) return { yaCumplido: true };

  let userId = await buscarUsuarioPorCorreo(email);
  let cuentaNueva = false;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { origen: 'compra_invitado' },
    });
    if (error) {
      // Carrera: otro proceso pudo crearla justo antes.
      userId = await buscarUsuarioPorCorreo(email);
      if (!userId) throw error;
    } else {
      userId = data.user.id;
      cuentaNueva = true;
    }
  }

  // Solo se reclama si sigue sin dueño (así dos ejecuciones no se pisan).
  const { data: reclamado, error: errReclamo } = await supabaseAdmin
    .from('pedidos')
    .update({ user_id: userId, email_comprador: email, cuenta_creada_en_compra: cuentaNueva })
    .eq('id', pedidoId)
    .is('user_id', null)
    .select('id');
  if (errReclamo) throw errReclamo;
  if (!reclamado || reclamado.length === 0) return { yaCumplido: true };

  await supabaseAdmin.from('pedido_items').update({ user_id: userId }).eq('pedido_id', pedidoId);

  const { data: items } = await supabaseAdmin
    .from('pedido_items')
    .select('id, nombre, modulo, parametros_congelados, opciones_corte, mueble_id')
    .eq('pedido_id', pedidoId);

  for (const item of items || []) {
    if (item.mueble_id) continue;
    const { data: mueble } = await supabaseAdmin
      .from('muebles')
      .insert({
        user_id: userId,
        nombre: item.nombre || 'Mueble',
        modulo: item.modulo,
        parametros: item.parametros_congelados,
        opciones_corte: item.opciones_corte || null,
      })
      .select('id')
      .single();
    if (mueble) {
      await supabaseAdmin.from('pedido_items').update({ mueble_id: mueble.id }).eq('id', item.id);
    }
  }

  return { cuentaNueva };
}
