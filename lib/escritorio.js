/**
 * MOTOR DE REGLAS — Escritorio
 * ------------------------------------------------------------
 * Escritorio "pedestal": un panel sólido de un lado (sin nada dentro, solo
 * apoyo) y una cajonera (mini cuerpo con cajones) del otro lado, ambos del
 * piso hasta la cubierta — con un hueco libre en el medio (sin piso, sin
 * respaldo corrido) para las piernas. La cubierta va siempre incluida y
 * vuela por delante y por los lados de ambos apoyos.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso)
 *   z: profundidad (0 = fondo, +z hacia el frente)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 1200,       // ancho exterior total
  H: 720,        // alto hasta la cubierta (alto de escritorio estándar)
  P: 550,        // profundidad exterior
  e: 15,         // espesor tablero estructural y de cajones
  anchoCajonera: 450, // ancho de la cajonera (el resto, menos el panel sólido, queda como hueco libre)
  ladoCajonera: 'derecha', // 'derecha' | 'izquierda'
  configCajonera: 'solo_cajones', // 'solo_cajones' | 'cajon_puerta' | 'cajon_repisa'
  nC: 3,         // cantidad de cajones (solo aplica con configCajonera:'solo_cajones')
  correderaTipo: 'bola',
  cubierta: {
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const HUECO_MINIMO_PIERNAS = 400; // mm, espacio libre mínimo para las piernas

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  validarParametros(p);

  const { xPanel, xCajoneraInicio } = calcularLayout(p);

  const piezas = [
    ...piezaPanelSolido(p, xPanel),
    ...piezasCajonera(p, xCajoneraInicio),
    ...piezasCubierta(p),
  ];

  const { piezas: piezasFrentes, cajones } = piezasFrentesCajonera(p, xCajoneraInicio);
  piezas.push(...piezasFrentes);
  piezas.push(...piezasCajasCajonera(p, xCajoneraInicio, cajones));

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
  if (!['solo_cajones', 'cajon_puerta', 'cajon_repisa'].includes(p.configCajonera)) {
    throw new Error('configCajonera debe ser "solo_cajones", "cajon_puerta" o "cajon_repisa"');
  }
  if (p.configCajonera === 'solo_cajones' && p.nC < 1) {
    throw new Error('La cajonera debe tener al menos 1 cajón');
  }
  if (!['derecha', 'izquierda'].includes(p.ladoCajonera)) {
    throw new Error('ladoCajonera debe ser "derecha" o "izquierda"');
  }
  if (p.anchoCajonera < 250) throw new Error('El ancho de la cajonera debe ser de al menos 250mm');

  const huecoLibre = p.A - p.e - p.anchoCajonera;
  if (huecoLibre < HUECO_MINIMO_PIERNAS) {
    throw new Error(
      `Con este ancho (A) y ancho de cajonera, el hueco libre para las piernas queda en solo ${Math.round(huecoLibre)}mm (mínimo recomendado ${HUECO_MINIMO_PIERNAS}mm). Sube el ancho (A) o achica la cajonera.`
    );
  }

  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// El panel sólido y la cajonera van cada uno pegado a su extremo del
// escritorio, según `ladoCajonera` — el hueco libre para las piernas queda
// automáticamente entre ambos.
function calcularLayout(p) {
  if (p.ladoCajonera === 'derecha') {
    return { xPanel: 0, xCajoneraInicio: p.A - p.anchoCajonera };
  }
  return { xPanel: p.A - p.e, xCajoneraInicio: 0 };
}

// ---------- 1. Panel sólido (el apoyo sin cajones) ----------
function piezaPanelSolido(p, xPanel) {
  const { P, e, H, colorInterior } = p;
  return [{
    id: 'panel_solido',
    ancho: P, alto: H, espesor: e,
    cantos: ['delantero'],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: xPanel, y: 0, z: 0 },
    rotacion: 'vertical_profundidad',
  }];
}

// ---------- 2. Cajonera (mini cuerpo: 2 costados + piso + techo + respaldo) ----------
function piezasCajonera(p, xInicio) {
  const { P, e, H, anchoCajonera, colorInterior } = p;

  return [
    {
      id: 'cajonera_lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'cajonera_lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + anchoCajonera - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'cajonera_piso',
      ancho: anchoCajonera - 2 * e, alto: P - 20, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'cajonera_techo',
      ancho: anchoCajonera - 2 * e, alto: P - 20, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'cajonera_respaldo',
      ancho: anchoCajonera - 2 * e + 16, alto: H - 2 * e + 16, espesor: 3,
      cantos: [],
      cantidad: 1,
      material: 'HDF',
      posicion: { x: xInicio + e - 8, y: e - 8, z: 0 },
      rotacion: 'vertical_frontal',
    },
  ];
}

// ---------- 3. Frentes de la cajonera ----------
// 'solo_cajones': N cajones apilados, ocupan toda la cajonera.
// 'cajon_puerta' / 'cajon_repisa': 1 cajón fijo arriba + una puerta o una
// repisa fija abajo (igual criterio que el Velador), siempre con al menos
// un cajón — nunca queda "solo puertas" sin cajón.
const ALTURA_CAJON_SUPERIOR = 150; // mm, alto de frente del cajón único en cajon_puerta/cajon_repisa
const GAP = 3;

function piezasFrentesCajonera(p, xInicio) {
  const { anchoCajonera, H, nC, e, colorExterior, colorInterior } = p;

  if (p.configCajonera === 'solo_cajones') {
    const alturaUtil = H - (nC + 1) * GAP;
    const alturaCajon = alturaUtil / nC;
    const piezas = [];
    const cajones = [];

    for (let i = 0; i < nC; i++) {
      const y = GAP + i * (alturaCajon + GAP);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoCajonera - 4, alto: alturaCajon, espesor: e,
        cantos: ['todos'],
        cantidad: 1,
        color: colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${i + 1}`,
      });
      cajones.push({ alturaFrente: alturaCajon, posicionY: y });
    }

    return { piezas, cajones };
  }

  // cajon_puerta / cajon_repisa: 1 cajón fijo arriba
  const yCajon = H - GAP - ALTURA_CAJON_SUPERIOR;
  const piezas = [{
    id: 'frente_cajon_1',
    ancho: anchoCajonera - 4, alto: ALTURA_CAJON_SUPERIOR, espesor: e,
    cantos: ['todos'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: xInicio + 2, y: yCajon, z: p.P },
    rotacion: 'vertical_frontal',
    grupo: 'cajon_1',
  }];
  const cajones = [{ alturaFrente: ALTURA_CAJON_SUPERIOR, posicionY: yCajon }];

  const ySuperiorZona = yCajon - GAP;
  const yInferiorZona = e;
  const alturaZona = ySuperiorZona - yInferiorZona;
  if (alturaZona < 100) {
    throw new Error('No queda espacio suficiente bajo el cajón para la puerta/repisa. Sube el alto (H).');
  }

  if (p.configCajonera === 'cajon_puerta') {
    piezas.push({
      id: 'puerta_1',
      ancho: anchoCajonera - 4, alto: alturaZona, espesor: p.e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: xInicio + 2, y: yInferiorZona, z: p.P },
      rotacion: 'vertical_frontal',
    });
  } else {
    const y = yInferiorZona + alturaZona / 2;
    piezas.push({
      id: 'repisa_1',
      ancho: anchoCajonera - 2 * e - 4, alto: p.P - 40, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e + 2, y, z: 20 },
      rotacion: 'horizontal',
    });
  }

  return { piezas, cajones };
}

// ---------- 4. Cajas de cajón ----------
function piezasCajasCajonera(p, xInicio, cajones) {
  const { P, e, anchoCajonera, correderaTipo, colorInterior } = p;
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const anchoCaja = anchoCajonera - 2 * e - descuentoAncho;
  const piezas = [];

  cajones.forEach((cajon, idx) => {
    const n = idx + 1;
    const altoInterior = cajon.alturaFrente - 30;

    piezas.push(
      {
        id: `cajon${n}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + e + descuentoAncho / 2, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + anchoCajonera - e - descuentoAncho / 2 - e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + e + descuentoAncho / 2 + e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + e + descuentoAncho / 2 + e, y: cajon.posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_fondo`,
        ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
        cantos: [],
        cantidad: 1,
        material: 'HDF',
        posicion: { x: xInicio + e + descuentoAncho / 2 - 8, y: cajon.posicionY + 15, z: 50 - 8 },
        rotacion: 'horizontal',
        grupo: `cajon_${n}`,
      }
    );
  });

  return piezas;
}

// ---------- 5. Cubierta (superficie de trabajo, siempre incluida) ----------
const OVERHANG_FRENTE_CUBIERTA = 20;
const OVERHANG_LADOS_CUBIERTA = 10;

function piezasCubierta(p) {
  const { A, P, H } = p;
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

// ---------- 6. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];
  const cantidadCajones = p.configCajonera === 'solo_cajones' ? p.nC : 1;

  const correderaId = p.correderaTipo === 'bola'
    ? `corredera_bola_${Math.round(p.P - 60)}mm`
    : `corredera_oculta_${Math.round(p.P - 60)}mm`;
  herrajes.push({ tipo: correderaId, cantidad: cantidadCajones, unidad: 'par' });
  herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: cantidadCajones });

  if (p.configCajonera === 'cajon_puerta') {
    herrajes.push({ tipo: 'bisagra_codo', cantidad: 2 });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: 1 });
  } else if (p.configCajonera === 'cajon_repisa') {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: 4 });
  }

  herrajes.push({ tipo: 'pata_regulable', cantidad: 2 });
  herrajes.push({ tipo: 'tornillo_confirmat', cantidad: 12 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 8 + cantidadCajones * 4 });

  return herrajes;
}

// ---------- 7. Notas de producción ----------
function generarNotas(p) {
  const notas = [];
  if (p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  notas.push('El hueco entre el panel sólido y la cajonera queda libre (sin piso ni respaldo corrido) para las piernas — la cubierta y los dos apoyos son lo único que le da rigidez, igual que un escritorio de pedestal real.');
  return notas;
}

export { generarDespiece };
