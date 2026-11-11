import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAdminConfigurado } from '@/lib/supabaseAdmin';
import { resolverDespiece } from '@/lib/accesoDespiece';

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
 * el dueño lo marque como compartido explícitamente. Solo funciona para
 * muebles ya comprados, y muestra el diseño tal como quedó al comprarlo (ver
 * lib/accesoDespiece.js).
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
    const acceso = await resolverDespiece({
      muebleId: id,
      modulo: data.modulo,
      parametros: data.parametros,
      opcionesCorte: data.opciones_corte || undefined,
    });
    if (!acceso.completo) {
      return NextResponse.json(
        { error: 'El link para compartir este mueble se habilita una vez que se compra el despiece.' },
        { status: 403 }
      );
    }
    return NextResponse.json({ nombre: data.nombre, modulo: acceso.modulo, despiece: acceso.despiece, corte: acceso.corte });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
