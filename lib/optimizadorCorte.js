/**
 * OPTIMIZADOR DE CORTE (NESTING) — algoritmo guillotine bin-packing
 * -------------------------------------------------------------------
 * Recibe el array de "piezas" que entrega el motor de reglas
 * (muebleBajoCocina.js) y las acomoda dentro de planchas estándar,
 * agrupando por espesor + material (no se puede mezclar 15mm con 3mm
 * en la misma plancha).
 *
 * Algoritmo: "guillotine cut" con heurística de mejor ajuste (best-fit).
 * Es el mismo enfoque que usan herramientas como Cut List Optimizer /
 * OptiCutter: cada plancha libre se sub-divide en 2 rectángulos cada
 * vez que se coloca una pieza, y el corte siempre puede hacerse de
 * lado a lado con una sierra (a diferencia de un bin-packing genérico,
 * que podría generar cortes no realizables en una seccionadora).
 */

import { MATERIALES_SIN_NESTING } from './shared';

// ---------- Tamaños de plancha por país / proveedor (configurable) ----------
const PLANCHAS_ESTANDAR = {
  CL: { nombre: 'Chile — Melamina 1830x2500', ancho: 1830, alto: 2500 },
  CL_grande: { nombre: 'Chile — Melamina 1830x3660 (formato grande, algunos proveedores)', ancho: 1830, alto: 3660 },
  AR: { nombre: 'Argentina — Melamina 1830x2750', ancho: 1830, alto: 2750 },
  MX: { nombre: 'México — Melamina 1220x2440 (48x96")', ancho: 1220, alto: 2440 },
  US: { nombre: 'EEUU — Melamina 1220x2440 (4x8 ft)', ancho: 1220, alto: 2440 },
  custom: null, // el usuario ingresa ancho/alto manualmente
};

const KERF_DEFAULT = 4; // mm perdidos por cada corte de sierra (grosor de disco)
const MARGEN_DEFAULT = 10; // mm de margen no utilizable en cada borde de la plancha
const MARGEN_EMPALME = 20; // mm que se pierden en cada unión (solape/refuerzo con prensa o dominó)

/**
 * Punto de entrada principal.
 * @param {Array} piezas - piezas generadas por el motor de reglas
 * @param {Object} opciones - { plancha: 'CL' | 'custom', anchoCustom, altoCustom, kerf, margen }
 */
function optimizarCorte(piezas, opciones = {}) {
  const plancha = resolverPlancha(opciones);
  const kerf = opciones.kerf ?? KERF_DEFAULT;
  const margen = opciones.margen ?? MARGEN_DEFAULT;

  const anchoUtil = plancha.ancho - 2 * margen;
  const altoUtil = plancha.alto - 2 * margen;

  // Materiales de cubierta en piedra (cuarzo/granito/mármol) no se cortan de
  // una plancha de melamina: se excluyen del nesting y del empalme, pero
  // igual quedan en la lista final de piezas.
  const piezasNesteables = piezas.filter(p => !MATERIALES_SIN_NESTING.includes(p.material));
  const piezasSinNesting = piezas.filter(p => MATERIALES_SIN_NESTING.includes(p.material));

  // Piezas más anchas que la plancha (ej. piso/traviesa de un mueble muy largo)
  // se dividen automáticamente en segmentos que se unen en taller ("empalme").
  const piezasDivididas = dividirPiezasGrandes(piezasNesteables, anchoUtil, altoUtil, kerf);

  // Agrupar piezas por espesor+material: no se optimiza junto lo que va en planchas distintas
  const grupos = agruparPorMaterial(piezasDivididas);

  const resultado = {};
  for (const [key, piezasGrupo] of Object.entries(grupos)) {
    resultado[key] = nestearGrupo(piezasGrupo, anchoUtil, altoUtil, kerf, plancha);
  }

  return {
    plancha: { nombre: plancha.nombre, ancho: plancha.ancho, alto: plancha.alto },
    kerf,
    margen,
    piezas: [...piezasDivididas, ...piezasSinNesting], // lista final de piezas (con empalmes ya resueltos)
    resultadosPorMaterial: resultado,
    resumen: resumirResultado(resultado),
  };
}

