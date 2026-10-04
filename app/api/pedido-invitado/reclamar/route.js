import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';

/**
 * POST /api/pedido-invitado/reclamar
 * body: { pedidoId, token }
 *
 * Lo llama la página a la que vuelve el cliente después de pagar sin cuenta.
 * Si el pedido ya está pagado y la cuenta se creó justamente en esta compra,
 * devuelve un código de un solo uso para iniciar sesión en este navegador sin
 * pedirle nada. Si el correo ya tenía cuenta NO se inicia sesión (así nadie
 * puede entrar a una cuenta ajena escribiendo su correo en un pago): se le
 * pide iniciar sesión normalmente.
 */
export async function POST(request) {
  if (!supabaseAdminConfigurado) {
    return NextResponse.json({ error: 'Servidor no configurado' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { pedidoId, token } = body || {};
  if (typeof pedidoId !== 'string' || typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const { data: pedido } = await supabaseAdmin
    .from('pedidos')
    .select('id, user_id, estado, guest_token, email_comprador, cuenta_creada_en_compra')
    .eq('id', pedidoId)
    .single();

  const tokenGuardado = pedido?.guest_token || '';
  const a = Buffer.from(token);
  const b = Buffer.from(tokenGuardado);
  const tokenValido = tokenGuardado.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!pedido || !tokenValido) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  // El pago o la creación de la cuenta todavía no terminan: que reintente.
  if (pedido.estado !== 'pagado' || !pedido.user_id) {
    return NextResponse.json({ estado: 'esperando' });
  }

  const olvidarToken = () =>
    supabaseAdmin.from('pedidos').update({ guest_token: null }).eq('id', pedido.id);

  if (!pedido.cuenta_creada_en_compra) {
    await olvidarToken();
    return NextResponse.json({ estado: 'cuenta_existente', correo: enmascarar(pedido.email_comprador) });
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: pedido.email_comprador,
  });
  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    return NextResponse.json({ error: 'No se pudo iniciar la sesión' }, { status: 500 });
  }

  await olvidarToken();
  return NextResponse.json({ estado: 'listo', hashedToken });
}

function enmascarar(correo) {
  if (!correo) return '';
  const [usuario, dominio] = correo.split('@');
  return `${usuario.slice(0, 1)}***@${dominio}`;
}
