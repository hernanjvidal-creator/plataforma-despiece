import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { crearManualArmadoPdf } from '@/lib/ManualArmadoDocument';

/**
 * POST /api/manual-armado
 * body: { nombre, modulo, despiece }
 *
 * Genera el manual de armado PERSONALIZADO para un despiece ya calculado
 * por el cliente — a diferencia de /api/guia-armado (genérico, igual para
 * cualquier mueble), este solo incluye las secciones que aplican a las
 * piezas y herrajes reales de este diseño. No consulta la base de datos:
 * solo formatea lo que se le manda.
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
      crearManualArmadoPdf({
        nombre: body.nombre || 'Mueble',
        modulo: body.modulo,
        despiece: body.despiece,
      })
    );

    const nombreArchivo = (body.nombre || 'mueble').replace(/[^a-z0-9]+/gi, '_').toLowerCase();

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
