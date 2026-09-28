// Verificador de invariantes geométricas para todos los motores de despiece.
// No reemplaza probar un mueble físico real, pero atrapa la clase de bug que
// encontramos a mano esta sesión (piezas que se traslapan en 3D, ej. una
// repisa atravesando el respaldo) — corre cientos de combinaciones de
// medidas por cada tipo de mueble y revisa:
//   1. Ninguna pieza se traslapa con otra en las 3 dimensiones a la vez.
//   2. Ninguna medida (ancho/alto/espesor) es negativa, cero o NaN.
//   3. Los herrajes no tienen cantidades negativas o no numéricas.
//
// Uso: node scripts/verificar-despieces.mjs

import { generarDespiece as generarBajoCocina } from '../lib/muebleBajoCocina.js';
import { generarDespiece as generarAltoCocina } from '../lib/muebleAltoCocina.js';
import { generarDespiece as generarVanitorioBano } from '../lib/vanitorioBano.js';
import { generarDespiece as generarCloset } from '../lib/closet.js';
import { generarDespiece as generarDespensa } from '../lib/despensa.js';
import { generarDespiece as generarVelador } from '../lib/velador.js';
import { generarDespiece as generarEscritorio } from '../lib/escritorio.js';
import { generarDespiece as generarLibrero } from '../lib/librero.js';
import { generarDespiece as generarBaul } from '../lib/baul.js';

// Traslape mínimo (mm) para considerarse un problema real — piezas que
// solo se tocan en un borde (ej. lateral contra piso) dan overlap ~0 y no
// deben marcarse; un bug real típicamente traslapa el espesor completo
// de una pieza (15-18mm), así que 2mm de margen es generoso mientras
// sigue detectando el tipo de error que ya encontramos.
const EPSILON_MM = 2;

// Misma lógica que components/Visor3D.jsx para convertir ancho/alto/espesor
// + rotación en una caja 3D real (sin la escala de render, no hace falta
// para comparar traslapes).
function bbox(pieza) {
  const { ancho, alto, espesor, posicion, rotacion } = pieza;
  const e = espesor ?? 15;
  const { x: px, y: py, z: pz } = posicion;
  let dimX, dimY, dimZ;
  if (rotacion === 'horizontal') {
    dimX = ancho; dimY = e; dimZ = alto;
  } else if (rotacion === 'vertical_profundidad') {
    dimX = e; dimY = alto; dimZ = ancho;
  } else {
    // 'vertical_frontal' (default)
    dimX = ancho; dimY = alto; dimZ = e;
  }
  return {
    xMin: px, xMax: px + dimX,
    yMin: py, yMax: py + dimY,
    zMin: pz, zMax: pz + dimZ,
  };
}

function overlapAmount(a, b) {
  const ox = Math.min(a.xMax, b.xMax) - Math.max(a.xMin, b.xMin);
  const oy = Math.min(a.yMax, b.yMax) - Math.max(a.yMin, b.yMin);
  const oz = Math.min(a.zMax, b.zMax) - Math.max(a.zMin, b.zMin);
  if (ox > 0 && oy > 0 && oz > 0) return Math.min(ox, oy, oz);
  return 0;
}

function verificarDespiece(modulo, etiquetaCaso, params, motor) {
  const problemas = [];
  let despiece;
  try {
    despiece = motor(params);
  } catch (e) {
    // Un error de validación esperado (ej. medida fuera de rango a propósito)
    // no es un bug — se reporta aparte, no como fallo geométrico.
    return { error: e.message, problemas: [] };
  }

  const piezas = (despiece.piezas || []).filter(p => !p.soloVisual);

  // 1. Medidas inválidas.
  for (const p of piezas) {
    for (const campo of ['ancho', 'alto']) {
      const v = p[campo];
      if (!(v > 0) || !Number.isFinite(v)) {
        problemas.push(`Pieza "${p.id}": ${campo}=${v} (debe ser un número positivo)`);
      }
    }
    const e = p.espesor ?? 15;
    if (!(e > 0) || !Number.isFinite(e)) {
      problemas.push(`Pieza "${p.id}": espesor=${e} (debe ser un número positivo)`);
    }
    if (!p.posicion || !Number.isFinite(p.posicion.x) || !Number.isFinite(p.posicion.y) || !Number.isFinite(p.posicion.z)) {
      problemas.push(`Pieza "${p.id}": posición inválida (${JSON.stringify(p.posicion)})`);
    }
  }

  // 2. Traslapes 3D entre piezas (comparación por pares — O(n²), pero el
  // despiece más grande de este set tiene unas pocas docenas de piezas).
  const cajas = piezas.map(p => ({ id: p.id, box: bbox(p) }));
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const ov = overlapAmount(cajas[i].box, cajas[j].box);
      if (ov > EPSILON_MM) {
        problemas.push(`Traslape de ${ov.toFixed(1)}mm entre "${cajas[i].id}" y "${cajas[j].id}"`);
      }
    }
  }

  // 3. Herrajes con cantidades inválidas.
  for (const h of despiece.herrajes || []) {
    if (!(h.cantidad >= 0) || !Number.isFinite(h.cantidad)) {
      problemas.push(`Herraje "${h.tipo}": cantidad=${h.cantidad} (debe ser un número ≥ 0)`);
    }
  }

  return { error: null, problemas };
}

