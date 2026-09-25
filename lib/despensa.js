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
 *   - Además de piso y techo, cada sección lleva travesaños traseros de
 *     refuerzo (superior e inferior — y uno intermedio si el mueble mide
 *     1,4m de alto o más) para que un cuerpo tan alto no se destranque con
 *     el uso. No lleva travesaño delantero: el techo ya da esa rigidez
 *     adelante.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes, bisagrasPorAltura } from './shared';

const DEFAULTS = {
  A: 900,        // ancho exterior
  H: 2000,       // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 450,        // profundidad exterior
  e: 15,         // espesor tablero estructural
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar) — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  nP: 2,         // cantidad de puertas globales, siempre batientes (0 = despensa abierta)
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

// Profundidad real del cuerpo (laterales/piso/divisores), descontando el
// espesor de la puerta de la profundidad TOTAL que ingresa el cliente: la
// puerta se monta por delante del borde del cuerpo, así que si el cuerpo
// también midiera P completo, el mueble terminado (cuerpo + puerta) quedaría
// espesorPuertas mm más profundo que lo que el cliente pidió.
function profundidadCuerpo(p) {
  return p.P - p.espesorPuertas;
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
    piezas.push(...piezasTraviesasSeccion(p, seccion, i));
    const piezasRepisasSec = piezasRepisasSeccion(p, seccion, i);
    piezas.push(...piezasRepisasSec);
    totalRepisas += piezasRepisasSec.length;
  });

  if (p.nP > 0) {
    piezas.push(...piezasPuertasBatientes(p));
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
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('La despensa debe tener al menos 1 sección');
  }
  for (const s of p.secciones) {
    if ((s.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
  }
}

// ---------- 1. Piezas del cuerpo (caja cerrada arriba y abajo) ----------
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
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: 'techo',
      ancho: A - 2 * e, alto: P, espesor: e,
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
    material: 'MDF',
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
// Cada sección admite un "ancho fijo" opcional (mismo criterio que mueble
// cocina/closet): el ancho NOMINAL tal como se ve por fuera, compartiendo la
// mitad de cada separador con la sección vecina — no el ancho interior puro.
// Las secciones sin ancho fijo se reparten en partes iguales el ancho que
// sobra después de descontar las que sí lo tienen. Acá siempre hay divisor
// entre secciones (no existe el caso "colgador puro" del closet que a veces
// se lo salta): con 1 sola sección, en cambio, no hay ningún divisor.
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const nDivisores = n - 1;

  let anchoFijoInteriorTotal = 0;
  let nAutomaticas = 0;
  const anchosInteriores = p.secciones.map((s, i) => {
    if (!s.ancho) { nAutomaticas++; return null; }
    const extIzq = i === 0 ? e : e / 2;
    const extDer = i === n - 1 ? e : e / 2;
    const interior = s.ancho - extIzq - extDer;
    if (interior < 200) {
      throw new Error(
        `Sección ${i + 1}: con ${Math.round(s.ancho)}mm de ancho fijo, el hueco interior real quedaría en solo ${Math.round(interior)}mm. Sube el ancho fijo de esta sección a al menos ${Math.round(extIzq + extDer + 200)}mm.`
      );
    }
    anchoFijoInteriorTotal += interior;
    return interior;
  });

  const ANCHO_MIN_SECCION_AUTOMATICA = 200;
  const anchoMinimoA = Math.ceil(
    anchoFijoInteriorTotal + nAutomaticas * ANCHO_MIN_SECCION_AUTOMATICA + 2 * e + nDivisores * e
  );
  const anchoInteriorTotal = A - 2 * e - nDivisores * e;
  const anchoRestante = anchoInteriorTotal - anchoFijoInteriorTotal;
  if (anchoRestante < 0) {
    throw new Error(
      `Las secciones de esta despensa (sumando sus anchos fijos) no caben dentro de un mueble de ${A}mm de ancho exterior. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o quita/achica secciones.`
    );
  }
  const anchoAutomatico = nAutomaticas > 0 ? anchoRestante / nAutomaticas : 0;
  if (nAutomaticas > 0 && anchoAutomatico < ANCHO_MIN_SECCION_AUTOMATICA) {
    throw new Error(
      `Con estas secciones, las de ancho libre quedan de solo ${Math.round(anchoAutomatico)}mm de ancho interior. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o reduce/achica secciones.`
    );
  }

  const secciones = [];
  const divisores = [];
  let x = e;
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosInteriores[i] ?? anchoAutomatico;
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion });
    x += anchoSeccion;
    if (i < n - 1) {
      divisores.push({ id: `divisor_${divisores.length + 1}`, x });
      x += e;
    }
  }
  return { secciones, divisores };
}

