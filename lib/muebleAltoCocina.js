/**
 * MOTOR DE REGLAS — Mueble Alto de Cocina (alacena)
 * ----------------------------------------------------
 * Mismo patrón que muebleBajoCocina.js: recibe los parámetros del wizard
 * y devuelve piezas (con posición 3D) + herrajes.
 *
 * Diferencias principales respecto al mueble bajo:
 *   - Cuerpo cerrado arriba y abajo (piso + techo) porque no hay cubierta
 *     apoyada encima.
 *   - No lleva patas ni zócalo: se cuelga de la pared atornillando dos
 *     travesaños traseros (superior e inferior) directamente a los pies
 *     derechos/montantes del muro.
 *   - Frentes: solo puertas (no cajones) con repisas interiores ajustables.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes, bisagrasPorAltura } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 700,        // alto exterior del cuerpo
  P: 320,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  nP: 2,         // cantidad de puertas
  nBaldas: 1,    // cantidad de repisas interiores ajustables (clave interna "nBaldas" por compatibilidad con diseños ya guardados)
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasTravesanosTraseros(p),
    ...piezasRespaldo(p),
    ...piezasRepisas(p),
    ...piezasPuertas(p),
  ];

  const herrajes = generarHerrajes(p);
  const notas = [];
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  return {
    modulo: 'alto_cocina',
    parametros: p,
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  if (p.A < 50 || p.A > 10000) throw new Error('Ancho (A) fuera de rango 50-10000mm');
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (p.nP < 1) throw new Error('El mueble alto debe tener al menos 1 puerta');
}

// Profundidad real del cuerpo (laterales/piso/techo), descontando el espesor
// de la puerta de la profundidad TOTAL que ingresa el cliente: la puerta se
// monta por delante del borde del cuerpo, así que si el cuerpo también
// midiera P completo, el mueble terminado (cuerpo + puerta) quedaría
// espesorPuertas mm más profundo que lo que el cliente pidió.
function profundidadCuerpo(p) {
  return p.P - p.espesorPuertas;
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno), así que se
// terminan igual que el frente.
function piezasCuerpo(p) {
  const { A, H, e, colorInterior, colorExterior } = p;
  const P = profundidadCuerpo(p);

  return [
    {
      id: 'lateral_izq',
      ancho: P, alto: H, espesor: e,
      // "inferior": el mueble alto no lleva zócalo que tape la base (se
      // cuelga de la pared), así que el canto de abajo queda a la vista
      // desde el piso de la cocina — se tapa con melamina a color para que
      // quede terminado y sirva de tope limpio donde se aperna a la pared.
      cantos: ['delantero', 'inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero', 'inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: A - 2 * e, alto: P, espesor: e,
      // Tapacanto delantero: la base queda a la vista al mirar el mueble
      // desde abajo (muy común en un mueble colgado más alto que los ojos).
      cantos: ['delantero'],
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
  const { A, H, e } = p;
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

// ---------- 3. Repisas interiores (ajustables por soporte duplo o escuadra triangular) ----------
// Recesadas "e" desde el fondo (no llegan a z=0) para no chocar con los
// travesaños traseros de colgado, que corren de lateral a lateral por esa
// franja — cualquier repisa que caiga a su altura, si no se recesara.
function piezasRepisas(p) {
  const { A, H, e, nBaldas, colorInterior } = p;
  const P = profundidadCuerpo(p);
  if (nBaldas <= 0) return [];

  const alturaInterior = H - 2 * e;
  const piezas = [];

  for (let i = 0; i < nBaldas; i++) {
    const y = e + ((i + 1) * alturaInterior) / (nBaldas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: A - 2 * e - 4, alto: P - 20 - e, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: e },
      rotacion: 'horizontal',
    });
  }

  return piezas;
}

// ---------- 4. Puertas ----------
// Estilo "overlay" moderno (igual que muebleBajoCocina.js): la puerta no
// queda metida dentro del hueco, sino montada por encima del canto de los
// laterales — llega a ras de los dos bordes exteriores del mueble (x=0 y
// x=A), con solo 2mm de holgura entre puertas cuando hay más de una.
function piezasPuertas(p) {
  const { A, H, nP, espesorPuertas, colorExterior } = p;
  const anchoDisponible = A - (nP - 1) * 2;
  const anchoPuerta = anchoDisponible / nP;
  const piezas = [];

  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: i * (anchoPuerta + 2), y: 2, z: profundidadCuerpo(p) },
      rotacion: 'vertical_frontal',
    });
  }

  return piezas;
}

// ---------- 4b. Travesaños traseros (superior e inferior, para colgar) ----------
// Dos rieles horizontales atornillados por dentro contra el respaldo, uno
// justo bajo el techo y otro justo sobre el piso — de lateral a lateral.
// Son el punto de fijación real a la pared: se atornillan directo a los
// pies derechos del muro (con tacos si el muro no calza con un montante),
// en vez de depender de escuadras colgadas sueltas.
const ALTO_TRAVESANO_TRASERO = 100;

function piezasTravesanosTraseros(p) {
  const { A, H, e, colorInterior } = p;
  const alto = ALTO_TRAVESANO_TRASERO;

  return [
    {
      id: 'travesano_trasero_superior',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e - alto, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'travesano_trasero_inferior',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    },
  ];
}

// ---------- 5. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];

  const bisagrasPorPuerta = bisagrasPorAltura(p.H);
  herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: p.nP * bisagrasPorPuerta });
  herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });

  if (p.nBaldas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: p.nBaldas * 4 });
  }

  // Puntos de fijación a la pared por travesaño (superior e inferior) — el
  // mueble se cuelga atornillando ambos travesaños directo al muro, no con
  // escuadras sueltas.
  const puntosColgadoPorTravesano = p.A > 900 ? 3 : 2;
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgadoPorTravesano * 2 });

  // Fijación a los laterales de los 4 paneles horizontales del cuerpo
  // (piso, techo y los dos travesaños traseros): 2 tornillos por lado.
  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 16 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
