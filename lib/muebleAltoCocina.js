/**
 * MOTOR DE REGLAS — Mueble Alto de Cocina (alacena)
 * ----------------------------------------------------
 * Mismo patrón que muebleBajoCocina.js: recibe los parámetros del wizard
 * y devuelve piezas (con posición 3D) + herrajes.
 *
 * Diferencias principales respecto al mueble bajo:
 *   - Cuerpo cerrado arriba y abajo (piso + techo, no traviesas) porque no
 *     hay cubierta apoyada encima.
 *   - No lleva patas ni zócalo: se cuelga de la pared con un sistema de
 *     colgado (escuadras + tacos).
 *   - Frentes: solo puertas (no cajones) con baldas interiores ajustables.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 700,        // alto exterior del cuerpo
  P: 320,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  nP: 2,         // cantidad de puertas
  nBaldas: 1,    // cantidad de baldas interiores ajustables
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasBaldas(p),
    ...piezasPuertas(p),
    ...piezasZocaloInferior(p),
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

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
function piezasCuerpo(p) {
  const { A, H, P, e, colorInterior } = p;

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
      posicion: { x: A - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: A - 2 * e, alto: P - 20, espesor: e,
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
  const { A, H, e } = p;
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

// ---------- 3. Baldas interiores (ajustables por soportes metálicos) ----------
function piezasBaldas(p) {
  const { A, P, H, e, nBaldas, colorInterior } = p;
  if (nBaldas <= 0) return [];

  const alturaInterior = H - 2 * e;
  const piezas = [];

  for (let i = 0; i < nBaldas; i++) {
    const y = e + ((i + 1) * alturaInterior) / (nBaldas + 1);
    piezas.push({
      id: `balda_${i + 1}`,
      ancho: A - 2 * e - 4, alto: P - 40, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: 20 },
      rotacion: 'horizontal',
    });
  }

  return piezas;
}

// ---------- 4. Puertas ----------
function piezasPuertas(p) {
  const { A, H, nP, espesorPuertas, colorExterior } = p;
  const anchoUtil = A - (nP + 1) * 2;
  const anchoPuerta = anchoUtil / nP;
  const piezas = [];

  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
      rotacion: 'vertical_frontal',
    });
  }

  return piezas;
}

// ---------- 4b. Zócalo inferior (panel visible, no de patas) ----------
// El mueble alto no tiene patas que tapar, pero al quedar colgado más
// arriba de los ojos, la base se ve desde abajo — este panel cuelga bajo
// el cuerpo (como un pequeño remate) para que se vea terminado y no el
// hueco crudo del piso interior.
const ALTO_ZOCALO_INFERIOR = 100; // mínimo que acepta una máquina de corte

function piezasZocaloInferior(p) {
  const { A, P, e, colorExterior } = p;
  return [{
    id: 'zocalo_inferior',
    ancho: A, alto: ALTO_ZOCALO_INFERIOR, espesor: e,
    cantos: ['inferior'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y: -ALTO_ZOCALO_INFERIOR, z: P - e },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 5. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];

  const bisagrasPorPuerta = p.H > 800 ? 3 : 2;
  herrajes.push({ tipo: 'bisagra_codo', cantidad: p.nP * bisagrasPorPuerta });
  herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });

  if (p.nBaldas > 0) {
    herrajes.push({ tipo: 'soporte_balda_metalico', cantidad: p.nBaldas * 4 });
  }

  const puntosColgado = p.A > 900 ? 3 : 2;
  herrajes.push({ tipo: 'escuadra_colgado_pared', cantidad: puntosColgado });
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgado });

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 }); // fijación piso + techo a laterales
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 });

  return herrajes;
}

export { generarDespiece };
