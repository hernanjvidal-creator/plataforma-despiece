/**
 * MOTOR DE REGLAS — Librero
 * ------------------------------------------------------------
 * El más simple de los muebles por secciones: un cuerpo abierto (sin
 * puertas) con columnas de repisas ajustables — igual que la Despensa pero
 * sin puertas, ya que un librero normalmente queda a la vista. Va sobre un
 * zócalo de 100mm en todo el contorno (los 4 lados, como el mueble aéreo)
 * para que los libros no queden a ras de piso. Lleva travesaños traseros de
 * refuerzo (superior e inferior) de lateral a lateral.
 *
 * Un librero ancho se arma en varios CUERPOS independientes, igual que el
 * closet (ver dividirEnCuerpos en shared.js): su piso, techo, travesaños,
 * zócalo y respaldo corren de lado a lado y, pasado cierto ancho, dejan de
 * caber en la plancha. Un librero que cabe en un solo cuerpo sale igual que
 * siempre, con las mismas piezas y los mismos nombres.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar el zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import {
  resumirPlanchas, tornillosMontajeHerrajes, grapasParaRespaldos,
  largoMaximoPieza, dividirEnCuerpos, trasladarAlCuerpo, sumarHerrajes, TORNILLOS_POR_UNION_CUERPOS,
} from './shared';
import { medidasUtilesPlancha } from './optimizadorCorte';

const DEFAULTS = {
  H: 1800,       // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 300,        // profundidad exterior (típico de librero, más angosto que un closet)
  e: 15,         // espesor tablero estructural
  hp: 110,       // alto reservado para el zócalo (estándar) — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  secciones: [
    { repisas: 5, ancho: 450 },
    { repisas: 5, ancho: 450 },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

// El respaldo de MDF sobresale esto por cada lado del cuerpo (ver piezasRespaldo).
const SOBRANTE_RESPALDO = 6;

// Orden de los herrajes al sumar varios cuerpos — el mismo en que los lista
// generarHerrajes para un solo cuerpo.
const ORDEN_HERRAJES = [/^soporte_repisa/, /^grapa/, /^tope/, /^tornillo_confirmat/, /^tornillo_30mm$/, /^tornillo_aglomerado/];

function alturaCuerpo(p) {
  return p.H - p.hp;
}

function generarDespiece(paramsUsuario = {}, { plancha = medidasUtilesPlancha({ plancha: 'CL' }) } = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametros(p);
  validarAltoContraPlancha(p, plancha);

  const cuerpos = dividirEnCuerpos(p.secciones.map(s => Number(s.ancho) || 0), anchoMaximoCuerpo(p, plancha));
  const variosCuerpos = cuerpos.length > 1;

  const piezas = [];
  const herrajesPorCuerpo = [];
  const anchosCuerpos = [];
  let xOrigen = 0;
  let divisoresPrevios = 0;

  cuerpos.forEach((indices, k) => {
    const cuerpo = generarCuerpo({ ...p, secciones: indices.map(i => p.secciones[i]) }, {
      indicePrimeraSeccion: indices[0],
      divisoresPrevios,
    });
    const prefijo = variosCuerpos ? `cuerpo${k + 1}_` : '';
    piezas.push(...cuerpo.piezas.map(pz => trasladarAlCuerpo(pz, xOrigen, prefijo)));
    herrajesPorCuerpo.push(cuerpo.herrajes);
    anchosCuerpos.push(cuerpo.ancho);
    xOrigen += cuerpo.ancho;
    divisoresPrevios += cuerpo.numDivisores;
  });
  // El ancho total no lo manda el cliente: es la suma real de las secciones
  // (ver comentario de calcularSecciones).
  p.A = xOrigen;
  p.numCuerpos = cuerpos.length;

  // Uniones entre cuerpos vecinos, lateral con lateral.
  const herrajesUnion = variosCuerpos
    ? [{ tipo: 'tornillo_30mm', cantidad: (cuerpos.length - 1) * TORNILLOS_POR_UNION_CUERPOS }]
    : [];
  const herrajes = sumarHerrajes([...herrajesPorCuerpo, herrajesUnion], ORDEN_HERRAJES);

  const notas = [];
  if (variosCuerpos) {
    notas.push(
      `El librero se arma en ${cuerpos.length} cuerpos independientes (de ${anchosCuerpos.map(a => Math.round(a)).join(', ')} mm de ancho), ` +
      'para que ninguna pieza quede más grande que la plancha. Arma cada cuerpo por separado y después atorníllalos entre sí, ' +
      `lateral con lateral, con tornillo de 30 mm (${TORNILLOS_POR_UNION_CUERPOS} por unión, repartidos a lo alto).`
    );
  }
  const topes = herrajes.find(h => h.tipo === 'tope_plastico_redondo').cantidad;
  notas.push(
    `Pega los ${topes} topes plásticos redondos (10-20mm) bajo el zócalo, repartidos a lo ancho del mueble, antes de ponerlo en su lugar final — así no raya el piso al moverlo y queda un poco más estable.`
  );

  return {
    modulo: 'librero',
    parametros: p,
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// Un cuerpo completo (caja independiente) con sus secciones, en coordenadas
// LOCALES a él mismo (x: 0 a su ancho) — generarDespiece lo traslada a su
// lugar dentro del librero. `p.secciones` son solo las de este cuerpo;
// `indicePrimeraSeccion` y `divisoresPrevios` mantienen la numeración de
// secciones y divisores corrida a lo largo de todo el librero.
function generarCuerpo(p, { indicePrimeraSeccion, divisoresPrevios }) {
  const { secciones, anchoTotal } = calcularSecciones(p, indicePrimeraSeccion);
  p.A = anchoTotal;

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasTravesanosTraseros(p),
    ...piezasRespaldo(p),
    ...piezasZocalo(p),
    ...piezasDivisores(p, secciones, divisoresPrevios),
  ];

  let totalRepisas = 0;
  secciones.forEach(seccion => {
    const piezasRepisasSec = piezasRepisasSeccion(p, seccion);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;
  });

  const herrajes = generarHerrajes(p, { totalRepisas, secciones, piezas });
  return { piezas, herrajes, ancho: anchoTotal, numDivisores: secciones.length - 1 };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  // El ancho (A) no es un input real: se calcula en calcularSecciones como
  // la suma de las secciones (cada una ya valida su propio ancho ahí).
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (p.H <= p.hp) throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El librero debe tener al menos 1 sección');
  }
  for (const s of p.secciones) {
    if ((s.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  }
}

// ---------- Tamaño de los cuerpos según la plancha ----------
// (ver largoMaximoPieza y dividirEnCuerpos en shared.js)
// Los laterales (profundidad x alto del cuerpo) son las piezas más largas
// del librero: si no caben en la plancha, no hay forma de armarlo — se
// rechaza con la medida máxima en vez de dejar que el optimizador de corte
// falle con un mensaje técnico.
function validarAltoContraPlancha(p, plancha) {
  const altoMaximoCuerpo = largoMaximoPieza(p.P, plancha);
  if (alturaCuerpo(p) > altoMaximoCuerpo) {
    throw new Error(
      `Con la plancha "${plancha.nombre}", los laterales del librero pueden medir a lo más ${Math.floor(altoMaximoCuerpo)} mm, así que el librero completo (con zócalo) puede medir hasta ${Math.floor(altoMaximoCuerpo + p.hp)} mm de alto. Baja el alto o elige una plancha más larga.`
    );
  }
}

// Ancho máximo de un cuerpo para que todas sus piezas quepan enteras en la
// plancha: el respaldo (que además sobresale por los lados), el piso y el
// techo (ancho interior por la profundidad), y los travesaños y el zócalo
// (ancho interior por 100 mm). En un librero alto la que manda es el
// respaldo; en uno bajo, cualquiera de las otras.
function anchoMaximoCuerpo(p, plancha) {
  const { e } = p;
  const altoRespaldo = alturaCuerpo(p) - 2 * e + 2 * SOBRANTE_RESPALDO;
  const anchoInterior = Math.min(
    largoMaximoPieza(altoRespaldo, plancha) - 2 * SOBRANTE_RESPALDO,
    largoMaximoPieza(p.P, plancha),
    largoMaximoPieza(ALTO_TRAVIESA_TRASERA, plancha),
  );
  return anchoInterior + 2 * e;
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
// Los laterales van en melamina color exterior: un librero queda a la vista
// por los costados, y no se sabe de antemano si además queda contra una
// pared por atrás o en medio de una sala (como divisor de ambientes).
function piezasCuerpo(p) {
  const { A, P, e, colorInterior, colorExterior } = p;
  const H = alturaCuerpo(p);

  return [
    {
      id: 'lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero', 'superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero', 'superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: A - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'techo',
      ancho: A - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
  ];
}

// ---------- 1b. Travesaños traseros (refuerzo superior e inferior) ----------
// Van de lateral a lateral, por dentro, pegados a la parte de atrás — igual
// que en la Despensa/Closet. Como cruzan por detrás de todos los divisores
// internos, cada divisor se recesa "e" en profundidad (ver piezasDivisores)
// para que el travesaño pase limpio por detrás sin chocar.
const ALTO_TRAVIESA_TRASERA = 100;

function piezasTravesanosTraseros(p) {
  const { A, e, colorInterior } = p;
  const H = alturaCuerpo(p);
  const alto = ALTO_TRAVIESA_TRASERA;

  return [
    {
      id: 'travesano_trasero_superior',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e - alto, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'travesano_trasero_inferior',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    },
  ];
}

// ---------- 2. Respaldo ----------
// Sobresale por los 4 lados para cubrir el canto trasero del cuerpo (no va
// en una ranura real) — antes 8mm por lado, ahora SOBRANTE_RESPALDO (6mm)
// por lado. Va clavado POR DETRÁS del cuerpo (z negativo), no dentro de él.
function piezasRespaldo(p) {
  const { A, e } = p;
  const H = alturaCuerpo(p);
  return [{
    id: 'respaldo',
    ancho: A - 2 * e + 2 * SOBRANTE_RESPALDO, alto: H - 2 * e + 2 * SOBRANTE_RESPALDO, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'MDF',
    color: 'blanco',
    posicion: { x: e - SOBRANTE_RESPALDO, y: e - SOBRANTE_RESPALDO, z: -3 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 2b. Zócalo (100mm, en todo el contorno — como el mueble aéreo) ----------
const ALTO_ZOCALO = 100; // mínimo que acepta una máquina de corte

function piezasZocalo(p) {
  const { A, P, e, colorExterior } = p;
  const alto = ALTO_ZOCALO;

  // Los dos laterales corren todo el fondo; el frontal y el trasero van
  // ENTRE ellos (por eso miden A-2*e) — antes medían el ancho completo y se
  // cruzaban con los laterales en las cuatro esquinas.
  return [
    {
      id: 'zocalo_frontal',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: -alto, z: P - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_trasero',
      ancho: A - 2 * e, alto, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: -alto, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: P, alto, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -alto, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: P, alto, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -alto, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3. Reparto del ancho en secciones + divisores ----------
// Cada sección trae su propio ancho obligatorio (mismo criterio que mueble
// cocina/closet/despensa): el ancho NOMINAL tal como se ve por fuera,
// compartiendo la mitad de cada separador con la sección vecina — no el
// ancho interior puro. El ancho total del librero no es un dato que mande
// el cliente: se calcula acá como la suma real de las secciones (ver
// anchoTotal en el resultado). Con 1 sola sección no se agrega ningún
// divisor. Trabaja sobre las secciones de UN cuerpo: sus dos secciones de
// los extremos llegan a un lateral (del librero o de la unión con el cuerpo
// vecino), que es del ancho completo `e`.
function calcularSecciones(p, indicePrimeraSeccion = 0) {
  const { e } = p;
  const n = p.secciones.length;

  const anchosInteriores = p.secciones.map((s, i) => {
    const numero = indicePrimeraSeccion + i + 1;
    if (!s.ancho) {
      throw new Error(`Sección ${numero}: cada sección debe traer su propio ancho.`);
    }
    const extIzq = i === 0 ? e : e / 2;
    const extDer = i === n - 1 ? e : e / 2;
    const interior = s.ancho - extIzq - extDer;
    if (interior < 200) {
      throw new Error(
        `Sección ${numero}: con ${Math.round(s.ancho)}mm de ancho, el hueco interior real quedaría en solo ${Math.round(interior)}mm. Sube el ancho de esta sección a al menos ${Math.round(extIzq + extDer + 200)}mm.`
      );
    }
    return interior;
  });

  const secciones = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosInteriores[i];
    secciones.push({ ...p.secciones[i], indice: indicePrimeraSeccion + i, xInicio: x, anchoSeccion });
    x += anchoSeccion;
    if (i < n - 1) x += e;
  }
  return { secciones, anchoTotal: x + e };
}

function piezasDivisores(p, secciones, divisoresPrevios = 0) {
  const { e, colorInterior } = p;
  const H = alturaCuerpo(p);
  const nDivisores = secciones.length - 1;
  const piezas = [];
  for (let i = 0; i < nDivisores; i++) {
    piezas.push({
      id: `divisor_${divisoresPrevios + i + 1}`,
      // alto: H-2*e, y: e — insertado entre piso y techo (que son piezas de
      // ancho completo y "pasan por encima/debajo" del divisor), no corre
      // detrás de ellos. Antes usaba el alto completo y se traslapaba con
      // ambos (mismo criterio ya usado en closet.js).
      ancho: p.P - e, alto: H - 2 * e, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: secciones[i].xInicio + secciones[i].anchoSeccion, y: e, z: e },
      rotacion: 'vertical_profundidad',
    });
  }
  return piezas;
}

// ---------- 4. Repisas dentro de una sección (repartidas en toda la altura interior) ----------
function piezasRepisasSeccion(p, seccion) {
  const { xInicio, anchoSeccion, repisas: nRepisas, indice } = seccion;
  if (!nRepisas || nRepisas <= 0) return [];

  const { e } = p;
  const H = alturaCuerpo(p);
  const yInferiorZona = e;
  const ySuperiorZona = H - e;
  const alturaZona = ySuperiorZona - yInferiorZona;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferiorZona + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      // Recesada "e" desde el fondo para no chocar con los travesaños
      // traseros (ver piezasTravesanosTraseros).
      id: `s${indice + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 2, alto: p.P - 20 - e, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + 1, y, z: e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Herrajes (de un cuerpo) ----------
function generarHerrajes(p, { totalRepisas, secciones, piezas }) {
  const herrajes = [];

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  const grapasRespaldo = grapasParaRespaldos(piezas);
  if (grapasRespaldo > 0) {
    herrajes.push({ tipo: 'grapa_carpintero_6mm', cantidad: grapasRespaldo });
  }

  // Igual criterio que la Despensa: el zócalo es solo un panel cosmético
  // que tapa el frente, el apoyo real en el piso son estos topes.
  herrajes.push({ tipo: 'tope_plastico_redondo', cantidad: p.A >= 900 ? 6 : 4 });

  // Cada travesaño trasero (superior + inferior) va atornillado en sus dos
  // extremos (2 tornillos por lado) y, al pasar por detrás de cada divisor
  // interno, también ahí (2 tornillos por cruce).
  const nDivisores = secciones.length - 1;
  const tornillosTravesanos = 2 * (4 + nDivisores * 2);

  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 8 + nDivisores * 4 + tornillosTravesanos });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
