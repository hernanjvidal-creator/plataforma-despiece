// Auditor geométrico: complementa a verificar-despieces.mjs. En vez de unos
// pocos casos escritos a mano, barre miles de combinaciones de medidas por
// mueble y revisa, además de los traslapes en 3D:
//   - la luz entre frentes vecinos y contra las tapas laterales,
//   - piezas que no caben en la plancha (terminan en "empalme"),
//   - puertas y cajas de cajón de medidas poco razonables,
//   - el tamaño real del mueble contra el que se pidió,
//   - que el diagrama de corte sea válido (nada fuera de la plancha ni
//     superpuesto, y la misma cantidad de piezas que el listado).
// Agrupa los hallazgos por tipo y cuenta cuántas veces aparece cada uno.
//
// Uso: node --loader ./scripts/resolve-extensionless-loader.mjs scripts/auditar-despieces.mjs
import { generarDespiecePorModulo } from '../lib/generarDespiecePorModulo.js';

const PLANCHA = { ancho: 1830, alto: 2500, margen: 10, kerf: 4 };

function bbox(p) {
  const e = p.espesor ?? 15;
  const { x, y, z } = p.posicion;
  let dx, dy, dz;
  if (p.rotacion === 'horizontal') { dx = p.ancho; dy = e; dz = p.alto; }
  else if (p.rotacion === 'vertical_profundidad') { dx = e; dy = p.alto; dz = p.ancho; }
  else { dx = p.ancho; dy = p.alto; dz = e; }
  return { x0: x, x1: x + dx, y0: y, y1: y + dy, z0: z, z1: z + dz };
}
const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
const norm = id => id
  .replace(/_empalme_\d+de\d+/g, '')
  .replace(/^t\d+_m\d+_/, '').replace(/^m\d+_/, '').replace(/^s\d+_/, '')
  .replace(/cajon_?\d+/g, 'cajonN').replace(/_\d+$/g, '_N').replace(/_\d+_/g, '_N_');
const esFrente = id => /(^|_)puerta_\d+$|frente_cajon_\d+$/.test(id);

const hallazgos = new Map(); // clave -> { n, ejemplo, modulos:Set }
function anotar(modulo, clave, ejemplo) {
  const k = `${modulo} | ${clave}`;
  const h = hallazgos.get(k) || { n: 0, ejemplo };
  h.n++; hallazgos.set(k, h);
}
const errores = new Map();
const totales = {};

