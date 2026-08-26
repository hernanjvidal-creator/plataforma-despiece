/**
 * MOTOR DE REGLAS — Velador (mesita de noche)
 * ------------------------------------------------------------
 * Mueble chico y simple: 1 cajón arriba + un compartimento abajo que puede
 * ser puerta (cerrado), repisa fija (abierto con una repisa) o abierto sin
 * nada. Va siempre sobre patas expuestas (sin zócalo que las tape).
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 450,        // ancho exterior
  H: 500,        // alto exterior del cuerpo (patas expuestas, sin zócalo)
  P: 400,        // profundidad exterior
  e: 15,         // espesor tablero estructural y del cajón
  espesorPuertas: 15, // espesor de la puerta — 15 (estándar) o 18 (opcional)
  tipoInferior: 'puerta', // 'puerta' | 'repisa' | 'abierto'
  correderaTipo: 'bola',
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const ALTURA_CAJON = 150; // mm de altura de frente del cajón superior
const GAP = 3;            // mm de holgura entre piezas de frente

function alturaCuerpo(p) {
  return p.H;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  const H = alturaCuerpo(p);
  const yCajon = H - GAP - ALTURA_CAJON;
  const ySuperiorZonaInferior = yCajon - GAP;

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezaFrenteCajon(p, yCajon),
    ...piezasCajaCajon(p, yCajon),
    ...piezasZonaInferior(p, ySuperiorZonaInferior),
  ];

  const notas = [];
  if (p.espesorPuertas !== p.e && p.tipoInferior === 'puerta') {
    notas.push(`Puerta en ${p.espesorPuertas}mm (más gruesa que el resto del cuerpo, en ${p.e}mm) — queda en un grupo de material aparte para el corte.`);
  }

  const herrajes = generarHerrajes(p);

  return {
    modulo: 'velador',
    parametros: p,
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  if (p.A < 50 || p.A > 2000) throw new Error('Ancho (A) fuera de rango 50-2000mm');
  if (p.H < 50 || p.H > 1500) throw new Error('Alto (H) fuera de rango 50-1500mm');
  if (p.P < 50 || p.P > 1500) throw new Error('Profundidad (P) fuera de rango 50-1500mm');
  if (!['puerta', 'repisa', 'abierto'].includes(p.tipoInferior)) {
    throw new Error('tipoInferior debe ser "puerta", "repisa" o "abierto"');
  }
  const H = alturaCuerpo(p);
  if (H - GAP - ALTURA_CAJON - GAP < 100) {
    throw new Error(`Con un cajón de ${ALTURA_CAJON}mm no queda espacio suficiente abajo. Sube el alto (H).`);
  }
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno).
function piezasCuerpo(p) {
  const { A, P, e, colorInterior, colorExterior } = p;
  const H = alturaCuerpo(p);

  return [
    {
      id: 'lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: A - 2 * e, alto: P - 20, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'techo',
      ancho: A - 2 * e, alto: P - 20, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
  ];
}

// ---------- 2. Respaldo ----------
function piezasRespaldo(p) {
  const { A, e } = p;
  const H = alturaCuerpo(p);
  return [{
    id: 'respaldo',
    ancho: A - 2 * e + 16, alto: H - 2 * e + 16, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'HDF',
    posicion: { x: e - 8, y: e - 8, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Cajón superior (frente + caja) ----------
function piezaFrenteCajon(p, y) {
  const { A, e, colorExterior } = p;
  return [{
    id: 'frente_cajon_1',
    ancho: A - 4, alto: ALTURA_CAJON, espesor: e,
    cantos: ['todos'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 2, y, z: p.P },
    rotacion: 'vertical_frontal',
    grupo: 'cajon_1',
  }];
}

function piezasCajaCajon(p, y) {
  const { A, P, e, correderaTipo, colorInterior } = p;
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const altoInterior = ALTURA_CAJON - 30;
  const anchoCaja = A - 2 * e - descuentoAncho;

  return [
    {
      id: 'cajon1_costado_izq',
      ancho: P - 50, alto: altoInterior, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + descuentoAncho / 2, y, z: 50 },
      rotacion: 'vertical_profundidad',
      grupo: 'cajon_1',
    },
    {
      id: 'cajon1_costado_der',
      ancho: P - 50, alto: altoInterior, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: A - e - descuentoAncho / 2 - e, y, z: 50 },
      rotacion: 'vertical_profundidad',
      grupo: 'cajon_1',
    },
    {
      id: 'cajon1_frente_caja',
      ancho: anchoCaja, alto: altoInterior, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + descuentoAncho / 2 + e, y, z: 50 },
      rotacion: 'vertical_frontal',
      grupo: 'cajon_1',
    },
    {
      id: 'cajon1_trasera_caja',
      ancho: anchoCaja, alto: altoInterior, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + descuentoAncho / 2 + e, y, z: P - 30 },
      rotacion: 'vertical_frontal',
      grupo: 'cajon_1',
    },
    {
      id: 'cajon1_fondo',
      ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
      cantos: [],
      cantidad: 1,
      material: 'HDF',
      posicion: { x: e + descuentoAncho / 2 - 8, y: y + 15, z: 50 - 8 },
      rotacion: 'horizontal',
      grupo: 'cajon_1',
    },
  ];
}

// ---------- 4. Compartimento inferior: puerta, repisa fija o abierto ----------
function piezasZonaInferior(p, ySuperiorZona) {
  const { A, e, colorExterior, colorInterior } = p;
  const yInferiorZona = e;
  const alturaZona = ySuperiorZona - yInferiorZona;

  if (p.tipoInferior === 'puerta') {
    return [{
      id: 'puerta_1',
      ancho: A - 4, alto: alturaZona, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 2, y: yInferiorZona, z: p.P },
      rotacion: 'vertical_frontal',
    }];
  }

  if (p.tipoInferior === 'repisa') {
    const y = yInferiorZona + alturaZona / 2;
    return [{
      id: 'repisa_1',
      ancho: A - 2 * e - 4, alto: p.P - 40, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: 20 },
      rotacion: 'horizontal',
    }];
  }

  return []; // 'abierto': compartimento a la vista, sin nada más
}

// ---------- 5. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];

  const correderaId = p.correderaTipo === 'bola'
    ? `corredera_bola_${Math.round(p.P - 60)}mm`
    : `corredera_oculta_${Math.round(p.P - 60)}mm`;
  herrajes.push({ tipo: correderaId, cantidad: 1, unidad: 'par' });
  herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: 1 });

  if (p.tipoInferior === 'puerta') {
    herrajes.push({ tipo: 'bisagra_codo', cantidad: 2 });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: 1 });
  } else if (p.tipoInferior === 'repisa') {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: 4 });
  }

  herrajes.push({ tipo: 'pata_regulable', cantidad: 4 });
  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 });

  return herrajes;
}

export { generarDespiece };
