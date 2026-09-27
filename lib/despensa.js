/**
 * MOTOR DE REGLAS — Despensa (armario de cocina, solo repisas)
 * ------------------------------------------------------------
 * Un solo cuerpo, sin secciones ni divisores internos (a diferencia de
 * closet.js/librero.js): el cliente ingresa el ancho total directamente, y
 * al final elige la cantidad de puertas (0, 1 o 2 — globales, cubren todo
 * el ancho, siempre batientes). Mismo criterio general de siempre:
 *   - Va sobre un zócalo de 100mm a ras (sin retranqueo, como el mueble
 *     aéreo/librero — con retranqueo quedaba casi invisible detrás del
 *     borde inferior de la puerta), no apoyado directo en el piso como el
 *     closet.
 *   - No tiene la opción de colgador (no aplica en una despensa): son solo
 *     repisas ajustables, repartidas en toda la altura interior.
 *   - El respaldo es un panel de melamina ESTRUCTURAL de 15mm (no un MDF
 *     decorativo en ranura) — atornillado directo a laterales, piso y
 *     techo, es lo que le da al cuerpo su rigidez trasera (una despensa
 *     cargada de repisas aguanta bastante peso). No lleva travesaños
 *     traseros: el respaldo estructural cumple esa función, igual que en
 *     closet.js. Ocupa toda la cara trasera (z=0 a z=e), así que la repisa
 *     descuenta ese espesor y parte en z=e, contra su cara delantera.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes, bisagrasPorAltura } from './shared';

const DEFAULTS = {
  A: 450,        // ancho total
  H: 2000,       // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 450,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar) — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  nP: 2,         // cantidad de puertas, siempre batientes — 0 (abierta), 1 o 2
  repisas: 5,
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function alturaCuerpo(p) {
  return p.H - p.hp;
}

// Profundidad real del cuerpo (laterales/piso), descontando el espesor de
// la puerta de la profundidad TOTAL que ingresa el cliente: la puerta se
// monta por delante del borde del cuerpo, así que si el cuerpo también
// midiera P completo, el mueble terminado (cuerpo + puerta) quedaría
// espesorPuertas mm más profundo que lo que el cliente pidió.
function profundidadCuerpo(p) {
  return p.P - p.espesorPuertas;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasZocalo(p),
  ];

  const notas = [];
  const piezasRepisasCuerpo = piezasRepisas(p);
  piezas.push(...piezasRepisasCuerpo);

  if (p.nP > 0) {
    piezas.push(...piezasPuertasBatientes(p));
  } else {
    notas.push('Despensa abierta (sin puertas): las repisas quedan a la vista.');
  }

  if (p.nP > 0 && p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  const herrajes = generarHerrajes(p, { totalRepisas: piezasRepisasCuerpo.length });

  return {
    modulo: 'despensa',
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
  if (p.H <= p.hp) throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  if (![0, 1, 2].includes(Number(p.nP))) throw new Error('La cantidad de puertas debe ser 0, 1 o 2.');
  if ((p.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
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

// ---------- 2. Respaldo (estructural — ver comentario de cabecera) ----------
function piezasRespaldo(p) {
  const { A, e, colorInterior } = p;
  const H = alturaCuerpo(p);
  return [{
    id: 'respaldo',
    ancho: A - 2 * e, alto: H - 2 * e, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: e, y: e, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Zócalo (100mm, igual que mueble cocina/vanitorio) ----------
function piezasZocalo(p) {
  const { A, P, e, hp, colorExterior } = p;
  const altoZocalo = hp - 10;

  // A ras (sin retranqueo): igual que el zócalo del mueble aéreo/librero.
  // Con retranqueo quedaba recluido justo detrás del borde inferior de la
  // puerta (apenas 12mm de por medio) y era casi invisible en el plano 3D.
  return [
    {
      id: 'zocalo_frontal',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: P - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: P, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: P, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 4. Repisas (repartidas en toda la altura interior) ----------
function piezasRepisas(p) {
  const { A, e, repisas: nRepisas, colorInterior } = p;
  if (!nRepisas || nRepisas <= 0) return [];

  const H = alturaCuerpo(p);
  const yInferiorZona = e;
  const ySuperiorZona = H - e;
  const alturaZona = ySuperiorZona - yInferiorZona;
  if (alturaZona <= 0) return [];

  const anchoRepisa = A - 2 * e;
  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferiorZona + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      // Recesada "e" desde el fondo para no chocar con el respaldo
      // estructural, que ocupa z=0 a z=e (ver piezasRespaldo).
      id: `repisa_${i + 1}`,
      ancho: anchoRepisa - 4, alto: profundidadCuerpo(p) - 20 - e, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e + 2, y, z: e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Puertas (cubren todo el ancho, siempre batientes) ----------
// Estilo "overlay" moderno (igual que muebleBajoCocina.js): la puerta llega
// a ras de los dos bordes exteriores de la despensa (x=0 y x=A), con solo
// 2mm de holgura entre puertas cuando hay más de una.
function piezasPuertasBatientes(p) {
  const { A, nP, espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
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

// ---------- 6. Herrajes ----------
function generarHerrajes(p, { totalRepisas }) {
  const herrajes = [];

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  if (p.nP > 0) {
    const H = alturaCuerpo(p);
    const bisagrasPorPuerta = bisagrasPorAltura(H);
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: p.nP * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
  }

  // Igual criterio que mueble bajo cocina/vanitorio (4 o 6 según ancho), pero
  // el corte de "ancho grande" baja a 900mm: una despensa es mucho más alta
  // y carga más peso en repisas que un mueble bajo, así que necesita más
  // puntos de apoyo para no destemplarse con el uso.
  const patas = p.A >= 900 ? 6 : 4;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });

  // El respaldo estructural se atornilla por su perímetro (2 laterales +
  // piso + techo, ~10 puntos de fijación) — mismo criterio que closet.js.
  const tornillosRespaldo = 10;

  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 8 + tornillosRespaldo });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
