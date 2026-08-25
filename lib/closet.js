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

import { resumirPlanchas } from './shared';

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

  secciones.forEach((seccion, i) => {
    const { piezas: piezasFrentes, cajaInfos, zonaLibreDesde } = generarSeccionFrentes(p, seccion, i);
    piezas.push(...piezasFrentes);

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

  const herrajes = generarHerrajes(p, { totalCajones, totalRepisas, secciones, divisores });

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

  const n = p.secciones.length;
  const nDivisores = contarDivisoresNecesarios(p.secciones);
  const anchoPorSeccion = (p.A - 2 * p.e - nDivisores * p.e) / n;
  if (anchoPorSeccion < 200) {
    throw new Error(
      `Con ${n} secciones, cada una queda de solo ${Math.round(anchoPorSeccion)}mm. Reduce la cantidad de secciones o aumenta el ancho (A).`
    );
  }
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
function piezasCuerpo(p) {
  const { A, H, P, e, colorInterior } = p;

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

// ---------- 3. Reparto del ancho en secciones + divisores ----------
// Reparte el ancho interior en partes iguales entre las secciones (v1: sin
// anchos custom por sección). Cada divisor interno es UNA sola pieza
// compartida entre la sección de su izquierda y la de su derecha.
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const nDivisores = contarDivisoresNecesarios(p.secciones);
  const anchoInteriorTotal = A - 2 * e - nDivisores * e;
  const anchoPorSeccion = anchoInteriorTotal / n;

  const secciones = [];
  const divisores = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion: anchoPorSeccion });
    x += anchoPorSeccion;
    if (i < n - 1) {
      const necesitaDivisor = !(esColgadorPuro(p.secciones[i]) && esColgadorPuro(p.secciones[i + 1]));
      if (necesitaDivisor) {
        divisores.push({ id: `divisor_${divisores.length + 1}`, x });
        x += e;
      }
    }
  }
  return { secciones, divisores };
}

function piezasDivisores(p, divisores) {
  const { H, P, e, colorInterior } = p;
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

// ---------- 4. Frentes de cajón dentro de una sección ----------
// Los cajones de una sección se apilan desde su piso; el resto de la altura
// de la sección (arriba de los cajones) queda libre para repisas/colgador.
function generarSeccionFrentes(p, seccion, indice) {
  const { xInicio, anchoSeccion, cajones: nC } = seccion;
  const piezas = [];
  const cajaInfos = [];

  if (nC > 0) {
    const gap = 3;
    let ySiguiente = 3;
    for (let i = 0; i < nC; i++) {
      const y = ySiguiente;
      piezas.push({
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoSeccion - 4, alto: ALTURA_CAJON_UNIDAD, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `s${indice + 1}_cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: ALTURA_CAJON_UNIDAD, posicionY: y, xInicio, anchoSeccion });
      ySiguiente = y + ALTURA_CAJON_UNIDAD + gap;
    }
    return { piezas, cajaInfos, zonaLibreDesde: ySiguiente };
  }

  return { piezas, cajaInfos, zonaLibreDesde: p.e };
}

// ---------- 5. Cajas de cajón (mismo patrón que muebleBajoCocina/vanitorioBano) ----------
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
      ancho: anchoSeccion - 4, alto: p.P - 40, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + 2, y, z: 20 },
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

function piezasPuertasBatientes(p) {
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

// Puertas correderas: paneles que se solapan (van en dos rieles, uno
// delante del otro) y en conjunto cubren todo el ancho A al combinarse.
function piezasPuertasCorrederas(p) {
  const { A, H, nP, espesorPuertas, colorExterior } = p;
  const solape = 40; // mm de traslape entre paneles contiguos
  const anchoPuerta = (A + (nP - 1) * solape) / nP;
  const paso = anchoPuerta - solape;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    const enRielTrasero = i % 2 === 0; // los paneles alternan entre riel delantero y trasero
    piezas.push({
      id: `puerta_corredera_${i + 1}`,
      ancho: anchoPuerta, alto: H - 15, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: i * paso, y: 8, z: enRielTrasero ? p.P : p.P + 14 },
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
  const { A, H, P, e, colorExterior } = p;
  return {
    id: 'tapacanto_superior_corredera',
    ancho: A, alto: ALTO_TAPACANTO_CORREDERA, espesor: e,
    cantos: ['inferior'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y: H - ALTO_TAPACANTO_CORREDERA, z: P + 14 },
    rotacion: 'vertical_frontal',
  };
}

// ---------- 8. Herrajes ----------
function generarHerrajes(p, { totalCajones, totalRepisas, secciones, divisores }) {
  const herrajes = [];

  if (totalCajones > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(p.P - 60)}mm`
      : `corredera_oculta_${Math.round(p.P - 60)}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: totalRepisas * 4 });
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
      herrajes.push({ tipo: 'bisagra_codo', cantidad: p.nP * bisagrasPorPuerta });
      herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
    }
  }

  const puntosColgado = p.A > 900 ? 3 : 2;
  herrajes.push({ tipo: 'escuadra_colgado_pared', cantidad: puntosColgado });
  herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgado });

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 + divisores.length * 4 }); // cuerpo + fijación de divisores
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 + totalCajones * 4 });

  return herrajes;
}

export { generarDespiece };
