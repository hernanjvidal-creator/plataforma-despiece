/**
 * MOTOR DE REGLAS — Escritorio
 * ------------------------------------------------------------
 * Escritorio "pedestal": un panel sólido de un lado (sin nada dentro, solo
 * apoyo) y una cajonera (mini cuerpo con cajones) del otro lado, ambos del
 * piso hasta la cubierta — con un hueco libre en el medio (sin piso, sin
 * respaldo corrido) para las piernas. Atrás, justo bajo la cubierta, un
 * faldón une los dos apoyos para que el escritorio no se ladee. La cubierta
 * va siempre incluida y vuela por delante y por los lados de ambos apoyos.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso)
 *   z: profundidad (0 = fondo, +z hacia el frente)
 */

import {
  resumirPlanchas, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura, grapasParaRespaldos,
  piezasCajaCajon, espesorCubierta, piezaCubierta, notaCubierta,
} from './shared';

const DEFAULTS = {
  A: 1200,       // ancho exterior total
  H: 720,        // alto TOTAL, hasta la superficie de la cubierta (alto de escritorio estándar)
  P: 550,        // profundidad exterior
  e: 15,         // espesor tablero estructural y de cajones
  anchoCajonera: 450, // ancho de la cajonera (el resto, menos el panel sólido, queda como hueco libre)
  ladoCajonera: 'derecha', // 'derecha' | 'izquierda'
  configCajonera: 'solo_cajones', // 'solo_cajones' | 'cajon_puerta' | 'cajon_repisa'
  nC: 3,         // cantidad de cajones (solo aplica con configCajonera:'solo_cajones')
  correderaTipo: 'bola',
  cubierta: {
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol' — ver espesorCubierta en shared.js
    espesor: 18,
  },
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

const HUECO_MINIMO_PIERNAS = 400; // mm, espacio libre mínimo para las piernas

// Faldón: panel parado atrás, de apoyo a apoyo, justo bajo la cubierta. Sin
// él, lo único que mantiene la escuadra es la cubierta atornillada encima, y
// un escritorio de melamina termina ladeándose hacia un costado. 30 cm de
// alto (lo usual en un escritorio de pedestal) deja libre la parte de abajo
// para los pies y los cables.
const ALTO_FALDON = 300;

// Profundidad real de los apoyos (panel sólido/cajonera), descontando el
// espesor del frente de la profundidad TOTAL que ingresa el cliente: el
// frente (cajón/puerta) se monta por delante del borde del apoyo, así que si
// el apoyo también midiera P completo, el escritorio terminado (apoyo +
// frente) quedaría espesorPuertas mm... salvo que acá los frentes usan el
// espesor de tablero estándar `e` (no hay un espesorPuertas propio en este
// módulo), así que se descuenta `e`.
function profundidadCuerpo(p) {
  return p.P - p.e;
}

// Alto de los apoyos (panel sólido y cajonera): llegan hasta la cara de
// abajo de la cubierta, así que el "Alto" que ingresa el cliente (hasta la
// superficie) queda justo — antes la cubierta iba encima del alto completo
// y el escritorio salía más alto que lo pedido.
function alturaApoyos(p) {
  return p.H - espesorCubierta(p.cubierta);
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  validarParametros(p);

  const { xPanel, xCajoneraInicio } = calcularLayout(p);

  const piezas = [
    ...piezaPanelSolido(p, xPanel),
    ...piezasCajonera(p, xCajoneraInicio),
    ...piezaFaldon(p),
    ...piezasCubierta(p),
  ];

  const { piezas: piezasFrentes, cajones } = piezasFrentesCajonera(p, xCajoneraInicio);
  piezas.push(...piezasFrentes);
  piezas.push(...piezasCajasCajonera(p, xCajoneraInicio, cajones));

  const herrajes = generarHerrajes(p, piezas);
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

  if (!['melamina', 'cuarzo', 'granito', 'marmol'].includes(p.cubierta.material)) {
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
// Va en melamina color exterior: es un lateral visible del escritorio, no
// se sabe de antemano si queda contra una pared.
function piezaPanelSolido(p, xPanel) {
  const { e, colorExterior } = p;
  const H = alturaApoyos(p);
  const P = profundidadCuerpo(p);
  return [{
    id: 'panel_solido',
    ancho: P, alto: H, espesor: e,
    cantos: ['delantero'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: xPanel, y: 0, z: 0 },
    rotacion: 'vertical_profundidad',
  }];
}

// ---------- 1b. Faldón (travesaño trasero entre los dos apoyos) ----------
// Va entre la cara interior del panel sólido y la cara exterior de la
// cajonera, a ras de la parte de atrás de ambos (z=0) y pegado bajo la
// cubierta. Color exterior: se ve desde el hueco de las piernas.
function piezaFaldon(p) {
  const { e, colorExterior } = p;
  const xDesde = p.ladoCajonera === 'derecha' ? e : p.anchoCajonera;
  const ancho = p.A - p.anchoCajonera - e;
  const alto = Math.min(ALTO_FALDON, alturaApoyos(p) / 2);
  return [{
    id: 'faldon',
    ancho, alto, espesor: e,
    cantos: ['inferior'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: xDesde, y: alturaApoyos(p) - alto, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 2. Cajonera (mini cuerpo: 2 costados + piso + techo + respaldo) ----------
// Los 2 costados van igual en color exterior (mismo criterio que el panel
// sólido) — el que da hacia el hueco de las piernas también queda visible.
function piezasCajonera(p, xInicio) {
  const { e, anchoCajonera, colorInterior, colorExterior } = p;
  const H = alturaApoyos(p);
  const P = profundidadCuerpo(p);

  return [
    {
      id: 'cajonera_lateral_izq',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: xInicio, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'cajonera_lateral_der',
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: xInicio + anchoCajonera - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'cajonera_piso',
      ancho: anchoCajonera - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'cajonera_techo',
      ancho: anchoCajonera - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
    {
      // Sobresale por los 4 lados para cubrir el canto trasero de la
      // cajonera (no va en una ranura real) — 6mm por lado. Va clavado POR
      // DETRÁS de la cajonera (z negativo), no dentro de ella.
      id: 'cajonera_respaldo',
      ancho: anchoCajonera - 2 * e + 12, alto: H - 2 * e + 12, espesor: 3,
      cantos: [],
      cantidad: 1,
      material: 'MDF',
      color: 'blanco',
      posicion: { x: xInicio + e - 6, y: e - 6, z: -3 },
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
  const { anchoCajonera, nC, e, colorExterior, colorInterior } = p;
  const H = alturaApoyos(p);

  if (p.configCajonera === 'solo_cajones') {
    // El cajón de más abajo se apoya sobre el piso (y=0 a y=e), no sobre el
    // borde exterior del mueble — arranca en e+GAP, no en GAP.
    const alturaUtil = H - e - (nC + 1) * GAP;
    const alturaCajon = alturaUtil / nC;
    const piezas = [];
    const cajones = [];

    for (let i = 0; i < nC; i++) {
      const y = e + GAP + i * (alturaCajon + GAP);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoCajonera, alto: alturaCajon, espesor: e,
        cantos: ['todos'],
        cantidad: 1,
        color: colorExterior, cara: 'exterior',
        posicion: { x: xInicio, y, z: profundidadCuerpo(p) },
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
    ancho: anchoCajonera, alto: ALTURA_CAJON_SUPERIOR, espesor: e,
    cantos: ['todos'],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: xInicio, y: yCajon, z: profundidadCuerpo(p) },
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
      ancho: anchoCajonera, alto: alturaZona, espesor: p.e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: xInicio, y: yInferiorZona, z: profundidadCuerpo(p) },
      rotacion: 'vertical_frontal',
    });
  } else {
    const y = yInferiorZona + alturaZona / 2;
    piezas.push({
      id: 'repisa_1',
      ancho: anchoCajonera - 2 * e - 2, alto: profundidadCuerpo(p) - 20, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio + e + 1, y, z: 0 },
      rotacion: 'horizontal',
    });
  }

  return { piezas, cajones };
}

// ---------- 4. Cajas de cajón ----------
function piezasCajasCajonera(p, xInicio, cajones) {
  const { e, anchoCajonera, correderaTipo, colorInterior } = p;
  const P = profundidadCuerpo(p);
  const piezas = [];

  cajones.forEach((cajon, idx) => {
    const n = idx + 1;
    piezas.push(...piezasCajaCajon({
      prefijoId: `cajon${n}`, grupo: `cajon_${n}`,
      xHueco: xInicio + e, anchoHueco: anchoCajonera - 2 * e,
      y: cajon.posicionY, alto: cajon.alturaFrente - 30,
      zTrasero: 50, zDelantero: P,
      e, color: colorInterior, correderaTipo,
    }));
  });

  return piezas;
}

// ---------- 5. Cubierta (superficie de trabajo, siempre incluida) ----------
// La profundidad de la cubierta es la que el cliente ingresa como "Fondo"
// (P) — no lleva vuelo extra al frente: P ya es la medida de la cubierta,
// es la que manda, y los apoyos/frentes quedan por detrás de su borde (ver
// profundidadCuerpo). Vuela por los lados 25mm de cada lado — estándar real
// de un extremo abierto (un escritorio casi siempre queda expuesto por los
// costados, a diferencia de un mueble bajo de cocina contra la pared).
const OVERHANG_LADOS_CUBIERTA = 25;

function piezasCubierta(p) {
  return [piezaCubierta({
    cubierta: p.cubierta,
    colorExterior: p.colorExterior,
    ancho: p.A + 2 * OVERHANG_LADOS_CUBIERTA,
    fondo: p.P,
    posicion: { x: -OVERHANG_LADOS_CUBIERTA, y: alturaApoyos(p), z: 0 },
  })];
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p, piezas) {
  const herrajes = [];
  const cantidadCajones = p.configCajonera === 'solo_cajones' ? p.nC : 1;

  const grapasRespaldo = grapasParaRespaldos(piezas);
  if (grapasRespaldo > 0) {
    herrajes.push({ tipo: 'grapa_carpintero_6mm', cantidad: grapasRespaldo });
  }

  const largoCorredera = largoCorrederaComercial(profundidadCuerpo(p) - 60);
  const correderaId = p.correderaTipo === 'bola'
    ? `corredera_bola_${largoCorredera}mm`
    : `corredera_oculta_${largoCorredera}mm`;
  herrajes.push({ tipo: correderaId, cantidad: cantidadCajones, unidad: 'par' });
  herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: cantidadCajones });

  if (p.configCajonera === 'cajon_puerta') {
    // Misma altura de puerta que calcula piezasFrentesCajonera (ver ahí).
    const alturaPuerta = alturaApoyos(p) - 2 * GAP - ALTURA_CAJON_SUPERIOR - p.e;
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: bisagrasPorAltura(alturaPuerta) });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: 1 });
  } else if (p.configCajonera === 'cajon_repisa') {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: 4 });
  }

  herrajes.push({ tipo: 'tope_plastico_redondo', cantidad: 6 });
  // 12 del cuerpo de la cajonera + 4 por caja de cajón + 4 del faldón (2 por lado).
  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 12 + cantidadCajones * 4 + 4 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

// ---------- 7. Notas de producción ----------
function generarNotas(p) {
  const notas = [];
  const nota = notaCubierta(p.cubierta);
  if (nota) notas.push(nota);
  notas.push(`El hueco para las piernas queda libre: entre el panel de apoyo y la cajonera solo va el faldón, un panel de ${Math.round(Math.min(ALTO_FALDON, alturaApoyos(p) / 2) / 10)} cm atrás, justo bajo la cubierta. Es lo que impide que el escritorio se ladee: atorníllalo a los dos apoyos (2 tornillos por lado, desde afuera del panel y desde adentro de la cajonera) antes de poner la cubierta.`);
  notas.push('Pega los 6 topes plásticos redondos (10-20mm) bajo el escritorio, repartidos entre el panel sólido y la cajonera, antes de ponerlo en su lugar final — así no raya el piso al moverlo y queda un poco más estable.');
  return notas;
}

export { generarDespiece };