// ---------- División automática de piezas más anchas que la plancha ----------
// Si una pieza no entra en la plancha en ninguna orientación, pero su dimensión
// corta ("alto") sí cabe, se divide en N segmentos iguales a lo largo de "ancho".
// Si ni siquiera la dimensión corta cabe, se deja intacta: dividir por ancho no
// resuelve nada y nestearGrupo reportará el error real más abajo.
function dividirPiezasGrandes(piezas, anchoUtil, altoUtil, kerf) {
  const resultado = [];
  for (const pieza of piezas) {
    resultado.push(...dividirPiezaSiCorresponde(pieza, anchoUtil, altoUtil, kerf));
  }
  return resultado;
}

function cabeEnPlancha(ancho, alto, anchoUtil, altoUtil, kerf) {
  return (ancho + kerf <= anchoUtil && alto + kerf <= altoUtil)
    || (alto + kerf <= anchoUtil && ancho + kerf <= altoUtil);
}

function dividirPiezaSiCorresponde(pieza, anchoUtil, altoUtil, kerf) {
  const { ancho, alto } = pieza;
  if (cabeEnPlancha(ancho, alto, anchoUtil, altoUtil, kerf)) return [pieza];

  const capacidadPorSegmento = alto + kerf <= altoUtil ? anchoUtil
    : (alto + kerf <= anchoUtil ? altoUtil : null);
  if (capacidadPorSegmento == null) return [pieza]; // ni la dimensión corta cabe: no se resuelve dividiendo

  const capacidadUtilPorSegmento = capacidadPorSegmento - kerf - MARGEN_EMPALME;
  const nSegmentos = Math.max(2, Math.ceil(ancho / capacidadUtilPorSegmento));
  const anchoSegmento = ancho / nSegmentos;

  const segmentos = [];
  for (let i = 0; i < nSegmentos; i++) {
    segmentos.push(crearSegmentoEmpalme(pieza, i, nSegmentos, anchoSegmento));
  }
  return segmentos;
}

function crearSegmentoEmpalme(pieza, indice, total, anchoSegmento) {
  return {
    ...pieza,
    id: `${pieza.id}_empalme_${indice + 1}de${total}`,
    ancho: anchoSegmento,
    posicion: desplazarPosicionSegmento(pieza, indice * anchoSegmento),
    empalme: { piezaOriginal: pieza.id, segmento: indice + 1, totalSegmentos: total },
  };
}

// El campo "ancho" se mapea a distintos ejes según la orientación de la pieza
// (ver components/Visor3D.jsx): horizontal->X, vertical_frontal->X, vertical_profundidad->Z
function desplazarPosicionSegmento(pieza, offset) {
  const { x, y, z } = pieza.posicion;
  if (pieza.rotacion === 'vertical_profundidad') {
    return { x, y, z: z + offset };
  }
  return { x: x + offset, y, z };
}

function resolverPlancha(opciones) {
  if (opciones.plancha === 'custom') {
    if (!opciones.anchoCustom || !opciones.altoCustom) {
      throw new Error('Debe indicar anchoCustom y altoCustom cuando plancha = "custom"');
    }
    return { nombre: 'Custom', ancho: opciones.anchoCustom, alto: opciones.altoCustom };
  }
  const preset = PLANCHAS_ESTANDAR[opciones.plancha || 'CL'];
  if (!preset) throw new Error(`Preset de plancha no encontrado: ${opciones.plancha}`);
  return preset;
}

function agruparPorMaterial(piezas) {
  const grupos = {};
  for (const pieza of piezas) {
    const key = `${pieza.espesor}mm_${pieza.material || 'melamina'}_${pieza.color || 'sin_color'}`;
    if (!grupos[key]) grupos[key] = [];
    // Expandir piezas con cantidad > 1 en instancias individuales
    const cantidad = pieza.cantidad || 1;
    for (let i = 0; i < cantidad; i++) {
      grupos[key].push({ ...pieza, instancia: i + 1 });
    }
  }
  return grupos;
}

/**
 * Nestea un grupo de piezas (mismo espesor/material) en tantas planchas
 * como sean necesarias, usando guillotine best-fit descendente por área.
 */
