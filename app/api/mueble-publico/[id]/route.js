import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { generarDespiecePorModulo } from '@/lib/generarDespiecePorModulo';

/**
 * GET /api/mueble-publico/[id]
 *
 * Endpoint PÚBLICO (sin login) para el link de "compartir" de un mueble
 * guardado — pensado para que el cliente se lo pase a un maestro externo que
 * le está armando el mueble, sin que ese maestro necesite una cuenta.
 *
 * Usa supabaseAdmin (service_role) porque la tabla `muebles` tiene RLS que
 * solo deja ver el mueble a su dueño (auth.uid() = user_id) — acá el
 * servidor lee el registro sin sesión y solo devuelve lo necesario para
 * armar el plano 3D (nombre, modulo, despiece), nunca el user_id ni otros
 * datos de la cuenta. Cualquiera que tenga el link puede ver el mueble
 * (como un link de Google Docs "cualquiera con el enlace") — no requiere que
 * el dueño lo marque como compartido explícitamente.
 */
export async function GET(request, { params }) {
  const { id } = await params;

  if (!supabaseAdminConfigurado) {
    return NextResponse.json({ error: 'Servicio no configurado' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('muebles')
    .select('nombre, modulo, parametros, opciones_corte')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'No se encontró ese mueble' }, { status: 404 });
  }

  try {
    const { despiece, corte } = generarDespiecePorModulo(data.modulo, data.parametros, data.opciones_corte || undefined);
    return NextResponse.json({ nombre: data.nombre, modulo: data.modulo, despiece, corte });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
