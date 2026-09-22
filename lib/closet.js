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
 *
 * Las puertas son globales: cubren todo el ancho del closet por fuera,
 * independientes de cómo esté organizado el interior por secciones.
 * Pueden ser batientes (con bisagra) o correderas (sobre riel, en dos
 * planos que se solapan).
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes } from './shared';

const DEFAULTS = {
  A: 2400,       // ancho exterior
  H: 2200,       // alto exterior del cuerpo (típico piso a techo)
  P: 580,        // profundidad exterior (holgura para colgar ropa)
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  nP: 0,         // cantidad de puertas globales (0 = closet abierto, secciones a la vista)
  tipoPuerta: 'batiente', // 'batiente' | 'corredera'
  correderaTipo: 'bola',  // corredera de los CAJONES (no confundir con tipoPuerta)
  secciones: [
    { cajones: 2, repisas: 2, colgador: false },
    { cajones: 0, repisas: 1, colgador: true },
    { cajones: 2, repisas: 2, colgador: false },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const ALTURA_COLGADOR_IDEAL = 1750; // mm desde el piso, holgura estándar para colgar camisas/pantalones
const ALTURA_CAJON_UNIDAD = 200;    // mm de altura de frente por cajón

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
function profundidadCuerpo(p) {
  if (p.tipoPuerta === 'corredera') return p.P;
  return p.P - p.espesorPuertas;
}

// Profundidad libre para una repisa. Con puerta batiente, la misma de
// siempre. Con puerta corredera hay que restarle además el espacio real
// que consume el mecanismo cerca del frente: 30mm de las dos puertas
// solapadas (riel trasero + riel delantero), 10mm de juego entre ambas
// puertas, y 40mm de juego entre la puerta más interior y el contenido —
// 80mm en total, sobre la profundidad TOTAL del mueble.
function profundidadRepisa(p) {
  if (p.tipoPuerta === 'corredera') return p.P - 80;
  return profundidadCuerpo(p) - 20;
}

// Profundidad de referencia para las cajas de cajón (antes de aplicarles
// sus propios márgenes de montaje de corredera, más abajo). Mismo criterio
// que profundidadRepisa: con puerta corredera, el cajón tampoco puede
// llegar más allá de donde empieza a molestar el mecanismo de la puerta.
function profundidadParaCajas(p) {
  if (p.tipoPuerta === 'corredera') return p.P - 80;
  return profundidadCuerpo(p);
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametros(p);

  const { secciones, divisores } = calcularSecciones(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasDivisores(p, divisores),
  ];

  const notas = [];
  let totalCajones = 0;
  let totalRepisas = 0;
  let totalCajoneras = 0;

  secciones.forEach((seccion, i) => {
    const { piezas: piezasFrentes, cajaInfos, zonaLibreDesde, tieneCajonera } = generarSeccionFrentes(p, seccion, i);
    piezas.push(...piezasFrentes);
    if (tieneCajonera) totalCajoneras += 1;

    if (cajaInfos.length > 0) {
      piezas.push(...piezasCajasSeccion(p, cajaInfos, i));
      totalCajones += cajaInfos.length;
    }

    const piezasRepisasSec = piezasRepisasSeccion(p, seccion, zonaLibreDesde, i);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;

    if (seccion.colgador) {
      notas.push(`Sección ${i + 1}: barra colgadora a ${alturaColgadorEfectiva(p, zonaLibreDesde)}mm desde el piso interior.`);
    }
  });

  if (p.nP > 0) {
    piezas.push(...piezasPuertasGlobales(p));
    if (p.tipoPuerta === 'corredera') {
      piezas.push(piezaTapaCantoSuperior(p));
      notas.push('El tapacanto superior tapa el riel de las puertas correderas por fuera — se atornilla desde adentro, sin herraje adicional.');
    }
  } else {
    notas.push('Closet abierto (sin puertas): las secciones quedan a la vista.');
  }

  if (p.nP > 0 && p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  const herrajes = generarHerrajes(p, { totalCajones, totalRepisas, totalCajoneras, secciones, divisores });

  return {
    modulo: 'closet',
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
  if (p.nP < 0) throw new Error('La cantidad de puertas no puede ser negativa');
  if (!['batiente', 'corredera'].includes(p.tipoPuerta)) {
    throw new Error('tipoPuerta debe ser "batiente" o "corredera"');
  }
  if (p.nP > 0 && p.tipoPuerta === 'corredera' && p.nP < 2) {
    throw new Error('Las puertas correderas requieren al menos 2 paneles');
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El closet debe tener al menos 1 sección');
  }
  for (const s of p.secciones) {
    if (s.cajones < 0) throw new Error('La cantidad de cajones no puede ser negativa');
    if (s.repisas < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  }
  // El ancho de cada sección (fijo o automático) se valida en calcularSecciones,
  // que ya conoce el ancho fijo real de cada una — acá solo se valida lo que
  // no depende de esa cuenta.
}

// Una sección "solo colgador" (sin cajones) no necesita un divisor de por
// medio con la siguiente si esta también es solo colgador: la barra puede
// correr de corrido y no hace falta un panel partiendo el hueco en dos.
function esColgadorPuro(seccion) {
  return (seccion.cajones || 0) === 0 && !!seccion.colgador;
}

function contarDivisoresNecesarios(secciones) {
  let n = 0;
  for (let i = 0; i < secciones.length - 1; i++) {
    if (!(esColgadorPuro(secciones[i]) && esColgadorPuro(secciones[i + 1]))) n++;
  }
  return n;
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno).
function piezasCuerpo(p) {
  const { A, H, e, colorInterior, colorExterior } = p;
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

// ---------- 3. Reparto del ancho en secciones + divisores ----------
// Cada sección admite un "ancho fijo" opcional (mismo criterio que mueble
// cocina): el ancho NOMINAL tal como se ve por fuera, compartiendo la mitad
// de cada separador con la sección vecina — no el ancho interior puro. Las
// secciones sin ancho fijo se reparten en partes iguales el ancho que sobra
// después de descontar las que sí lo tienen. Cada divisor interno es UNA
// sola pieza compartida entre la sección de su izquierda y la de su derecha.
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const nDivisores = contarDivisoresNecesarios(p.secciones);

  // Tipo de cada uno de los n+1 "bordes" entre secciones (ver el mismo
  // criterio en muebleBajoCocina.js): 'exterior' contra un lateral de
  // verdad, 'divisor' contra un separador interno de verdad, o 'abierto'
  // cuando no hay separador (dos secciones "solo colgador" seguidas) — en
  // ese caso nunca hay cajones a ninguno de los dos lados, así que el
  // frente-overlay ni siquiera llega a mirar este borde.
  const bordes = new Array(n + 1).fill('divisor');
  bordes[0] = 'exterior';
  bordes[n] = 'exterior';
  for (let i = 0; i < n - 1; i++) {
    const necesitaDivisor = !(esColgadorPuro(p.secciones[i]) && esColgadorPuro(p.secciones[i + 1]));
    if (!necesitaDivisor) bordes[i + 1] = 'abierto';
  }

  function extensionPorBorde(tipo) {
    if (tipo === 'exterior') return e;
    if (tipo === 'divisor') return e / 2;
    return 0; // 'abierto'
  }
  function holguraPorBorde(tipo) {
    return tipo === 'divisor' ? 1 : 0;
  }
  const extensiones = p.secciones.map((s, i) => ({
    extIzq: extensionPorBorde(bordes[i]),
    extDer: extensionPorBorde(bordes[i + 1]),
  }));

  let anchoFijoInteriorTotal = 0;
  let nAutomaticas = 0;
  const anchosInteriores = p.secciones.map((s, i) => {
    if (!s.ancho) { nAutomaticas++; return null; }
    const { extIzq, extDer } = extensiones[i];
    const interior = s.ancho - extIzq - extDer;
    if (interior < 200) {
      throw new Error(
        `Sección ${i + 1}: con ${Math.round(s.ancho)}mm de ancho fijo, el hueco interior real quedaría en solo ${Math.round(interior)}mm. Sube el ancho fijo de esta sección a al menos ${Math.round(extIzq + extDer + 200)}mm.`
      );
    }
    anchoFijoInteriorTotal += interior;
    return interior;
  });

  const ANCHO_MIN_SECCION_AUTOMATICA = 200;
  const anchoMinimoA = Math.ceil(
    anchoFijoInteriorTotal + nAutomaticas * ANCHO_MIN_SECCION_AUTOMATICA + 2 * e + nDivisores * e
  );
  const anchoInteriorTotal = A - 2 * e - nDivisores * e;
  const anchoRestante = anchoInteriorTotal - anchoFijoInteriorTotal;
  if (anchoRestante < 0) {
    throw new Error(
      `Las secciones de este closet (sumando sus anchos fijos) no caben dentro de un mueble de ${A}mm de ancho exterior. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o quita/achica secciones.`
    );
  }
  const anchoAutomatico = nAutomaticas > 0 ? anchoRestante / nAutomaticas : 0;
  if (nAutomaticas > 0 && anchoAutomatico < ANCHO_MIN_SECCION_AUTOMATICA) {
    throw new Error(
      `Con estas secciones, las de ancho libre quedan de solo ${Math.round(anchoAutomatico)}mm de ancho interior. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o reduce/achica secciones.`
    );
  }

  const secciones = [];
  const divisores = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosInteriores[i] ?? anchoAutomatico;
    const xInicio = x;
    const { extIzq, extDer } = extensiones[i];
    secciones.push({
      ...p.secciones[i],
      xInicio, anchoSeccion,
      xInicioFrente: xInicio - extIzq,
      anchoSeccionFrente: anchoSeccion + extIzq + extDer,
      holguraIzq: holguraPorBorde(bordes[i]),
      holguraDer: holguraPorBorde(bordes[i + 1]),
    });
    x += anchoSeccion;
    if (i < n - 1) {
      if (bordes[i + 1] !== 'abierto') {
        divisores.push({ id: `divisor_${divisores.length + 1}`, x });
        x += e;
      }
    }
  }
  return { secciones, divisores };
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

// El divisor no llega hasta el borde real del mueble por ningún lado: por
// delante lo tapa la puerta (igual que los laterales — mismo descuento de
// profundidadCuerpo), y en altura queda insertado entre el piso y el techo
// en vez de correr por detrás de ellos — el piso y el techo son piezas de
// ancho completo que "pasan por encima/debajo" del divisor, no al revés.
function piezasDivisores(p, divisores) {
  const { H, e, colorInterior } = p;
  const P = profundidadCuerpo(p);
  return divisores.map(d => ({
    id: d.id,
    ancho: P, alto: H - 2 * e, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: d.x, y: e, z: 0 },
    rotacion: 'vertical_profundidad',
  }));
}

// ---------- 4. Frentes de cajón dentro de una sección ----------
// Los cajones de una sección se apilan desde su piso; el resto de la altura
// de la sección (arriba de los cajones) queda libre para repisas/colgador.
// El cajón de más arriba siempre queda cerrado por una tapa (mismo criterio
// que la cajonera del escritorio): separa la cajonera del resto de la
// sección en vez de dejar el cajón de arriba a la vista del hueco abierto.
function generarSeccionFrentes(p, seccion, indice) {
  const { xInicio, anchoSeccion, cajones: nC } = seccion;
  const piezas = [];
  const cajaInfos = [];

  if (nC > 0) {
    const { anchoFrente, posiciones: [xFrente] } = repartirFrentes(seccion, 1);
    const gap = 3;
    let ySiguiente = 3;
    for (let i = 0; i < nC; i++) {
      const y = ySiguiente;
      piezas.push({
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoFrente, alto: ALTURA_CAJON_UNIDAD, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xFrente, y, z: profundidadCuerpo(p) },
        rotacion: 'vertical_frontal',
        grupo: `s${indice + 1}_cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: ALTURA_CAJON_UNIDAD, posicionY: y, xInicio, anchoSeccion });
      ySiguiente = y + ALTURA_CAJON_UNIDAD + gap;
    }
    piezas.push({
      id: `s${indice + 1}_cajonera_remate`,
      ancho: anchoSeccion, alto: profundidadCuerpo(p), espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio, y: ySiguiente, z: 0 },
      rotacion: 'horizontal',
    });
    return { piezas, cajaInfos, zonaLibreDesde: ySiguiente + p.e, tieneCajonera: true };
  }

  return { piezas, cajaInfos, zonaLibreDesde: p.e, tieneCajonera: false };
}

// ---------- 5. Cajas de cajón (mismo patrón que muebleBajoCocina/vanitorioBano) ----------
function piezasCajasSeccion(p, cajaInfos, indiceSeccion) {
  const { e, correderaTipo, colorInterior } = p;
  const P = profundidadParaCajas(p);
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajaInfos.forEach((cajon, idx) => {
    const n = idx + 1;
    const { xInicio, anchoSeccion, alturaFrente, posicionY } = cajon;
    const altoInterior = alturaFrente - 30;
    const anchoCaja = anchoSeccion - descuentoAncho;
    const prefix = `s${indiceSeccion + 1}_cajon${n}`;

    piezas.push(
      {
        id: `${prefix}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + anchoSeccion - descuentoAncho / 2 - e, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2 + e, y: posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_fondo`,
        ancho: anchoCaja, alto: P - 50, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'horizontal',
        grupo: prefix,
      }
    );
  });

  return piezas;
}

// ---------- 6. Repisas dentro de una sección ----------
// Si la sección lleva colgador, las repisas se agrupan arriba de la barra;
// si no, se reparten en toda la zona libre (arriba de los cajones, si hay).
function piezasRepisasSeccion(p, seccion, zonaLibreDesde, indiceSeccion) {
  const { xInicio, anchoSeccion, repisas: nRepisas, colgador } = seccion;
  if (nRepisas <= 0) return [];

  const yInferiorZona = colgador ? alturaColgadorEfectiva(p, zonaLibreDesde) + 100 : zonaLibreDesde;
  const ySuperiorZona = p.H - p.e;
  const alturaZona = ySuperiorZona - yInferiorZona;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferiorZona + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `s${indiceSeccion + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 4, alto: profundidadRepisa(p), espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + 2, y, z: 0 },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// Altura real del colgador: la ideal (1750mm desde el piso), pero nunca por
// debajo de la zona libre de esa sección ni tan alta que no deje margen al techo.
function alturaColgadorEfectiva(p, zonaLibreDesde) {
  const ideal = Math.min(ALTURA_COLGADOR_IDEAL, p.H - 250);
  return Math.max(ideal, zonaLibreDesde + 200);
}

// ---------- 7. Puertas globales (cubren todo el ancho, batientes o correderas) ----------
function piezasPuertasGlobales(p) {
  return p.tipoPuerta === 'corredera' ? piezasPuertasCorrederas(p) : piezasPuertasBatientes(p);
}

// Estilo "overlay" moderno (igual que muebleBajoCocina.js): la puerta llega
// a ras de los dos bordes exteriores del closet (x=0 y x=A), con solo 2mm
// de holgura entre puertas cuando hay más de una.
function piezasPuertasBatientes(p) {
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

// Puertas correderas: paneles que se solapan (van en dos rieles, uno
// delante del otro). A diferencia de una puerta batiente, acá los
// laterales mandan con la profundidad completa (ver profundidadCuerpo) —
// la puerta necesita un tope real contra el que chocar — así que el ancho
// disponible para las puertas también se acorta 2*e (el espesor de cada
// lateral), en vez de correr de punta a punta como con una puerta
// batiente. El "solape" es el traslape real entre dos puertas contiguas,
// repartido mitad y mitad para cada una.
function piezasPuertasCorrederas(p) {
  const { A, H, e, nP, espesorPuertas, colorExterior } = p;
  const solape = 40; // mm de traslape entre paneles contiguos
  const anchoDisponible = (A - 2 * e) + (nP - 1) * solape;
  const anchoPuerta = anchoDisponible / nP;
  const paso = anchoPuerta - solape;
  // Alto: se le resta el espesor del techo (15mm, para no chocar con él),
  // más 50mm extra arriba por el espacio real que ocupa el mecanismo del
  // riel, y 15mm abajo para que la puerta no llegue a topar con el piso.
  const alturaPuerta = H - 15 - 50 - 15;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    const enRielTrasero = i % 2 === 0; // los paneles alternan entre riel delantero y trasero
    piezas.push({
      id: `puerta_corredera_${i + 1}`,
      ancho: anchoPuerta, alto: alturaPuerta, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e + i * paso, y: 15, z: enRielTrasero ? profundidadCuerpo(p) : profundidadCuerpo(p) + 14 },
      rotacion: 'vertical_frontal',
    });
  }
  return piezas;
}

const ALTO_TAPACANTO_CORREDERA = 150; // mm, estándar

// Tapacanto superior: panel horizontal atornillado por fuera, al frente y
// arriba del todo, que cuelga tapando el riel y el mecanismo de las puertas
// correderas (quedaría a la vista si no se cubre, sobre todo mirando el
// closet desde abajo).
function piezaTapaCantoSuperior(p) {
  const { A, H, e, colorExterior } = p;
  return {
    id: 'tapacanto_superior_corredera',
    ancho: A, alto: ALTO_TAPACANTO_CORREDERA, espesor: e,
    cantos: ['inferior'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y: H - ALTO_TAPACANTO_CORREDERA, z: profundidadCuerpo(p) + 14 },
    rotacion: 'vertical_frontal',
  };
}

// ---------- 8. Herrajes ----------
function generarHerrajes(p, { totalCajones, totalRepisas, totalCajoneras, secciones, divisores }) {
  const herrajes = [];

  if (totalCajones > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(profundidadParaCajas(p) - 60)}mm`
      : `corredera_oculta_${Math.round(profundidadParaCajas(p) - 60)}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  secciones.forEach((seccion, i) => {
    if (!seccion.colgador) return;
    const largoTubo = Math.round(seccion.anchoSeccion - 20);
    const soportes = seccion.anchoSeccion > 1200 ? 3 : 2;
    herrajes.push({ tipo: `tubo_colgador_redondo_${largoTubo}mm_seccion${i + 1}`, cantidad: 1 });
    herrajes.push({ tipo: 'soporte_tubo_colgador', cantidad: soportes });
  });

  if (p.nP > 0) {
    if (p.tipoPuerta === 'corredera') {
      herrajes.push({ tipo: `riel_corredera_superior_${Math.round(p.A)}mm`, cantidad: 1 });
      herrajes.push({ tipo: `riel_guia_inferior_${Math.round(p.A)}mm`, cantidad: 1 });
      herrajes.push({ tipo: 'kit_ruedas_puerta_corredera', cantidad: p.nP });
      herrajes.push({ tipo: 'tirador_embutido_o_perfil_uñero', cantidad: p.nP });
    } else {
      const bisagrasPorPuerta = p.H > 1800 ? 4 : (p.H > 900 ? 3 : 2);
      herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: p.nP * bisagrasPorPuerta });
      herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
    }
  }

  const puntosColgado = p.A > 900 ? 3 : 2;
  herrajes.push({ tipo: 'escuadra_colgado_pared', cantidad: puntosColgado });
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgado });

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 + divisores.length * 4 + totalCajoneras * 4 }); // cuerpo + fijación de divisores + tapa de cada cajonera
  herrajes.push({ tipo: 'tornillo_1_5/8', cantidad: 8 + totalCajones * 4 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
