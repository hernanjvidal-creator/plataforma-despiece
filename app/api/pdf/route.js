import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { crearDocumentoPdf } from '@/lib/PdfDocument';
import { resolverDespiece } from '@/lib/accesoDespiece';

/**
 * POST /api/pdf
 * body: { muebleId?, accessToken?, modulo?, parametros?, opcionesCorte?, nombre?, imagen3D? }
 *
 * Genera el PDF de entrega (plano 3D + listado de piezas + herrajes +
 * diagrama de corte). El despiece se calcula acá, en el servidor, y solo si
 * corresponde entregar el exacto (mueble comprado o cuenta de administración
 * — ver lib/accesoDespiece.js): antes se formateaba el despiece que mandara
 * el navegador, sin revisar nada.
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
    return NextResponse.json({ error: 'El PDF se habilita una vez que compras el despiece de este mueble.' }, { status: 403 });
  }

  try {
    const nombre = body.nombre || acceso.nombre || 'Mueble';
    const buffer = await renderToBuffer(
      crearDocumentoPdf({
        nombre,
        modulo: acceso.modulo,
        despiece: acceso.despiece,
        corte: acceso.corte,
        imagen3D: body.imagen3D,
      })
    );

    const nombreArchivo = String(nombre).replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="despiece_${nombreArchivo}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