function auditar(modulo, etiqueta, params) {
  totales[modulo] = totales[modulo] || { casos: 0, rechazados: 0, conProblema: 0 };
  totales[modulo].casos++;
  let r;
  try { r = generarDespiecePorModulo(modulo, params, { plancha: 'CL' }); }
  catch (e) {
    totales[modulo].rechazados++;
    const m = e.message.replace(/\d+(\.\d+)?/g, '#');
    const k = `${modulo} | ${m}`;
    const h = errores.get(k) || { n: 0, ejemplo: `${etiqueta} → ${e.message}` };
    h.n++; errores.set(k, h);
    return;
  }
  const antes = [...hallazgos.values()].reduce((s, h) => s + h.n, 0);
  const piezas = r.despiece.piezas.filter(p => !p.soloVisual);
  const cajas = piezas.map(p => ({ p, b: bbox(p), id: p.id }));

  // 1. medidas inválidas / fraccionarias / muy chicas
  for (const p of piezas) {
    for (const c of ['ancho', 'alto']) {
      if (!(p[c] > 0) || !Number.isFinite(p[c])) anotar(modulo, `MEDIDA INVÁLIDA ${norm(p.id)}.${c}`, `${etiqueta}: ${p.id} ${c}=${p[c]}`);
      else if (p[c] < 60 && p.material !== 'MDF') anotar(modulo, `pieza con lado < 60mm: ${norm(p.id)}`, `${etiqueta}: ${p.id} ${Math.round(p.ancho)}x${Math.round(p.alto)}`);
    }
    if (p.empalme) anotar(modulo, `EMPALME (no cabe en plancha): ${norm(p.id)}`, `${etiqueta}: ${p.id} ${Math.round(p.ancho)}x${Math.round(p.alto)}`);
    if (/puerta_\d+$/.test(p.id) && !/corredera/.test(p.id)) {
      if (p.ancho > 600) anotar(modulo, 'puerta batiente > 600mm de ancho', `${etiqueta}: ${p.id} ${Math.round(p.ancho)}x${Math.round(p.alto)}`);
      if (p.ancho < 200) anotar(modulo, 'puerta batiente < 200mm de ancho', `${etiqueta}: ${p.id} ${Math.round(p.ancho)}x${Math.round(p.alto)}`);
    }
    if (/frente_caja$/.test(p.id) && p.ancho < 150) anotar(modulo, 'caja de cajón < 150mm de ancho interior', `${etiqueta}: ${p.id} ancho=${Math.round(p.ancho)}`);
  }

  // 2. traslapes 3D
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i].b, b = cajas[j].b;
    const ox = ov(a.x0, a.x1, b.x0, b.x1), oy = ov(a.y0, a.y1, b.y0, b.y1), oz = ov(a.z0, a.z1, b.z0, b.z1);
    if (ox > 0.5 && oy > 0.5 && oz > 0.5) {
      const esMDF = cajas[i].p.material === 'MDF' || cajas[j].p.material === 'MDF';
      const clave = `${esMDF ? 'traslape respaldo MDF 3mm (solo dibujo)' : 'TRASLAPE'}: ${norm(cajas[i].id)} × ${norm(cajas[j].id)} (${Math.round(Math.min(ox, oy, oz))}mm)`;
      anotar(modulo, clave, `${etiqueta}: ${cajas[i].id} × ${cajas[j].id} ox=${ox.toFixed(1)} oy=${oy.toFixed(1)} oz=${oz.toFixed(1)}`);
    }
  }

  // 3. holgura entre frentes vecinos y contra tapas laterales (mismo plano Z)
  const frentes = cajas.filter(c => esFrente(c.id));
  const tapas = cajas.filter(c => /tapa_lateral/.test(c.id));
  for (let i = 0; i < frentes.length; i++) {
    const a = frentes[i].b;
    for (let j = 0; j < frentes.length; j++) {
      if (i === j) continue;
      const b = frentes[j].b;
      if (ov(a.z0, a.z1, b.z0, b.z1) <= 0) continue;
      if (ov(a.y0, a.y1, b.y0, b.y1) > 5) {
        const gap = b.x0 - a.x1;
        if (gap > -0.01 && gap < 1.5) anotar(modulo, `frentes vecinos con ${gap.toFixed(1)}mm de luz (rozan)`, `${etiqueta}: ${frentes[i].id} | ${frentes[j].id}`);
      }
    }
    for (const t of tapas) {
      const b = t.b;
      if (ov(a.z0, a.z1, b.z0, b.z1) <= 0 || ov(a.y0, a.y1, b.y0, b.y1) <= 5) continue;
      const gap = Math.min(Math.abs(a.x0 - b.x1), Math.abs(b.x0 - a.x1));
      if (gap < 1.5) anotar(modulo, `frente a ${gap.toFixed(1)}mm de la tapa lateral (roza)`, `${etiqueta}: ${frentes[i].id} | ${t.id}`);
    }
  }

  // 4. dimensiones exteriores reales vs lo pedido
  const todo = cajas.reduce((m, c) => ({
    x0: Math.min(m.x0, c.b.x0), x1: Math.max(m.x1, c.b.x1), y0: Math.min(m.y0, c.b.y0), y1: Math.max(m.y1, c.b.y1), z0: Math.min(m.z0, c.b.z0), z1: Math.max(m.z1, c.b.z1),
  }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 });
  const pr = r.despiece.parametros;
  const Areal = todo.x1 - todo.x0, Hreal = todo.y1 - todo.y0, Preal = todo.z1 - todo.z0;
  const dA = Math.round(Areal - (pr.A ?? 0)), dH = Math.round(Hreal - pr.H), dP = Math.round(Preal - pr.P);
  if (!r.despiece.piezas.some(p => /^esquina/.test(p.id))) {
    if (dA !== 0) anotar(modulo, `ancho real ≠ ancho pedido (${dA > 0 ? '+' : ''}${dA}mm)`, `${etiqueta}: pedido ${pr.A} real ${Math.round(Areal)}`);
    if (dH !== 0) anotar(modulo, `alto real ≠ alto pedido (${dH > 0 ? '+' : ''}${dH}mm)`, `${etiqueta}: pedido ${pr.H} real ${Math.round(Hreal)}`);
    if (dP !== 0) anotar(modulo, `fondo real ≠ fondo pedido (${dP > 0 ? '+' : ''}${dP}mm)`, `${etiqueta}: pedido ${pr.P} real ${Math.round(Preal)}`);
  }

  // 5. diagrama de corte: dentro de la plancha, sin traslapes, todas las piezas
  const util = { w: PLANCHA.ancho - 2 * PLANCHA.margen, h: PLANCHA.alto - 2 * PLANCHA.margen };
  let colocadas = 0;
  for (const [grupo, g] of Object.entries(r.corte.resultadosPorMaterial)) {
    for (const pl of g.planchas) {
      for (let i = 0; i < pl.piezas.length; i++) {
        const a = pl.piezas[i]; colocadas++;
        if (a.x < 0 || a.y < 0 || a.x + a.ancho > util.w + 0.01 || a.y + a.alto > util.h + 0.01) anotar(modulo, 'CORTE: pieza fuera de la plancha', `${etiqueta}: ${a.id}`);
        for (let j = i + 1; j < pl.piezas.length; j++) {
          const b = pl.piezas[j];
          if (ov(a.x, a.x + a.ancho, b.x, b.x + b.ancho) > 0.01 && ov(a.y, a.y + a.alto, b.y, b.y + b.alto) > 0.01) anotar(modulo, 'CORTE: piezas superpuestas en la plancha', `${etiqueta}: ${a.id} × ${b.id}`);
        }
      }
    }
    if (/^20mm_melamina|^2\dmm_melamina|^3\dmm_melamina/.test(grupo)) anotar(modulo, `material inexistente en el comercio: ${grupo.replace(/_[^_]+$/, '')}`, `${etiqueta}: ${grupo} → ${g.planchasNecesarias} plancha(s)`);
  }
  const esperadas = r.corte.piezas.filter(p => !['cuarzo', 'granito', 'marmol'].includes(p.material)).reduce((s, p) => s + (p.cantidad || 1), 0);
  if (colocadas !== esperadas) anotar(modulo, 'CORTE: cantidad de piezas en planchas ≠ lista de piezas', `${etiqueta}: ${colocadas} vs ${esperadas}`);

  const despues = [...hallazgos.values()].reduce((s, h) => s + h.n, 0);
  if (despues > antes) totales[modulo].conProblema++;
}