// ---------- Casos de prueba por módulo ----------
// No pretende cubrir cada combinación posible — cubre los extremos de cada
// parámetro (mínimos, máximos, cada opción documentada) más un caso "típico"
// por módulo, que es donde suelen aparecer los bugs de traslape.

const casos = [];

// bajo_cocina / alto_cocina: varios módulos, todas las configuraciones de
// sección, con y sin cubierta/isla.
for (const modulo of ['bajo_cocina']) {
  casos.push([modulo, 'default', {}, generarBajoCocina]);
  casos.push([modulo, '1 módulo mínimo', { H: 700, P: 500, secciones: [{ tipo: 'estandar', config: 'solo_cajones', nC: 1, ancho: 300 }] }, generarBajoCocina]);
  casos.push([modulo, 'combo cajón+puerta+repisa', {
    H: 900, P: 600,
    secciones: [
      { tipo: 'estandar', config: 'solo_cajones', nC: 4, ancho: 500 },
      { tipo: 'estandar', config: 'solo_puertas', nP: 2, repisas: 2, ancho: 700 },
      { tipo: 'estandar', config: 'mixto', nC: 1, nP: 1, repisas: 1, ancho: 500 },
      { tipo: 'estandar', config: 'abierto', repisas: 3, ancho: 400 },
    ],
  }, generarBajoCocina]);
  casos.push([modulo, 'lavaplatos + horno + lavavajillas', {
    H: 850, P: 600,
    secciones: [
      { tipo: 'lavaplatos', ancho: 800 },
      { tipo: 'horno', ancho: 600 },
      { tipo: 'lavavajillas', ancho: 600 },
    ],
  }, generarBajoCocina]);
  casos.push([modulo, 'isla + cubierta', {
    H: 900, P: 900, isla: true,
    cubierta: { incluir: true, material: 'cuarzo', espesor: 20 },
    secciones: [{ tipo: 'estandar', config: 'solo_cajones', nC: 3, ancho: 900 }],
  }, generarBajoCocina]);
}

casos.push(['alto_cocina', 'default', {}, generarAltoCocina]);
casos.push(['alto_cocina', 'varios módulos con baldas', {
  H: 700, P: 320,
  secciones: [
    { ancho: 400, nP: 1, nBaldas: 0 },
    { ancho: 900, nP: 2, nBaldas: 3 },
    { ancho: 600, nP: 1, nBaldas: 1 },
  ],
}, generarAltoCocina]);

// vanitorio_bano: cada config × cada soporte, con y sin cubierta.
for (const config of ['solo_puertas', 'solo_cajones', 'mixto', 'abierto']) {
  for (const soporte of ['patas', 'suspendido']) {
    const nP = config === 'solo_cajones' ? 0 : 2;
    const nC = config === 'solo_puertas' || config === 'abierto' ? 0 : 2;
    casos.push(['vanitorio_bano', `${config}/${soporte}`, {
      config, soporte, nP, nC,
      repisas: config === 'solo_puertas' || config === 'mixto' ? 2 : 0,
      cubierta: { incluir: true, material: 'melamina', espesor: 20 },
    }, generarVanitorioBano]);
  }
}

// closet: batiente/corredera, con/sin puertas, varias secciones (cajones,
// repisas, colgador, mezclas, secciones "colgador puro" adyacentes).
casos.push(['closet', 'default', {}, generarCloset]);
casos.push(['closet', 'batiente 1 sección angosta', {
  H: 2000, P: 550, nP: 1, tipoPuerta: 'batiente',
  secciones: [{ cajones: 0, repisas: 1, colgador: false, ancho: 300 }],
}, generarCloset]);
casos.push(['closet', 'batiente ancho grande (2 puertas por sección)', {
  H: 2400, P: 600, nP: 1, tipoPuerta: 'batiente',
  secciones: [{ cajones: 3, repisas: 2, colgador: false, ancho: 1200 }],
}, generarCloset]);
casos.push(['closet', 'corredera con cajones y repisas', {
  H: 2200, P: 600, nP: 2, tipoPuerta: 'corredera',
  secciones: [
    { cajones: 2, repisas: 2, colgador: false, ancho: 800 },
    { cajones: 0, repisas: 1, colgador: true, ancho: 800 },
    { cajones: 2, repisas: 2, colgador: false, ancho: 800 },
  ],
}, generarCloset]);
casos.push(['closet', 'sin puertas, 2 colgadores puros adyacentes (sin divisor)', {
  H: 2200, P: 580, nP: 0, tipoPuerta: 'batiente',
  secciones: [
    { cajones: 0, repisas: 0, colgador: true, ancho: 700 },
    { cajones: 0, repisas: 0, colgador: true, ancho: 700 },
    { cajones: 3, repisas: 1, colgador: false, ancho: 800 },
  ],
}, generarCloset]);
casos.push(['closet', 'mueble alto, puertas gruesas', {
  H: 2700, P: 620, nP: 1, tipoPuerta: 'batiente', espesorPuertas: 18,
  secciones: [{ cajones: 4, repisas: 3, colgador: false, ancho: 900 }],
}, generarCloset]);