function nestearGrupo(piezas, anchoUtil, altoUtil, kerf, plancha) {
  // Ordenar de mayor a menor área (heurística estándar: piezas grandes primero)
  const piezasOrdenadas = [...piezas].sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));

  const planchas = [];

  for (const pieza of piezasOrdenadas) {
    let colocada = false;

    // Intentar colocar en alguna plancha ya abierta
    for (const p of planchas) {
      const espacio = buscarEspacio(p.espaciosLibres, pieza, kerf);
      if (espacio) {
        colocarPieza(p, espacio, pieza, kerf);
        colocada = true;
        break;
      }
    }

    // Si no cupo en ninguna, abrir una plancha nueva
    if (!colocada) {
      const nuevaPlancha = {
        numero: planchas.length + 1,
        anchoUtil, altoUtil,
        piezasColocadas: [],
        espaciosLibres: [{ x: 0, y: 0, ancho: anchoUtil, alto: altoUtil }],
      };
      const espacio = buscarEspacio(nuevaPlancha.espaciosLibres, pieza, kerf);
      if (!espacio) {
        throw new Error(
          `La pieza "${pieza.id}" (${pieza.ancho}x${pieza.alto}mm) no cabe en una plancha de ${anchoUtil}x${altoUtil}mm útiles`
        );
      }
      colocarPieza(nuevaPlancha, espacio, pieza, kerf);
      planchas.push(nuevaPlancha);
    }
  }

  return {
    planchasNecesarias: planchas.length,
    planchas: planchas.map(p => ({
      numero: p.numero,
      piezas: p.piezasColocadas,
      aprovechamientoPct: calcularAprovechamiento(p),
    })),
  };
}

// Busca el espacio libre más ajustado (best-fit) donde entra la pieza,
// probando también la pieza rotada 90°.
function buscarEspacio(espaciosLibres, pieza, kerf) {
  let mejor = null;
  let mejorSobrante = Infinity;

  for (const espacio of espaciosLibres) {
    for (const rotada of [false, true]) {
      const ancho = (rotada ? pieza.alto : pieza.ancho) + kerf;
      const alto = (rotada ? pieza.ancho : pieza.alto) + kerf;
      if (ancho <= espacio.ancho && alto <= espacio.alto) {
        const sobrante = (espacio.ancho * espacio.alto) - (ancho * alto);
        if (sobrante < mejorSobrante) {
          mejorSobrante = sobrante;
          mejor = { espacio, rotada, ancho, alto };
        }
      }
    }
  }
  return mejor;
}

// Coloca la pieza en el espacio elegido y sub-divide el espacio libre
// en dos nuevos rectángulos (corte guillotine: uno a la derecha, uno abajo)
function colocarPieza(plancha, match, pieza, kerf) {
  const { espacio, rotada, ancho, alto } = match;

  plancha.piezasColocadas.push({
    id: pieza.id,
    grupo: pieza.grupo,
    x: espacio.x,
    y: espacio.y,
    ancho: rotada ? pieza.alto : pieza.ancho,
    alto: rotada ? pieza.ancho : pieza.alto,
    rotada,
  });

  // Quitar el espacio usado y agregar los dos rectángulos remanentes
  plancha.espaciosLibres = plancha.espaciosLibres.filter(e => e !== espacio);

  const espacioDerecha = {
    x: espacio.x + ancho, y: espacio.y,
    ancho: espacio.ancho - ancho, alto: alto,
  };
  const espacioAbajo = {
    x: espacio.x, y: espacio.y + alto,
    ancho: espacio.ancho, alto: espacio.alto - alto,
  };

  if (espacioDerecha.ancho > 0 && espacioDerecha.alto > 0) plancha.espaciosLibres.push(espacioDerecha);
  if (espacioAbajo.ancho > 0 && espacioAbajo.alto > 0) plancha.espaciosLibres.push(espacioAbajo);
}

function calcularAprovechamiento(plancha) {
  const areaTotal = plancha.anchoUtil * plancha.altoUtil;
  const areaUsada = plancha.piezasColocadas.reduce((sum, p) => sum + p.ancho * p.alto, 0);
  return Math.round((areaUsada / areaTotal) * 1000) / 10; // % con 1 decimal
}

function resumirResultado(resultado) {
  let totalPlanchas = 0;
  const detalle = {};
  for (const [key, r] of Object.entries(resultado)) {
    totalPlanchas += r.planchasNecesarias;
    detalle[key] = r.planchasNecesarias;
  }
  return { totalPlanchas, porMaterial: detalle };
}

export { optimizarCorte, PLANCHAS_ESTANDAR };
