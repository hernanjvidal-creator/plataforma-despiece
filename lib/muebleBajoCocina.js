/**
 * MOTOR DE REGLAS — Mueble Cocina (por módulos independientes)
 * -----------------------------------------------------------
 * El mueble se arma como una lista de MÓDULOS de izquierda a derecha, y
 * cada módulo es una CAJA COMPLETAMENTE INDEPENDIENTE (sus propios 2
 * laterales, piso y travesaños) — no comparten un divisor con el módulo
 * vecino. Los módulos se atornillan entre sí, lateral con lateral, para
 * formar el mueble completo. Es el modelo real de instalación de una
 * cocina (cajas separadas atornilladas entre sí en terreno), y le da mucho
 * más soporte estructural que un solo cuerpo largo con divisores internos.
 *
 * Cada módulo trae su propio `tipo`:
 *   - 'estandar'    → puertas/cajones/mixto (usa config/nP/nC del módulo).
 *                     Un módulo angosto (100-300mm) con 1 puerta sirve de
 *                     "especiero" — no es un tipo aparte, solo un módulo
 *                     estándar chico.
 *   - 'lavaplatos'   → solo puertas (sin cajones, por las cañerías), 600mm
 *                     por defecto.
 *   - 'lavavajillas'  → sin frente propio (el equipo trae el suyo), 600mm
 *                     por defecto (estándar internacional).
 *   - 'horno'         → sin frente propio, 600mm por defecto (hueco de
 *                     horno empotrado estándar 600x560x600).
 *
 * Un módulo con 2 puertas va SIN separador al medio: cada puerta hinge
 * directo contra su propio lateral del módulo (mismo criterio que ya usa
 * mueble aéreo con sus N puertas repartidas) — no hace falta divisor
 * interno para eso.
 *
 * Cada módulo, obligatoriamente, trae su propio `ancho` — no hay un "Ancho
 * total" del que repartir automáticamente (cada caja es independiente, no
 * tiene sentido repartir un ancho compartido). El ancho total del mueble es
 * solo la suma de los anchos de sus módulos.
 *
 * Alto (H): es la altura TOTAL desde el piso hasta la superficie de la
 * cubierta. Cada módulo reserva 100mm de zócalo (ahora resuelto con
 * zócalo de aluminio + patas plásticas, no con un panel de melamina) + 20mm
 * de cubierta + el espesor del piso (que ahora queda DEBAJO de los
 * laterales del módulo, no entre ellos) — ver `alturaLateralModulo`.
 *
 * Espesor de frentes: los cajones siempre van en 15mm (`e`, el mismo
 * espesor estructural). Las puertas van en 15mm por defecto también, pero
 * el cliente puede pedir 18mm (`espesorPuertas`) si prefiere un frente más
 * grueso — quedan en un grupo de material aparte para el corte.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble completo (0 = borde izquierdo del primer módulo)
 *   y: altura (0 = borde inferior del piso de cada módulo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 *
 * Nota: por ahora este motor no soporta muebles en L/U (esquineros) — el
 * sistema de "brazos" que existía antes queda pendiente de rediseñar para
 * que funcione con módulos independientes (no se perdió, solo no está
 * conectado todavía).
 */

import { resumirPlanchas, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura } from './shared';

const DEFAULTS = {
  H: 700,        // alto TOTAL desde el piso hasta la superficie de la cubierta
  P: 560,        // profundidad de la cubierta (la estructura queda 40mm más angosta)
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  correderaTipo: 'bola',  // 'bola' | 'oculta'
  isla: false,   // true = mueble independiente (isla): respaldo terminado, no HDF
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y los accesorios (lavaplatos)
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  secciones: [
    { tipo: 'estandar', ancho: 600, config: 'solo_cajones', nP: 0, nC: 3 },
  ],
  colorInterior: 'blanco',    // color estándar de cajones/bandejas/interior de cuerpo
  colorExterior: 'blanco',    // color elegido por el cliente para frentes y caras vistas
};

