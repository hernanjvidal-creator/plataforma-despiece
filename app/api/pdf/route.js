import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { crearDocumentoPdf } from '@/lib/PdfDocument';

/**
 * POST /api/pdf
 * body: { nombre, modulo, despiece, corte, imagen3D (dataURL base64, opcional) }
 *
 * Genera el PDF de entrega (plano 3D + listado de piezas + herrajes +
 * diagrama de corte) a partir de un despiece ya calculado por el cliente.
 * No consulta la base de datos: solo formatea lo que se le manda.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON' }, { status: 400 });
  }

  if (!body.despiece) {
    return NextResponse.json({ error: 'Falta "despiece" en la solicitud' }, { status: 400 });
  }

  try {
    const buffer = await renderToBuffer(
      crearDocumentoPdf({
        nombre: body.nombre || 'Mueble',
        modulo: body.modulo,
        despiece: body.despiece,
        corte: body.corte,
        imagen3D: body.imagen3D,
      })
    );

    const nombreArchivo = (body.nombre || 'despiece').replace(/[^a-z0-9]+/gi, '_').toLowerCase();

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
