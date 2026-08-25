/**
 * MOTOR DE REGLAS — Librero
 * ------------------------------------------------------------
 * El más simple de los muebles por secciones: un cuerpo abierto (sin
 * puertas, sin zócalo, apoyado directo en el piso) con columnas de repisas
 * ajustables — igual que la Despensa pero sin puertas ni zócalo, ya que un
 * librero normalmente queda a la vista.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 900,        // ancho exterior
  H: 1800,       // alto exterior del cuerpo
  P: 300,        // profundidad exterior (típico de librero, más angosto que un closet)
  e: 15,         // espesor tablero estructural
  secciones: [
    { repisas: 5 },
    { repisas: 5 },
  ],
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametros(p);

  const { secciones } = calcularSecciones(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasDivisores(p, secciones),
  ];

  let totalRepisas = 0;
  secciones.forEach((seccion, i) => {
    const piezasRepisasSec = piezasRepisasSeccion(p, seccion, i);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;
  });

  const herrajes = generarHerrajes({ totalRepisas, secciones });

  return {
    modulo: 'librero',
    parametros: p,
    piezas,
    herrajes,
    notas: [],
    resumen: resumirPlanchas(piezas),
  };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  if (p.A < 50 || p.A > 10000) throw new Error('Ancho (A) fuera de rango 50-10000mm');
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El librero debe tener al menos 1 sección');
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
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const nDivisores = n - 1;
  const anchoInteriorTotal = A - 2 * e - nDivisores * e;
  const anchoPorSeccion = anchoInteriorTotal / n;

  const secciones = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion: anchoPorSeccion });
    x += anchoPorSeccion;
    if (i < n - 1) x += e;
  }
  return { secciones };
}

function piezasDivisores(p, secciones) {
  const { H, e, colorInterior } = p;
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

// ---------- 4. Repisas dentro de una sección (repartidas en toda la altura interior) ----------
function piezasRepisasSeccion(p, seccion, indiceSeccion) {
  const { xInicio, anchoSeccion, repisas: nRepisas } = seccion;
  if (!nRepisas || nRepisas <= 0) return [];

  const { H, e } = p;
  const yInferiorZona = e;
  const ySuperiorZona = H - e;
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

// ---------- 5. Herrajes ----------
function generarHerrajes({ totalRepisas, secciones }) {
  const herrajes = [];

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: totalRepisas * 4 });
  }

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 + (secciones.length - 1) * 4 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 });

  return herrajes;
}

export { generarDespiece };
