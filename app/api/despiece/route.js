import { NextResponse } from 'next/server';
import { generarDespiecePorModulo } from '@/lib/generarDespiecePorModulo';

/**
 * POST /api/despiece
 * body: { modulo: 'bajo_cocina' | 'alto_cocina' | 'vanitorio_bano', parametros: {...}, opcionesCorte: {...} }
 *
 * Devuelve el despiece completo (piezas + herrajes + posiciones 3D)
 * y el resultado del nesting (diagrama de corte por plancha).
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido, se esperaba JSON' }, { status: 400 });
  }

  try {
    const { despiece, corte } = generarDespiecePorModulo(
      body.modulo || 'bajo_cocina',
      body.parametros,
      body.opcionesCorte
    );
    return NextResponse.json({ despiece, corte });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