// Anchos estándar de mercado (mm) para módulos de electrodomésticos.
// Fuentes: lavavajillas/horno empotrado 600mm es el estándar internacional
// más común; lavaplatos 600-900mm según cubeta simple/doble.
const ANCHO_ESTANDAR_POR_TIPO = {
  lavaplatos: 600,
  lavavajillas: 600,
  horno: 600,
};

const ALTO_TRAVIESA = 100;       // alto/profundidad de los 3 travesaños de cada módulo
const RESERVA_ZOCALO = 100;      // mm reservados abajo para el zócalo de aluminio + patas
const RESERVA_CUBIERTA = 20;     // mm reservados arriba para la cubierta

// Altura de los laterales de CADA módulo: se descuenta el zócalo, la
// reserva de cubierta y el espesor del piso (que ahora va por debajo de
// los laterales, no compartiendo su misma franja de altura).
function alturaLateralModulo(p) {
  return p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA - p.e;
}

// Línea superior de los frentes (puertas/cajones): 5mm de margen extra por
// sobre la reserva de zócalo+cubierta, para que el frente no tope con la
// cubierta pero llegue bien arriba, tapando el travesaño delantero.
function lineaSuperiorFrentes(p) {
  return p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA - 5;
}

// Profundidad real de cada módulo (laterales/piso/caja de cajón). El
// "Fondo (mm)" que ingresa el cliente es la medida de la CUBIERTA, no de
// la estructura de melamina — la estructura queda 40mm más angosta (vuelo
// de la cubierta + espacio de la puerta, sin importar el espesor de puerta
// elegido).
function profundidadModulo(p) {
  return p.P - 40;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametrosGlobales(p);
  validarSecciones(p.secciones);

  let piezas = [];
  let accesorios = [];
  let notas = [];
  let x = 0;
  let totalCajones = 0;
  let totalPuertas = 0;
  let totalRepisas = 0;
  let totalModulosConPatas = 0;
  const infoPorModulo = [];

  p.secciones.forEach((seccion, i) => {
    const anchoModulo = seccion.ancho || ANCHO_ESTANDAR_POR_TIPO[seccion.tipo];
    const prefijo = `m${i + 1}_`;
    const r = generarModulo(p, seccion, anchoModulo, i);

    piezas.push(...r.piezas.map(pz => trasladarYPrefijar(pz, x, prefijo)));
    if (seccion.tipo === 'lavaplatos' && p.cubierta.incluir) {
      accesorios.push(...accesorioLavaplatos(p, anchoModulo, x, i));
    }

    totalCajones += r.totalCajones;
    totalPuertas += r.totalPuertas;
    totalRepisas += r.totalRepisas;
    totalModulosConPatas += 1;
    infoPorModulo.push({ tipo: seccion.tipo, anchoModulo, totalPuertas: r.totalPuertas });
    notas.push(...r.notas.map(n => `Módulo ${i + 1}: ${n}`));

    x += anchoModulo;
  });

  const anchoTotal = x;
  piezas.push(...piezasTapasLaterales(p, anchoTotal));
  if (p.cubierta.incluir) piezas.push(...piezasCubierta(p, anchoTotal));

  const herrajes = generarHerrajes(p, {
    infoPorModulo, totalCajones, totalPuertas, totalRepisas,
    numModulos: p.secciones.length, totalModulosConPatas, anchoTotal,
  });

  notas.push(
    `Cada módulo es una caja independiente (sus propios laterales, piso y travesaños) — se arma por separado y ` +
    `después se atornilla al módulo vecino, lateral con lateral. El zócalo es de aluminio, instalado sobre 4 patas ` +
    `plásticas por módulo (no incluye panel de zócalo en melamina).`
  );
  if (p.cubierta.incluir && p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavaplatos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del pozo en la cubierta.');
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  return {
    modulo: 'bajo_cocina',
    parametros: { ...p, A: anchoTotal },
    piezas,
    accesorios,
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
  if (p.H <= RESERVA_ZOCALO + RESERVA_CUBIERTA) {
    throw new Error(`El alto (H) debe ser mayor que ${RESERVA_ZOCALO + RESERVA_CUBIERTA}mm (zócalo + reserva de cubierta) — sube el alto total.`);
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El mueble debe tener al menos 1 módulo');
  }
  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

function validarSecciones(secciones) {
  const tiposValidos = ['estandar', 'lavaplatos', 'lavavajillas', 'horno'];
  secciones.forEach((s, i) => {
    if (!tiposValidos.includes(s.tipo)) throw new Error(`Tipo de módulo desconocido: "${s.tipo}"`);
    const ancho = s.ancho || ANCHO_ESTANDAR_POR_TIPO[s.tipo];
    if (!ancho) {
      throw new Error(`Módulo ${i + 1}: cada módulo debe traer su propio ancho.`);
    }
    if (ancho < 100) {
      throw new Error(`Módulo ${i + 1}: ancho de ${Math.round(ancho)}mm demasiado angosto — mínimo 100mm.`);
    }
    if (s.tipo === 'estandar') {
      const nP = s.nP || 0, nC = s.nC || 0;
      const config = s.config || 'solo_cajones';
      if (config !== 'abierto' && nP === 0 && nC === 0) {
        throw new Error(`Módulo ${i + 1}: debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")`);
      }
      if (config === 'solo_cajones' && nP > 0) throw new Error(`Módulo ${i + 1}: config solo_cajones no admite puertas`);
      if (config === 'solo_puertas' && nC > 0) throw new Error(`Módulo ${i + 1}: config solo_puertas no admite cajones`);
      if ((s.repisas || 0) < 0) throw new Error(`Módulo ${i + 1}: la cantidad de repisas no puede ser negativa`);
      if ((s.repisas || 0) > 0 && config === 'solo_cajones') {
        throw new Error(`Módulo ${i + 1}: config solo_cajones no tiene hueco de puertas: las repisas no aplican`);
      }
    }
  });
}

// ---------- Un módulo completo (caja independiente) ----------
// Genera TODAS las piezas de un módulo en coordenadas LOCALES a él mismo
// (x: 0 a anchoModulo) — el llamador (generarDespiece) las traslada al
// punto que corresponda dentro del mueble completo.
function generarModulo(p, seccion, anchoModulo, indice) {
  const piezas = [...piezasEstructuraModulo(p, anchoModulo)];
  const notas = [];

  let frentes = { piezas: [], cajaInfos: [] };
  if (seccion.tipo === 'lavavajillas' || seccion.tipo === 'horno') {
    // sin frente propio: lo trae el electrodoméstico
    notas.push(
      seccion.tipo === 'lavavajillas'
        ? `Hueco libre de ${Math.round(anchoModulo)}mm, sin frente propio — el equipo lleva su panel frontal.`
        : `Hueco libre de ${Math.round(anchoModulo)}mm, sin frente propio — verificar la medida exacta en la ficha técnica del horno antes de cortar.`
    );
  } else if (seccion.tipo === 'lavaplatos') {
    frentes = generarPuertasLavaplatos(p, anchoModulo);
    notas.push('Requiere perforación en piso/respaldo para cañerías y sifón — definir medida exacta en terreno.');
  } else {
    frentes = generarFrenteEstandar(p, seccion, anchoModulo);
  }
  piezas.push(...frentes.piezas);

  if (frentes.cajaInfos.length > 0) {
    piezas.push(...piezasCajasModulo(p, frentes.cajaInfos, anchoModulo));
  }

  const totalPuertas = frentes.piezas.filter(pz => pz.id.includes('_puerta_')).length;
  const totalRepisas = frentes.piezas.filter(pz => pz.id.includes('_repisa_')).length;

  return { piezas, notas, totalCajones: frentes.cajaInfos.length, totalPuertas, totalRepisas };
}

// ---------- 1. Estructura de un módulo ----------
// El piso queda por DEBAJO de los laterales (ancho completo del módulo);
// los laterales se apoyan encima. Van en color interior: quedan tapados
// contra el módulo vecino (o, en los 2 extremos del mueble, los cubre la
// tapa lateral — ver piezasTapasLaterales).
function piezasEstructuraModulo(p, anchoModulo) {
  const { e, isla, colorInterior, colorExterior } = p;
  const H = alturaLateralModulo(p);
  const Pm = profundidadModulo(p);

  const piezas = [
    {
      id: 'lateral_izq',
      ancho: Pm, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: e, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: Pm, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: anchoModulo - e, y: e, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'piso',
      ancho: anchoModulo, alto: Pm, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      // Vuelve a sentido horizontal (acostado) — apoya contra el borde
      // delantero de los laterales, justo debajo de la cubierta. Va en
      // melamina de color porque queda a la vista al abrir un cajón.
      id: 'travesano_delantero',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: H, z: Pm - ALTO_TRAVIESA },
      rotacion: 'horizontal',
    },
    {
      id: 'travesano_trasero',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H, z: 0 },
      rotacion: 'horizontal',
    },
  ];

  // En isla el respaldo (ver piezasRespaldoModulo) hace de refuerzo trasero
  // por sí solo — no hace falta el travesaño trasero inferior.
  if (!isla) {
    piezas.push({
      id: 'travesano_trasero_inferior',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    });
  }

  piezas.push(...piezasRespaldoModulo(p, anchoModulo));

  return piezas;
}

// ---------- 2. Respaldo de un módulo ----------
function piezasRespaldoModulo(p, anchoModulo) {
  const { e, isla, colorExterior } = p;
  const H = alturaLateralModulo(p);
  if (isla) {
    return [{
      id: 'respaldo',
      ancho: anchoModulo - 2 * e, alto: H, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    }];
  }
  return [{
    id: 'respaldo',
    ancho: anchoModulo - 2 * e + 16, alto: H - 2 * e + 16, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'MDF',
    posicion: { x: e - 8, y: e + e - 8, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Tapas laterales (una sola vez, en los 2 extremos del mueble) ----------
// Paneles cosméticos del mismo color que las puertas — tapan el canto del
// lateral (oculto, color interior) del primer y último módulo, más el
// canto del piso (bajan más que los laterales del módulo) y el canto de
// las puertas (vuelan más profundo que los laterales del módulo).
function piezasTapasLaterales(p, anchoTotal) {
  const { e, espesorPuertas, colorExterior } = p;
  const alto = p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA;
  const profundidad = profundidadModulo(p) + espesorPuertas;

  return [
    {
      id: 'tapa_lateral_izq',
      ancho: profundidad, alto, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: -e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'tapa_lateral_der',
      ancho: profundidad, alto, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: anchoTotal, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3b. Cubierta (superficie), una sola vez para todo el mueble ----------
const OVERHANG_LADOS_CUBIERTA = 25;

function piezasCubierta(p, anchoTotal) {
  const H = p.H - RESERVA_CUBIERTA;
  const { material, espesor } = p.cubierta;

  const pieza = {
    id: 'cubierta',
    ancho: anchoTotal + 2 * OVERHANG_LADOS_CUBIERTA, alto: p.P, espesor,
    cantos: ['todos'],
    cantidad: 1,
    posicion: { x: -OVERHANG_LADOS_CUBIERTA, y: H, z: 0 },
    rotacion: 'horizontal',
  };

  if (material === 'melamina') {
    pieza.color = p.colorExterior;
    pieza.cara = 'exterior';
  } else {
    pieza.material = material;
  }

  return [pieza];
}

// ---------- 4. Frentes de un módulo (puertas/cajones/mixto/abierto) ----------
// Reparte n frentes iguales en el ancho del módulo, con 2mm de holgura
// entre ellos si hay más de uno. Sin holgura de divisor: cada módulo es su
// propia caja, sus frentes se reparten en todo su ancho tal cual.
function repartirFrentesModulo(anchoModulo, n) {
  const anchoDisponible = anchoModulo - (n - 1) * 2;
  const anchoFrente = anchoDisponible / n;
  const posiciones = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    posiciones.push(x);
    x += anchoFrente + 2;
  }
  return { anchoFrente, posiciones };
}

function generarPuertasLavaplatos(p, anchoModulo) {
  const nP = anchoModulo > 500 ? 2 : 1;
  const { anchoFrente, posiciones } = repartirFrentesModulo(anchoModulo, nP);
  const alto = lineaSuperiorFrentes(p);
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoFrente, alto, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: posiciones[i], y: 2, z: profundidadModulo(p) },
      rotacion: 'vertical_frontal',
    });
  }
  return { piezas, cajaInfos: [] };
}

// Accesorio lavaplatos: caja aproximada del pozo (o los dos pozos), embutida
// en la cubierta, en el centro del módulo. No es una pieza de melamina —
// no entra en el nesting ni en el resumen de material.
function accesorioLavaplatos(p, anchoModulo, xOffset, indice) {
  const H = p.H - RESERVA_CUBIERTA;
  const dosPozos = anchoModulo > 700;
  const anchoCubeta = Math.min(anchoModulo - 100, dosPozos ? 780 : 450);
  const profundidadCubeta = 400;
  const alturaCubeta = 180;
  const espesorCubierta = p.cubierta.espesor;

  return [{
    id: `m${indice + 1}_lavaplatos`,
    descripcion: dosPozos ? 'Lavaplatos doble pozo (acero inoxidable)' : 'Lavaplatos un pozo (acero inoxidable)',
    ancho: anchoCubeta, alto: profundidadCubeta, espesor: alturaCubeta,
    posicion: {
      x: xOffset + (anchoModulo - anchoCubeta) / 2,
      y: H + espesorCubierta - alturaCubeta,
      z: (p.P - profundidadCubeta) / 2,
    },
    rotacion: 'horizontal',
    color: 'acero_inoxidable',
  }];
}

// Módulo estándar: puertas, cajones o mixto, repartidos en todo su ancho
// (sin separador interno, aunque tenga 2 puertas — cada una hinge contra
// su propio lateral del módulo).
function generarFrenteEstandar(p, seccion, anchoModulo) {
  const H = lineaSuperiorFrentes(p);
  const config = seccion.config || 'solo_cajones';
  const nP = seccion.nP || 0;
  const nC = seccion.nC || 0;
  const piezas = [];
  const cajaInfos = [];

  if (config === 'abierto') {
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const { anchoFrente, posiciones } = repartirFrentesModulo(anchoModulo, nP);
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoFrente, alto: H, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: posiciones[i], y: 2, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    const alturaUtil = H - nC * 3;
    const alturaCajon = alturaUtil / nC;
    const { anchoFrente } = repartirFrentesModulo(anchoModulo, 1);
    for (let i = 0; i < nC; i++) {
      const y = 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoFrente, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
        grupo: `cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajon, posicionY: y, anchoModulo });
    }
  }

  if (config === 'mixto') {
    const alturaCajonUnidad = 150;
    const gap = 3;
    const nCajones = Math.max(1, nC);
    const { anchoFrente: anchoCajonFrente } = repartirFrentesModulo(anchoModulo, 1);
    let ySiguiente = H;
    for (let i = 0; i < nCajones; i++) {
      const y = ySiguiente - alturaCajonUnidad;
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoCajonFrente, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
        grupo: `cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajonUnidad, posicionY: y, anchoModulo });
      ySiguiente = y - gap;
    }

    const alturaPuertas = ySiguiente - gap;
    if (alturaPuertas < 100) {
      throw new Error(
        `Con ${nCajones} cajón(es) de ${alturaCajonUnidad}mm no queda espacio para las puertas. Reduce cajones o aumenta el alto (H).`
      );
    }
    const { anchoFrente: anchoPuerta, posiciones: posicionesPuertas } = repartirFrentesModulo(anchoModulo, nP);
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: posicionesPuertas[i], y: gap, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, gap, ySiguiente));
  }

  return { piezas, cajaInfos };
}

