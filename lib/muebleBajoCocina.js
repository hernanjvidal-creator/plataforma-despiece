/**
 * MOTOR DE REGLAS — Mueble Cocina (por secciones, con esquinas opcionales)
 * -----------------------------------------------------------
 * El mueble se arma como una lista de SECCIONES (columnas) de izquierda a
 * derecha, cada una con un `tipo`:
 *
 *   - 'estandar'         → puertas/cajones/mixto, igual que antes (usa
 *                           config/nP/nC de la sección).
 *   - 'lavaplatos'        → solo puertas (sin cajones, por las cañerías),
 *                           600mm por defecto.
 *   - 'lavavajillas'      → sin frente propio (el equipo trae el suyo),
 *                           600mm por defecto (estándar internacional).
 *   - 'horno'             → sin frente propio, 600mm por defecto (hueco de
 *                           horno empotrado estándar 600x560x600).
 *   - 'cajones_olleros'   → siempre 2 cajones de 300mm abajo + 1 cajón
 *                           arriba con el saldo del alto disponible (no
 *                           es una cantidad configurable).
 *   - 'esquinero'         → no es una sección de verdad: es un marcador de
 *                           giro de 90° (campo `giro`: 'izquierda' |
 *                           'derecha'). Todo lo que viene ANTES de un
 *                           'esquinero' forma un "brazo" recto; lo que
 *                           viene DESPUÉS empieza un brazo nuevo, en el
 *                           ángulo recto, continuando desde donde terminó
 *                           el anterior. No puede ir de primero ni de
 *                           último (tiene que haber secciones de verdad a
 *                           cada lado). Se puede repetir más de una vez
 *                           (ej. un mueble en U tiene 2 esquinas/3 brazos).
 *
 * Entre secciones va un divisor vertical — el mismo tipo de panel que un
 * lateral — que es una ÚNICA pieza compartida entre las dos secciones que
 * separa (no se duplica). El ancho de las secciones con tipo de electro-
 * doméstico usa medidas estándar de mercado; las 'estandar' sin ancho fijo
 * se reparten el resto del ancho en partes iguales — EXCEPTO si el mueble
 * tiene alguna esquina, donde cada sección de cada brazo debe traer su
 * ancho explícito (no hay un solo "ancho total" del que repartir cuando
 * hay más de un brazo).
 *
 * Esquinas ("esquinero interior"): los dos brazos que se juntan en una
 * esquina son cuerpos independientes que llegan hasta ahí (no comparten un
 * panel de esquina); las puertas se resuelven con un herraje de puerta
 * plegable de rincón, no con bisagras rectas. Es el mismo modelo que tenía
 * el módulo "Esquinero bajo de cocina" aparte, ahora generalizado a
 * cualquier cantidad de esquinas dentro de un solo mueble — ver
 * `dividirEnTramos` / `transformarPiezaHeading` más abajo.
 *
 * Alto (H): es la altura TOTAL desde el piso hasta la parte de arriba del
 * cuerpo (sin contar la cubierta) — incluye el zócalo estándar (`hp`,
 * 110mm reservados para un panel de zócalo de 100mm, el mínimo que acepta
 * una máquina de corte, más 10mm de holgura). Es decir, el cuerpo
 * (laterales, puertas, cajones) mide H - hp. Es el mismo H para todos los
 * brazos de un mueble con esquinas.
 *
 * Espesor de frentes: los cajones siempre van en 15mm (`e`, el mismo
 * espesor estructural). Las puertas van en 15mm por defecto también, pero
 * el cliente puede pedir 18mm (`espesorPuertas`) si prefiere un frente más
 * grueso — quedan en un grupo de material aparte para el corte.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble (0 = lateral izquierdo)
 *   y: altura (0 = piso del cuerpo, sin contar zócalo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 * Sin esquinas, todo el mueble se genera directo en este plano. Con
 * esquinas, cada brazo se genera en SU PROPIO plano local (como si fuera
 * un mueble recto normal) y se traslada/rota 90°×N al espacio global,
 * encadenado uno tras otro desde donde terminó el brazo anterior.
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 700,        // alto TOTAL desde el piso (incluye el zócalo, ver hp)
  P: 560,        // profundidad exterior
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  hp: 110,       // alto reservado para el zócalo (estándar, no editable por el cliente) — el panel de zócalo en sí mide hp-10 = 100mm, el mínimo que acepta una máquina de corte
  r: 50,         // retranqueo zócalo
  correderaTipo: 'bola',  // 'bola' | 'oculta'
  isla: false,   // true = mueble independiente (isla): respaldo terminado, no HDF
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y los accesorios (lavaplatos)
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  secciones: [
    { tipo: 'estandar', config: 'solo_cajones', nP: 0, nC: 3 },
  ],
  colorInterior: 'blanco',    // color estándar de cajones/bandejas/interior de cuerpo
  colorExterior: 'blanco',    // color elegido por el cliente para frentes y caras vistas
};

// Anchos estándar de mercado (mm) para secciones de electrodomésticos.
// Fuentes: lavavajillas/horno empotrado 600mm es el estándar internacional
// más común; lavaplatos 600-900mm según cubeta simple/doble.
const ANCHO_ESTANDAR_POR_TIPO = {
  lavaplatos: 600,
  lavavajillas: 600,
  horno: 600,
  cajones_olleros: 450,
};

// Altura real del cuerpo (laterales/puertas/cajones), descontando el zócalo
// de la altura TOTAL que ingresa el cliente.
function alturaCuerpo(p) {
  return p.H - p.hp;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametrosGlobales(p);

  const tramos = dividirEnTramos(p.secciones);

  // Sin esquinas: un solo tramo, generado directo con el "Ancho (A)" que
  // ingresa el cliente — comportamiento idéntico al de siempre (incluido
  // el reparto automático de ancho entre secciones sin ancho fijo).
  if (tramos.length === 1) {
    if (p.A < 50 || p.A > 10000) throw new Error('Ancho (A) fuera de rango 50-10000mm');
    const r = generarTramo(p, p.A, tramos[0].secciones, '', 0, 0, 0);
    return {
      modulo: 'bajo_cocina',
      parametros: p,
      piezas: r.piezas,
      accesorios: r.accesorios,
      herrajes: r.herrajes,
      notas: r.notas,
      resumen: resumirPlanchas(r.piezas),
    };
  }

  // Con esquinas: cada tramo se genera en su propio plano local (como un
  // mueble recto independiente) y se traslada/rota al espacio global,
  // encadenado desde donde terminó el tramo anterior.
  let piezas = [];
  let accesorios = [];
  let herrajes = [];
  let notas = [];
  let heading = 0;
  let origenX = 0;
  let origenZ = 0;

  tramos.forEach((tramo, i) => {
    // Zona ciega de P mm en el/los extremo(s) de este tramo que dan a una
    // esquina: la caja (laterales/piso/zócalo/respaldo) sigue llegando
    // hasta el final del tramo tal cual, pero ahí NO se pone frente
    // (puerta/cajón) — ese es exactamente el ancho que el brazo perpendicular
    // ocupa en la esquina, así que una puerta ahí terminaría cruzándose
    // por dentro con la puerta del otro brazo. Es el mismo criterio que un
    // mueble esquinero real (zona ciega / lazy susan en vez de dos puertas
    // que se atraviesan).
    //
    // Esa zona ciega no queda del todo sin uso: lleva una repisa que sigue
    // la de la sección real más cercana — primero se prueba la del mismo
    // brazo (la sección justo antes, si la esquina va al final, o justo
    // después, si va al principio); si esa sección es de cajones (sin
    // repisa), se prueba con la sección del OTRO lado de la esquina (la
    // que sigue en el brazo siguiente/anterior). Si ninguna de las dos
    // tiene repisas, la zona ciega tampoco lleva — no hay de qué agarrarla.
    const primeraReal = tramo.secciones[0];
    const ultimaReal = tramo.secciones[tramo.secciones.length - 1];

    let repisasIniciales = 0;
    if (i > 0) {
      repisasIniciales = repisasDeSeccion(primeraReal);
      if (repisasIniciales === 0) {
        const tramoAnterior = tramos[i - 1];
        repisasIniciales = repisasDeSeccion(tramoAnterior.secciones[tramoAnterior.secciones.length - 1]);
      }
    }
    let repisasFinales = 0;
    if (i < tramos.length - 1) {
      repisasFinales = repisasDeSeccion(ultimaReal);
      if (repisasFinales === 0) {
        const tramoSiguiente = tramos[i + 1];
        repisasFinales = repisasDeSeccion(tramoSiguiente.secciones[0]);
      }
    }

    const seccionesConCiego = [
      ...(i > 0 ? [{ tipo: 'ciego', ancho: p.P, repisas: repisasIniciales }] : []),
      ...tramo.secciones,
      ...(i < tramos.length - 1 ? [{ tipo: 'ciego', ancho: p.P, repisas: repisasFinales }] : []),
    ];
    const anchoTramo = calcularAnchoTramo(seccionesConCiego, p.e);
    if (anchoTramo < 50 || anchoTramo > 10000) {
      throw new Error(`Brazo ${i + 1}: ancho total ${Math.round(anchoTramo)}mm fuera de rango 50-10000mm`);
    }
    const prefijo = `brazo${i + 1}_`;
    const r = generarTramo(p, anchoTramo, seccionesConCiego, prefijo, heading, origenX, origenZ);

    piezas.push(...r.piezas);
    accesorios.push(...r.accesorios);
    herrajes.push(...r.herrajes);
    notas.push(...r.notas.map(n => `Brazo ${i + 1}: ${n}`));

    if (tramo.giroSiguiente) {
      const direccion = DIRECCION_POR_HEADING[heading];
      origenX += direccion.x * anchoTramo;
      origenZ += direccion.z * anchoTramo;
      heading = (heading + (tramo.giroSiguiente === 'izquierda' ? 3 : 1)) % 4;
    }
  });

  herrajes.push({ tipo: 'kit_esquinero_giratorio_o_bandeja_extraible', cantidad: tramos.length - 1 });
  if (p.cubierta.incluir) {
    notas.push(
      'La cubierta se genera como un rectángulo independiente por cada brazo (no como una sola pieza en L/U con inglete) — ' +
      'la unión de la cubierta en cada esquina la resuelve el fabricante de la cubierta (mueblista o proveedor de piedra), igual que en una cocina real.'
    );
  }
  notas.push(
    `Este mueble tiene ${tramos.length - 1} esquina(s). En cada una, el último tramo de ${Math.round(p.P)}mm ` +
    '(el ancho de la profundidad, "P") de cada brazo queda como zona ciega, sin puerta ni cajón propio — es el espacio ' +
    'que ocupa el brazo perpendicular al llegar a la esquina, así que una puerta ahí terminaría cruzándose por dentro ' +
    'con la del otro brazo. La caja (laterales/piso/zócalo) sí llega hasta el fondo de la esquina, y esa zona no lleva ' +
    'separador contra la sección vecina (queda conectada con ella, con una repisa de continuación) para poder guardar ' +
    'algo ahí aunque sea incómodo de alcanzar. Para aprovecharla mejor se puede agregar un accesorio de esquina ' +
    '(bandeja extraíble o esquinero giratorio tipo "lazy susan"), no incluido como pieza de melamina — cotizar aparte según el hueco resultante.'
  );

  return {
    modulo: 'bajo_cocina',
    parametros: p,
    piezas,
    accesorios,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// Direcciones cardinales (en el plano X/Z) para cada uno de los 4 "heading"
// posibles (0=+X, 1=+Z, 2=-X, 3=-Z) — girar "derecha" suma 1, "izquierda" resta 1 (mod 4).
const DIRECCION_POR_HEADING = [
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 0, z: -1 },
];

// ---------- Tramos (separar la lista de secciones en los "esquinero") ----------
function dividirEnTramos(secciones) {
  const tramos = [];
  let actual = [];
  for (const s of secciones) {
    if (s.tipo === 'esquinero') {
      if (actual.length === 0) {
        throw new Error('Una esquina no puede ir de primera: debe haber al menos una sección antes de doblar.');
      }
      if (!['izquierda', 'derecha'].includes(s.giro)) {
        throw new Error('Cada esquina debe indicar hacia dónde gira: "izquierda" o "derecha".');
      }
      tramos.push({ secciones: actual, giroSiguiente: s.giro });
      actual = [];
    } else {
      actual.push(s);
    }
  }
  if (actual.length === 0) {
    throw new Error('Una esquina no puede ir de última: debe haber al menos una sección después de doblar.');
  }
  tramos.push({ secciones: actual, giroSiguiente: null });
  return tramos;
}

// Ancho total de un tramo cuando hay más de uno (todas sus secciones deben
// traer un ancho explícito — no hay un "ancho total del mueble" único del
// que repartir automáticamente cuando hay más de un brazo).
function calcularAnchoTramo(seccionesTramo, e) {
  const n = seccionesTramo.length;
  const sumaAnchos = seccionesTramo.reduce((suma, s, i) => {
    const ancho = s.ancho || ANCHO_ESTANDAR_POR_TIPO[s.tipo];
    if (!ancho) {
      throw new Error(
        `Sección ${i + 1} de un brazo: con más de un brazo (esquinero) cada sección debe traer un ancho fijo — falta en una sección tipo "${s.tipo}".`
      );
    }
    return suma + ancho;
  }, 0);
  return sumaAnchos + 2 * e + (n - 1) * e;
}

// Genera un tramo (brazo) completo — mismas reglas que un mueble recto
// normal, en su propio plano local — y lo transforma al espacio global
// según el heading/origen acumulados (identidad si heading=0 y origen=0,0,
// que es el caso de un mueble sin esquinas).
function generarTramo(p, anchoTramo, seccionesTramo, prefijo, heading, origenX, origenZ) {
  validarSecciones(seccionesTramo);
  const pLocal = { ...p, A: anchoTramo, secciones: seccionesTramo };

  const { secciones, divisores } = calcularSecciones(pLocal);

  let piezas = [
    ...piezasCuerpo(pLocal),
    ...piezasRespaldo(pLocal),
    ...piezasZocalo(pLocal),
    ...piezasDivisores(pLocal, divisores),
    ...piezasCubierta(pLocal),
  ];

  let totalCajones = 0;
  let totalPuertas = 0;
  let totalRepisas = 0;
  let accesorios = [];

  secciones.forEach((seccion, i) => {
    const resultado = generarSeccionFrentes(pLocal, seccion, i);
    piezas.push(...resultado.piezas);

    if (resultado.cajaInfos && resultado.cajaInfos.length > 0) {
      piezas.push(...piezasCajasSeccion(pLocal, resultado.cajaInfos, i));
      totalCajones += resultado.cajaInfos.length;
    }
    totalPuertas += resultado.piezas.filter(pz => pz.id.includes('_puerta_')).length;
    totalRepisas += resultado.piezas.filter(pz => pz.id.includes('_repisa_')).length;

    if (seccion.tipo === 'lavaplatos' && pLocal.cubierta.incluir) {
      accesorios.push(...accesorioLavaplatos(pLocal, seccion, i));
    }
  });

  const herrajes = generarHerrajes(pLocal, { secciones, totalCajones, totalPuertas, totalRepisas });
  const notas = generarNotas(pLocal, secciones);

  piezas = piezas.map(pz => aplicarPrefijo(transformarPiezaHeading(pz, heading, origenX, origenZ), prefijo));
  accesorios = accesorios.map(a => aplicarPrefijo(transformarPiezaHeading(a, heading, origenX, origenZ), prefijo));

  return { piezas, accesorios, herrajes, notas };
}

function aplicarPrefijo(pieza, prefijo) {
  if (!prefijo) return pieza;
  return { ...pieza, id: `${prefijo}${pieza.id}`, grupo: pieza.grupo ? `${prefijo}${pieza.grupo}` : pieza.grupo };
}

// Traslada (heading=0) o rota 90°×heading + traslada una pieza generada en
// coordenadas LOCALES (como si su tramo fuera un mueble recto empezando en
// el origen) al plano GLOBAL, según el heading acumulado del tramo y el
// punto donde arranca (origenX, origenZ) — donde terminó el tramo anterior.
// Es una rotación en múltiplos de 90°, así que basta con permutar/negar
// ejes, sin trigonometría. La altura (Y) nunca cambia.
function transformarPiezaHeading(pieza, heading, origenX, origenZ) {
  if (heading === 0) {
    const { x, y, z } = pieza.posicion;
    return { ...pieza, posicion: { x: x + origenX, y, z: z + origenZ } };
  }

  const { x: px, y: py, z: pz } = pieza.posicion;
  // Extensión de la pieza en el plano X/Z local, según cómo su `rotacion`
  // usa el campo "ancho" (ver comentario de coordenadas al inicio del archivo).
  let ex = 0, ez = 0;
  if (pieza.rotacion === 'horizontal') { ex = pieza.ancho; ez = pieza.alto; }
  else if (pieza.rotacion === 'vertical_frontal') { ex = pieza.ancho; ez = 0; }
  else { ex = 0; ez = pieza.ancho; } // vertical_profundidad

  const c1 = proyectarGlobal(px, pz, heading, origenX, origenZ);
  const c2 = proyectarGlobal(px + ex, pz + ez, heading, origenX, origenZ);
  const gx = Math.min(c1.x, c2.x);
  const gz = Math.min(c1.z, c2.z);

  let nuevaRotacion = pieza.rotacion;
  let nuevoAncho = pieza.ancho;
  let nuevoAlto = pieza.alto;
  if (heading % 2 === 1) {
    // Con un giro impar (90°/270°) los ejes X/Z locales intercambian su rol.
    if (pieza.rotacion === 'horizontal') { nuevoAncho = pieza.alto; nuevoAlto = pieza.ancho; }
    else if (pieza.rotacion === 'vertical_frontal') { nuevaRotacion = 'vertical_profundidad'; }
    else { nuevaRotacion = 'vertical_frontal'; }
  }

  return { ...pieza, ancho: nuevoAncho, alto: nuevoAlto, rotacion: nuevaRotacion, posicion: { x: gx, y: py, z: gz } };
}

function proyectarGlobal(lx, lz, heading, ox, oz) {
  switch (heading) {
    case 1: return { x: ox - lz, z: oz + lx };
    case 2: return { x: ox - lx, z: oz - lz };
    case 3: return { x: ox + lz, z: oz - lx };
    default: return { x: ox + lx, z: oz + lz };
  }
}

// ---------- Validación básica ----------
function validarParametrosGlobales(p) {
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (p.H <= p.hp) {
    throw new Error(`El alto (H) debe ser mayor que el zócalo estándar (${p.hp}mm) — sube el alto total.`);
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El mueble debe tener al menos 1 sección');
  }
  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// Validación de las secciones "de verdad" (no 'esquinero') de un tramo.
// 'ciego' no es una sección que ingresa el cliente — la agrega el propio
// motor en los extremos de un tramo que dan a una esquina (ver generarDespiece).
function validarSecciones(secciones) {
  const tiposValidos = ['estandar', 'lavaplatos', 'lavavajillas', 'horno', 'cajones_olleros', 'ciego'];
  for (const s of secciones) {
    if (!tiposValidos.includes(s.tipo)) throw new Error(`Tipo de sección desconocido: ${s.tipo}`);
    if (s.tipo === 'estandar') {
      const nP = s.nP || 0, nC = s.nC || 0;
      if (s.config !== 'abierto' && nP === 0 && nC === 0) {
        throw new Error('Una sección "estandar" debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")');
      }
      if (s.config === 'solo_cajones' && nP > 0) throw new Error('Config solo_cajones no admite puertas');
      if (s.config === 'solo_puertas' && nC > 0) throw new Error('Config solo_puertas no admite cajones');
      if ((s.repisas || 0) < 0) throw new Error('La cantidad de repisas no puede ser negativa');
      if ((s.repisas || 0) > 0 && s.config === 'solo_cajones') {
        throw new Error('Config solo_cajones no tiene hueco de puertas: las repisas no aplican');
      }
    }
  }
}

// ---------- 1. Piezas del cuerpo (caja estructural) ----------
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
// En un mueble normal (contra la pared) es HDF, invisible. En una isla, el
// respaldo queda a la vista desde el otro lado: se cambia a un panel de
// melamina terminado en el color exterior.
function piezasRespaldo(p) {
  const { A, e, isla, colorExterior } = p;
  const H = alturaCuerpo(p);
  if (isla) {
    return [{
      id: 'respaldo',
      ancho: A - 2 * e + 16, alto: H - 30, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e - 8, y: 15, z: 0 },
      rotacion: 'vertical_frontal',
    }];
  }
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

// ---------- 3. Zócalo ----------
// Panel frontal (recesado `r` mm desde el frente real, para dejar hueco a
// los pies) + panel trasero + retornos en los dos laterales, cerrando el
// hueco bajo el mueble por los cuatro lados. Además, por un tema de soporte
// estructural, se agregan cruces de adelante hacia atrás cada
// ESPACIADO_CRUCE_ZOCALO mm de ancho — necesarios en muebles largos para
// que el zócalo no ceda bajo el peso. Todas estas piezas quedan ocultas
// bajo el mueble (no se ven), salvo la cara frontal del panel delantero.
const ESPACIADO_CRUCE_ZOCALO = 800;

function piezasZocalo(p) {
  const { A, P, e, hp, r, colorInterior, colorExterior } = p;
  const altoZocalo = hp - 10;
  const profundidadZocalo = P - r; // del fondo (z=0) hasta la línea de recesado del frente

  const piezas = [
    {
      id: 'zocalo_frontal',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: profundidadZocalo - e },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_trasero',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: -hp, z: 0 },
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

  let x = ESPACIADO_CRUCE_ZOCALO;
  let n = 1;
  while (x < A - 200) {
    piezas.push({
      id: `zocalo_cruce_${n}`,
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x, y: -hp, z: 0 },
      rotacion: 'vertical_profundidad',
    });
    x += ESPACIADO_CRUCE_ZOCALO;
    n++;
  }

  return piezas;
}

// ---------- 3b. Cubierta (superficie) ----------
// Panel horizontal que va encima del cuerpo, con un pequeño vuelo (overhang)
// respecto al mueble. Si el material es piedra (cuarzo/granito/mármol), el
// optimizador de corte la excluye del nesting de melamina (se fabrica aparte).
const OVERHANG_FRENTE_CUBIERTA = 20;
const OVERHANG_LADOS_CUBIERTA = 10;

function piezasCubierta(p) {
  if (!p.cubierta.incluir) return [];
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

// ---------- 4. Reparto del ancho en secciones + divisores ----------
// Las secciones con tipo de electrodoméstico usan su ancho estándar (o el
// que indique el usuario); las 'estandar' sin ancho fijo se reparten el
// resto del ancho en partes iguales. Cada divisor interno es UNA sola
// pieza compartida entre la sección de su izquierda y la de su derecha.
function calcularSecciones(p) {
  const { A, e } = p;
  const n = p.secciones.length;
  const anchoInteriorTotal = A - 2 * e - (n - 1) * e;

  let anchoFijoTotal = 0;
  let nAutomaticas = 0;
  const anchosBase = p.secciones.map(s => {
    const ancho = s.ancho || ANCHO_ESTANDAR_POR_TIPO[s.tipo] || null;
    if (ancho) { anchoFijoTotal += ancho; return ancho; }
    nAutomaticas++;
    return null;
  });

  // Ancho mínimo de A para que esta combinación de secciones alcance a caber:
  // el ancho fijo total + un mínimo razonable para cada sección de ancho libre
  // + el espesor de los 2 laterales exteriores y los (n-1) divisores internos.
  const ANCHO_MIN_SECCION_AUTOMATICA = 200;
  const anchoMinimoA = Math.ceil(
    anchoFijoTotal + nAutomaticas * ANCHO_MIN_SECCION_AUTOMATICA + (n + 1) * e
  );

  const anchoRestante = anchoInteriorTotal - anchoFijoTotal;
  if (anchoRestante < 0) {
    throw new Error(
      `Las secciones con ancho fijo (${Math.round(anchoFijoTotal)}mm en total) no caben en un mueble de ${A}mm de ancho. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o quita/achica secciones.`
    );
  }
  const anchoAutomatico = nAutomaticas > 0 ? anchoRestante / nAutomaticas : 0;
  if (nAutomaticas > 0 && anchoAutomatico < ANCHO_MIN_SECCION_AUTOMATICA) {
    throw new Error(
      `Con estas secciones, las de ancho libre quedan de solo ${Math.round(anchoAutomatico)}mm. Sube el "Ancho (mm)" de arriba a al menos ${anchoMinimoA}mm, o reduce/achica secciones.`
    );
  }

  let x = e;
  const secciones = [];
  const divisores = [];
  for (let i = 0; i < n; i++) {
    const anchoSeccion = anchosBase[i] || anchoAutomatico;
    secciones.push({ ...p.secciones[i], xInicio: x, anchoSeccion });
    x += anchoSeccion;
    if (i < n - 1) {
      // Sin separador contra una zona ciega de esquina: así ese hueco queda
      // conectado con la sección vecina (se puede usar como extensión suya,
      // aunque incómodo de alcanzar) en vez de sellado en su propio cajón.
      // El espacio de e mm donde iría el separador se deja igual (x sigue
      // avanzando) para no descuadrar el resto del reparto de anchos.
      const esFronteraConCiego = p.secciones[i].tipo === 'ciego' || p.secciones[i + 1].tipo === 'ciego';
      if (!esFronteraConCiego) {
        divisores.push({ id: `divisor_${i + 1}`, x });
      }
      x += e;
    }
  }
  return { secciones, divisores };
}

function piezasDivisores(p, divisores) {
  const { P, e, colorInterior } = p;
  const H = alturaCuerpo(p);
  return divisores.map(d => ({
    id: d.id,
    ancho: P, alto: H, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorInterior, cara: 'interior',
    posicion: { x: d.x, y: 0, z: 0 },
    rotacion: 'vertical_profundidad',
  }));
}

// ---------- 5. Frentes por sección, según su tipo ----------
function generarSeccionFrentes(p, seccion, indice) {
  switch (seccion.tipo) {
    case 'ciego':
      return generarRepisaCiego(p, seccion, indice);
    case 'lavavajillas':
    case 'horno':
      return { piezas: [], cajaInfos: [] }; // sin frente propio: lo trae el electrodoméstico
    case 'lavaplatos':
      return generarPuertasLavaplatos(p, seccion, indice);
    case 'cajones_olleros':
      return generarCajonesOlleros(p, seccion, indice);
    default:
      return generarFrenteEstandar(p, seccion, indice);
  }
}

// Zona ciega de esquina: sin frente propio (puerta/cajón no caben ahí sin
// cruzarse con el brazo perpendicular), pero tampoco queda inutilizada del
// todo — como ya no tiene separador contra su sección vecina (ver
// calcularSecciones), se le pone una repisa que sigue de largo la de esa
// sección, para poder guardar algo ahí aunque sea incómodo de alcanzar.
function generarRepisaCiego(p, seccion, indice) {
  const H = alturaCuerpo(p);
  // `seccion.repisas` ya viene calculado desde generarDespiece (copiando la
  // cantidad de la sección real vecina, o 0 si no corresponde ninguna) —
  // piezasRepisasZona no pone nada si es 0.
  return { piezas: piezasRepisasZona(p, seccion, indice, p.e, H - p.e), cajaInfos: [] };
}

// Cuántas repisas "de verdad" tiene una sección — 0 para tipos que no
// tienen el concepto (cajones, lavaplatos, lavavajillas, horno) o para
// 'estandar' en solo_cajones (sin hueco de puertas donde ponerlas).
function repisasDeSeccion(seccion) {
  if (!seccion || seccion.tipo !== 'estandar') return 0;
  if (seccion.config === 'solo_puertas' || seccion.config === 'mixto' || seccion.config === 'abierto') {
    return seccion.repisas || 0;
  }
  return 0;
}

function generarPuertasLavaplatos(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const nP = anchoSeccion > 500 ? 2 : 1;
  const anchoUtil = anchoSeccion - (nP + 1) * 2;
  const anchoPuerta = anchoUtil / nP;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `s${indice + 1}_puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
      rotacion: 'vertical_frontal',
    });
  }
  return { piezas, cajaInfos: [] };
}

// Accesorio lavaplatos: caja aproximada del pozo (o los dos pozos), embutida
// en la cubierta, en el centro de la sección. No es una pieza de melamina —
// no entra en el nesting ni en el resumen de material.
function accesorioLavaplatos(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const dosPozos = anchoSeccion > 700;
  const anchoCubeta = Math.min(anchoSeccion - 100, dosPozos ? 780 : 450);
  const profundidadCubeta = 400;
  const alturaCubeta = 180;
  const espesorCubierta = p.cubierta.espesor;

  return [{
    id: `s${indice + 1}_lavaplatos`,
    descripcion: dosPozos ? 'Lavaplatos doble pozo (acero inoxidable)' : 'Lavaplatos un pozo (acero inoxidable)',
    ancho: anchoCubeta, alto: profundidadCubeta, espesor: alturaCubeta,
    posicion: {
      x: xInicio + (anchoSeccion - anchoCubeta) / 2,
      y: H + espesorCubierta - alturaCubeta,
      z: (p.P - profundidadCubeta) / 2,
    },
    rotacion: 'horizontal',
    color: 'acero_inoxidable',
  }];
}

// Cajones olleros: siempre 2 cajones de 300mm abajo, y un tercer cajón
// arriba con el saldo del alto disponible (no una cantidad configurable
// de cajones de 300mm, que fácilmente no calzan en el alto del mueble).
const ALTURA_CAJON_OLLERO = 300;
const MIN_ALTURA_CAJON_SALDO = 100;

function generarCajonesOlleros(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const gap = 3;

  const y1 = 3;
  const y2 = y1 + ALTURA_CAJON_OLLERO + gap;
  const y3 = y2 + ALTURA_CAJON_OLLERO + gap;
  const altoSaldo = H - y3 - gap;

  if (altoSaldo < MIN_ALTURA_CAJON_SALDO) {
    throw new Error(
      `Sección ${indice + 1} (cajones olleros): con 2 cajones de ${ALTURA_CAJON_OLLERO}mm abajo, el cajón superior quedaría de solo ${Math.round(altoSaldo)}mm. Sube el alto (H) — necesitas al menos ${Math.round(y3 + gap + MIN_ALTURA_CAJON_SALDO)}mm de alto de cuerpo.`
    );
  }

  const alturas = [ALTURA_CAJON_OLLERO, ALTURA_CAJON_OLLERO, altoSaldo];
  const posiciones = [y1, y2, y3];
  const piezas = [];
  const cajaInfos = [];

  alturas.forEach((alto, i) => {
    const y = posiciones[i];
    piezas.push({
      id: `s${indice + 1}_frente_cajon_${i + 1}`,
      ancho: anchoSeccion - 4, alto, espesor: p.e,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: xInicio + 2, y, z: p.P },
      rotacion: 'vertical_frontal',
      grupo: `s${indice + 1}_cajon${i + 1}`,
    });
    cajaInfos.push({ alturaFrente: alto, posicionY: y, xInicio, anchoSeccion });
  });

  return { piezas, cajaInfos };
}

// Sección estándar: puertas, cajones o mixto (igual que el mueble original,
// pero acotado al ancho de la sección en vez de todo el mueble).
function generarFrenteEstandar(p, seccion, indice) {
  const { xInicio, anchoSeccion } = seccion;
  const H = alturaCuerpo(p);
  const config = seccion.config || 'solo_cajones';
  const nP = seccion.nP || 0;
  const nC = seccion.nC || 0;
  const piezas = [];
  const cajaInfos = [];

  if (config === 'abierto') {
    // Sin puerta ni cajón: hueco abierto a la vista, con repisas opcionales
    // en toda la altura interior (igual que dentro de un hueco de puertas).
    piezas.push(...piezasRepisasZona(p, seccion, indice, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const anchoUtil = anchoSeccion - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `s${indice + 1}_puerta_${i + 1}`,
        ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: 2, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    // Además del piso, se pueden agregar repisas intermedias dentro del
    // hueco de puertas (todo el alto interior, de piso a casi el techo).
    piezas.push(...piezasRepisasZona(p, seccion, indice, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    const alturaUtil = H - (nC + 1) * 3;
    const alturaCajon = alturaUtil / nC;
    for (let i = 0; i < nC; i++) {
      const y = 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoSeccion - 4, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `s${indice + 1}_cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajon, posicionY: y, xInicio, anchoSeccion });
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
        id: `s${indice + 1}_frente_cajon_${i + 1}`,
        ancho: anchoSeccion - 4, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2, y, z: p.P },
        rotacion: 'vertical_frontal',
        grupo: `s${indice + 1}_cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajonUnidad, posicionY: y, xInicio, anchoSeccion });
      ySiguiente = y - gap;
    }

    const alturaPuertas = ySiguiente - gap;
    if (alturaPuertas < 100) {
      throw new Error(
        `Sección ${indice + 1}: con ${nCajones} cajón(es) de ${alturaCajonUnidad}mm no queda espacio para las puertas. Reduce cajones o aumenta el alto (H).`
      );
    }
    const anchoUtil = anchoSeccion - (nP + 1) * 2;
    const anchoPuerta = anchoUtil / nP;
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `s${indice + 1}_puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: xInicio + 2 + i * (anchoPuerta + 2), y: gap, z: p.P },
        rotacion: 'vertical_frontal',
      });
    }
    // Repisas intermedias dentro del hueco de puertas (debajo de los cajones).
    piezas.push(...piezasRepisasZona(p, seccion, indice, gap, ySiguiente));
  }

  return { piezas, cajaInfos };
}

// Además del piso (ya incluido en el cuerpo del mueble), agrega `seccion.repisas`
// repisas intermedias repartidas en partes iguales dentro de una zona [yInferior,
// ySuperior] de la sección — el mismo patrón que las baldas de la alacena/closet.
function piezasRepisasZona(p, seccion, indice, yInferior, ySuperior) {
  const nRepisas = seccion.repisas || 0;
  if (nRepisas <= 0) return [];

  const { xInicio, anchoSeccion } = seccion;
  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `s${indice + 1}_repisa_${i + 1}`,
      ancho: anchoSeccion - 2 * p.e - 4, alto: p.P - 40, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: xInicio + p.e + 2, y, z: 20 },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 6. Cajas de cajón (mismo patrón para toda sección con cajones) ----------
function piezasCajasSeccion(p, cajaInfos, indiceSeccion) {
  const { P, e, correderaTipo, colorInterior } = p;
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajaInfos.forEach((cajon, idx) => {
    const n = idx + 1;
    const { xInicio, anchoSeccion, alturaFrente, posicionY } = cajon;
    const altoInterior = alturaFrente - 30;
    const anchoCaja = anchoSeccion - descuentoAncho;
    const prefix = `s${indiceSeccion + 1}_cajon${n}`;

    piezas.push(
      {
        id: `${prefix}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + anchoSeccion - descuentoAncho / 2 - e, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: xInicio + descuentoAncho / 2 + e, y: posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_fondo`,
        ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
        cantos: [],
        cantidad: 1,
        material: 'HDF',
        posicion: { x: xInicio + descuentoAncho / 2 - 8, y: posicionY + 15, z: 50 - 8 },
        rotacion: 'horizontal',
        grupo: prefix,
      }
    );
  });

  return piezas;
}

// ---------- 7. Herrajes ----------
function generarHerrajes(p, { secciones, totalCajones, totalPuertas, totalRepisas }) {
  const herrajes = [];
  const H = alturaCuerpo(p);

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_balda_metalico', cantidad: totalRepisas * 4 });
  }

  if (totalPuertas > 0) {
    const bisagrasPorPuerta = H > 900 ? 3 : 2;
    herrajes.push({ tipo: 'bisagra_codo', cantidad: totalPuertas * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: totalPuertas });
  }
  if (totalCajones > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(p.P - 60)}mm`
      : `corredera_oculta_${Math.round(p.P - 60)}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  const seccionesLavavajillas = secciones.filter(s => s.tipo === 'lavavajillas').length;
  const seccionesHorno = secciones.filter(s => s.tipo === 'horno').length;
  if (seccionesLavavajillas > 0) {
    herrajes.push({ tipo: 'escuadra_fijacion_lavavajillas', cantidad: seccionesLavavajillas * 2 });
  }
  if (seccionesHorno > 0) {
    herrajes.push({ tipo: 'riel_soporte_horno', cantidad: seccionesHorno * 2 });
  }

  const patas = p.A > 900 ? 6 : 4;
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });
  herrajes.push({ tipo: 'tornillo_golfari', cantidad: 8 + (secciones.length - 1) * 4 }); // + fijación de divisores
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 12 + totalCajones * 2 });

  return herrajes;
}

// ---------- 8. Notas de producción ----------
function generarNotas(p, secciones) {
  const notas = [];
  secciones.forEach((s, i) => {
    if (s.tipo === 'lavaplatos') {
      notas.push(`Sección ${i + 1} (lavaplatos): requiere perforación en piso/respaldo para cañerías y sifón — definir medida exacta en terreno.`);
    }
    if (s.tipo === 'lavavajillas') {
      notas.push(`Sección ${i + 1} (lavavajillas): hueco libre de ${Math.round(s.anchoSeccion)}mm, sin frente propio — el equipo lleva su panel frontal.`);
    }
    if (s.tipo === 'horno') {
      notas.push(`Sección ${i + 1} (horno empotrado): hueco libre de ${Math.round(s.anchoSeccion)}mm, sin frente propio — verificar la medida exacta en la ficha técnica del horno antes de cortar.`);
    }
  });
  if (p.isla) {
    notas.push('Mueble isla: el respaldo va terminado en el color exterior (visible desde el otro lado). Revisa si los laterales también deben ir en color exterior según cómo quede instalada.');
  }
  if (p.cubierta.incluir && p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavaplatos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del pozo en la cubierta.');
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }
  return notas;
}

export { generarDespiece };
