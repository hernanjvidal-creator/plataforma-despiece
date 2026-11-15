import { generarDespiece as generarBajoCocina } from './muebleBajoCocina';
import { generarDespiece as generarAltoCocina } from './muebleAltoCocina';
import { generarDespiece as generarVanitorioBano } from './vanitorioBano';
import { generarDespiece as generarCloset } from './closet';
import { generarDespiece as generarDespensa } from './despensa';
import { generarDespiece as generarVelador } from './velador';
import { generarDespiece as generarEscritorio } from './escritorio';
import { generarDespiece as generarLibrero } from './librero';
import { generarDespiece as generarBaul } from './baul';
import { optimizarCorte } from './optimizadorCorte';
import { resumirTapacantos } from './shared';

const MOTORES = {
  bajo_cocina: generarBajoCocina,
  alto_cocina: generarAltoCocina,
  vanitorio_bano: generarVanitorioBano,
  closet: generarCloset,
  despensa: generarDespensa,
  velador: generarVelador,
  escritorio: generarEscritorio,
  librero: generarLibrero,
  baul: generarBaul,
};

// Lógica compartida entre /api/despiece (formulario del configurador) y
// /api/mueble-publico/[id] (link de solo lectura para compartir) — ambos
// necesitan exactamente el mismo despiece + diagrama de corte a partir de
// un modulo y sus parámetros, así que viven en un solo lugar para no
// desalinearse si se agrega un módulo nuevo o cambia el criterio de nesting.
export function generarDespiecePorModulo(modulo, parametros, opcionesCorte = { plancha: 'CL' }) {
  const motor = MOTORES[modulo];
  if (!motor) {
    throw new Error(`Módulo desconocido: ${modulo}`);
  }

  const despiece = motor(parametros || {});
  const corte = optimizarCorte(despiece.piezas, opcionesCorte || { plancha: 'CL' });

  // Reflejar los empalmes (piezas divididas por no caber en una sola plancha)
  // en el listado de piezas y en el plano 3D, para que todo quede consistente
  // con el diagrama de corte.
  despiece.piezas = corte.piezas;
  // Metros de tapacanto: se calculan acá, una sola vez para todos los
  // muebles, sobre la lista final de piezas.
  despiece.tapacantos = resumirTapacantos(despiece.piezas);
  if (corte.piezas.some(p => p.empalme)) {
    despiece.notas = [
      ...(despiece.notas || []),
      'Algunas piezas superan el ancho de una plancha y se dividieron automáticamente en partes (aparecen en el listado como "parte 1 de 2"); deben unirse en taller (prensa + refuerzo tipo dominó/tarugo) antes de instalar.',
    ];
  }

  return { despiece, corte };
}