// Repisas intermedias dentro del hueco de puertas — recesadas "e" desde el
// fondo para no chocar con el travesaño trasero (mismo criterio de siempre).
function piezasRepisasModulo(p, seccion, anchoModulo, yInferior, ySuperior) {
  const nRepisas = seccion.repisas || 0;
  if (nRepisas <= 0) return [];

  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: anchoModulo - 4, alto: profundidadModulo(p) - 20 - p.e, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: 2, y, z: p.e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Cajas de cajón de un módulo ----------
function piezasCajasModulo(p, cajaInfos, anchoModulo) {
  const { e, correderaTipo, colorInterior } = p;
  const P = profundidadModulo(p);
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajaInfos.forEach((cajon, idx) => {
    const n = idx + 1;
    const { alturaFrente, posicionY } = cajon;
    // El costado de la caja no puede pasar por encima del travesaño
    // delantero: se recorta la altura interior en vez de invadir su lugar.
    const H = alturaLateralModulo(p);
    const altoInterior = Math.min(alturaFrente - 30, H - posicionY);
    if (altoInterior < 60) {
      throw new Error(
        `El cajón de más arriba queda demasiado bajo (${Math.round(altoInterior)}mm de alto interior) por la cercanía al travesaño delantero. Reduce la cantidad de cajones o aumenta el alto (H).`
      );
    }
    const anchoCaja = anchoModulo - descuentoAncho;
    const prefix = `cajon${n}`;

    piezas.push(
      {
        id: `${prefix}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: anchoModulo - descuentoAncho / 2 - e, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_fondo`,
        ancho: anchoCaja, alto: P - 50, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'horizontal',
        grupo: prefix,
      }
    );
  });

  return piezas;
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p, { infoPorModulo, totalCajones, totalPuertas, totalRepisas, numModulos, totalModulosConPatas, anchoTotal }) {
  const herrajes = [];
  const H = alturaLateralModulo(p);

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  if (totalPuertas > 0) {
    const bisagrasPorPuerta = bisagrasPorAltura(H);
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: totalPuertas * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: totalPuertas });
  }
  if (totalCajones > 0) {
    const largoCorredera = largoCorrederaComercial(profundidadModulo(p) - 60);
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${largoCorredera}mm`
      : `corredera_oculta_${largoCorredera}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  const modulosLavavajillas = infoPorModulo.filter(m => m.tipo === 'lavavajillas').length;
  const modulosHorno = infoPorModulo.filter(m => m.tipo === 'horno').length;
  if (modulosLavavajillas > 0) {
    herrajes.push({ tipo: 'escuadra_fijacion_lavavajillas', cantidad: modulosLavavajillas * 2 });
  }
  if (modulosHorno > 0) {
    herrajes.push({ tipo: 'riel_soporte_horno', cantidad: modulosHorno * 2 });
  }

  // Zócalo de aluminio (a lo largo de todo el frente del mueble) + patas
  // plásticas regulables, 4 por módulo — reemplaza al zócalo de melamina.
  herrajes.push({ tipo: 'zocalo_aluminio_ml', cantidad: Math.ceil(anchoTotal / 1000), unidad: 'm' });
  herrajes.push({ tipo: 'pata_plastica_regulable', cantidad: totalModulosConPatas * 4 });

  // Tornillos de unión entre módulos vecinos, lateral con lateral: 6 por
  // cada junta (3 alturas x 2, para repartir bien la carga a lo alto).
  const juntasEntreModulos = Math.max(0, numModulos - 1);
  const tornillosUnionModulos = juntasEntreModulos * 6;

  // Por cada módulo: 2 laterales x (2 tornillos a piso + 2 a cada uno de
  // los 3 travesaños) = 2 + 2*3 = 8 puntos de fijación por lateral... en la
  // práctica cada módulo lleva 8 tornillos estructurales base (repartidos
  // entre piso y travesaños) + 2 por cajón (caja).
  const tornillosPorModulo = 8;
  herrajes.push({
    tipo: 'tornillo_confirmat / tornillo_1_5/8',
    cantidad: numModulos * tornillosPorModulo + totalCajones * 2 + tornillosUnionModulos,
  });

  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
