/**
 * MOTOR DE REGLAS — Baúl
 * ------------------------------------------------------------
 * Caja cerrada por los 4 lados — a diferencia del resto de los módulos,
 * acá no hay puerta: el único acceso es la tapa de arriba. Toda la
 * estructura va en un solo color de melamina (no hay distinción
 * interior/exterior como en un mueble con puertas).
 *
 * Orden de armado en profundidad (de atrás hacia adelante): el lateral
 * trasero es la pieza más al fondo, los dos laterales van por delante de
 * él (tapando su canto), y el frente va por delante de los laterales
 * (tapando el canto de ambos) — así ninguna pieza queda con un corte a la
 * vista, salvo el borde inferior de las 4 (no hay zócalo: el mueble va
 * sobre patas que el cliente elige aparte, sin afectar estas medidas).
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso)
 *   z: profundidad (0 = fondo/trasero, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 400,        // alto exterior (patas aparte, no incluidas en esta medida)
  P: 400,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  colorExterior: 'blanco', // única melamina — toda la estructura va de este color
};

// mm que la tapa sobresale por delante del frente, para poder tomarla de
// esa punta y levantarla — por detrás queda a ras del lateral trasero.
const OVERHANG_TAPA = 10;

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezaPiso(p),
    ...piezaTapa(p),
  ];

  return {
    modulo: 'baul',
    parametros: p,
    piezas,
    herrajes: generarHerrajes(p),
    notas: generarNotas(),
    resumen: resumirPlanchas(piezas),
  };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  if (p.A < 50 || p.A > 2000) throw new Error('Ancho (A) fuera de rango 50-2000mm');
  if (p.H < 50 || p.H > 1500) throw new Error('Alto (H) fuera de rango 50-1500mm');
  if (p.P < 50 || p.P > 1500) throw new Error('Profundidad (P) fuera de rango 50-1500mm');
}

// ---------- 1. Cuerpo: trasero + laterales + frente ----------
// Cada pieza tapa el canto de la anterior, por eso los laterales quedan
// más cortos en profundidad (entre las caras internas del trasero y el
// frente) en vez de correr todo el fondo como en los demás módulos.
function piezasCuerpo(p) {
  const { A, H, P, e, colorExterior } = p;

  return [
    {
      id: 'lateral_trasero',
      ancho: A, alto: H, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'lateral_izq',
      ancho: P - 2 * e, alto: H, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: e },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P - 2 * e, alto: H, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: 0, z: e },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'frente',
      ancho: A, alto: H, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: P - e },
      rotacion: 'vertical_frontal',
    },
  ];
}

// ---------- 2. Piso ----------
// Queda por dentro de los 4 laterales (no corre por debajo de ellos).
function piezaPiso(p) {
  const { A, P, e, colorExterior } = p;
  return [{
    id: 'piso',
    ancho: A - 2 * e, alto: P - 2 * e, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: e, y: 0, z: e },
    rotacion: 'horizontal',
  }];
}

// ---------- 3. Tapa ----------
// Va justo encima de todo el cuerpo, a todo lo ancho. Por detrás queda a
// ras del lateral trasero (sin volar); por delante sobresale OVERHANG_TAPA
// mm más allá del frente.
function piezaTapa(p) {
  const { A, H, P, e, colorExterior } = p;
  return [{
    id: 'tapa',
    ancho: A, alto: P + OVERHANG_TAPA, espesor: e,
    cantos: ['todos'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y: H, z: 0 },
    rotacion: 'horizontal',
  }];
}

// ---------- 4. Herrajes ----------
function generarHerrajes(p) {
  const bisagras = p.A > 900 ? 3 : 2;
  return [
    { tipo: 'pata_regulable', cantidad: 4 },
    { tipo: 'bisagra_codo_cierre_suave', cantidad: bisagras },
    { tipo: 'tornillo_confirmat', cantidad: 8 },
    { tipo: 'tarugo_minifix', cantidad: 8 },
  ];
}

// ---------- 5. Notas de producción ----------
function generarNotas() {
  return [
    'Las patas no están incluidas como pieza de melamina — se compran aparte, de la altura que el cliente prefiera, y no afectan ninguna de las medidas de este despiece.',
    'La tapa va montada sobre bisagras interiores de cierre suave, iguales a las de una puerta de mueble de cocina — se fijan entre el borde trasero de la tapa y el lateral trasero.',
  ];
}

export { generarDespiece };
