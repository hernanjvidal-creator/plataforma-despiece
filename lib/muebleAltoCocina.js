/**
 * MOTOR DE REGLAS — Mueble Alto de Cocina (alacena, por módulos independientes)
 * ------------------------------------------------------------------
 * Mismo patrón que muebleBajoCocina.js: el mueble se arma como una lista de
 * MÓDULOS de izquierda a derecha, y cada módulo es una CAJA COMPLETAMENTE
 * INDEPENDIENTE (sus propios 2 laterales, piso, techo y travesaños) — no
 * comparten un divisor con el módulo vecino. Los módulos se atornillan
 * entre sí, lateral con lateral, y además CADA módulo se afirma a la pared
 * por su propio travesaño trasero — más seguro que depender de unos pocos
 * puntos de anclaje repartidos en un solo cuerpo largo.
 *
 * Diferencias respecto a mueble bajo de cocina:
 *   - Cuerpo cerrado arriba y abajo (piso + techo) porque no hay cubierta
 *     apoyada encima — no hay reserva de zócalo ni de cubierta en la altura.
 *   - Los travesaños (delantero y trasero) van en sentido VERTICAL (de
 *     canto), no horizontal — el trasero en particular es el punto real de
 *     fijación a la pared (se atornilla directo a los pies derechos del
 *     muro), y necesita seguir siendo un panel vertical sólido para eso.
 *   - No lleva patas ni zócalo (se cuelga de la pared).
 *   - Frentes: solo puertas (no cajones) con repisas interiores ajustables.
 *   - Un módulo con 2 puertas va SIN separador al medio — cada puerta
 *     hinge directo contra su propio lateral del módulo.
 *
 * Cada módulo trae su propio `ancho` (obligatorio) — no hay un "Ancho
 * total" del que repartir automáticamente (cada caja es independiente). El
 * ancho total del mueble es solo la suma de los anchos de sus módulos.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble completo (0 = borde izquierdo del primer módulo)
 *   y: altura (0 = piso de cada módulo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes, bisagrasPorAltura } from './shared';

const DEFAULTS = {
  H: 700,        // alto exterior del cuerpo
  P: 320,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  secciones: [
    { ancho: 600, nP: 2, nBaldas: 1 },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const ALTO_TRAVESANO = 100;

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametrosGlobales(p);
  validarSecciones(p.secciones);

  let piezas = [];
  let notas = [];
  let x = 0;
  let totalPuertas = 0;
  let totalBaldas = 0;

  p.secciones.forEach((seccion, i) => {
    const anchoModulo = seccion.ancho;
    const prefijo = `m${i + 1}_`;
    const r = generarModulo(p, seccion, anchoModulo);
    piezas.push(...r.piezas.map(pz => trasladarYPrefijar(pz, x, prefijo)));
    totalPuertas += r.totalPuertas;
    totalBaldas += r.totalBaldas;
    x += anchoModulo;
  });

  const anchoTotal = x;
  piezas.push(...piezasTapasLaterales(p, anchoTotal));

  const herrajes = generarHerrajes(p, { totalPuertas, totalBaldas, numModulos: p.secciones.length });

  notas.push(
    'Cada módulo es una caja independiente (sus propios laterales, piso, techo y travesaños) — se arma por ' +
    'separado, se atornilla al muro por su propio travesaño trasero, y después se atornilla al módulo vecino, ' +
    'lateral con lateral.'
  );
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  return {
    modulo: 'alto_cocina',
    parametros: { ...p, A: anchoTotal },
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

function trasladarYPrefijar(pieza, xOffset, prefijo) {
  return {
    ...pieza,
    id: `${prefijo}${pieza.id}`,
    grupo: pieza.grupo ? `${prefijo}${pieza.grupo}` : pieza.grupo,
    posicion: { ...pieza.posicion, x: pieza.posicion.x + xOffset },
  };
}

// ---------- Validación básica ----------
function validarParametrosGlobales(p) {
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El mueble debe tener al menos 1 módulo');
  }
}

function validarSecciones(secciones) {
  secciones.forEach((s, i) => {
    if (!s.ancho) throw new Error(`Módulo ${i + 1}: cada módulo debe traer su propio ancho.`);
    if (s.ancho < 100) throw new Error(`Módulo ${i + 1}: ancho de ${Math.round(s.ancho)}mm demasiado angosto — mínimo 100mm.`);
    if ((s.nP || 0) < 1) throw new Error(`Módulo ${i + 1}: debe tener al menos 1 puerta.`);
    if ((s.nBaldas || 0) < 0) throw new Error(`Módulo ${i + 1}: la cantidad de repisas no puede ser negativa.`);
  });
}

// Profundidad real de un módulo (laterales/piso/techo), descontando el
// espesor de la puerta de la profundidad TOTAL que ingresa el cliente.
function profundidadModulo(p) {
  return p.P - p.espesorPuertas;
}

// ---------- Un módulo completo (caja independiente) ----------
function generarModulo(p, seccion, anchoModulo) {
  const piezas = [
    ...piezasEstructuraModulo(p, anchoModulo),
    ...piezasRepisasModulo(p, seccion, anchoModulo),
    ...piezasPuertasModulo(p, seccion, anchoModulo),
  ];
  return {
    piezas,
    totalPuertas: seccion.nP || 0,
    totalBaldas: seccion.nBaldas || 0,
  };
}

// ---------- 1. Estructura de un módulo (cuerpo cerrado arriba y abajo) ----------
// Los laterales van en color interior: quedan tapados contra el módulo
// vecino (o, en los 2 extremos del mueble, los cubre la tapa lateral).
function piezasEstructuraModulo(p, anchoModulo) {
  const { H, e, colorInterior, colorExterior } = p;
  const P = profundidadModulo(p);

  return [
    {
      id: 'lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero', 'inferior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero', 'inferior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: anchoModulo - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: anchoModulo - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'techo',
      ancho: anchoModulo - 2 * e, alto: P, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
    {
      // Travesaño delantero: vertical (de canto), igual que el trasero —
      // aporta rigidez al frente y tapa el hueco bajo el canto del techo.
      // Va en color exterior porque queda a la vista al abrir la puerta.
      id: 'travesano_delantero',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVESANO, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: H - e - ALTO_TRAVESANO, z: P - e },
      rotacion: 'vertical_frontal',
    },
    {
      // Travesaño trasero: el punto real de fijación a la pared de ESTE
      // módulo — se atornilla directo a los pies derechos del muro.
      id: 'travesano_trasero',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVESANO, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e - ALTO_TRAVESANO, z: 0 },
      rotacion: 'vertical_frontal',
    },
    ...piezasRespaldoModulo(p, anchoModulo),
  ];
}

function piezasRespaldoModulo(p, anchoModulo) {
  const { H, e } = p;
  return [{
    id: 'respaldo',
    ancho: anchoModulo - 2 * e + 16, alto: H - 2 * e + 16, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'MDF',
    posicion: { x: e - 8, y: e - 8, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 2. Tapas laterales (una sola vez, en los 2 extremos del mueble) ----------
function piezasTapasLaterales(p, anchoTotal) {
  const { e, espesorPuertas, H, colorExterior } = p;
  const profundidad = profundidadModulo(p) + espesorPuertas;

  return [
    {
      id: 'tapa_lateral_izq',
      ancho: profundidad, alto: H, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: -e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'tapa_lateral_der',
      ancho: profundidad, alto: H, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: anchoTotal, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3. Repisas interiores de un módulo ----------
// Recesadas "e" desde el fondo (no llegan a z=0) para no chocar con el
// travesaño trasero, que corre de lateral a lateral por esa franja.
function piezasRepisasModulo(p, seccion, anchoModulo) {
  const { H, e, colorInterior } = p;
  const P = profundidadModulo(p);
  const nBaldas = seccion.nBaldas || 0;
  if (nBaldas <= 0) return [];

  const alturaInterior = H - 2 * e;
  const piezas = [];

  for (let i = 0; i < nBaldas; i++) {
    const y = e + ((i + 1) * alturaInterior) / (nBaldas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: anchoModulo - 2 * e - 4, alto: P - 20 - e, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: e },
      rotacion: 'horizontal',
    });
  }

  return piezas;
}

// ---------- 4. Puertas de un módulo ----------
// Estilo "overlay" moderno: la puerta llega a ras de los dos bordes
// exteriores del módulo, con solo 2mm de holgura entre puertas si hay más
// de una. Sin separador interno: cada puerta hinge contra su propio
// lateral del módulo.
function piezasPuertasModulo(p, seccion, anchoModulo) {
  const { H, espesorPuertas, colorExterior } = p;
  const nP = seccion.nP || 0;
  const anchoDisponible = anchoModulo - (nP - 1) * 2;
  const anchoPuerta = anchoDisponible / nP;
  const piezas = [];

  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: i * (anchoPuerta + 2), y: 2, z: profundidadModulo(p) },
      rotacion: 'vertical_frontal',
    });
  }

  return piezas;
}

// ---------- 5. Herrajes ----------
function generarHerrajes(p, { totalPuertas, totalBaldas, numModulos }) {
  const herrajes = [];

  const bisagrasPorPuerta = bisagrasPorAltura(p.H);
  herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: totalPuertas * bisagrasPorPuerta });
  herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: totalPuertas });

  if (totalBaldas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalBaldas * 4 });
  }

  // Cada módulo se afirma a la pared por su propio travesaño trasero — más
  // seguro que unos pocos puntos repartidos en un solo cuerpo largo.
  const puntosColgadoPorModulo = 2;
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: numModulos * puntosColgadoPorModulo });

  // Tornillos de unión entre módulos vecinos, lateral con lateral.
  const juntasEntreModulos = Math.max(0, numModulos - 1);
  const tornillosUnionModulos = juntasEntreModulos * 6;

  // Por módulo: fijación de los 4 paneles horizontales/verticales del
  // cuerpo (piso, techo, travesaño delantero, travesaño trasero) a los
  // laterales: 2 tornillos por lado, 4 piezas = 16.
  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: numModulos * 16 + tornillosUnionModulos });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
