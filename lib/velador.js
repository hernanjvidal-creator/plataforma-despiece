/**
 * MOTOR DE REGLAS — Velador (mesita de noche)
 * ------------------------------------------------------------
 * Mueble chico y simple: 1 cajón arriba + un compartimento abajo que puede
 * ser puerta (cerrado), repisa fija (abierto con una repisa) o abierto sin
 * nada. Va apoyado bajo en 4 topes plásticos redondos (no en patas
 * regulables como los muebles de piso más grandes): es liviano y chico, así
 * que no necesita nivelación — solo evitar que raye el piso al arrastrarlo
 * y ganar algo de agarre.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes } from './shared';

const DEFAULTS = {
  A: 450,        // ancho exterior
  H: 500,        // alto exterior del cuerpo (apoyado en topes bajos, sin zócalo)
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

// Profundidad real del cuerpo (laterales/piso/caja de cajón), descontando el
// espesor de la puerta de la profundidad TOTAL que ingresa el cliente: la
// puerta/frente se monta por delante del borde del cuerpo, así que si el
// cuerpo también midiera P completo, el mueble terminado (cuerpo + frente)
// quedaría espesorPuertas mm más profundo que lo que el cliente pidió.
function profundidadCuerpo(p) {
  return p.P - p.espesorPuertas;
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
  notas.push('Pega los 4 topes plásticos redondos (10-20mm) bajo el mueble, uno en cada esquina, antes de ponerlo en su lugar final — así no raya el piso al moverlo y queda un poco más estable.');

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
  const { A, e, colorInterior, colorExterior } = p;
  const H = alturaCuerpo(p);
  const P = profundidadCuerpo(p);

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
      ancho: A - 2 * e, alto: P, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'techo',
      ancho: A - 2 * e, alto: P, espesor: e,
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
    material: 'MDF',
    posicion: { x: e - 8, y: e - 8, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Cajón superior (frente + caja) ----------
// Estilo "overlay" moderno (igual que muebleBajoCocina.js): el frente llega
// a ras de los dos bordes exteriores del velador (x=0 y x=A).
function piezaFrenteCajon(p, y) {
  const { A, e, colorExterior } = p;
  return [{
    id: 'frente_cajon_1',
    ancho: A, alto: ALTURA_CAJON, espesor: e,
    cantos: ['todos'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y, z: profundidadCuerpo(p) },
    rotacion: 'vertical_frontal',
    grupo: 'cajon_1',
  }];
}

function piezasCajaCajon(p, y) {
  const { A, e, correderaTipo, colorInterior } = p;
  const P = profundidadCuerpo(p);
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
      ancho: anchoCaja, alto: P - 50, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + descuentoAncho / 2 + e, y, z: 50 },
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
      ancho: A, alto: alturaZona, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: yInferiorZona, z: profundidadCuerpo(p) },
      rotacion: 'vertical_frontal',
    }];
  }

  if (p.tipoInferior === 'repisa') {
    const y = yInferiorZona + alturaZona / 2;
    return [{
      id: 'repisa_1',
      ancho: A - 2 * e - 4, alto: profundidadCuerpo(p) - 20, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: 0 },
      rotacion: 'horizontal',
    }];
  }

  return []; // 'abierto': compartimento a la vista, sin nada más
}

// ---------- 5. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];

  const correderaId = p.correderaTipo === 'bola'
    ? `corredera_bola_${Math.round(profundidadCuerpo(p) - 60)}mm`
    : `corredera_oculta_${Math.round(profundidadCuerpo(p) - 60)}mm`;
  herrajes.push({ tipo: correderaId, cantidad: 1, unidad: 'par' });
  herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: 1 });

  if (p.tipoInferior === 'puerta') {
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: 2 });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: 1 });
  } else if (p.tipoInferior === 'repisa') {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: 4 });
  }

  herrajes.push({ tipo: 'tope_plastico_redondo', cantidad: 4 });
  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 8 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
