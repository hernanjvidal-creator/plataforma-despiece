/**
 * MOTOR DE REGLAS — Mueble Bajo de Cocina (por secciones)
 * -----------------------------------------------------------
 * El mueble se arma como una lista de SECCIONES (columnas) de izquierda a
 * derecha, cada una con un `tipo`:
 *
 *   - 'estandar'         → puertas/cajones/mixto, igual que antes (usa
 *                           config/nP/nC de la sección).
 *   - 'lavaplatos'        → solo puertas (sin cajones, por las cañerías),
 *                           600mm por defecto.
 *   - 'lavavajillas'      → sin frente propio (el equipo trae el suyo),
 *                           600mm por defecto (estándar internacional).
 *   - 'horno'             → sin frente propio, 600mm por defecto (hueco de
 *                           horno empotrado estándar 600x560x600).
 *   - 'cajones_olleros'   → pocos cajones altos (~300mm) para ollas.
 *   - 'cajones_cubiertos' → cajones bajos (~120mm) para cubiertos.
 *
 * Entre secciones va un divisor vertical — el mismo tipo de panel que un
 * lateral — que es una ÚNICA pieza compartida entre las dos secciones que
 * separa (no se duplica). El ancho de las secciones con tipo de electro-
 * doméstico usa medidas estándar de mercado; las 'estandar' sin ancho fijo
 * se reparten el resto del ancho en partes iguales.
 *
 * Alto (H): es la altura TOTAL desde el piso hasta la parte de arriba del
 * cuerpo (sin contar la cubierta) — incluye el zócalo estándar de 100mm.
 * Es decir, el cuerpo (laterales, puertas, cajones) mide H - 100mm.
 *
 * Espesor de frentes: los cajones siempre van en 15mm (`e`, el mismo
 * espesor estructural). Las puertas van en 15mm por defecto también, pero
 * el cliente puede pedir 18mm (`espesorPuertas`) si prefiere un frente más
 * grueso — quedan en un grupo de material aparte para el corte.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 700,        // alto TOTAL desde el piso (incluye el zócalo de 100mm)
  P: 560,        // profundidad exterior
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 100,       // altura de zócalo (estándar, no editable por el cliente)
  r: 50,         // retranqueo zócalo
  correderaTipo: 'bola',  // 'bola' | 'oculta'
  isla: false,   // true = mueble independiente (isla): respaldo terminado, no HDF
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y los accesorios (lavaplatos)
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  secciones: [
    { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 3 },
  ],
  colorInterior: 'blanco',    // color estándar de cajones/bandejas/interior de cuerpo
  colorExterior: 'blanco',    // color elegido por el cliente para frentes y caras vistas
};

// Anchos estándar de mercado (mm) para secciones de electrodomésticos.
// Fuentes: lavavajillas/horno empotrado 600mm es el estándar internacional
// más común; lavaplatos 600-900mm según cubeta simple/doble.
const ANCHO_ESTANDAR_POR_TIPO = {
  lavaplatos: 600,
  lavavajillas: 600,
  horno: 600,
  cajones_olleros: 450,
  cajones_cubiertos: 450,
};

// Altura real del cuerpo (laterales/puertas/cajones), descontando el zócalo
// de la altura TOTAL que ingresa el cliente.
function alturaCuerpo(p) {
  return p.H - p.hp;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametros(p);

  const { secciones, divisores } = calcularSecciones(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasZocalo(p),
    ...piezasDivisores(p, divisores),
    ...piezasCubierta(p),
  ];

  let totalCajones = 0;
  let totalPuertas = 0;
  let totalRepisas = 0;
  const accesorios = [];

  secciones.forEach((seccion, i) => {
    const resultado = generarSeccionFrentes(p, seccion, i);
    piezas.push(...resultado.piezas);

    if (resultado.cajaInfos && resultado.cajaInfos.length > 0) {
      piezas.push(...piezasCajasSeccion(p, resultado.cajaInfos, i));
      totalCajones += resultado.cajaInfos.length;
    }
    totalPuertas += resultado.piezas.filter(pz => pz.id.includes('_puerta_')).length;
    totalRepisas += resultado.piezas.filter(pz => pz.id.includes('_repisa_')).length;

    if (seccion.tipo === 'lavaplatos' && p.cubierta.incluir) {
      accesorios.push(...accesorioLavaplatos(p, seccion, i));
    }
  });

  const herrajes = generarHerrajes(p, { secciones, totalCajones, totalPuertas, totalRepisas });
  const notas = generarNotas(p, secciones);

  return {
    modulo: 'bajo_cocina',
    parametros: p,
    piezas,
    accesorios,
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
  if (p.H <= p.hp) {
    throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El mueble debe tener al menos 1 sección');
  }

  const tiposValidos = ['estandar', 'lavaplatos', 'lavavajillas', 'horno', 'cajones_olleros', 'cajones_cubiertos'];
  for (const s of p.secciones) {
    if (!tiposValidos.includes(s.tipo)) throw new Error(`Tipo de sección desconocido: ${s.tipo}`);
    if (s.tipo === 'estandar') {
      const nP = s.nP || 0, nC = s.nC || 0;
      if (s.config !== 'abierto' && nP === 0 && nC === 0) {
        throw new Error('Una sección "estandar" debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")');
      }
      if (s.config === 'solo_cajones' && nP > 0) throw new Error('Config solo_cajones no admite puertas');
      if (s.config === 'solo_puertas' && nC > 0) throw new Error('Config solo_puertas no admite cajones');
      if ((s.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
      if ((s.repisas || 0) > 0 && s.config === 'solo_cajones') {
        throw new Error('Config solo_cajones no tiene hueco de puertas: las repisas no aplican');
      }
    }
  }

  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// ---------- 1. Piezas del cuerpo (caja estructural) ----------
function piezasCuerpo(p) {
  const { A, P, e, colorInterior } = p;
  const H = alturaCuerpo(p);

  return [
    {
      id: 'lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
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
      id: 'traviesa_delantera',
      ancho: A - 2 * e, alto: 100, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: P - 100 },
      rotacion: 'horizontal',
    },
    {
      id: 'traviesa_trasera',
      ancho: A - 2 * e, alto: 100, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
  ];
}

// ---------- 2. Respaldo ----------
// En un mueble normal (contra la pared) es HDF, invisible. En una isla, el
// respaldo queda a la vista desde el otro lado: se cambia a un panel de
// melamina terminado en el color exterior.
function piezasRespaldo(p) {
  const { A, e, isla, colorExterior } = p;
  const H = alturaCuerpo(p);
  if (isla) {
    return [{
      id: 'respaldo',
      ancho: A - 2 * e + 16, alto: H - 30, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e - 8, y: 15, z: 0 },
      rotacion: 'vertical_frontal',
    }];
  }
  return [{
    id: 'respaldo',
    ancho: A - 2 * e + 16, alto: H - 30, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'HDF',
    posicion: { x: e - 8, y: 15, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Zócalo ----------
// Panel frontal (recesado `r` mm desde el frente real, para dejar hueco a
// los pies) + panel trasero + retornos en los dos laterales, cerrando el
// hueco bajo el mueble por los cuatro lados. Además, por un tema de soporte
// estructural, se agregan cruces de adelante hacia atrás cada
// ESPACIADO_CRUCE_ZOCALO mm de ancho — necesarios en muebles largos para
// que el zócalo no ceda bajo el peso. Todas estas piezas quedan ocultas
// bajo el mueble (no se ven), salvo la cara frontal del panel delantero.
const ESPACIADO_CRUCE_ZOCALO = 800;

function piezasZocalo(p) {
  const { A, P, e, hp, r, colorInterior, colorExterior } = p;
  const altoZocalo = hp - 10;
  const profundidadZocalo = P - r; // del fondo (z=0) hasta la línea de recesado del frente

  const piezas = [
    {
      id: 'zocalo_frontal',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: profundidadZocalo - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_trasero',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: -hp, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];

  let x = ESPACIADO_CRUCE_ZOCALO;
  let n = 1;
  while (x < A - 200) {
    piezas.push({
      id: `zocalo_cruce_${n}`,
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    });
    x += ESPACIADO_CRUCE_ZOCALO;
    n++;
  }

  return piezas;
}

// ---------- 3b. Cubierta (superficie) ----------
// Panel horizontal que va encima del cuerpo, con un pequeño vuelo (overhang)
// respecto al mueble. Si el material es piedra (cuarzo/granito/mármol), el
// optimizador de corte la excluye del nesting de melamina (se fabrica aparte).
const OVERHANG_FRENTE_CUBIERTA = 20;
const OVERHANG_LADOS_CUBIERTA = 10;

function piezasCubierta(p) {
  if (!p.cubierta.incluir) return [];
  const { A, P } = p;
  const H = alturaCuerpo(p);
  const { material, espesor } = p.cubierta;

  const pieza = {
    id: 'cubierta',
    ancho: A + 2 * OVERHANG_LADOS_CUBIERTA, alto: P + OVERHANG_FRENTE_CUBIERTA, espesor,
    cantos: ['todos'],
    cantidad: 1,
    posicion: { x: -OVERHANG_LADOS_CUBIERTA, y: H, z: 0 },
    rotacion: 'horizontal',
  };

  if (material === 'melamina') {
    pieza.color = p.colorExterior;
    pieza.cara = 'exterior';
  } else {
    pieza.material = material; // 'cuarzo' | 'granito' | 'marmol'
  }

  return [pieza];
}

// ---------- 4. Reparto del ancho en secciones + divisores ----------
// Las secciones con tipo de electrodoméstico usan su ancho estándar (o el
// que indique el usuario); las 'estandar' sin ancho fijo se reparten el
// resto del ancho en partes iguales. Cada divisor interno es UNA sola
// pieza compartida entre la sección de su izquierda y la de su derecha.
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const anchoInteriorTotal = A - 2 * e - (n - 1) * e;

  let anchoFijoTotal = 0;
  let nAutomaticas = 0;
  const anchosBase = p.secciones.map(s => {
    const ancho = s.ancho || ANCHO_ESTANDAR_POR_TIPO[s.tipo] || null;
    if (ancho) { anchoFijoTotal += ancho; return ancho; }
    nAutomaticas++;
    return null;
  });

  // Ancho mínimo de A para que esta combinación de secciones alcance a caber:
  // el ancho fijo total + un mínimo razonable para cada sección de ancho libre
  // + el espesor de los 2 laterales exteriores y los (n-1) divisores internos.
  const ANCHO_MIN_SECCION_AUTOMATICA = 200;
  const anchoMinimoA = Math.ceil(
    anchoFijoTotal + nAutomaticas * ANCHO_MIN_SECCION_AUTOMATICA + (n + 1) * e
  );

  const anchoRestante = anchoInteriorTotal - anchoFijoTotal;
  if (anchoRestante < 0) {
    throw new Error(
      `Las secciones con ancho fijo (${Math.round(anchoFijoTotal)}mm en total) no caben en un mueble de ${A}mm de ancho. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o quita/achica secciones.`
    );
  }
  const anchoAutomatico = nAutomaticas > 0 ? anchoRestante / nAutomaticas : 0;
  if (nAutomaticas > 0 && anchoAutomatico < ANCHO_MIN_SECCION_AUTOMATICA) {
    throw new Error(
      `Con estas secciones, las de ancho libre quedan de solo ${Math.round(anchoAutomatico)}mm. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o reduce/achica secciones.`
    );
  }

  let x = e;
  const secciones = [];
  const divisores = [];
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosBase[i] || anchoAutomatico;
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion });
    x += anchoSeccion;
    if (i < n - 1) {
      divisores.push({ id: `divisor_${i + 1}`, x });
      x += e;
    }
  }
  return { secciones, divisores };
}

function piezasDivisores(p, divisores) {
  const { P, e, colorInterior } = p;
  const H = alturaCuerpo(p);
  return divisores.map(d => ({
    id: d.id,
    ancho: P, alto: H, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: d.x, y: 0, z: 0 },
    rotacion: 'vertical_profundidad',
  }));
}

// ---------- 5. Frentes por sección, según su tipo ----------
function generarSeccionFrentes(p, seccion, indice) {
  switch (seccion.tipo) {
    case 'lavavajillas':
    case 'horno':
      return { piezas: [], cajaInfos: [] }; // sin frente propio: lo trae el electrodoméstico
    case 'lavaplatos':
      return generarPuertasLavaplatos(p, seccion, indice);
    case 'cajones_olleros':
      return generarCajonesApilados(p, seccion, indice, 300);
    case 'cajones_cubiertos':
      return generarCajonesApilados(p, seccion, indice, 120);
    default:
      return generarFrenteEstandar(p, seccion, indice);
  }
}

function generarPuertasLavaplatos(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const nP = anchoSeccion > 500 ? 2 : 1;
  const anchoUtil = anchoSeccion - (nP + 1) * 2;
  const anchoPuerta = anchoUtil / nP;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `s${indice + 1}_puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
      rotacion: 'vertical_frontal',
    });
  }
  return { piezas, cajaInfos: [] };
}

// Accesorio lavaplatos: caja aproximada del pozo (o los dos pozos), embutida
// en la cubierta, en el centro de la sección. No es una pieza de melamina —
// no entra en el nesting ni en el resumen de material.
function accesorioLavaplatos(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const dosPozos = anchoSeccion > 700;
  const anchoCubeta = Math.min(anchoSeccion - 100, dosPozos ? 780 : 450);
  const profundidadCubeta = 400;
  const alturaCubeta = 180;
  const espesorCubierta = p.cubierta.espesor;

  return [{
    id: `s${indice + 1}_lavaplatos`,
    descripcion: dosPozos ? 'Lavaplatos doble pozo (acero inoxidable)' : 'Lavaplatos un pozo (acero inoxidable)',
    ancho: anchoCubeta, alto: profundidadCubeta, espesor: alturaCubeta,
    posicion: {
      x: xInicio + (anchoSeccion - anchoCubeta) / 2,
      y: H + espesorCubierta - alturaCubeta,
      z: (p.P - profundidadCubeta) / 2,
    },
    rotacion: 'horizontal',
    color: 'acero_inoxidable',
  }];
}

// Cajones apilados de altura fija (olleros ~300mm, cubiertos ~120mm).
function generarCajonesApilados(p, seccion, indice, alturaUnidad) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const nCajones = Math.max(1, seccion.nC || (alturaUnidad >= 250 ? 2 : 1));
  const gap = 3;
  const piezas = [];
  const cajaInfos = [];
  let y = 3;
  for (let i = 0; i < nCajones; i++) {
    piezas.push({
      id: `s${indice + 1}_frente_cajon_${i + 1}`,
      ancho: anchoSeccion - 4, alto: alturaUnidad, espesor: p.e,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: xInicio + 2, y, z: p.P },
      rotacion: 'vertical_frontal',
    });
    cajaInfos.push({ alturaFrente: alturaUnidad, posicionY: y, xInicio, anchoSeccion });
    y += alturaUnidad + gap;
  }
  if (y - gap > H - 6) {
    throw new Error(
      `Sección ${indice + 1}: ${nCajones} cajón(es) de ${alturaUnidad}mm no caben en el alto disponible (${Math.round(H)}mm, alto total menos zócalo). Reduce la cantidad o aumenta H.`
    );
  }
  return { piezas, cajaInfos };
}

// Sección estándar: puertas, cajones o mixto (igual que el mueble original,
// pero acotado al ancho de la sección en vez de todo el mueble).
function generarFrenteEstandar(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const config = seccion.config || 'solo_cajones';
  const nP = seccion.nP || 0;
  const nC = seccion.nC || 0;
  const piezas = [];
  const cajaInfos = [];

  if (config === 'abierto') {
    // Sin puerta ni cajón: hueco abierto a la vista, con repisas opcionales
    // en toda la altura interior (igual que dentro de un hueco de puertas).
    piezas.push(...piezasRepisasZona(p, seccion, indice, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const anchoUtil = anchoSeccion - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `s${indice + 1}_puerta_${i + 1}`,
        ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    // Además del piso, se pueden agregar repisas intermedias dentro del
    // hueco de puertas (todo el alto interior, de piso a casi el techo).
    piezas.push(...piezasRepisasZona(p, seccion, indice, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    const alturaUtil = H - (nC + 1) * 3;
    const alturaCajon = alturaUtil / nC;
    for (let i = 0; i < nC; i++) {
      const y = 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoSeccion - 4, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
      });
      cajaInfos.push({ alturaFrente: alturaCajon, posicionY: y, xInicio, anchoSeccion });
    }
  }

  if (config === 'mixto') {
    const alturaCajonUnidad = 150;
    const gap = 3;
    const nCajones = Math.max(1, nC);
    let ySiguiente = H - gap;
    for (let i = 0; i < nCajones; i++) {
      const y = ySiguiente - alturaCajonUnidad;
      piezas.push({
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoSeccion - 4, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
      });
      cajaInfos.push({ alturaFrente: alturaCajonUnidad, posicionY: y, xInicio, anchoSeccion });
      ySiguiente = y - gap;
    }

    const alturaPuertas = ySiguiente - gap;
    if (alturaPuertas < 100) {
      throw new Error(
        `Sección ${indice + 1}: con ${nCajones} cajón(es) de ${alturaCajonUnidad}mm no queda espacio para las puertas. Reduce cajones o aumenta el alto (H).`
      );
    }
    const anchoUtil = anchoSeccion - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `s${indice + 1}_puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: gap, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    // Repisas intermedias dentro del hueco de puertas (debajo de los cajones).
    piezas.push(...piezasRepisasZona(p, seccion, indice, gap, ySiguiente));
  }

  return { piezas, cajaInfos };
}

// Además del piso (ya incluido en el cuerpo del mueble), agrega `seccion.repisas`
// repisas intermedias repartidas en partes iguales dentro de una zona [yInferior,
// ySuperior] de la sección — el mismo patrón que las baldas de la alacena/closet.
function piezasRepisasZona(p, seccion, indice, yInferior, ySuperior) {
  const nRepisas = seccion.repisas || 0;
  if (nRepisas <= 0) return [];

  const { xInicio, anchoSeccion } = seccion;
  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `s${indice + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 2 * p.e - 4, alto: p.P - 40, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + p.e + 2, y, z: 20 },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 6. Cajas de cajón (mismo patrón para toda sección con cajones) ----------
function piezasCajasSeccion(p, cajaInfos, indiceSeccion) {
  const { P, e, correderaTipo, colorInterior } = p;
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
        ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
        cantos: [],
        cantidad: 1,
        material: 'HDF',
        posicion: { x: xInicio + descuentoAncho / 2 - 8, y: posicionY + 15, z: 50 - 8 },
        rotacion: 'horizontal',
        grupo: prefix,
      }
    );
  });

  return piezas;
}

// ---------- 7. Herrajes ----------
function generarHerrajes(p, { secciones, totalCajones, totalPuertas, totalRepisas }) {
  const herrajes = [];
  const H = alturaCuerpo(p);

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_balda_metalico', cantidad: totalRepisas * 4 });
  }

  if (totalPuertas > 0) {
    const bisagrasPorPuerta = H > 900 ? 3 : 2;
    herrajes.push({ tipo: 'bisagra_codo', cantidad: totalPuertas * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: totalPuertas });
  }
  if (totalCajones > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(p.P - 60)}mm`
      : `corredera_oculta_${Math.round(p.P - 60)}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  const seccionesLavavajillas = secciones.filter(s => s.tipo === 'lavavajillas').length;
  const seccionesHorno = secciones.filter(s => s.tipo === 'horno').length;
  if (seccionesLavavajillas > 0) {
    herrajes.push({ tipo: 'escuadra_fijacion_lavavajillas', cantidad: seccionesLavavajillas * 2 });
  }
  if (seccionesHorno > 0) {
    herrajes.push({ tipo: 'riel_soporte_horno', cantidad: seccionesHorno * 2 });
  }

  const patas = p.A > 900 ? 6 : 4;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });
  herrajes.push({ tipo: 'tornillo_golfari', cantidad: 8 + (secciones.length - 1) * 4 }); // + fijación de divisores
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 12 + totalCajones * 2 });

  return herrajes;
}

// ---------- 8. Notas de producción ----------
function generarNotas(p, secciones) {
  const notas = [];
  secciones.forEach((s, i) => {
    if (s.tipo === 'lavaplatos') {
      notas.push(`Sección ${i + 1} (lavaplatos): requiere perforación en piso/respaldo para cañerías y sifón — definir medida exacta en terreno.`);
    }
    if (s.tipo === 'lavavajillas') {
      notas.push(`Sección ${i + 1} (lavavajillas): hueco libre de ${Math.round(s.anchoSeccion)}mm, sin frente propio — el equipo lleva su panel frontal.`);
    }
    if (s.tipo === 'horno') {
      notas.push(`Sección ${i + 1} (horno empotrado): hueco libre de ${Math.round(s.anchoSeccion)}mm, sin frente propio — verificar la medida exacta en la ficha técnica del horno antes de cortar.`);
    }
  });
  if (p.isla) {
    notas.push('Mueble isla: el respaldo va terminado en el color exterior (visible desde el otro lado). Revisa si los laterales también deben ir en color exterior según cómo quede instalada.');
  }
  if (p.cubierta.incluir && p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavaplatos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del pozo en la cubierta.');
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }
  return notas;
}

export { generarDespiece };