// ---------- Barridos ----------
const prod = (...listas) => listas.reduce((acc, l) => acc.flatMap(a => l.map(v => [...a, v])), [[]]);

// bajo_cocina
for (const [H, P, ancho] of prod([700, 850, 900], [500, 560, 600], [150, 300, 400, 600, 900, 1200])) {
  for (const nC of [1, 2, 3, 4, 5]) auditar('bajo_cocina', `H${H} P${P} cajones${nC} a${ancho}`, { H, P, secciones: [{ tipo: 'estandar', config: 'solo_cajones', nC, nP: 0, ancho }] });
  for (const nP of [1, 2]) for (const repisas of [0, 2]) auditar('bajo_cocina', `H${H} P${P} puertas${nP} rep${repisas} a${ancho}`, { H, P, secciones: [{ tipo: 'estandar', config: 'solo_puertas', nP, nC: 0, repisas, ancho }] });
  for (const nC of [1, 2]) for (const nP of [1, 2]) auditar('bajo_cocina', `H${H} P${P} mixto c${nC} p${nP} a${ancho}`, { H, P, secciones: [{ tipo: 'estandar', config: 'mixto', nP, nC, repisas: 1, ancho }] });
  auditar('bajo_cocina', `H${H} P${P} abierto a${ancho}`, { H, P, secciones: [{ tipo: 'estandar', config: 'abierto', nP: 0, nC: 0, repisas: 2, ancho }] });
}
for (const [H, isla, cub] of prod([850, 900], [false, true], [false, true])) {
  auditar('bajo_cocina', `cocina 3 módulos H${H} isla=${isla} cubierta=${cub}`, { H, P: 600, isla, cubierta: { incluir: cub, material: 'melamina', espesor: 20 }, secciones: [
    { tipo: 'estandar', config: 'solo_cajones', nC: 3, nP: 0, ancho: 600 },
    { tipo: 'lavaplatos', ancho: 800 },
    { tipo: 'estandar', config: 'solo_puertas', nP: 2, nC: 0, repisas: 1, ancho: 800 },
    { tipo: 'horno', ancho: 600 },
  ] });
  auditar('bajo_cocina', `cocina larga 3,6 m H${H} isla=${isla} cubierta=${cub}`, { H, P: 600, isla, cubierta: { incluir: cub, material: 'melamina', espesor: 20 }, secciones: [600, 600, 600, 600, 600, 600].map(ancho => ({ tipo: 'estandar', config: 'solo_puertas', nP: 2, nC: 0, repisas: 1, ancho })) });
}

