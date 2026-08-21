import { NextResponse } from 'next/server';
import { generarDespiece as generarBajoCocina } from '@/lib/muebleBajoCocina';
import { generarDespiece as generarAltoCocina } from '@/lib/muebleAltoCocina';
import { generarDespiece as generarVanitorioBano } from '@/lib/vanitorioBano';
import { generarDespiece as generarCloset } from '@/lib/closet';
import { generarDespiece as generarEsquineroBajoCocina } from '@/lib/esquineroBajoCocina';
import { optimizarCorte } from '@/lib/optimizadorCorte';

const MOTORES = {
  bajo_cocina: generarBajoCocina,
  alto_cocina: generarAltoCocina,
  vanitorio_bano: generarVanitorioBano,
  closet: generarCloset,
  esquinero_bajo_cocina: generarEsquineroBajoCocina,
};

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

  const modulo = body.modulo || 'bajo_cocina';
  const motor = MOTORES[modulo];
  if (!motor) {
    return NextResponse.json({ error: `Módulo desconocido: ${modulo}` }, { status: 400 });
  }

  try {
    const despiece = motor(body.parametros || {});
    const corte = optimizarCorte(despiece.piezas, body.opcionesCorte || { plancha: 'CL' });

    // Reflejar los empalmes (piezas divididas por no caber en una sola plancha)
    // en el listado de piezas y en el plano 3D, para que todo quede consistente
    // con el diagrama de corte.
    despiece.piezas = corte.piezas;
    if (corte.piezas.some(p => p.empalme)) {
      despiece.notas = [
        ...(despiece.notas || []),
        'Algunas piezas superan el ancho de una plancha y se dividieron automáticamente en segmentos (sufijo "_empalme_XdeY"); deben unirse en taller (prensa + refuerzo tipo dominó/tarugo) antes de instalar.',
      ];
    }

    return NextResponse.json({ despiece, corte });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
