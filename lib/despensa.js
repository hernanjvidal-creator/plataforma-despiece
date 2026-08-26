/**
 * MOTOR DE REGLAS — Despensa (armario de cocina, solo repisas)
 * ------------------------------------------------------------
 * Mismo patrón general que closet.js (secciones en columnas, puertas
 * globales), pero pensado para la cocina en vez del dormitorio:
 *   - Va sobre un zócalo de 100mm a ras (sin retranqueo, como el mueble
 *     aéreo/librero — con retranqueo quedaba casi invisible detrás del
 *     borde inferior de la puerta), no apoyado directo en el piso como el
 *     closet.
 *   - No tiene la opción de colgador (no aplica en una despensa): cada
 *     sección es solo una cantidad de repisas ajustables, repartidas en
 *     toda la altura interior.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 900,        // ancho exterior
  H: 2000,       // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 450,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar) — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  nP: 2,         // cantidad de puertas globales (0 = despensa abierta)
  tipoPuerta: 'batiente', // 'batiente' | 'corredera'
  secciones: [
    { repisas: 5 },
    { repisas: 5 },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function alturaCuerpo(p) {
  return p.H - p.hp;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametros(p);

  const { secciones } = calcularSecciones(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasZocalo(p),
    ...piezasDivisores(p, secciones),
  ];

  const notas = [];
  let totalRepisas = 0;

  secciones.forEach((seccion, i) => {
    const piezasRepisasSec = piezasRepisasSeccion(p, seccion, i);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;
  });

  if (p.nP > 0) {
    piezas.push(...piezasPuertasGlobales(p));
    if (p.tipoPuerta === 'corredera') {
      piezas.push(piezaTapaCantoSuperior(p));
      notas.push('El tapacanto superior tapa el riel de las puertas correderas por fuera — se atornilla desde adentro, sin herraje adicional.');
    }
  } else {
    notas.push('Despensa abierta (sin puertas): las repisas quedan a la vista.');
  }

  if (p.nP > 0 && p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  const herrajes = generarHerrajes(p, { totalRepisas, secciones });

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
  if (p.nP < 0) throw new Error('La cantidad de puertas no puede ser negativa');
  if (!['batiente', 'corredera'].includes(p.tipoPuerta)) {
    throw new Error('tipoPuerta debe ser "batiente" o "corredera"');
  }
  if (p.nP > 0 && p.tipoPuerta === 'corredera' && p.nP < 2) {
    throw new Error('Las puertas correderas requieren al menos 2 paneles');
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('La despensa debe tener al menos 1 sección');
  }
  for (const s of p.secciones) {
    if ((s.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  }

  const n = p.secciones.length;
  const nDivisores = n - 1;
  const anchoPorSeccion = (p.A - 2 * p.e - nDivisores * p.e) / n;
  if (anchoPorSeccion < 200) {
    throw new Error(
      `Con ${n} secciones, cada una queda de solo ${Math.round(anchoPorSeccion)}mm. Reduce la cantidad de secciones o aumenta el ancho (A).`
    );
  }
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno).
function piezasCuerpo(p) {
  const { A, P, e, colorInterior, colorExterior } = p;
  const H = alturaCuerpo(p);

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
  const { A, e } = p;
  const H = alturaCuerpo(p);
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

// ---------- 4. Reparto del ancho en secciones + divisores ----------
// Reparte el ancho interior en partes iguales entre las secciones (mismo
// criterio v1 que closet.js). Cada divisor interno es UNA sola pieza
// compartida entre la sección de su izquierda y la de su derecha — acá
// siempre hay divisor entre secciones (no existe el caso "colgador puro"
// del closet que a veces se lo salta).
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const nDivisores = n - 1;
  const anchoInteriorTotal = A - 2 * e - nDivisores * e;
  const anchoPorSeccion = anchoInteriorTotal / n;

  const secciones = [];
  const divisores = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion: anchoPorSeccion });
    x += anchoPorSeccion;
    if (i < n - 1) {
      divisores.push({ id: `divisor_${divisores.length + 1}`, x });
      x += e;
    }
  }
  return { secciones, divisores };
}

function piezasDivisores(p, secciones) {
  const { e, colorInterior } = p;
  const H = alturaCuerpo(p);
  const nDivisores = secciones.length - 1;
  const piezas = [];
  for (let i = 0; i < nDivisores; i++) {
    piezas.push({
      id: `divisor_${i + 1}`,
      ancho: p.P, alto: H, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: secciones[i].xInicio + secciones[i].anchoSeccion, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    });
  }
  return piezas;
}

// ---------- 5. Repisas dentro de una sección (repartidas en toda la altura interior) ----------
function piezasRepisasSeccion(p, seccion, indiceSeccion) {
  const { xInicio, anchoSeccion, repisas: nRepisas } = seccion;
  if (!nRepisas || nRepisas <= 0) return [];

  const H = alturaCuerpo(p);
  const yInferiorZona = p.e;
  const ySuperiorZona = H - p.e;
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

// ---------- 6. Puertas globales (cubren todo el ancho, batientes o correderas) ----------
function piezasPuertasGlobales(p) {
  return p.tipoPuerta === 'corredera' ? piezasPuertasCorrederas(p) : piezasPuertasBatientes(p);
}

function piezasPuertasBatientes(p) {
  const { A, nP, espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
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
  const { A, nP, espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
  const solape = 40; // mm de traslape entre paneles contiguos
  const anchoPuerta = (A + (nP - 1) * solape) / nP;
  const paso = anchoPuerta - solape;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    const enRielTrasero = i % 2 === 0;
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

function piezaTapaCantoSuperior(p) {
  const { A, P, e, colorExterior } = p;
  const H = alturaCuerpo(p);
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

// ---------- 7. Herrajes ----------
function generarHerrajes(p, { totalRepisas, secciones }) {
  const herrajes = [];

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: totalRepisas * 4 });
  }

  if (p.nP > 0) {
    if (p.tipoPuerta === 'corredera') {
      herrajes.push({ tipo: `riel_corredera_superior_${Math.round(p.A)}mm`, cantidad: 1 });
      herrajes.push({ tipo: `riel_guia_inferior_${Math.round(p.A)}mm`, cantidad: 1 });
      herrajes.push({ tipo: 'kit_ruedas_puerta_corredera', cantidad: p.nP });
      herrajes.push({ tipo: 'tirador_embutido_o_perfil_uñero', cantidad: p.nP });
    } else {
      const H = alturaCuerpo(p);
      const bisagrasPorPuerta = H > 1800 ? 4 : (H > 900 ? 3 : 2);
      herrajes.push({ tipo: 'bisagra_codo', cantidad: p.nP * bisagrasPorPuerta });
      herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
    }
  }

  const patas = p.A > 900 ? 4 : 2;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 + (secciones.length - 1) * 4 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 });

  return herrajes;
}

export { generarDespiece };