// alto_cocina
for (const [H, P, ancho, nP, nBaldas] of prod([500, 700, 900], [300, 320, 350], [300, 400, 600, 800, 1000], [1, 2], [0, 1, 3])) {
  auditar('alto_cocina', `H${H} P${P} a${ancho} p${nP} b${nBaldas}`, { H, P, secciones: [{ ancho, nP, nBaldas }] });
}
auditar('alto_cocina', '3 módulos', { H: 700, P: 320, secciones: [{ ancho: 400, nP: 1, nBaldas: 1 }, { ancho: 800, nP: 2, nBaldas: 1 }, { ancho: 600, nP: 2, nBaldas: 2 }] });

// vanitorio_bano
for (const [A, H, P, soporte] of prod([400, 600, 800, 1000, 1200], [550, 800, 850], [400, 450, 500], ['patas', 'suspendido'])) {
  for (const nC of [1, 2, 3]) auditar('vanitorio_bano', `A${A} H${H} P${P} ${soporte} cajones${nC}`, { A, H, P, soporte, config: 'solo_cajones', nC, nP: 0 });
  for (const nP of [1, 2]) auditar('vanitorio_bano', `A${A} H${H} P${P} ${soporte} puertas${nP}`, { A, H, P, soporte, config: 'solo_puertas', nC: 0, nP, repisas: 1 });
  auditar('vanitorio_bano', `A${A} H${H} P${P} ${soporte} mixto`, { A, H, P, soporte, config: 'mixto', nC: 1, nP: 2, repisas: 1 });
  auditar('vanitorio_bano', `A${A} H${H} P${P} ${soporte} abierto`, { A, H, P, soporte, config: 'abierto', nC: 0, nP: 0, repisas: 1 });
}
auditar('vanitorio_bano', 'con cubierta', { A: 800, H: 850, P: 480, cubierta: { incluir: true, material: 'melamina', espesor: 20 } });

