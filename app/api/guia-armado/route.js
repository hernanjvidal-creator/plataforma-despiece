import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { crearGuiaArmadoPdf } from '@/lib/GuiaArmadoDocument';

/**
 * GET /api/guia-armado
 * Descarga pública (sin login) del PDF genérico de armado — igual para
 * cualquier mueble, no depende de un despiece específico.
 */
export async function GET() {
  try {
    const buffer = await renderToBuffer(crearGuiaArmadoPdf());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="guia_general_de_armado.pdf"',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
