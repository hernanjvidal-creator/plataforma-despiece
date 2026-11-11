import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { crearManualArmadoPdf } from '@/lib/ManualArmadoDocument';
import { resolverDespiece } from '@/lib/accesoDespiece';

/**
 * POST /api/manual-armado
 * body: { muebleId?, accessToken?, modulo?, parametros?, opcionesCorte?, nombre? }
 *
 * Genera el manual de armado PERSONALIZADO de un mueble — a diferencia de
 * /api/guia-armado (genérico, igual para cualquier mueble), este solo incluye
 * las secciones que aplican a las piezas y herrajes reales de ese diseño.
 * Trae las medidas de cada pieza, así que se entrega con el mismo criterio
 * que el PDF de despiece: el servidor calcula el despiece y solo si
 * corresponde el exacto (ver lib/accesoDespiece.js).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON' }, { status: 400 });
  }

  let acceso;
  try {
    acceso = await resolverDespiece({
      muebleId: body.muebleId,
      accessToken: body.accessToken,
      modulo: body.modulo,
      parametros: body.parametros,
      opcionesCorte: body.opcionesCorte,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  if (!acceso.completo) {
    return NextResponse.json({ error: 'El manual de armado se habilita una vez que compras el despiece de este mueble.' }, { status: 403 });
  }

  try {
    const nombre = body.nombre || acceso.nombre || 'Mueble';
    const buffer = await renderToBuffer(
      crearManualArmadoPdf({
        nombre,
        modulo: acceso.modulo,
        despiece: acceso.despiece,
      })
    );

    const nombreArchivo = String(nombre).replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="manual_armado_${nombreArchivo}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