// closet
const seccionesCloset = [
  ['1 sección cajones+repisas', a => [{ cajones: 3, repisas: 2, colgador: false, ancho: a }]],
  ['1 sección colgador', a => [{ cajones: 0, repisas: 1, colgador: true, ancho: a }]],
  ['3 secciones típicas', a => [{ cajones: 2, repisas: 2, colgador: false, ancho: a }, { cajones: 0, repisas: 1, colgador: true, ancho: a }, { cajones: 2, repisas: 2, colgador: false, ancho: a }]],
  ['2 colgadores seguidos', a => [{ cajones: 0, repisas: 1, colgador: true, ancho: a }, { cajones: 0, repisas: 1, colgador: true, ancho: a }]],
];
for (const [H, P, tipoPuerta, nP, ancho] of prod([2000, 2200, 2400], [500, 580, 600], ['batiente', 'corredera'], [0, 1], [400, 600, 800, 1000, 1200])) {
  for (const [nombre, f] of seccionesCloset) auditar('closet', `H${H} P${P} ${nP ? tipoPuerta : 'sin puertas'} ${nombre} a${ancho}`, { H, P, tipoPuerta, nP, secciones: f(ancho) });
}

// despensa
for (const [A, H, P, nP, repisas] of prod([300, 450, 600, 900, 1200], [1500, 2000, 2400], [350, 450, 600], [0, 1, 2], [0, 5])) {
  auditar('despensa', `A${A} H${H} P${P} p${nP} r${repisas}`, { A, H, P, nP, repisas });
}

// velador
for (const [A, H, P, tipoInferior] of prod([350, 450, 600], [400, 500, 600], [350, 400, 450], ['puerta', 'repisa', 'abierto'])) {
  auditar('velador', `A${A} H${H} P${P} ${tipoInferior}`, { A, H, P, tipoInferior });
}

// escritorio
for (const [A, P, anchoCajonera, ladoCajonera] of prod([1000, 1200, 1500, 1800], [500, 550, 600], [300, 450, 600], ['derecha', 'izquierda'])) {
  for (const nC of [1, 2, 3, 4]) auditar('escritorio', `A${A} P${P} cajonera${anchoCajonera} ${ladoCajonera} c${nC}`, { A, H: 720, P, anchoCajonera, ladoCajonera, configCajonera: 'solo_cajones', nC });
  for (const configCajonera of ['cajon_puerta', 'cajon_repisa']) auditar('escritorio', `A${A} P${P} cajonera${anchoCajonera} ${ladoCajonera} ${configCajonera}`, { A, H: 720, P, anchoCajonera, ladoCajonera, configCajonera });
}

// librero
for (const [H, P, ancho, n, repisas] of prod([1200, 1800, 2200], [250, 300, 400], [300, 450, 800, 1000], [1, 2, 4], [0, 5])) {
  auditar('librero', `H${H} P${P} ${n}x${ancho} r${repisas}`, { H, P, secciones: Array.from({ length: n }, () => ({ repisas, ancho })) });
}

// baul
for (const [A, H, P] of prod([400, 600, 1000, 1200], [350, 400, 500], [350, 400, 500])) auditar('baul', `A${A} H${H} P${P}`, { A, H, P });

// ---------- Informe ----------
console.log('=== CASOS ===');
for (const [m, t] of Object.entries(totales)) console.log(`${m}: ${t.casos} casos, ${t.rechazados} rechazados por validación, ${t.conProblema} con al menos 1 hallazgo`);
console.log('\n=== HALLAZGOS (n = veces que aparece) ===');
[...hallazgos.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, h]) => console.log(`${String(h.n).padStart(5)}  ${k}\n         ej: ${h.ejemplo}`));
console.log('\n=== RECHAZOS DE VALIDACIÓN ===');
[...errores.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, h]) => console.log(`${String(h.n).padStart(5)}  ${k}\n         ej: ${h.ejemplo}`));
