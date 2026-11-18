/**
 * MOTOR DE REGLAS — Vanitorio de Baño
 * -------------------------------------
 * Mismo patrón que muebleBajoCocina.js (cuerpo + zócalo/patas + frentes +
 * cajas de cajón), con las particularidades de un vanitorio:
 *
 *   - soporte: 'patas' (apoyado en el piso, con zócalo) o 'suspendido'
 *     (colgado de la pared, sin patas ni zócalo — usa el mismo sistema de
 *     colgado que un mueble alto).
 *   - sifon: si es true, se deja libre el espacio del sifón (ver
 *     zonaSifon): los cajones que pasan a esa altura se arman en U,
 *     rodeándolo, y las repisas van bajo él. El recorte del respaldo para
 *     las cañerías se hace en obra (queda como nota).
 *   - cubierta.incluir: si es true, agrega la pieza de cubierta y el
 *     accesorio de lavamanos. Si es postformada o de piedra (cuarzo/
 *     granito/mármol), se excluye del nesting de melamina (se compra aparte).
 *
 * Alto (H): es la altura TOTAL desde el piso hasta la superficie de la
 * cubierta (aunque no se agregue la pieza de cubierta al pedido). Con
 * soporte 'patas' incluye el zócalo estándar (`hp`, 110mm reservados para
 * un panel de zócalo de 100mm, el mínimo que acepta una máquina de corte,
 * más 10mm de holgura) y la reserva de la cubierta (su espesor, ver
 * reservaCubierta); el cuerpo mide H - hp - reserva. Con soporte
 * 'suspendido' no hay zócalo, así que el cuerpo mide H - reserva.
 *
 * Fondo (P): es la profundidad de la cubierta, no de la estructura de
 * melamina — ver `profundidadCuerpo`.
 *
 * Espesor de frentes: los cajones siempre van en 15mm (`e`). Las puertas
 * van en 15mm por defecto también, pero el cliente puede pedir 18mm
 * (`espesorPuertas`) si prefiere un frente más grueso.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import {
  resumirPlanchas, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura, grapasParaRespaldos,
  piezasCajaCajon, MATERIALES_CUBIERTA, espesorCubierta, piezaCubierta, notaCubierta,
} from './shared';
import { numero } from './nombres';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 850,        // alto TOTAL hasta la superficie de la cubierta (incluye zócalo si soporte='patas')
  P: 450,        // profundidad de la cubierta (la estructura queda 40mm más angosta)
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar, solo si soporte = 'patas') — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  r: 50,         // retranqueo zócalo (solo si soporte = 'patas')
  nP: 0,
  nC: 2,
  repisas: 0,             // repisas intermedias dentro del hueco de puertas (solo_puertas/mixto)
  config: 'solo_cajones', // 'solo_puertas' | 'solo_cajones' | 'mixto'
  correderaTipo: 'bola',
  soporte: 'patas',       // 'patas' | 'suspendido'
  sifon: true,            // si lleva lavamanos con sifón: deja libre su espacio (ver zonaSifon)
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y el accesorio de lavamanos
    material: 'postformada',  // 'postformada' | 'melamina' | 'cuarzo' | 'granito' | 'marmol' — ver espesorCubierta en shared.js
    espesor: 28,
  },
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

// mm reservados en la parte de arriba del cuerpo para la cubierta: el "Alto"
// que ingresa el cliente llega hasta la superficie de la cubierta (donde se
// apoya el lavamanos), no hasta el borde de los laterales, así que el
// cuerpo queda el espesor de la cubierta más bajo que H — la incluya el
// despiece o no. Mismo criterio que mueble cocina.
function reservaCubierta(p) {
  return espesorCubierta(p.cubierta);
}

// Altura real del cuerpo: con patas se descuenta el zócalo de la altura
// total; suspendido no tiene zócalo, así que H ya es el alto del cuerpo.
// En ambos casos se descuenta además la reserva de la cubierta.
function alturaCuerpo(p) {
  return (p.soporte === 'patas' ? p.H - p.hp : p.H) - reservaCubierta(p);
}

const ALTO_TRAVIESA = 100;

// Los frentes (puertas/cajones) no llegan hasta el borde superior de los
// laterales: se dejan 30mm de por medio para que no queden pegados contra
// la cubierta (con el espesor estándar de 20mm, eso es un canto libre de
// unos 5cm bajo la superficie).
const RESERVA_SUPERIOR_FRENTES = 30;

// Profundidad real del cuerpo (laterales/piso/caja de cajón): el "Fondo"
// que ingresa el cliente es la medida de la CUBIERTA, no de la estructura
// de melamina — la estructura queda 40mm más angosta (vuelo de la cubierta
// + espacio de la puerta, sin importar el espesor de puerta elegido) —
// mismo criterio que mueble cocina.
function profundidadCuerpo(p) {
  return p.P - 40;
}

// ---------- Sifón ----------
// El lavamanos desagua por el centro de la taza: el tubo baja justo bajo el
// centro de la cubierta (a lo ancho y a lo hondo) hasta el sifón, y de ahí
// va hacia atrás, a la salida del muro, donde están también las llaves de
// paso. Ese espacio no lo puede ocupar ninguna pieza: una franja al centro,
// desde la pared hasta un poco más adelante del desagüe, y desde la cubierta
// hacia abajo. Los cajones que pasan a esa altura se arman en U, rodeándolo
// (como los vanitorios de fábrica, ver piezasCajaCajon); las repisas van
// bajo él. Se supone el desagüe en el muro, lo normal en un vanitorio.
const SIFON = {
  anchoLibre: 200,       // mm libres al centro, a lo ancho (sifón de ~8 cm más el desagüe y las llaves de paso)
  holguraDelante: 70,    // cuánto más adelante del eje del desagüe llega el espacio libre (radio del sifón + holgura)
  altoBajoCubierta: 420, // desde la superficie de la cubierta hacia abajo: taza (~17 cm) + sifón (~25 cm)
};
// Lo mínimo que tiene que quedar útil en cada brazo del cajón en U y delante
// del recorte; menos que eso es una pieza que no sirve y que muchas
// máquinas de corte ni siquiera aceptan.
const MIN_UTIL_CAJON_EN_U = 60;
// Alto libre mínimo entre repisas (y entre la de arriba y el sifón).
const SEPARACION_MINIMA_REPISAS = 100;

// Espacio del sifón en coordenadas del cuerpo, o null si no lleva.
function zonaSifon(p) {
  if (!p.sifon) return null;
  return {
    xCentro: p.A / 2,
    zEje: p.P / 2,                                // eje del desagüe, medido desde la pared
    zHasta: p.P / 2 + SIFON.holguraDelante,       // libre desde la pared hasta acá
    yDesde: alturaCuerpo(p) + reservaCubierta(p) - SIFON.altoBajoCubierta, // libre desde acá hacia arriba
  };
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  validarParametros(p);

  const piezas = [
    ...piezasCuerpo(p),
    ...piezasRespaldo(p),
  ];

  if (p.soporte === 'patas') {
    piezas.push(...piezasZocalo(p));
  }

  piezas.push(...piezasCubierta(p));

  const frentes = distribuirFrentes(p);
  piezas.push(...frentes.piezas);

  if (p.nC > 0) {
    piezas.push(...piezasCajas(p, frentes.cajones));
  }

  const accesorios = [
    ...(p.cubierta.incluir ? accesorioLavamanos(p) : []),
    ...accesorioSifon(p),
  ];

  const herrajes = generarHerrajes(p, piezas);
  const notas = generarNotas(p, piezas);

  return {
    modulo: 'vanitorio_bano',
    parametros: p,
    piezas,
    accesorios,
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
  if (p.soporte === 'patas' && p.H <= p.hp) {
    throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  }
  if (p.config !== 'abierto' && p.nP === 0 && p.nC === 0) {
    throw new Error('El vanitorio debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")');
  }
  if (p.config === 'solo_cajones' && p.nP > 0) throw new Error('Config solo_cajones no admite puertas');
  if (p.config === 'solo_puertas' && p.nC > 0) throw new Error('Config solo_puertas no admite cajones');
  if ((p.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  if ((p.repisas || 0) > 0 && p.config === 'solo_cajones') {
    throw new Error('Config solo_cajones no tiene hueco de puertas: las repisas no aplican');
  }
  if (!['patas', 'suspendido'].includes(p.soporte)) throw new Error('soporte debe ser "patas" o "suspendido"');

  if (!MATERIALES_CUBIERTA.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// ---------- 1. Piezas del cuerpo (caja estructural) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno).
function piezasCuerpo(p) {
  const { A, e, colorInterior, colorExterior } = p;
  const H = alturaCuerpo(p);
  const P = profundidadCuerpo(p);

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
      ancho: A - 2 * e, alto: P, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      // Parada en sentido vertical (de canto), no acostada — apoya contra
      // el borde delantero de los laterales, justo debajo de la cubierta.
      // Va en melamina de color porque queda a la vista al abrir la puerta.
      id: 'traviesa_delantera',
      ancho: A - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: ['inferior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: H - ALTO_TRAVIESA, z: P - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'traviesa_trasera',
      ancho: A - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - ALTO_TRAVIESA, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      // Cuarto travesaño: trasero e inferior, justo encima del piso — mismo
      // criterio estructural que el travesaño trasero superior.
      id: 'traviesa_trasera_inferior',
      ancho: A - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    },
  ];
}

// ---------- 2. Respaldo ----------
// Sobresale por los 4 lados para cubrir el canto trasero del cuerpo (no va
// en una ranura real) — antes 8mm por lado, ahora 6mm por lado. Va clavado
// POR DETRÁS del cuerpo (z negativo), no dentro de él.
function piezasRespaldo(p) {
  const { A, e, sifon } = p;
  const H = alturaCuerpo(p);
  return [{
    id: 'respaldo',
    ancho: A - 2 * e + 12, alto: H - 2 * e + 12, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'MDF',
    color: 'blanco',
    posicion: { x: e - 6, y: e - 6, z: -3 },
    rotacion: 'vertical_frontal',
    ...(sifon ? { mecanizado: 'recorte_paso_canerias_a_definir_en_obra' } : {}),
  }];
}

// ---------- 3. Zócalo (solo si soporte = 'patas') ----------
// Panel frontal + retornos en los dos laterales, no solo el frente. Los
// retornos corren desde la pared (z=0) hasta la línea del zócalo, que queda
// retranqueada `r` desde el borde delantero del CUERPO; el frontal va entre
// los dos retornos, a ras de su punta delantera. Antes el retranqueo se
// medía desde la pared: el frontal quedaba al fondo y los retornos salían
// por delante de los cajones.
function piezasZocalo(p) {
  const { A, e, hp, r, colorExterior } = p;
  const altoZocalo = hp - 10;
  const profundidadZocalo = profundidadCuerpo(p) - r;

  return [
    {
      id: 'zocalo_frontal',
      ancho: A - 2 * e, alto: altoZocalo, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: -hp, z: profundidadZocalo - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3b. Cubierta (superficie) ----------
// La profundidad de la cubierta es la que el cliente ingresa como "Fondo"
// (P) — no lleva vuelo extra al frente: P ya es la medida de la cubierta,
// es la que manda, y el cuerpo/las puertas quedan por detrás de su borde
// (ver profundidadCuerpo). Vuela por los lados 25mm de cada lado — estándar
// real de un extremo abierto (contra un muro bajaría a 0-6mm, pero el motor
// no sabe de antemano si ese lado queda contra pared o expuesto).
const OVERHANG_LADOS_CUBIERTA = 25;

function piezasCubierta(p) {
  if (!p.cubierta.incluir) return [];
  return [piezaCubierta({
    cubierta: p.cubierta,
    colorExterior: p.colorExterior,
    ancho: p.A + 2 * OVERHANG_LADOS_CUBIERTA,
    fondo: p.P,
    posicion: { x: -OVERHANG_LADOS_CUBIERTA, y: alturaCuerpo(p), z: 0 },
  })];
}

// Accesorio lavamanos: caja aproximada del bowl, embutida en la cubierta,
// centrada en el ancho del mueble. No es una pieza de melamina — no entra
// en el nesting ni en el resumen de material.
function accesorioLavamanos(p) {
  const { A, P } = p;
  const H = alturaCuerpo(p);
  const anchoBowl = Math.min(A - 100, 500);
  const profundidadBowl = 380;
  const alturaBowl = 150;
  const espesor = espesorCubierta(p.cubierta);

  return [{
    id: 'lavamanos',
    descripcion: 'Lavamanos (loza/cerámica)',
    ancho: anchoBowl, alto: profundidadBowl, espesor: alturaBowl,
    posicion: {
      x: (A - anchoBowl) / 2,
      y: H + espesor - alturaBowl,
      z: (P - profundidadBowl) / 2,
    },
    rotacion: 'horizontal',
    color: 'ceramica',
  }];
}

// Sifón de referencia, solo para el 3D (no es una pieza ni se compra con el
// mueble): la bajada desde la taza y la salida hacia el muro, dibujadas
// como tubos de 5 cm — así se ve por qué los cajones de arriba van en U.
function accesorioSifon(p) {
  const zona = zonaSifon(p);
  if (!zona) return [];
  const D = 50;
  // En un vanitorio bajo el sifón llegaría hasta el travesaño trasero de
  // abajo: ahí se dibuja justo encima de él (en la realidad sale antes al muro).
  const yCodo = Math.max(zona.yDesde + 20, p.e + ALTO_TRAVIESA + 10);
  const yArriba = p.cubierta.incluir ? alturaCuerpo(p) + reservaCubierta(p) - 150 : alturaCuerpo(p);
  const comun = { descripcion: 'Sifón (referencia)', espesor: D, color: 'pvc', soloVisual: true };
  return [
    {
      ...comun, id: 'sifon_bajada',
      ancho: D, alto: yArriba - yCodo,
      posicion: { x: zona.xCentro - D / 2, y: yCodo, z: zona.zEje - D / 2 },
      rotacion: 'vertical_frontal',
    },
    {
      ...comun, id: 'sifon_salida',
      ancho: D, alto: zona.zEje + D / 2,
      posicion: { x: zona.xCentro - D / 2, y: yCodo, z: 0 },
      rotacion: 'horizontal',
    },
  ];
}

// ---------- 4. Distribución y piezas de frentes ----------
function distribuirFrentes(p) {
  const { A, nP, nC, config } = p;
  const H = alturaCuerpo(p);
  const piezas = [];
  const cajones = []; // {alturaFrente, posicionY}

  if (config === 'abierto') {
    // Sin puerta ni cajón: hueco abierto a la vista, con repisas opcionales.
    piezas.push(...piezasRepisasZona(p, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const anchoDisponible = A - (nP - 1) * 2;
    const anchoPuerta = anchoDisponible / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: H - RESERVA_SUPERIOR_FRENTES - 2, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: i * (anchoPuerta + 2), y: 2, z: profundidadCuerpo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasZona(p, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    // El cajón de más abajo se apoya sobre el piso (y=0 a y=p.e), no sobre
    // el borde exterior del mueble — arranca en p.e+3, no en 3. Arriba, a
    // diferencia de la puerta (que es delgada y no llega a chocar), la caja
    // del cajón es profunda y sí puede toparse con la traviesa_delantera si
    // solo se le deja RESERVA_SUPERIOR_FRENTES (30mm) — necesita el alto
    // completo de la traviesa (ALTO_TRAVIESA, 100mm) para no invadirla.
    const alturaUtil = H - ALTO_TRAVIESA - p.e - nC * 3;
    const alturaCajon = alturaUtil / nC;
    for (let i = 0; i < nC; i++) {
      const y = p.e + 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: A, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadCuerpo(p) },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${i + 1}`,
      });
      cajones.push({ alturaFrente: alturaCajon, posicionY: y });
    }
  }

  if (config === 'mixto') {
    // N cajones de altura fija apilados arriba + puerta(s) abajo ocupando el resto
    const alturaCajonUnidad = 150;
    const gap = 3;
    const nCajones = Math.max(1, nC);

    // Mismo motivo que en solo_cajones: la caja del cajón es profunda y
    // necesita el alto completo de la traviesa_delantera para no invadirla,
    // no solo RESERVA_SUPERIOR_FRENTES (pensado para la puerta, delgada).
    let ySiguiente = H - ALTO_TRAVIESA; // borde superior del próximo cajón a apilar (bajando desde arriba)
    for (let i = 0; i < nCajones; i++) {
      const y = ySiguiente - alturaCajonUnidad;
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: A, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadCuerpo(p) },
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
    const anchoDisponible = A - (nP - 1) * 2;
    const anchoPuerta = anchoDisponible / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: i * (anchoPuerta + 2), y: gap, z: profundidadCuerpo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasZona(p, gap, ySiguiente));
  }

  return { piezas, cajones };
}

// Además del piso (ya incluido en el cuerpo), agrega `p.repisas` repisas
// intermedias repartidas en partes iguales dentro de una zona [yInferior,
// ySuperior] del hueco de puertas. Recesadas "e" desde el fondo (no llegan a
// z=0) para no chocar con los travesaños traseros, que corren de lateral a
// lateral por esa franja. Con sifón, la zona termina donde empieza el sifón:
// una repisa de lado a lado no puede pasar a su altura.
function piezasRepisasZona(p, yInferior, ySuperior) {
  const nRepisas = p.repisas || 0;
  if (nRepisas <= 0) return [];

  const zona = zonaSifon(p);
  const techo = zona ? Math.min(ySuperior, zona.yDesde) : ySuperior;
  const alturaZona = techo - yInferior;
  if (zona) {
    const maximo = Math.max(0, Math.floor(alturaZona / SEPARACION_MINIMA_REPISAS) - 1);
    if (nRepisas > maximo) {
      throw new Error(maximo === 0
        ? `Con lavamanos con sifón, las repisas van bajo el sifón (que baja hasta ${numero(SIFON.altoBajoCubierta / 10)} cm bajo la cubierta), y en este vanitorio no queda espacio para ninguna. Deja 0 repisas, o desmarca el sifón si el lavamanos no lleva.`
        : `Con lavamanos con sifón, las repisas van bajo el sifón, y ahí caben como máximo ${maximo}. Baja la cantidad de repisas.`);
    }
  }
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: p.A - 2 * p.e - 2, alto: profundidadCuerpo(p) - 20 - p.e, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: p.e + 1, y, z: p.e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Cajas de cajón ----------
// Los cajones que pasan a la altura del sifón se arman en U, rodeándolo
// (ver zonaSifon y piezasCajaCajon); los de más abajo quedan normales.
const Z_TRASERO_CAJAS = 50;

function piezasCajas(p, cajones) {
  const { A, e, correderaTipo, colorInterior } = p;
  const P = profundidadCuerpo(p);
  const zona = zonaSifon(p);
  const piezas = [];

  cajones.forEach((cajon, idx) => {
    const n = idx + 1;
    const alto = cajon.alturaFrente - 30;
    const enU = zona && cajon.posicionY + alto > zona.yDesde;
    const caja = piezasCajaCajon({
      prefijoId: `cajon${n}`, grupo: `cajon_${n}`,
      xHueco: e, anchoHueco: A - 2 * e,
      y: cajon.posicionY, alto,
      zTrasero: Z_TRASERO_CAJAS, zDelantero: P,
      e, color: colorInterior, correderaTipo,
      ...(enU ? { recorte: { xCentro: zona.xCentro, anchoLibre: SIFON.anchoLibre, fondo: zona.zHasta - Z_TRASERO_CAJAS } } : {}),
    });
    if (enU) revisarCajonEnU(p, caja, n);
    piezas.push(...caja);
  });

  return piezas;
}

// Un cajón en U necesita algo útil a cada lado del sifón y delante de él.
function revisarCajonEnU(p, caja, n) {
  const brazo = Math.min(...caja.filter(pz => /_fondo_(izq|der)$/.test(pz.id)).map(pz => pz.ancho));
  const delante = caja.find(pz => /_fondo_delantero$/.test(pz.id)).alto;
  const inicio = `El cajón ${n} queda a la altura del sifón, así que se arma en U, rodeándolo`;
  if (brazo < MIN_UTIL_CAJON_EN_U) {
    const anchoMinimo = Math.ceil((p.A + 2 * (MIN_UTIL_CAJON_EN_U - brazo)) / 10);
    throw new Error(`${inicio}, y con este ancho le quedan solo ${Math.max(0, Math.floor(brazo))} mm útiles a cada lado del sifón. Haz el vanitorio de al menos ${anchoMinimo} cm de ancho, o usa puertas en vez de cajones.`);
  }
  if (delante < MIN_UTIL_CAJON_EN_U) {
    const fondoMinimo = Math.ceil((p.P + 2 * (MIN_UTIL_CAJON_EN_U - delante)) / 10);
    throw new Error(`${inicio}, y con esta profundidad le quedan solo ${Math.max(0, Math.floor(delante))} mm útiles delante del sifón. Sube la profundidad a ${fondoMinimo} cm o más, o usa puertas en vez de cajones.`);
  }
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p, piezas) {
  const herrajes = [];
  const H = alturaCuerpo(p);

  const grapasRespaldo = grapasParaRespaldos(piezas);
  if (grapasRespaldo > 0) {
    herrajes.push({ tipo: 'grapa_carpintero_6mm', cantidad: grapasRespaldo });
  }

  if (p.repisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: p.repisas * 4 });
  }

  if (p.nP > 0) {
    const bisagrasPorPuerta = bisagrasPorAltura(H);
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: p.nP * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
  }
  if (p.nC > 0) {
    const largoCorredera = largoCorrederaComercial(profundidadCuerpo(p) - 60);
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${largoCorredera}mm`
      : `corredera_oculta_${largoCorredera}mm`;
    herrajes.push({ tipo: correderaId, cantidad: p.nC, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: p.nC });
  }

  if (p.soporte === 'patas') {
    const patas = p.A > 900 ? 6 : 4;
    herrajes.push({ tipo: 'pata_regulable', cantidad: patas });
  } else {
    const puntosColgado = p.A > 900 ? 3 : 2;
    herrajes.push({ tipo: 'escuadra_colgado_pared', cantidad: puntosColgado });
    herrajes.push({ tipo: 'taco_fischer_tornillo', cantidad: puntosColgado });
  }

  herrajes.push({ tipo: 'tornillo_1_5/8', cantidad: 8 + 12 });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

// ---------- 7. Notas de producción ----------
function generarNotas(p, piezas) {
  const notas = [];
  if (!p.cubierta.incluir) {
    notas.push(`La cubierta no está incluida en este despiece — se reservaron ${reservaCubierta(p)} mm para ella, el espesor que indicaste. Actívala en "Cubierta" si quieres que se genere la pieza y el accesorio de lavamanos.`);
  } else if (notaCubierta(p.cubierta)) {
    notas.push(notaCubierta(p.cubierta));
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavamanos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del bowl en la cubierta.');
  }
  if (p.sifon) {
    const zona = zonaSifon(p);
    const cajonesEnU = piezas
      .map(pz => pz.id.match(/^cajon(\d+)_recorte_frente$/))
      .filter(Boolean)
      .map(m => Number(m[1]));
    if (cajonesEnU.length > 0) {
      const cuales = cajonesEnU.length === 1
        ? `El cajón ${cajonesEnU[0]} pasa a la altura del sifón, así que se arma en U`
        : `Los cajones ${cajonesEnU.slice(0, -1).join(', ')} y ${cajonesEnU[cajonesEnU.length - 1]} pasan a la altura del sifón, así que se arman en U`;
      notas.push(`${cuales}: la caja lo rodea con un recorte abierto hacia atrás, de ${numero(SIFON.anchoLibre / 10)} cm de ancho, y corre en correderas de largo completo como cualquier cajón. Son todas piezas rectangulares (trasera en dos partes, los dos lados y el frente del recorte, y el fondo en tres partes).`);
    }
    notas.push(`Lavamanos con sifón: queda libre una franja de ${numero(SIFON.anchoLibre / 10)} cm al centro, desde la pared hasta ${numero(zona.zHasta / 10)} cm hacia adelante y desde la superficie de la cubierta hasta ${numero(SIFON.altoBajoCubierta / 10)} cm más abajo. El desagüe y las llaves de paso tienen que salir del muro dentro de esa franja. Si en tu baño el desagüe sale del piso, el tubo baja por todo el mueble: en ese caso usa puertas en vez de cajones.`);
    if ((p.repisas || 0) > 0 && p.config !== 'solo_cajones') {
      notas.push('Las repisas van bajo el sifón: a su altura no pasa una repisa de lado a lado.');
    }
    notas.push('Al respaldo hay que hacerle un recorte para que pasen el desagüe y las llaves de paso: mide en el muro dónde salen y córtalo en obra, antes de clavarlo.');
  }
  const cajas = piezas.filter(pz => /^cajon\d+_costado_izq$/.test(pz.id));
  if (cajas.length > 0) {
    const bordeCajas = Math.max(...cajas.map(pz => pz.posicion.y + pz.alto));
    const libre = alturaCuerpo(p) + reservaCubierta(p) - bordeCajas;
    notas.push(`Si el lavamanos va embutido en la cubierta, revisa en su ficha que la taza no baje más de ${numero(Math.floor(libre) / 10)} cm desde la superficie de la cubierta: más abajo ya está el cajón de arriba.`);
  }
  if (p.soporte === 'suspendido') {
    notas.push(
      'Mueble suspendido (sin patas ni zócalo): verificar que la pared soporte el peso con los tacos/escuadras especificados en herrajes.'
    );
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }
  return notas;
}

export { generarDespiece };