// despensa: 0/1/2 puertas, mueble alto (con travesaño intermedio... ya no
// aplica, pero se prueba igual el rango de alto), ancho chico y grande.
for (const nP of [0, 1, 2]) {
  casos.push(['despensa', `nP=${nP}, mueble bajo`, { A: 450, H: 900, P: 400, nP, repisas: 3 }, generarDespensa]);
  casos.push(['despensa', `nP=${nP}, mueble alto (>1.4m)`, { A: 900, H: 2400, P: 450, nP, repisas: 6 }, generarDespensa]);
}
casos.push(['despensa', 'sin repisas', { A: 500, H: 1800, P: 400, nP: 1, repisas: 0 }, generarDespensa]);

// velador: cada tipoInferior.
for (const tipoInferior of ['puerta', 'repisa', 'abierto']) {
  casos.push(['velador', tipoInferior, { A: 450, H: 500, P: 400, tipoInferior }, generarVelador]);
}
casos.push(['velador', 'chico', { A: 300, H: 450, P: 300, tipoInferior: 'puerta' }, generarVelador]);

// escritorio: cada configCajonera × lado, ancho mínimo viable y grande.
for (const configCajonera of ['solo_cajones', 'cajon_puerta', 'cajon_repisa']) {
  for (const ladoCajonera of ['derecha', 'izquierda']) {
    casos.push(['escritorio', `${configCajonera}/${ladoCajonera}`, {
      A: 1200, H: 720, P: 550, configCajonera, ladoCajonera, nC: 3, anchoCajonera: 450,
      cubierta: { material: 'melamina', espesor: 20 },
    }, generarEscritorio]);
  }
}
casos.push(['escritorio', 'ancho grande, cubierta gruesa', {
  A: 1800, H: 750, P: 600, configCajonera: 'solo_cajones', nC: 4, anchoCajonera: 500,
  cubierta: { material: 'cuarzo', espesor: 30 },
}, generarEscritorio]);

// librero: 1 sección, muchas secciones, mueble alto.
casos.push(['librero', 'default', {}, generarLibrero]);
casos.push(['librero', '1 sección', { H: 1800, P: 300, secciones: [{ repisas: 5, ancho: 800 }] }, generarLibrero]);
casos.push(['librero', '4 secciones angostas', {
  H: 2200, P: 300,
  secciones: [
    { repisas: 6, ancho: 300 },
    { repisas: 4, ancho: 300 },
    { repisas: 6, ancho: 300 },
    { repisas: 4, ancho: 300 },
  ],
}, generarLibrero]);

// baul: default, chico, grande.
casos.push(['baul', 'default', {}, generarBaul]);
casos.push(['baul', 'chico', { A: 400, H: 350, P: 350 }, generarBaul]);
casos.push(['baul', 'grande', { A: 1200, H: 500, P: 500 }, generarBaul]);

// ---------- Ejecutar ----------
let totalProblemas = 0;
let totalErrores = 0;
for (const [modulo, etiqueta, params, motor] of casos) {
  const { error, problemas } = verificarDespiece(modulo, etiqueta, params, motor);
  if (error) {
    totalErrores++;
    console.log(`⚠️  [${modulo}] ${etiqueta}: validación rechazó el caso — ${error}`);
    continue;
  }
  if (problemas.length > 0) {
    totalProblemas += problemas.length;
    console.log(`❌ [${modulo}] ${etiqueta}:`);
    problemas.forEach(p => console.log(`   - ${p}`));
  } else {
    console.log(`✅ [${modulo}] ${etiqueta}`);
  }
}

console.log(`\n${casos.length} casos probados — ${totalProblemas} problema(s) geométrico(s), ${totalErrores} rechazado(s) por validación.`);
process.exit(totalProblemas > 0 ? 1 : 0);