// El divisor no llega hasta el borde real del mueble por ningún lado: por
// delante lo tapa la puerta (igual que los laterales — mismo descuento de
// profundidadCuerpo), y en altura queda insertado entre el piso y el techo
// en vez de correr por detrás de ellos — el piso y el techo son piezas de
// ancho completo que "pasan por encima/debajo" del divisor, no al revés.
function piezasDivisores(p, secciones) {
  const { e, colorInterior } = p;
  const H = alturaCuerpo(p);
  const nDivisores = secciones.length - 1;
  const piezas = [];
  for (let i = 0; i < nDivisores; i++) {
    piezas.push({
      id: `divisor_${i + 1}`,
      ancho: profundidadCuerpo(p), alto: H - 2 * e, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: secciones[i].xInicio + secciones[i].anchoSeccion, y: e, z: 0 },
      rotacion: 'vertical_profundidad',
    });
  }
  return piezas;
}

// ---------- 4b. Travesaños de refuerzo por sección (traseros) ----------
// El techo ya cierra el cuerpo por arriba y da rigidez al frente, pero en un
// mueble tan alto y angosto como una despensa (hasta 2-3m) eso solo no evita
// que el cuerpo se destranque (racking) por atrás con el uso de las puertas
// o el peso de las repisas cargadas. Se agrega, por cada sección, un
// travesaño trasero justo debajo del techo y otro justo encima del piso —
// mismo criterio estructural que mueble cocina/vanitorio, sin el travesaño
// delantero (el techo ya cumple esa función adelante). Van por sección (no
// de lateral a lateral completo) porque cada divisor interno ya ocupa ese
// mismo rango de altura, de piso a techo — mismo motivo por el que las
// repisas también van por sección.
const ALTO_TRAVIESA_DESPENSA = 100;
const ALTO_MINIMO_TRAVIESA_INTERMEDIA = 1400; // mm, alto TOTAL (H) del mueble

function piezasTraviesasSeccion(p, seccion, indiceSeccion) {
  const { e, colorInterior } = p;
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const alto = ALTO_TRAVIESA_DESPENSA;
  const prefijo = `s${indiceSeccion + 1}_`;

  const piezas = [
    {
      id: `${prefijo}traviesa_trasera`,
      ancho: anchoSeccion, alto, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio, y: H - e - alto, z: 0 },
      rotacion: 'vertical_frontal',
    },
    {
      id: `${prefijo}traviesa_trasera_inferior`,
      ancho: anchoSeccion, alto, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    },
  ];

  // Mueble alto (1,4m o más): suma un travesaño trasero a media altura para
  // reforzar el tramo intermedio, que en un mueble así de alto queda
  // demasiado largo sin apoyo entre el travesaño superior y el inferior.
  if (p.H >= ALTO_MINIMO_TRAVIESA_INTERMEDIA) {
    piezas.push({
      id: `${prefijo}traviesa_trasera_intermedia`,
      ancho: anchoSeccion, alto, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: xInicio, y: (H - alto) / 2, z: 0 },
      rotacion: 'vertical_frontal',
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
      // Recesada "e" desde el fondo para no chocar con los travesaños
      // traseros de refuerzo de esta misma sección (ver piezasTraviesasSeccion).
      id: `s${indiceSeccion + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 4, alto: profundidadCuerpo(p) - 20 - p.e, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + 2, y, z: p.e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 6. Puertas globales (cubren todo el ancho, siempre batientes) ----------
// Estilo "overlay" moderno (igual que muebleBajoCocina.js): la puerta llega
// a ras de los dos bordes exteriores de la despensa (x=0 y x=A), con solo
// 2mm de holgura entre puertas cuando hay más de una.
function piezasPuertasBatientes(p) {
  const { A, nP, espesorPuertas, colorExterior } = p;
  const H = alturaCuerpo(p);
  const anchoDisponible = A - (nP - 1) * 2;
  const anchoPuerta = anchoDisponible / nP;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: i * (anchoPuerta + 2), y: 2, z: profundidadCuerpo(p) },
      rotacion: 'vertical_frontal',
    });
  }
  return piezas;
}

// ---------- 7. Herrajes ----------
function generarHerrajes(p, { totalRepisas, secciones }) {
  const herrajes = [];

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  if (p.nP > 0) {
    const H = alturaCuerpo(p);
    const bisagrasPorPuerta = bisagrasPorAltura(H);
    herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: p.nP * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
  }

  // Igual criterio que mueble bajo cocina/vanitorio (4 o 6 según ancho), pero
  // el corte de "ancho grande" baja a 900mm: una despensa es mucho más alta
  // y carga más peso en repisas que un mueble bajo, así que necesita más
  // puntos de apoyo para no destemplarse con el uso.
  const patas = p.A >= 900 ? 6 : 4;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });

  // Cada travesaño de refuerzo (trasero superior + trasero inferior, y el
  // intermedio en muebles altos) va atornillado por sus dos extremos (a un
  // lateral o a un divisor), 2 tornillos por extremo.
  const traviesasPorSeccion = p.H >= ALTO_MINIMO_TRAVIESA_INTERMEDIA ? 3 : 2;
  const tornillosTraviesas = secciones.length * traviesasPorSeccion * 4;

  herrajes.push({ tipo: 'tornillo_confirmat / tornillo_1_5/8', cantidad: 8 + (secciones.length - 1) * 4 + tornillosTraviesas });
  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
