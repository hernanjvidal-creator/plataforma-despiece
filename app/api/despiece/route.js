import { NextResponse } from 'next/server';
import { resolverDespiece } from '@/lib/accesoDespiece';

/**
 * POST /api/despiece
 * body: { modulo, parametros, opcionesCorte, muebleId?, accessToken? }
 *
 * Devuelve el despiece (piezas + herrajes + posiciones 3D) y el resultado del
 * nesting, más `completo`:
 *   - true: medidas exactas y diagrama de corte. Solo si `muebleId` es un
 *     mueble ya comprado (o la sesión es la de administración).
 *   - false: vista previa para dibujar el 3D — medidas alteradas y sin
 *     diagrama de corte. Ver lib/accesoDespiece.js.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON' }, { status: 400 });
  }

  try {
    const { completo, despiece, corte } = await resolverDespiece({
      muebleId: body.muebleId,
      accessToken: body.accessToken,
      modulo: body.modulo,
      parametros: body.parametros,
      opcionesCorte: body.opcionesCorte,
    });
    return NextResponse.json({ despiece, corte, completo });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
