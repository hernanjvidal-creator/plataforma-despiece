/**
 * MOTOR DE REGLAS — Closet / Armario Ropero (por secciones)
 * ------------------------------------------------------------
 * El interior del closet se arma como una lista de SECCIONES (columnas)
 * puestas de izquierda a derecha, cada una con su propia combinación de
 * cajones / repisas / colgador — ej: [repisas+cajones, colgador,
 * repisas+cajones]. Entre secciones va un divisor vertical (mismo tipo de
 * panel que un lateral) que es una ÚNICA pieza compartida entre las dos
 * secciones que separa — no se duplica. Excepción: si dos o más secciones
 * seguidas son "solo colgador" (sin cajones), no llevan divisor entre
 * ellas — la barra puede correr de corrido sin un panel partiendo el hueco.
 * Cada sección trae su propio `ancho` obligatorio (mismo criterio que los
 * módulos de mueble de cocina/aéreo) — no hay reparto automático: el ancho
 * total del closet es solo la suma de sus secciones.
 *
 * CUERPOS: un closet ancho no se arma como una sola caja. Su respaldo (todo
 * el ancho del closet por todo su alto) deja de caber en una plancha pasados
 * unos 1,8 m, y partirlo con una unión cualquiera lo debilita justo donde
 * más trabaja. Por eso las secciones se reparten en CUERPOS independientes —
 * cada uno con sus propios laterales, piso, techo, respaldo y zócalo — que
 * se atornillan entre sí, lateral con lateral (mismo criterio que los
 * módulos del mueble de cocina). Los cortes van siempre entre secciones, con
 * la menor cantidad de cuerpos posible y lo más parejos posible (ver
 * dividirEnCuerpos); el ancho máximo de un cuerpo depende de la plancha
 * elegida (ver anchoMaximoCuerpo). Un closet que cabe en un solo cuerpo sale
 * igual que siempre, con las mismas piezas y los mismos nombres.
 *
 * Las puertas correderas son de cada cuerpo: cubren todo su ancho por fuera,
 * independientes de cómo esté organizado el interior por secciones (solo
 * necesitan un riel, no un panel real detrás de cada borde). Quedan
 * EMPOTRADAS dentro del cuerpo — ninguna hoja sobresale por delante del
 * canto de los laterales, y no llevan tapacantos ni riel visible por fuera
 * (ver piezasPuertasCorrederas). Las puertas batientes, en cambio, SÍ
 * dependen de las secciones: cada bisagra necesita un panel real (lateral o
 * divisor) detrás de su canto, así que cada sección (o grupo de secciones
 * unidas por un borde "abierto", sin divisor real entre sí) arma sus
 * propias puertas dentro de su propio ancho — una, o dos si el ancho supera
 * ANCHO_PARA_DOS_PUERTAS (ver piezasPuertasBatientes). En una sección con
 * cajones, la puerta batiente parte SOBRE la cajonera y los frentes de los
 * cajones quedan a la vista, a ras de las puertas: escondidos detrás,
 * chocarían con las bisagras, que van atornilladas a la cara interior de los
 * mismos paneles (ver generarSeccionFrentes).
 *
 * El respaldo es un panel de melamina ESTRUCTURAL de 15mm (no un MDF
 * decorativo en ranura) — atornillado directo a laterales, piso, techo y
 * cada divisor, es lo que le da al cuerpo su rigidez/escuadra trasera. No
 * hay travesaños traseros (se eliminaron): el respaldo estructural cumple
 * esa función, y además deja libre la franja superior/inferior que necesita
 * el riel empotrado de la puerta corredera. A diferencia de los travesaños
 * viejos (un simple listón), el respaldo ocupa TODA la cara trasera (z=0 a
 * z=e) — así que el divisor, la repisa y el remate de cajonera sí necesitan
 * descontar ese espesor y partir en z=e, o quedarían atravesando el mismo
 * panel del respaldo.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import {
  resumirPlanchas, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura, piezasCajaCajon,
  largoMaximoPieza, dividirEnCuerpos, trasladarAlCuerpo, sumarHerrajes, TORNILLOS_POR_UNION_CUERPOS,
} from './shared';
import { medidasUtilesPlancha } from './optimizadorCorte';

const DEFAULTS = {
  H: 2200,       // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 580,        // profundidad exterior (holgura para colgar ropa)
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar) — el panel de zócalo en sí mide hp-10 = 100mm
  nP: 0,         // cantidad de puertas globales (0 = closet abierto, secciones a la vista)
  tipoPuerta: 'batiente', // 'batiente' | 'corredera'
  correderaTipo: 'bola',  // corredera de los CAJONES (no confundir con tipoPuerta)
  secciones: [
    { cajones: 2, repisas: 2, colgador: false, ancho: 800 },
    { cajones: 0, repisas: 1, colgador: true, ancho: 800 },
    { cajones: 2, repisas: 2, colgador: false, ancho: 800 },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const ALTURA_COLGADOR_IDEAL = 1750; // mm desde el piso real (no desde el piso del cuerpo), holgura estándar para colgar camisas/pantalones
const ALTURA_CAJON_UNIDAD = 200;    // mm de altura de frente por cajón

// Los cajones del closet NUNCA llevan manilla — con puerta por delante o
// sin ella, se abren metiendo los dedos por el hueco entre uno y otro. Por
// eso siempre usan el gap de 30mm (en vez del reveal cosmético de 3mm que
// se usa donde sí hay manilla, como bajo_cocina/vanitorio) — sin ese gap
// más ancho no habría por dónde agarrar el cajón. El mismo gap de 30mm
// separa el cajón de más arriba de la tapa de la cajonera (o de la puerta
// que parte sobre ella, con puertas batientes).
const GAP_CAJON_SIN_MANILLA = 30;
// mm libres a cada lado del frente de un cajón que queda escondido detrás de
// las puertas correderas, entre el frente y los paneles que bordean su sección.
const HOLGURA_FRENTE_INTERIOR = 2;
// mm entre el canto de abajo del piso del cuerpo y el de las puertas y los
// frentes a la vista (y entre el borde de arriba de la puerta y el techo).
const Y_INFERIOR_FRENTES = 2;
// mm que cada puerta o frente deja libres en el borde donde un cuerpo se une
// con el siguiente — sumados los dos lados, la misma luz de 2mm que queda
// entre dos puertas vecinas de un mismo cuerpo.
const HOLGURA_UNION_CUERPOS = 1;

// Puerta corredera EMPOTRADA (ver piezasPuertasCorrederas): ninguna hoja
// sobresale por delante del canto de los laterales — ambas quedan dentro de
// la profundidad del cuerpo, una detrás de la otra. Criterio razonable (no
// viene de una ficha técnica), fácil de ajustar si en terreno se necesita
// otra medida.
const GAP_ENTRE_RIELES_CORREDERA = 8;   // aire entre los 2 rieles, para que las hojas no se rocen
const HOLGURA_RIEL_SUPERIOR = 15;       // mm libres entre el canto de la puerta y la cara inferior del techo
const HOLGURA_RIEL_INFERIOR = 10;       // mm libres entre el canto de la puerta y el piso
const MARGEN_CONTENIDO_CORREDERA = 20;  // mm de despeje entre la hoja más interior y el contenido (repisas/colgador)

// Profundidad total que ocupa el mecanismo de la puerta corredera empotrada,
// cerca del frente: las 2 hojas superpuestas + el aire entre rieles + el
// margen antes del contenido. Bastante menos que el riel colgante de antes
// (80mm fijos) — el sistema empotrado deja más profundidad útil adentro.
function profundidadMecanismoCorredera(p) {
  return 2 * p.espesorPuertas + GAP_ENTRE_RIELES_CORREDERA + MARGEN_CONTENIDO_CORREDERA;
}

// Profundidad real del cuerpo (laterales/piso/caja de cajón). Con puerta
// batiente, se descuenta el espesor de la puerta de la profundidad TOTAL
// que ingresa el cliente: la puerta se monta por delante del borde del
// cuerpo, así que si el cuerpo también midiera P completo, el mueble
// terminado (cuerpo + puerta) quedaría espesorPuertas mm más profundo que
// lo pedido. Con puerta corredera es al revés: los laterales mandan con la
// profundidad TOTAL — la puerta no monta "por delante" de un borde único
// como la batiente, corre sobre dos rieles que necesitan un tope real
// contra el que chocar, y ese tope lo da el lateral en su profundidad
// completa (ver profundidadRepisa/profundidadParaCajas más abajo para
// cuánto de esa profundidad queda realmente libre para el contenido).
// Un closet abierto no tiene puerta que descontar: el cuerpo mide el fondo
// completo, salvo que alguna sección lleve cajones — sus frentes montan por
// delante del canto de los paneles y suman su espesor al fondo total. Eso se
// decide con las secciones de TODO el closet (`hayCajones`), no las de cada
// cuerpo, para que todos los cuerpos queden de la misma profundidad.
function profundidadCuerpo(p) {
  if (llevaPuertasCorrederas(p)) return p.P;
  if (p.nP > 0) return p.P - p.espesorPuertas;
  return p.hayCajones ? p.P - p.e : p.P;
}

// Altura del cuerpo (laterales): el alto total menos la franja del zócalo.
function alturaCuerpo(p) {
  return p.H - p.hp;
}

function llevaPuertasCorrederas(p) {
  return p.nP > 0 && p.tipoPuerta === 'corredera';
}

// Profundidad libre para una repisa. Con puerta batiente, la misma de
// siempre. Con puerta corredera hay que restarle además el espacio real que
// consume el mecanismo empotrado cerca del frente (ver
// profundidadMecanismoCorredera). En ambos casos se descuenta además el
// espesor del respaldo estructural (p.e): la repisa parte en z=e, justo
// contra su cara delantera, no en z=0 (adentro del panel mismo).
function profundidadRepisa(p) {
  if (llevaPuertasCorrederas(p)) return p.P - profundidadMecanismoCorredera(p) - p.e;
  return profundidadCuerpo(p) - 20 - p.e;
}

// Profundidad de referencia para las cajas de cajón (antes de aplicarles
// sus propios márgenes de montaje de corredera). Con puerta corredera, el
// cajón no puede llegar más allá de donde empieza el mecanismo de la puerta.
// Sin puertas, o con batientes (donde el frente del cajón queda a la vista,
// por delante del cuerpo — ver generarSeccionFrentes), la caja llega hasta
// el canto de los laterales, justo detrás de su frente.
function profundidadParaCajas(p) {
  if (llevaPuertasCorrederas(p)) return p.P - profundidadMecanismoCorredera(p);
  return profundidadCuerpo(p);
}

function generarDespiece(paramsUsuario = {}, { plancha = medidasUtilesPlancha({ plancha: 'CL' }) } = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  // La puerta corredera siempre son 2 hojas (superpuestas en dos rieles) —
  // no es una cantidad que elija el cliente, así que no se confía en lo que
  // venga en paramsUsuario.nP para este caso.
  if (p.nP > 0 && p.tipoPuerta === 'corredera') p.nP = 2;
  validarParametros(p);
  p.hayCajones = p.secciones.some(s => (s.cajones || 0) > 0);
  validarAltoContraPlancha(p, plancha);

  const cuerpos = dividirEnCuerpos(p.secciones.map(s => Number(s.ancho) || 0), anchoMaximoCuerpo(p, plancha));
  const variosCuerpos = cuerpos.length > 1;

  const piezas = [];
  const herrajesPorCuerpo = [];
  const notasSecciones = [];
  const anchosCuerpos = [];
  let xOrigen = 0;
  let divisoresPrevios = 0;
  let totalCajones = 0;

  cuerpos.forEach((indices, k) => {
    const cuerpo = generarCuerpo({ ...p, secciones: indices.map(i => p.secciones[i]) }, {
      indicePrimeraSeccion: indices[0],
      bordeIzq: k === 0 ? 'exterior' : 'union',
      bordeDer: k === cuerpos.length - 1 ? 'exterior' : 'union',
      divisoresPrevios,
    });
    const prefijo = variosCuerpos ? `cuerpo${k + 1}_` : '';
    piezas.push(...cuerpo.piezas.map(pz => trasladarAlCuerpo(pz, xOrigen, prefijo)));
    herrajesPorCuerpo.push(cuerpo.herrajes);
    notasSecciones.push(...cuerpo.notas);
    anchosCuerpos.push(cuerpo.ancho);
    xOrigen += cuerpo.ancho;
    divisoresPrevios += cuerpo.numDivisores;
    totalCajones += cuerpo.totalCajones;
  });
  // El ancho total no lo manda el cliente: es la suma real de las secciones
  // (ver comentario de calcularSecciones).
  p.A = xOrigen;
  p.numCuerpos = cuerpos.length;

  const notas = [];
  if (variosCuerpos) {
    notas.push(
      `El closet se arma en ${cuerpos.length} cuerpos independientes (de ${anchosCuerpos.map(a => Math.round(a)).join(', ')} mm de ancho), ` +
      'para que ninguna pieza quede más grande que la plancha. Arma cada cuerpo por separado y después atorníllalos entre sí, ' +
      `lateral con lateral, con tornillo de 30 mm (${TORNILLOS_POR_UNION_CUERPOS} por unión, repartidos a lo alto).`
    );
  }
  notas.push(...notasSecciones);

  if (llevaPuertasCorrederas(p)) {
    notas.push(
      'Las puertas correderas quedan empotradas dentro del mueble, a ras de laterales, piso y techo — no llevan tapacantos ni riel visible por fuera.' +
      (variosCuerpos ? ' Cada cuerpo lleva su propio par de puertas, en sus propios rieles.' : '')
    );
  } else if (p.nP === 0) {
    notas.push('Closet abierto (sin puertas): las secciones quedan a la vista.');
  }

  if (p.nP > 0 && p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  if (totalCajones > 0) {
    if (llevaPuertasCorrederas(p)) {
      notas.push('Los cajones quedan detrás de las puertas, sin manilla — se abren metiendo la mano por el hueco de 30mm entre uno y otro (o entre el de más arriba y la tapa de la cajonera).');
    } else if (llevaPuertasBatientes(p)) {
      notas.push('En las secciones con cajones, la puerta parte sobre la cajonera: los frentes de los cajones quedan a la vista, a ras de las puertas, para que no choquen con las bisagras. Van sin manilla — se abren metiendo la mano por el hueco de 30mm entre uno y otro (o entre el de más arriba y la puerta).');
    } else {
      notas.push('Los cajones van sin manilla — se abren metiendo la mano por el hueco de 30mm entre uno y otro (o entre el de más arriba y la tapa de la cajonera).');
    }
  }

  // Uniones entre cuerpos vecinos, lateral con lateral.
  const herrajesUnion = variosCuerpos
    ? [{ tipo: 'tornillo_30mm', cantidad: (cuerpos.length - 1) * TORNILLOS_POR_UNION_CUERPOS }]
    : [];
  const herrajes = sumarHerrajes([...herrajesPorCuerpo, herrajesUnion], ORDEN_HERRAJES);

  return {
    modulo: 'closet',
    parametros: p,
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// Un cuerpo completo (caja independiente) con sus secciones, en coordenadas
// LOCALES a él mismo (x: 0 a su ancho) — generarDespiece lo traslada a su
// lugar dentro del closet. `p.secciones` son solo las de este cuerpo;
// `indicePrimeraSeccion` y `divisoresPrevios` mantienen la numeración de
// secciones y divisores corrida a lo largo de todo el closet.
function generarCuerpo(p, { indicePrimeraSeccion, bordeIzq, bordeDer, divisoresPrevios }) {
  const { secciones, divisores, anchoTotal } = calcularSecciones(p, { indicePrimeraSeccion, bordeIzq, bordeDer, divisoresPrevios });
  p.A = anchoTotal;

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasZocalo(p),
    ...piezasDivisores(p, divisores),
  ];

  const notas = [];
  let totalCajones = 0;
  let totalRepisas = 0;
  let totalCajoneras = 0;

  secciones.forEach(seccion => {
    const { piezas: piezasFrentes, cajaInfos, zonaLibreDesde, yTapaCajonera } = generarSeccionFrentes(p, seccion);
    piezas.push(...piezasFrentes);
    if (yTapaCajonera != null) {
      totalCajoneras += 1;
      seccion.yInicioPuerta = yTapaCajonera;
    }

    if (cajaInfos.length > 0) {
      piezas.push(...piezasCajasSeccion(p, cajaInfos, seccion.indice));
      totalCajones += cajaInfos.length;
    }

    const piezasRepisasSec = piezasRepisasSeccion(p, seccion, zonaLibreDesde);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;

    if (seccion.colgador) {
      notas.push(`Sección ${seccion.indice + 1}: barra colgadora a ${alturaColgadorEfectiva(p, zonaLibreDesde)}mm desde el piso interior.`);
    }
  });

  let puertas = { totalPuertas: 0, bisagrasRectas: 0, bisagrasSemicurvas: 0 };
  if (llevaPuertasCorrederas(p)) {
    piezas.push(...piezasPuertasCorrederas(p));
  } else if (llevaPuertasBatientes(p)) {
    puertas = piezasPuertasBatientes(p, secciones);
    piezas.push(...puertas.piezas);
  }

  const herrajes = generarHerrajes(p, { totalCajones, totalRepisas, totalCajoneras, secciones, divisores, puertas });

  return { piezas, herrajes, notas, ancho: anchoTotal, numDivisores: divisores.length, totalCajones };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  // El ancho (A) no es un input real: se calcula en calcularSecciones como
  // la suma de las secciones (cada una ya valida su propio ancho ahí).
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (p.H <= p.hp) throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  if (p.nP < 0) throw new Error('La cantidad de puertas no puede ser negativa');
  if (!['batiente', 'corredera'].includes(p.tipoPuerta)) {
    throw new Error('tipoPuerta debe ser "batiente" o "corredera"');
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El closet debe tener al menos 1 sección');
  }
  for (const s of p.secciones) {
    if (s.cajones < 0) throw new Error('La cantidad de cajones no puede ser negativa');
    if (s.repisas < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  }
}

// ---------- Tamaño de los cuerpos según la plancha ----------
// (ver largoMaximoPieza y dividirEnCuerpos en shared.js)
// Los laterales (profundidad x alto del cuerpo) son las piezas más largas
// del closet: si no caben en la plancha, no hay forma de armarlo — se
// rechaza con la medida máxima en vez de dejar que el optimizador de corte
// falle con un mensaje técnico.
function validarAltoContraPlancha(p, plancha) {
  const altoMaximoCuerpo = largoMaximoPieza(profundidadCuerpo(p), plancha);
  if (alturaCuerpo(p) > altoMaximoCuerpo) {
    throw new Error(
      `Con la plancha "${plancha.nombre}", los laterales del closet pueden medir a lo más ${Math.floor(altoMaximoCuerpo)} mm, así que el closet completo (con zócalo) puede medir hasta ${Math.floor(altoMaximoCuerpo + p.hp)} mm de alto. Baja el alto o elige una plancha más larga.`
    );
  }
}

// Ancho máximo de un cuerpo para que todas sus piezas quepan enteras en la
// plancha. La que primero deja de caber es el respaldo (ancho interior del
// cuerpo por su alto interior); el piso y el techo (ancho interior por la
// profundidad) casi nunca, pero se revisan igual.
function anchoMaximoCuerpo(p, plancha) {
  const { e } = p;
  const anchoInterior = Math.min(
    largoMaximoPieza(alturaCuerpo(p) - 2 * e, plancha),
    largoMaximoPieza(profundidadCuerpo(p), plancha)
  );
  return anchoInterior + 2 * e;
}

// Orden de los herrajes del closet al sumar varios cuerpos — el mismo en que
// los lista generarHerrajes para un solo cuerpo.
const ORDEN_HERRAJES = [
  /^corredera_/, /^soporte_repisa/, /^tubo_colgador/, /^soporte_tubo/, /^riel_/, /^kit_ruedas/, /^tirador/,
  /^bisagra_codo_35mm$/, /^bisagra_codo_semicurva/, /^manilla/, /^pata/, /^escuadra/, /^taco/,
  /^tornillo_confirmat/, /^tornillo_30mm$/, /^tornillo_aglomerado/,
];

// Una sección "solo colgador" (sin cajones) no necesita un divisor de por
// medio con la siguiente si esta también es solo colgador: la barra puede
// correr de corrido y no hace falta un panel partiendo el hueco en dos.
function esColgadorPuro(seccion) {
  return (seccion.cajones || 0) === 0 && !!seccion.colgador;
}

// Puertas batientes: un tramo entre dos paneles reales (lateral o divisor)
// se cierra con 1 puerta, o con 2 si es más ancho que ANCHO_PARA_DOS_PUERTAS
// — una con bisagras en cada panel. Nunca 3: la del medio no tendría panel
// donde llevar bisagras. Por eso un tramo no puede pasar de 2 puertas de
// ANCHO_MAXIMO_HOJA.
const ANCHO_PARA_DOS_PUERTAS = 500;
const ANCHO_MAXIMO_HOJA = 600;
const ANCHO_MAXIMO_TRAMO_BATIENTE = 2 * ANCHO_MAXIMO_HOJA;

function llevaPuertasBatientes(p) {
  return p.nP > 0 && p.tipoPuerta === 'batiente';
}

// Para cada borde entre dos secciones vecinas, si va SIN divisor (dos
// secciones "solo colgador" seguidas). Con puertas batientes hay un tope: si
// el tramo sin divisor pasara de lo que cierran 2 puertas, el divisor se
// queda — hace falta ese panel para las bisagras.
function bordesSinDivisor(p) {
  const sinDivisor = [];
  let anchoTramo = p.secciones[0].ancho || 0;
  for (let i = 0; i < p.secciones.length - 1; i++) {
    const anchoSiguiente = p.secciones[i + 1].ancho || 0;
    let abierto = esColgadorPuro(p.secciones[i]) && esColgadorPuro(p.secciones[i + 1]);
    if (abierto && llevaPuertasBatientes(p) && anchoTramo + anchoSiguiente > ANCHO_MAXIMO_TRAMO_BATIENTE) {
      abierto = false;
    }
    anchoTramo = abierto ? anchoTramo + anchoSiguiente : anchoSiguiente;
    sinDivisor.push(abierto);
  }
  return sinDivisor;
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

// ---------- 2b. Zócalo ----------
// Igual que la despensa: el cuerpo descansa sobre patas regulables (ver
// generarHerrajes) y el zócalo es el panel que las tapa — un frontal entre
// dos retornos, uno por costado. Va a ras del frente del mueble: de la cara
// de las puertas batientes si las hay, o del canto de los laterales si no.
function piezasZocalo(p) {
  const { A, e, hp, colorExterior } = p;
  const altoZocalo = hp - 10;
  const profundidad = llevaPuertasBatientes(p) ? p.P : profundidadCuerpo(p);

  return [
    {
      id: 'zocalo_frontal',
      ancho: A - 2 * e, alto: altoZocalo, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: -hp, z: profundidad - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: profundidad, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: profundidad, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3. Reparto del ancho en secciones + divisores ----------
// Cada sección trae su propio ancho obligatorio (mismo criterio que mueble
// cocina): el ancho NOMINAL tal como se ve por fuera, compartiendo la mitad
// de cada separador con la sección vecina — no el ancho interior puro. El
// ancho total del closet no es un dato que mande el cliente: se calcula acá
// como la suma real de las secciones (ver anchoTotal en el resultado) —
// mismo criterio que muebleBajoCocina.js. Cada divisor interno es UNA sola
// pieza compartida entre la sección de su izquierda y la de su derecha.
// Trabaja sobre las secciones de UN cuerpo (`p.secciones`): sus dos bordes
// extremos son o el lateral exterior del closet ('exterior') o el lateral
// propio con que se une al cuerpo vecino ('union').
function calcularSecciones(p, { indicePrimeraSeccion = 0, bordeIzq = 'exterior', bordeDer = 'exterior', divisoresPrevios = 0 } = {}) {
  const { e } = p;
  const n = p.secciones.length;

  // Tipo de cada uno de los n+1 "bordes" entre secciones (ver el mismo
  // criterio en muebleBajoCocina.js): 'exterior' contra un lateral de
  // verdad, 'union' contra el lateral con que este cuerpo se une al vecino,
  // 'divisor' contra un separador interno de verdad, o 'abierto' cuando no
  // hay separador (dos secciones "solo colgador" seguidas, ver
  // bordesSinDivisor) — en ese caso nunca hay cajones a ninguno de los dos
  // lados, así que el frente-overlay ni siquiera llega a mirar este borde.
  const bordes = new Array(n + 1).fill('divisor');
  bordes[0] = bordeIzq;
  bordes[n] = bordeDer;
  bordesSinDivisor(p).forEach((abierto, i) => {
    if (abierto) bordes[i + 1] = 'abierto';
  });

  function extensionPorBorde(tipo) {
    if (tipo === 'exterior' || tipo === 'union') return e;
    if (tipo === 'divisor') return e / 2;
    return 0; // 'abierto'
  }
  function holguraPorBorde(tipo) {
    if (tipo === 'divisor') return 1;
    if (tipo === 'union') return HOLGURA_UNION_CUERPOS;
    return 0;
  }
  const extensiones = p.secciones.map((s, i) => ({
    extIzq: extensionPorBorde(bordes[i]),
    extDer: extensionPorBorde(bordes[i + 1]),
  }));

  // Cada sección trae su propio ancho obligatorio (mismo criterio que los
  // módulos de mueble de cocina/aéreo) — no hay reparto automático.
  const anchosInteriores = p.secciones.map((s, i) => {
    const numero = indicePrimeraSeccion + i + 1;
    if (!s.ancho) {
      throw new Error(`Sección ${numero}: cada sección debe traer su propio ancho.`);
    }
    const { extIzq, extDer } = extensiones[i];
    const interior = s.ancho - extIzq - extDer;
    if (interior < 200) {
      throw new Error(
        `Sección ${numero}: con ${Math.round(s.ancho)}mm de ancho, el hueco interior real quedaría en solo ${Math.round(interior)}mm. Sube el ancho de esta sección a al menos ${Math.round(extIzq + extDer + 200)}mm.`
      );
    }
    return interior;
  });

  const secciones = [];
  const divisores = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosInteriores[i];
    const xInicio = x;
    const { extIzq, extDer } = extensiones[i];
    secciones.push({
      ...p.secciones[i],
      indice: indicePrimeraSeccion + i,
      xInicio, anchoSeccion,
      xInicioFrente: xInicio - extIzq,
      anchoSeccionFrente: anchoSeccion + extIzq + extDer,
      holguraIzq: holguraPorBorde(bordes[i]),
      holguraDer: holguraPorBorde(bordes[i + 1]),
      bordeIzq: bordes[i],
      abiertoDer: bordes[i + 1] === 'abierto',
    });
    x += anchoSeccion;
    if (i < n - 1) {
      if (bordes[i + 1] !== 'abierto') {
        divisores.push({ id: `divisor_${divisoresPrevios + divisores.length + 1}`, x });
        x += e;
      }
    }
  }
  return { secciones, divisores, anchoTotal: x + e };
}

// Reparte n frentes iguales (frentes de cajón) dentro de la zona "overlay" de
// una sección — montados por encima del canto del lateral/separador que la
// bordea, con 2mm de holgura entre ellos si hay más de uno (mismo patrón que
// muebleBajoCocina.js).
function repartirFrentes(seccion, n) {
  const { xInicioFrente, anchoSeccionFrente, holguraIzq, holguraDer } = seccion;
  const anchoDisponible = anchoSeccionFrente - holguraIzq - holguraDer - (n - 1) * 2;
  const anchoFrente = anchoDisponible / n;
  const posiciones = [];
  let x = xInicioFrente + holguraIzq;
  for (let i = 0; i < n; i++) {
    posiciones.push(x);
    x += anchoFrente + 2;
  }
  return { anchoFrente, posiciones };
}

// El divisor no llega hasta el borde real del mueble por delante: lo tapa la
// puerta (igual que los laterales — mismo descuento de profundidadCuerpo).
// En altura queda insertado entre el piso y el techo en vez de correr por
// detrás de ellos — el piso y el techo son piezas de ancho completo que
// "pasan por encima/debajo" del divisor, no al revés. Por detrás, en cambio,
// NO llega hasta z=0: ahí está el respaldo estructural (ocupa z=0 a z=e), así
// que el divisor parte en z=e (a tope contra su cara delantera) y se
// atornilla contra él — mismo criterio que la repisa (ver profundidadRepisa).
function piezasDivisores(p, divisores) {
  const { e, colorInterior } = p;
  const H = alturaCuerpo(p);
  // Con puerta corredera, el divisor tampoco puede llegar hasta el frente
  // real: ahí corre el mecanismo empotrado (ver profundidadMecanismoCorredera)
  // y un panel sólido lo bloquearía — mismo descuento que ya usa la repisa
  // (ver profundidadRepisa) para dejarle el paso libre.
  const reduccionCorredera = llevaPuertasCorrederas(p) ? profundidadMecanismoCorredera(p) : 0;
  const P = profundidadCuerpo(p) - e - reduccionCorredera;
  return divisores.map(d => ({
    id: d.id,
    ancho: P, alto: H - 2 * e, espesor: e,
    cantos: ['delantero'],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: d.x, y: e, z: e },
    rotacion: 'vertical_profundidad',
  }));
}

// ---------- 4. Frentes de cajón dentro de una sección ----------
// Los cajones de una sección se apilan desde su piso; el resto de la altura
// de la sección (arriba de los cajones) queda libre para repisas/colgador.
// El cajón de más arriba siempre queda cerrado por una tapa (mismo criterio
// que la cajonera del escritorio): separa la cajonera del resto de la
// sección en vez de dejar el cajón de arriba a la vista del hueco abierto.
// Los cajones nunca llevan manilla (ver constantes arriba), así que siempre
// usan el gap de 30mm, con o sin puerta.
//
// Dónde va el frente depende de las puertas:
//   - Correderas: el cajón queda escondido detrás de las hojas, dentro del
//     cuerpo — su frente cabe ENTRE los dos paneles que bordean la sección
//     (HOLGURA_FRENTE_INTERIOR por lado) y detrás de todo el mecanismo.
//   - Sin puertas, o batientes: el frente monta por delante del canto de
//     esos paneles (overlay) y queda a la vista. Con batientes la puerta de
//     la sección parte sobre la cajonera (ver piezasPuertasBatientes): un
//     cajón escondido detrás chocaría con las bisagras, que van atornilladas
//     a la cara interior de los mismos paneles. Ahí el frente lleva el
//     espesor de las puertas, para quedar a ras de ellas.
// Devuelve, si hay cajonera, la altura de su tapa (`yTapaCajonera`): de ahí
// parte la puerta batiente de la sección.
function generarSeccionFrentes(p, seccion) {
  const { xInicio, anchoSeccion, cajones: nC, indice } = seccion;
  if (!(nC > 0)) {
    return { piezas: [], cajaInfos: [], zonaLibreDesde: p.e, yTapaCajonera: null };
  }

  const piezas = [];
  const cajaInfos = [];
  const frenteInterior = llevaPuertasCorrederas(p);
  const { anchoFrente, posiciones: [xFrente] } = frenteInterior
    ? { anchoFrente: anchoSeccion - 2 * HOLGURA_FRENTE_INTERIOR, posiciones: [xInicio + HOLGURA_FRENTE_INTERIOR] }
    : repartirFrentes(seccion, 1);
  const espesorFrente = llevaPuertasBatientes(p) ? p.espesorPuertas : p.e;
  // Escondido: arranca justo donde termina el mecanismo de la corredera. A la
  // vista: por delante del canto de los paneles, igual que las puertas.
  const zFrente = frenteInterior
    ? profundidadCuerpo(p) - profundidadMecanismoCorredera(p)
    : profundidadCuerpo(p);
  const gap = GAP_CAJON_SIN_MANILLA;
  // A la vista, el frente de más abajo baja hasta tapar el canto del piso,
  // igual que la puerta de la sección vecina; escondido, tiene que quedar
  // sobre el piso (y=0 a y=e). La caja del cajón queda siempre sobre el
  // piso — ver piezasCajasSeccion.
  let ySiguiente = frenteInterior ? p.e + 3 : Y_INFERIOR_FRENTES;
  for (let i = 0; i < nC; i++) {
    const y = ySiguiente;
    piezas.push({
      id: `s${indice + 1}_frente_cajon_${i + 1}`,
      ancho: anchoFrente, alto: ALTURA_CAJON_UNIDAD, espesor: espesorFrente,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: xFrente, y, z: zFrente },
      rotacion: 'vertical_frontal',
      grupo: `s${indice + 1}_cajon${i + 1}`,
    });
    cajaInfos.push({ alturaFrente: ALTURA_CAJON_UNIDAD, posicionY: y, xInicio, anchoSeccion });
    ySiguiente = y + ALTURA_CAJON_UNIDAD + gap;
  }
  // Mismo descuento que el divisor si hay puerta corredera — ver
  // piezasDivisores.
  const reduccionCorrederaRemate = llevaPuertasCorrederas(p) ? profundidadMecanismoCorredera(p) : 0;
  piezas.push({
    id: `s${indice + 1}_cajonera_remate`,
    ancho: anchoSeccion, alto: profundidadCuerpo(p) - p.e - reduccionCorrederaRemate, espesor: p.e,
    cantos: ['delantero'],
    cantidad: 1,
    color: p.colorInterior, cara: 'interior',
    posicion: { x: xInicio, y: ySiguiente, z: p.e },
    rotacion: 'horizontal',
  });
  return { piezas, cajaInfos, zonaLibreDesde: ySiguiente + p.e, yTapaCajonera: ySiguiente };
}

// ---------- 5. Cajas de cajón (mismo patrón que muebleBajoCocina/vanitorioBano) ----------
function piezasCajasSeccion(p, cajaInfos, indiceSeccion) {
  const { e, correderaTipo, colorInterior } = p;
  const P = profundidadParaCajas(p);
  const piezas = [];

  cajaInfos.forEach((cajon, idx) => {
    const prefix = `s${indiceSeccion + 1}_cajon${idx + 1}`;
    // La caja parte a la altura de su frente, salvo la del cajón de más
    // abajo cuando el frente queda a la vista: ese frente baja hasta tapar el
    // canto del piso, pero la caja tiene que quedar por encima de él.
    const yCaja = Math.max(cajon.posicionY, e + 3);
    piezas.push(...piezasCajaCajon({
      prefijoId: prefix, grupo: prefix,
      xHueco: cajon.xInicio, anchoHueco: cajon.anchoSeccion,
      y: yCaja, alto: cajon.posicionY + cajon.alturaFrente - 30 - yCaja,
      zTrasero: 50, zDelantero: P,
      e, color: colorInterior, correderaTipo,
    }));
  });

  return piezas;
}

// ---------- 6. Repisas dentro de una sección ----------
// Si la sección lleva colgador, las repisas se agrupan arriba de la barra;
// si no, se reparten en toda la zona libre (arriba de los cajones, si hay).
function piezasRepisasSeccion(p, seccion, zonaLibreDesde) {
  const { xInicio, anchoSeccion, repisas: nRepisas, colgador, indice } = seccion;
  if (nRepisas <= 0) return [];

  const yInferiorZona = colgador ? alturaColgadorEfectiva(p, zonaLibreDesde) + 100 : zonaLibreDesde;
  const ySuperiorZona = alturaCuerpo(p) - p.e;
  const alturaZona = ySuperiorZona - yInferiorZona;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferiorZona + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `s${indice + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 2, alto: profundidadRepisa(p), espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + 1, y, z: p.e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// Altura real del colgador, medida desde el piso del cuerpo: la ideal
// (1750mm desde el piso real, o sea descontando el zócalo), pero nunca por
// debajo de la zona libre de esa sección ni tan alta que no deje margen al techo.
function alturaColgadorEfectiva(p, zonaLibreDesde) {
  const ideal = Math.min(ALTURA_COLGADOR_IDEAL - p.hp, alturaCuerpo(p) - 250);
  return Math.max(ideal, zonaLibreDesde + 200);
}

// ---------- 7. Puertas batientes (una por sección, o más si queda muy ancha) ----------
// Cada bisagra necesita un panel real detrás de su canto (un lateral o un
// divisor) — así que las puertas batientes NO se reparten a ciegas sobre el
// ancho total del closet: cada sección arma sus propias puertas dentro de
// su propio ancho (reusando xInicioFrente/anchoSeccionFrente, igual que los
// frentes de cajón). Si esa sección supera ANCHO_PARA_DOS_PUERTAS, se reparte
// en 2 puertas iguales SIN agregar un divisor nuevo — los bordes de esas
// puertas siguen cayendo en los mismos dos paneles reales que ya bordean la
// sección (una hace bisagra contra el de la izquierda, la otra contra el de
// la derecha), igual que una puerta doble de clóset común. Nunca más de 2
// (ver ANCHO_MAXIMO_TRAMO_BATIENTE). Dos o más secciones unidas por un borde
// "abierto" (sin divisor real entre sí — ver calcularSecciones) se tratan
// como una sola sección para esto (nunca llevan cajones: ver esColgadorPuro).
function agruparSeccionesParaPuertas(secciones) {
  const grupos = [];
  let inicio = 0;
  for (let i = 0; i < secciones.length; i++) {
    const siguienteEsAbierta = secciones[i].abiertoDer;
    if (!siguienteEsAbierta) {
      const primera = secciones[inicio];
      const ultima = secciones[i];
      grupos.push({
        xInicioFrente: primera.xInicioFrente,
        anchoSeccionFrente: (ultima.xInicioFrente + ultima.anchoSeccionFrente) - primera.xInicioFrente,
        holguraIzq: primera.holguraIzq,
        holguraDer: ultima.holguraDer,
        bordeIzq: primera.bordeIzq,
        indiceSeccion: primera.indice,
        yInicioPuerta: Math.max(...secciones.slice(inicio, i + 1).map(s => s.yInicioPuerta ?? Y_INFERIOR_FRENTES)),
      });
      inicio = i + 1;
    }
  }
  return grupos;
}

function piezasPuertasBatientes(p, secciones) {
  const { espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
  const grupos = agruparSeccionesParaPuertas(secciones);
  const piezas = [];
  let totalPuertas = 0;
  let bisagrasRectas = 0;
  let bisagrasSemicurvas = 0;

  grupos.forEach(grupo => {
    if (grupo.anchoSeccionFrente > ANCHO_MAXIMO_TRAMO_BATIENTE) {
      throw new Error(
        `Sección ${grupo.indiceSeccion + 1}: con puertas batientes una sección no puede medir más de ${ANCHO_MAXIMO_TRAMO_BATIENTE}mm de ancho (2 puertas de ${ANCHO_MAXIMO_HOJA}mm) — una tercera puerta al medio no tendría dónde llevar bisagras. Divídela en dos secciones o usa puertas correderas.`
      );
    }
    const nPuertas = grupo.anchoSeccionFrente > ANCHO_PARA_DOS_PUERTAS ? 2 : 1;
    const { anchoFrente, posiciones } = repartirFrentes(grupo, nPuertas);
    // En una sección con cajones la puerta parte sobre la cajonera (ver
    // generarSeccionFrentes) y queda más baja que las demás. Arriba siempre
    // llega a Y_INFERIOR_FRENTES del borde, igual que abajo.
    const yPuerta = grupo.yInicioPuerta;
    const altoPuerta = H - Y_INFERIOR_FRENTES - yPuerta;

    posiciones.forEach((x, i) => {
      piezas.push({
        id: `s${grupo.indiceSeccion + 1}_puerta_${i + 1}`,
        ancho: anchoFrente, alto: altoPuerta, espesor: espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: colorExterior, cara: 'exterior',
        posicion: { x, y: yPuerta, z: profundidadCuerpo(p) },
        rotacion: 'vertical_frontal',
      });
    });
    totalPuertas += nPuertas;

    // Si el borde izquierdo del grupo es un divisor real (no un lateral: ni
    // el exterior del closet ni el de la unión con otro cuerpo, que son
    // paneles propios), ese separador ya tiene la bisagra del grupo vecino
    // montada por el otro lado — porque el separador (15/18mm) no tiene
    // espesor para dos placas de montaje enfrentadas, este grupo usa bisagra
    // codo semicurva en su puerta más a la izquierda en vez de la recta.
    const bisagrasPorPuerta = bisagrasPorAltura(altoPuerta);
    const puertasSemicurva = grupo.bordeIzq === 'divisor' ? 1 : 0;
    bisagrasSemicurvas += puertasSemicurva * bisagrasPorPuerta;
    bisagrasRectas += (nPuertas - puertasSemicurva) * bisagrasPorPuerta;
  });

  return { piezas, totalPuertas, bisagrasRectas, bisagrasSemicurvas };
}

// Puertas correderas EMPOTRADAS: quedan dentro del cuerpo, a ras del límite
// exterior de piso, techo y laterales — ninguna hoja sobresale por delante
// (a diferencia del riel colgante tradicional, que monta una hoja por
// fuera). Van en dos rieles empotrados (uno más atrás que el otro, con
// GAP_ENTRE_RIELES_CORREDERA de aire entre ambos), los dos dentro de la
// profundidad del cuerpo — por eso no hace falta tapacantos ni riel visible
// por fuera. Los laterales mandan con la profundidad completa (ver
// profundidadCuerpo) — la puerta necesita un tope real contra el que
// chocar — así que el ancho disponible para las puertas también se acorta
// 2*e (el espesor de cada lateral), en vez de correr de punta a punta como
// con una puerta batiente. El "solape" es el traslape real entre dos
// puertas contiguas, repartido mitad y mitad para cada una. Con varios
// cuerpos, cada uno lleva su propio par de hojas: el lateral de unión entre
// dos cuerpos corre todo el fondo y cortaría un riel de punta a punta.
function piezasPuertasCorrederas(p) {
  const { A, e, nP, espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
  const solape = 40; // mm de traslape entre paneles contiguos
  const anchoDisponible = (A - 2 * e) + (nP - 1) * solape;
  const anchoPuerta = anchoDisponible / nP;
  const paso = anchoPuerta - solape;
  const alturaPuerta = H - 2 * e - HOLGURA_RIEL_SUPERIOR - HOLGURA_RIEL_INFERIOR;
  const yPuerta = e + HOLGURA_RIEL_INFERIOR;
  // La hoja del riel delantero queda con su cara exterior justo al ras del
  // canto de los laterales (z = profundidadCuerpo); la del riel trasero
  // retrocede su propio espesor más el aire entre rieles — ambas quedan
  // contenidas dentro de la profundidad del cuerpo, nada sobresale.
  const zRielDelantero = profundidadCuerpo(p) - espesorPuertas;
  const zRielTrasero = zRielDelantero - espesorPuertas - GAP_ENTRE_RIELES_CORREDERA;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    const enRielTrasero = i % 2 === 0; // los paneles alternan entre riel delantero y trasero
    piezas.push({
      id: `puerta_corredera_${i + 1}`,
      ancho: anchoPuerta, alto: alturaPuerta, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e + i * paso, y: yPuerta, z: enRielTrasero ? zRielTrasero : zRielDelantero },
      rotacion: 'vertical_frontal',
    });
  }
  return piezas;
}

// ---------- 8. Herrajes (de un cuerpo) ----------
function generarHerrajes(p, {
  totalCajones, totalRepisas, totalCajoneras, secciones, divisores, puertas,
}) {
  const herrajes = [];

  if (totalCajones > 0) {
    const largoCorredera = largoCorrederaComercial(profundidadParaCajas(p) - 60);
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${largoCorredera}mm`
      : `corredera_oculta_${largoCorredera}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    // Los cajones del closet nunca llevan manilla (ver generarSeccionFrentes) —
    // se abren directo con la mano por el gap de 30mm entre uno y otro.
  }

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  secciones.forEach(seccion => {
    if (!seccion.colgador) return;
    const largoTubo = Math.round(seccion.anchoSeccion - 20);
    const soportes = seccion.anchoSeccion > 1200 ? 3 : 2;
    herrajes.push({ tipo: `tubo_colgador_redondo_${largoTubo}mm_seccion${seccion.indice + 1}`, cantidad: 1 });
    herrajes.push({ tipo: 'soporte_tubo_colgador', cantidad: soportes });
  });

  if (llevaPuertasCorrederas(p)) {
    herrajes.push({ tipo: `riel_corredera_superior_empotrado_${Math.round(p.A)}mm`, cantidad: 1 });
    herrajes.push({ tipo: `riel_guia_inferior_empotrado_${Math.round(p.A)}mm`, cantidad: 1 });
    herrajes.push({ tipo: 'kit_ruedas_puerta_corredera', cantidad: p.nP });
    herrajes.push({ tipo: 'tirador_embutido_o_perfil_uñero', cantidad: p.nP });
  } else if (llevaPuertasBatientes(p)) {
    // La cantidad de bisagras va por puerta, según su alto: la puerta que
    // parte sobre una cajonera es más baja y puede llevar menos.
    if (puertas.bisagrasRectas > 0) {
      herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: puertas.bisagrasRectas });
    }
    if (puertas.bisagrasSemicurvas > 0) {
      herrajes.push({ tipo: 'bisagra_codo_semicurva_35mm', cantidad: puertas.bisagrasSemicurvas });
    }
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: puertas.totalPuertas });
  }

  // Dos patas (adelante y atrás) bajo cada panel vertical — los dos
  // laterales y cada divisor —, que es por donde baja el peso del closet.
  herrajes.push({ tipo: 'pata_regulable', cantidad: (divisores.length + 2) * 2 });

  const puntosColgado = p.A > 900 ? 3 : 2;
  herrajes.push({ tipo: 'escuadra_colgado_pared', cantidad: puntosColgado });
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgado });

  // El respaldo estructural se atornilla por su perímetro (2 laterales +
  // piso + techo, ~10 puntos de fijación) y, donde cruza por detrás de cada
  // divisor interno, también ahí (2 tornillos por cruce) — mismo criterio
  // que antes usaban los travesaños traseros, que este respaldo reemplaza.
  const tornillosRespaldo = 10 + divisores.length * 2;

  // cuerpo + fijación de divisores + tapa de cada cajonera + respaldo + cajas de cajón
  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 8 + divisores.length * 4 + totalCajoneras * 4 + tornillosRespaldo + totalCajones * 4 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
