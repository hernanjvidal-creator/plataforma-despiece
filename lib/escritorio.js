/**
 * MOTOR DE REGLAS — Escritorio
 * ------------------------------------------------------------
 * Mismo patrón que vanitorioBano.js (cuerpo con un solo hueco de frentes:
 * solo puertas / solo cajones / mixto / abierto, con repisas opcionales),
 * pero pensado para un escritorio:
 *   - Va siempre sobre patas expuestas (sin zócalo que las tape — un
 *     escritorio se ve con las patas a la vista, a diferencia de un mueble
 *     de cocina o un vanitorio).
 *   - La cubierta (superficie de trabajo) va siempre incluida, no es
 *     opcional como en el vanitorio.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 1200,       // ancho exterior
  H: 720,        // alto del cuerpo (patas expuestas, sin zócalo)
  P: 550,        // profundidad exterior
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  nP: 0,
  nC: 3,
  repisas: 0,             // repisas intermedias dentro del hueco de puertas (solo_puertas/mixto/abierto)
  config: 'solo_cajones', // 'solo_puertas' | 'solo_cajones' | 'mixto' | 'abierto'
  correderaTipo: 'bola',
  cubierta: {
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function alturaCuerpo(p) {
  return p.H;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
    ...piezasCubierta(p),
  ];

  const frentes = distribuirFrentes(p);
  piezas.push(...frentes.piezas);

  if (p.nC > 0) {
    piezas.push(...piezasCajas(p, frentes.cajones));
  }

  const herrajes = generarHerrajes(p);
  const notas = generarNotas(p);

  return {
    modulo: 'escritorio',
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
  if (p.config !== 'abierto' && p.nP === 0 && p.nC === 0) {
    throw new Error('El escritorio debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")');
  }
  if (p.config === 'solo_cajones' && p.nP > 0) throw new Error('Config solo_cajones no admite puertas');
  if (p.config === 'solo_puertas' && p.nC > 0) throw new Error('Config solo_puertas no admite cajones');
  if ((p.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  if ((p.repisas || 0) > 0 && p.config === 'solo_cajones') {
    throw new Error('Config solo_cajones no tiene hueco de puertas: las repisas no aplican');
  }

  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// ---------- 1. Piezas del cuerpo ----------
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
function piezasRespaldo(p) {
  const { A, e } = p;
  const H = alturaCuerpo(p);
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

// ---------- 3. Cubierta (superficie de trabajo, siempre incluida) ----------
const OVERHANG_FRENTE_CUBIERTA = 20;
const OVERHANG_LADOS_CUBIERTA = 10;

function piezasCubierta(p) {
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

// ---------- 4. Distribución y piezas de frentes ----------
function distribuirFrentes(p) {
  const { A, nP, nC, config } = p;
  const H = alturaCuerpo(p);
  const piezas = [];
  const cajones = [];

  if (config === 'abierto') {
    piezas.push(...piezasRepisasZona(p, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const anchoUtil = A - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasZona(p, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    const alturaUtil = H - (nC + 1) * 3;
    const alturaCajon = alturaUtil / nC;
    for (let i = 0; i < nC; i++) {
      const y = 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: A - 4, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${i + 1}`,
      });
      cajones.push({ alturaFrente: alturaCajon, posicionY: y });
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
        id: `frente_cajon_${i + 1}`,
        ancho: A - 4, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${i + 1}`,
      });
      cajones.push({ alturaFrente: alturaCajonUnidad, posicionY: y });
      ySiguiente = y - gap;
    }

    const alturaPuertas = ySiguiente - gap;
    if (alturaPuertas < 100) {
      throw new Error(
        `Con ${nCajones} cajón(es) de ${alturaCajonUnidad}mm no queda espacio suficiente para las puertas. Reduce la cantidad de cajones o aumenta el alto (H).`
      );
    }
    const anchoUtil = A - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 2 + i * (anchoPuerta + 2), y: gap, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasZona(p, gap, ySiguiente));
  }

  return { piezas, cajones };
}

function piezasRepisasZona(p, yInferior, ySuperior) {
  const nRepisas = p.repisas || 0;
  if (nRepisas <= 0) return [];

  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: p.A - 2 * p.e - 4, alto: p.P - 40, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: p.e + 2, y, z: 20 },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Cajas de cajón ----------
function piezasCajas(p, cajones) {
  const { A, P, e, correderaTipo, colorInterior } = p;
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajones.forEach((cajon, idx) => {
    const n = idx + 1;
    const altoInterior = cajon.alturaFrente - 30;
    const anchoCaja = A - 2 * e - descuentoAncho;

    piezas.push(
      {
        id: `cajon${n}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: A - e - descuentoAncho / 2 - e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2 + e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2 + e, y: cajon.posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_fondo`,
        ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
        cantos: [],
        cantidad: 1,
        material: 'HDF',
        posicion: { x: e + descuentoAncho / 2 - 8, y: cajon.posicionY + 15, z: 50 - 8 },
        rotacion: 'horizontal',
        grupo: `cajon_${n}`,
      }
    );
  });

  return piezas;
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];
  const H = alturaCuerpo(p);

  if (p.repisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: p.repisas * 4 });
  }

  if (p.nP > 0) {
    const bisagrasPorPuerta = H > 650 ? 3 : 2;
    herrajes.push({ tipo: 'bisagra_codo', cantidad: p.nP * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
  }
  if (p.nC > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(p.P - 60)}mm`
      : `corredera_oculta_${Math.round(p.P - 60)}mm`;
    herrajes.push({ tipo: correderaId, cantidad: p.nC, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: p.nC });
  }

  const patas = p.A > 900 ? 4 : 2;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });

  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 8 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 12 });

  return herrajes;
}

// ---------- 7. Notas de producción ----------
function generarNotas(p) {
  const notas = [];
  if (p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }
  return notas;
}

export { generarDespiece };
