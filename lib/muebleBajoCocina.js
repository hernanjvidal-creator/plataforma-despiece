/**
 * MOTOR DE REGLAS — Mueble Cocina (por módulos independientes)
 * -----------------------------------------------------------
 * El mueble se arma como una lista de MÓDULOS de izquierda a derecha, y
 * cada módulo es una CAJA COMPLETAMENTE INDEPENDIENTE (sus propios 2
 * laterales, piso y travesaños) — no comparten un divisor con el módulo
 * vecino. Los módulos se atornillan entre sí, lateral con lateral, para
 * formar el mueble completo. Es el modelo real de instalación de una
 * cocina (cajas separadas atornilladas entre sí en terreno), y le da mucho
 * más soporte estructural que un solo cuerpo largo con divisores internos.
 *
 * Cada módulo trae su propio `tipo`:
 *   - 'estandar'    → puertas/cajones/mixto (usa config/nP/nC del módulo).
 *                     Un módulo angosto (100-300mm) con 1 puerta sirve de
 *                     "especiero" — no es un tipo aparte, solo un módulo
 *                     estándar chico.
 *   - 'lavaplatos'   → solo puertas (sin cajones, por las cañerías), 600mm
 *                     por defecto.
 *   - 'lavavajillas'  → sin frente propio (el equipo trae el suyo), 600mm
 *                     por defecto (estándar internacional).
 *   - 'horno'         → sin frente propio, 600mm por defecto (hueco de
 *                     horno empotrado estándar 600x560x600).
 *   - 'esquinero'     → no es un módulo de verdad: es un marcador que hace
 *                     doblar la fila 90° hacia donde indique su `giro`
 *                     ('izquierda' | 'derecha'). Separa la lista de
 *                     secciones en TRAMOS (ver `dividirEnTramos`) — cada
 *                     tramo es una fila recta normal, generada en su
 *                     propio plano local y después rotada/trasladada al
 *                     plano global según cuántas esquinas la preceden (ver
 *                     `transformarPiezaHeading`). El esquinero en sí
 *                     genera 2 brazos con su propia puerta cada uno (mismo
 *                     campo `ancho`, el ancho de esas puertas) — sin panel
 *                     diagonal: el travesaño delantero de un brazo se
 *                     estira hasta el lateral lejano del otro, formando
 *                     una "T" que le da respaldo sólido a las dos puertas
 *                     en el rincón (ver `generarModuloEsquinero`). No
 *                     puede ir primero ni último en la lista: siempre
 *                     necesita un tramo antes y uno después para doblar.
 *
 * Un módulo con 2 puertas va SIN separador al medio: cada puerta hinge
 * directo contra su propio lateral del módulo (mismo criterio que ya usa
 * mueble aéreo con sus N puertas repartidas) — no hace falta divisor
 * interno para eso.
 *
 * Cada módulo, obligatoriamente, trae su propio `ancho` — no hay un "Ancho
 * total" del que repartir automáticamente (cada caja es independiente, no
 * tiene sentido repartir un ancho compartido). El ancho total del mueble es
 * solo la suma de los anchos de sus módulos.
 *
 * Alto (H): es la altura TOTAL desde el piso hasta la superficie de la
 * cubierta. Cada módulo reserva 100mm de zócalo (ahora resuelto con
 * zócalo de aluminio + patas plásticas, no con un panel de melamina) + 20mm
 * de cubierta + el espesor del piso (que ahora queda DEBAJO de los
 * laterales del módulo, no entre ellos) — ver `alturaLateralModulo`.
 *
 * Espesor de frentes: los cajones siempre van en 15mm (`e`, el mismo
 * espesor estructural). Las puertas van en 15mm por defecto también, pero
 * el cliente puede pedir 18mm (`espesorPuertas`) si prefiere un frente más
 * grueso — quedan en un grupo de material aparte para el corte.
 *
 * Sistema de coordenadas (mm), igual que el resto de los módulos:
 *   x: ancho del mueble completo (0 = borde izquierdo del primer módulo)
 *   y: altura (0 = borde inferior del piso de cada módulo)
 *   z: profundidad (0 = fondo/respaldo, +z hacia el frente)
 */

import { resumirPlanchas, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura, grapasParaRespaldos } from './shared';

const DEFAULTS = {
  H: 700,        // alto TOTAL desde el piso hasta la superficie de la cubierta
  P: 560,        // profundidad de la cubierta (la estructura queda 40mm más angosta)
  e: 15,         // espesor tablero estructural y de cajones
  espesorPuertas: 15, // espesor de las puertas — 15 (estándar) o 18 (opcional)
  correderaTipo: 'bola',  // 'bola' | 'oculta'
  isla: false,   // true = mueble independiente (isla): respaldo terminado, no HDF
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y los accesorios (lavaplatos)
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  secciones: [
    { tipo: 'estandar', ancho: 600, config: 'solo_cajones', nP: 0, nC: 3 },
  ],
  colorInterior: 'blanco',    // color estándar de cajones/bandejas/interior de cuerpo
  colorExterior: 'blanco',    // color elegido por el cliente para frentes y caras vistas
};

// Anchos estándar de mercado (mm) para módulos de electrodomésticos.
// Fuentes: lavavajillas/horno empotrado 600mm es el estándar internacional
// más común; lavaplatos 600-900mm según cubeta simple/doble.
const ANCHO_ESTANDAR_POR_TIPO = {
  lavaplatos: 600,
  lavavajillas: 600,
  horno: 600,
};

const ALTO_TRAVIESA = 100;       // alto/profundidad de los 3 travesaños de cada módulo
const RESERVA_ZOCALO = 100;      // mm reservados abajo para el zócalo de aluminio + patas
const RESERVA_CUBIERTA = 20;     // mm reservados arriba para la cubierta

// Altura de los laterales de CADA módulo: se descuenta el zócalo, la
// reserva de cubierta y el espesor del piso (que ahora va por debajo de
// los laterales, no compartiendo su misma franja de altura).
function alturaLateralModulo(p) {
  return p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA - p.e;
}

// Línea superior de los frentes (puertas/cajones): 5mm de margen extra por
// sobre la reserva de zócalo+cubierta, para que el frente no tope con la
// cubierta pero llegue bien arriba, tapando el travesaño delantero.
function lineaSuperiorFrentes(p) {
  return p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA - 5;
}

// Profundidad real de cada módulo (laterales/piso/caja de cajón). El
// "Fondo (mm)" que ingresa el cliente es la medida de la CUBIERTA, no de
// la estructura de melamina — la estructura queda 40mm más angosta (vuelo
// de la cubierta + espacio de la puerta, sin importar el espesor de puerta
// elegido).
function profundidadModulo(p) {
  return p.P - 40;
}

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  p.cubierta = { ...DEFAULTS.cubierta, ...(paramsUsuario.cubierta || {}) };
  if (!p.secciones || p.secciones.length === 0) p.secciones = DEFAULTS.secciones;
  validarParametrosGlobales(p);
  validarSecciones(p.secciones);

  const tramos = dividirEnTramos(p.secciones);
  const Pm = profundidadModulo(p);

  let piezas = [];
  let accesorios = [];
  let notas = [];
  let totalCajones = 0;
  let totalPuertas = 0;
  let totalRepisas = 0;
  let totalModulosConPatas = 0;
  let numModulos = 0;
  let anchoTotalSuma = 0; // suma de los anchos de todos los tramos + esquinas — informativo, no es una sola línea recta si hay esquinas
  const infoPorModulo = [];

  let heading = 0, origenX = 0, origenZ = 0;
  let headingTramoInicial = 0, origenXTramoInicial = 0, origenZTramoInicial = 0;
  let headingUltimoTramo = 0, origenXUltimoTramo = 0, origenZUltimoTramo = 0;
  let anchoLocalUltimoTramo = 0;

  tramos.forEach((tramo, iTramo) => {
    if (iTramo === tramos.length - 1) {
      headingUltimoTramo = heading;
      origenXUltimoTramo = origenX;
      origenZUltimoTramo = origenZ;
    }

    let xLocal = 0;
    tramo.secciones.forEach((seccion, iSeccion) => {
      const anchoModulo = seccion.ancho || ANCHO_ESTANDAR_POR_TIPO[seccion.tipo];
      const prefijo = `t${iTramo + 1}_m${iSeccion + 1}_`;
      const r = generarModulo(p, seccion, anchoModulo, iSeccion);

      const colocar = pz => transformarPiezaHeading(trasladarYPrefijar(pz, xLocal, prefijo), heading, origenX, origenZ);
      piezas.push(...r.piezas.map(colocar));

      if (seccion.tipo !== 'lavavajillas') {
        // El lavavajillas no tiene piso propio (ver piezasEstructuraModulo) —
        // no hay dónde atornillar las patas, así que este módulo no las lleva.
        accesorios.push(...piezasPatasVisuales(anchoModulo, Pm).map(colocar));
        totalModulosConPatas += 1;
      }
      if (seccion.tipo === 'lavaplatos' && p.cubierta.incluir) {
        accesorios.push(...accesorioLavaplatos(p, anchoModulo).map(colocar));
      }

      totalCajones += r.totalCajones;
      totalPuertas += r.totalPuertas;
      totalRepisas += r.totalRepisas;
      infoPorModulo.push({ tipo: seccion.tipo, anchoModulo, totalPuertas: r.totalPuertas });
      notas.push(...r.notas.map(n => `Módulo t${iTramo + 1}_m${iSeccion + 1}: ${n}`));
      numModulos += 1;

      xLocal += anchoModulo;
    });

    if (p.cubierta.incluir) {
      piezas.push(...piezasCubierta(p, xLocal).map(pz => transformarPiezaHeading(pz, heading, origenX, origenZ)));
    }

    if (iTramo === tramos.length - 1) {
      anchoLocalUltimoTramo = xLocal;
    }
    anchoTotalSuma += xLocal;

    if (tramo.esquinero) {
      const { ancho: anchoEsquinero, giro, repisas } = tramo.esquinero;
      anchoTotalSuma += 2 * anchoEsquinero; // los 2 brazos del esquinero (uno por tramo que conecta)
      const corner = generarModuloEsquinero(p, anchoEsquinero, giro, repisas || 0);
      const prefijo = `esquina${iTramo + 1}_`;
      const colocar = pz => transformarPiezaHeading(trasladarYPrefijar(pz, xLocal, prefijo), heading, origenX, origenZ);
      piezas.push(...corner.piezas.map(colocar));
      accesorios.push(...piezasPatasVisuales(anchoEsquinero, Pm).map(colocar));
      accesorios.push(...piezasPatasVisuales(Pm, anchoEsquinero)
        .map(pz => ({ ...pz, posicion: { ...pz.posicion, x: pz.posicion.x + anchoEsquinero } }))
        .map(colocar));
      totalModulosConPatas += 2;
      totalPuertas += corner.totalPuertas;
      totalRepisas += corner.totalRepisas;
      notas.push(...corner.notas.map(n => `Esquina ${iTramo + 1}: ${n}`));

      // El origen del tramo siguiente es la esquina donde termina el
      // brazo 2 del esquinero: se avanza `xLocal + anchoEsquinero + Pm` en
      // la dirección VIEJA (fin del brazo 1 + todo el fondo que ocupa el
      // brazo 2), y aparte `anchoEsquinero` en la dirección NUEVA, ya
      // girada (el ancho que ocupó el brazo 2 en esa dirección) — mismos
      // valores que arma `espejarBrazo2` puertas adentro del esquinero.
      const headingNuevo = (heading + (giro === 'izquierda' ? 3 : 1)) % 4;
      const dirVieja = DIRECCION_POR_HEADING[heading];
      const dirNueva = DIRECCION_POR_HEADING[headingNuevo];
      const avanceVieja = xLocal + anchoEsquinero + Pm;
      origenX += dirVieja.x * avanceVieja + dirNueva.x * anchoEsquinero;
      origenZ += dirVieja.z * avanceVieja + dirNueva.z * anchoEsquinero;
      heading = headingNuevo;
    }
  });

  // Tapas laterales solo en los 2 extremos REALES del mueble completo (el
  // inicio del primer tramo y el final del último) — no en cada esquina,
  // que es una unión interna, no un canto expuesto.
  const tapas = piezasTapasLaterales(p, anchoLocalUltimoTramo);
  piezas.push(transformarPiezaHeading(tapas[0], headingTramoInicial, origenXTramoInicial, origenZTramoInicial));
  piezas.push(transformarPiezaHeading(tapas[1], headingUltimoTramo, origenXUltimoTramo, origenZUltimoTramo));

  const numEsquineros = tramos.length - 1;
  const herrajes = generarHerrajes(p, {
    infoPorModulo, totalCajones, totalPuertas, totalRepisas,
    numModulos, numEsquineros, totalModulosConPatas, anchoTotal: anchoTotalSuma, piezas,
  });

  notas.push(
    `Cada módulo es una caja independiente (sus propios laterales, piso y travesaños) — se arma por separado y ` +
    `después se atornilla al módulo vecino, lateral con lateral. El zócalo es de aluminio, instalado sobre 4 patas ` +
    `plásticas por módulo (no incluye panel de zócalo en melamina).`
  );
  if (p.cubierta.incluir && p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavaplatos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del pozo en la cubierta.');
  }
  if (p.espesorPuertas !== p.e) {
    notas.push(`Puertas en ${p.espesorPuertas}mm (más gruesas que el resto del cuerpo, en ${p.e}mm) — quedan en un grupo de material aparte para el corte.`);
  }

  return {
    modulo: 'bajo_cocina',
    parametros: { ...p, A: anchoTotalSuma },
    piezas,
    accesorios,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

function trasladarYPrefijar(pieza, xOffset, prefijo) {
  return {
    ...pieza,
    id: `${prefijo}${pieza.id}`,
    grupo: pieza.grupo ? `${prefijo}${pieza.grupo}` : pieza.grupo,
    posicion: { ...pieza.posicion, x: pieza.posicion.x + xOffset },
  };
}

// ---------- Validación básica ----------
function validarParametrosGlobales(p) {
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 50 || p.P > 3000) throw new Error('Profundidad (P) fuera de rango 50-3000mm');
  if (p.H <= RESERVA_ZOCALO + RESERVA_CUBIERTA) {
    throw new Error(`El alto (H) debe ser mayor que ${RESERVA_ZOCALO + RESERVA_CUBIERTA}mm (zócalo + reserva de cubierta) — sube el alto total.`);
  }
  if (!Array.isArray(p.secciones) || p.secciones.length < 1) {
    throw new Error('El mueble debe tener al menos 1 módulo');
  }
  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

function validarSecciones(secciones) {
  const tiposValidos = ['estandar', 'lavaplatos', 'lavavajillas', 'horno', 'esquinero'];
  secciones.forEach((s, i) => {
    if (!tiposValidos.includes(s.tipo)) throw new Error(`Tipo de módulo desconocido: "${s.tipo}"`);
    const ancho = s.ancho || ANCHO_ESTANDAR_POR_TIPO[s.tipo];
    if (!ancho) {
      throw new Error(`Módulo ${i + 1}: cada módulo debe traer su propio ancho.`);
    }
    if (ancho < 100) {
      throw new Error(`Módulo ${i + 1}: ancho de ${Math.round(ancho)}mm demasiado angosto — mínimo 100mm.`);
    }
    if (s.tipo === 'estandar') {
      const nP = s.nP || 0, nC = s.nC || 0;
      const config = s.config || 'solo_cajones';
      if (config !== 'abierto' && nP === 0 && nC === 0) {
        throw new Error(`Módulo ${i + 1}: debe tener al menos 1 puerta o 1 cajón (o usar la configuración "abierto")`);
      }
      if (config === 'solo_cajones' && nP > 0) throw new Error(`Módulo ${i + 1}: config solo_cajones no admite puertas`);
      if (config === 'solo_puertas' && nC > 0) throw new Error(`Módulo ${i + 1}: config solo_puertas no admite cajones`);
      if ((s.repisas || 0) < 0) throw new Error(`Módulo ${i + 1}: la cantidad de repisas no puede ser negativa`);
      if ((s.repisas || 0) > 0 && config === 'solo_cajones') {
        throw new Error(`Módulo ${i + 1}: config solo_cajones no tiene hueco de puertas: las repisas no aplican`);
      }
    }
    if (s.tipo === 'esquinero') {
      if (!['izquierda', 'derecha'].includes(s.giro)) {
        throw new Error(`Módulo ${i + 1}: cada esquina debe indicar hacia dónde gira: "izquierda" o "derecha".`);
      }
      if ((s.repisas || 0) < 0) throw new Error(`Módulo ${i + 1}: la cantidad de repisas no puede ser negativa`);
    }
  });
}

// ---------- Tramos: separar la fila en tramos rectos, partidos por cada
// 'esquinero' ----------
// Un esquinero no es un módulo de verdad: es el punto donde la fila dobla
// 90°. No puede ir primero ni último — siempre necesita un tramo antes
// (de dónde viene) y uno después (hacia dónde sigue, ya doblado).
function dividirEnTramos(secciones) {
  const tramos = [];
  let actual = [];
  secciones.forEach((s, i) => {
    if (s.tipo === 'esquinero') {
      if (actual.length === 0) {
        throw new Error(`Módulo ${i + 1}: una esquina no puede ir de primera — debe haber al menos un módulo antes de doblar.`);
      }
      tramos.push({ secciones: actual, esquinero: s });
      actual = [];
    } else {
      actual.push(s);
    }
  });
  if (actual.length === 0) {
    throw new Error('Una esquina no puede ir de última: debe haber al menos un módulo después de doblar.');
  }
  tramos.push({ secciones: actual, esquinero: null });
  return tramos;
}

// ---------- Rotación por múltiplos de 90° (heading 0-3 = 0°/90°/180°/270°) ----------
// Como los giros siempre son de 90°, no hace falta trigonometría: alcanza
// con permutar/negar los ejes X/Z. heading=0 es una simple traslación
// (mismo comportamiento que un mueble recto de toda la vida).
const DIRECCION_POR_HEADING = [
  { x: 1, z: 0 },
  { x: 0, z: 1 },
  { x: -1, z: 0 },
  { x: 0, z: -1 },
];

function proyectarGlobal(lx, lz, heading, origenX, origenZ) {
  switch (heading) {
    case 1: return { x: origenX - lz, z: origenZ + lx };
    case 2: return { x: origenX - lx, z: origenZ - lz };
    case 3: return { x: origenX + lz, z: origenZ - lx };
    default: return { x: origenX + lx, z: origenZ + lz };
  }
}

// Rota (heading) + traslada (origenX, origenZ) una pieza generada en
// coordenadas LOCALES (como si su tramo fuera un mueble recto que arranca
// en el origen) al plano GLOBAL del mueble completo. La altura (Y) nunca
// cambia — el giro es siempre alrededor del eje vertical.
function transformarPiezaHeading(pieza, heading, origenX, origenZ) {
  if (heading === 0) {
    const { x, y, z } = pieza.posicion;
    return { ...pieza, posicion: { x: x + origenX, y, z: z + origenZ } };
  }

  const { x: px, y: py, z: pz } = pieza.posicion;
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

// ---------- Un módulo completo (caja independiente) ----------
// Genera TODAS las piezas de un módulo en coordenadas LOCALES a él mismo
// (x: 0 a anchoModulo) — el llamador (generarDespiece) las traslada al
// punto que corresponda dentro del mueble completo.
function generarModulo(p, seccion, anchoModulo, indice) {
  const piezas = [...piezasEstructuraModulo(p, anchoModulo, seccion.tipo)];
  const notas = [];

  let frentes = { piezas: [], cajaInfos: [] };
  if (seccion.tipo === 'lavavajillas' || seccion.tipo === 'horno') {
    // sin frente propio: lo trae el electrodoméstico
    notas.push(
      seccion.tipo === 'lavavajillas'
        ? `Hueco libre de ${Math.round(anchoModulo)}mm, sin frente propio — el equipo lleva su panel frontal.`
        : `Hueco libre de ${Math.round(anchoModulo)}mm, sin frente propio — verificar la medida exacta en la ficha técnica del horno antes de cortar.`
    );
  } else if (seccion.tipo === 'lavaplatos') {
    frentes = generarPuertasLavaplatos(p, anchoModulo);
    notas.push('Requiere perforación en piso/respaldo para cañerías y sifón — definir medida exacta en terreno.');
  } else {
    frentes = generarFrenteEstandar(p, seccion, anchoModulo);
  }
  piezas.push(...frentes.piezas);

  if (frentes.cajaInfos.length > 0) {
    piezas.push(...piezasCajasModulo(p, frentes.cajaInfos, anchoModulo));
  }

  const totalPuertas = frentes.piezas.filter(pz => pz.id.includes('_puerta_')).length;
  const totalRepisas = frentes.piezas.filter(pz => pz.id.includes('_repisa_')).length;

  return { piezas, notas, totalCajones: frentes.cajaInfos.length, totalPuertas, totalRepisas };
}

// Espeja una pieza LOCAL del brazo 2 de un esquinero alrededor del punto
// donde termina el brazo 1 (x: anchoModulo) — el ancho local del brazo 2
// (su eje X) pasa a ser Z (hacia 'derecha': +Z; hacia 'izquierda': -Z), y
// su profundidad (eje Z) pasa a ser X, sumando `anchoModulo`. A diferencia
// de `transformarPiezaHeading` (rotación pura), esto es un espejo: los dos
// brazos crecen en perpendicular DESDE el mismo rincón, no uno detrás del
// otro en una fila que sigue doblada.
function espejarBrazo2(pieza, anchoModulo, giro) {
  const { x: px, y: py, z: pz } = pieza.posicion;
  let ex = 0, ez = 0;
  if (pieza.rotacion === 'horizontal') { ex = pieza.ancho; ez = pieza.alto; }
  else if (pieza.rotacion === 'vertical_frontal') { ex = pieza.ancho; ez = 0; }
  else { ex = 0; ez = pieza.ancho; } // vertical_profundidad

  const signoZ = giro === 'izquierda' ? -1 : 1;
  const proyectar = (lx, lz) => ({ x: lz + anchoModulo, z: signoZ * lx });
  const c1 = proyectar(px, pz);
  const c2 = proyectar(px + ex, pz + ez);
  const gx = Math.min(c1.x, c2.x);
  const gz = Math.min(c1.z, c2.z);

  let nuevaRotacion = pieza.rotacion;
  let nuevoAncho = pieza.ancho;
  let nuevoAlto = pieza.alto;
  if (pieza.rotacion === 'horizontal') { nuevoAncho = pieza.alto; nuevoAlto = pieza.ancho; }
  else if (pieza.rotacion === 'vertical_frontal') { nuevaRotacion = 'vertical_profundidad'; }
  else { nuevaRotacion = 'vertical_frontal'; }

  return { ...pieza, ancho: nuevoAncho, alto: nuevoAlto, rotacion: nuevaRotacion, posicion: { x: gx, y: py, z: gz } };
}

// ---------- Esquinero: dos brazos perpendiculares ----------
// Sin panel diagonal (complica el corte): un travesaño nuevo, recto, une
// el lateral interior del brazo 1 con el lateral lejano del brazo 2,
// formando una "T" que le da respaldo sólido a las dos puertas en el
// rincón — cada brazo mantiene su propia estructura estándar sin
// modificar. Los dos brazos son cajas estándar de 1 puerta (mismo ancho,
// el que ingresa el cliente), con travesaños DE CANTO (igual que
// lavaplatos/horno) porque necesitan dejar el hueco superior libre para
// que la "T" pase por encima sin chocar.
//
// El brazo 2 se arma en su propio plano local (como si el esquinero mismo
// fuera un mueble recto) y se coloca con `espejarBrazo2`: a diferencia de
// `transformarPiezaHeading` (una rotación pura, para cuando un tramo
// ENTERO sigue doblado en una nueva dirección), acá los dos brazos crecen
// en perpendicular DESDE el mismo rincón — es un espejo, no una rotación
// (girar en vez de espejar los dejaría superpuestos).
//
// Si se piden repisas, cada brazo las genera con su misma lógica estándar
// (vía `generarFrenteEstandar` → `piezasRepisasModulo`) — la del brazo 2
// suele quedar más corta que la del brazo 1 (su alcance en Z viene de
// `anchoModulo`, no de la profundidad `Pm`, salvo que el cliente ponga un
// ancho de puerta mayor a la profundidad del mueble) — se agrega un
// travesaño de soporte por debajo de la repisa más corta, de costado a
// costado, que por su ubicación cerca del rincón también queda apoyando
// la repisa del otro brazo.
function generarModuloEsquinero(p, anchoModulo, giro, nRepisas = 0) {
  const { e, colorExterior } = p;
  const H = alturaLateralModulo(p);
  const Pm = profundidadModulo(p);
  const seccionFrente = { config: 'solo_puertas', nP: 1, repisas: nRepisas };

  const piezasA = piezasEstructuraModulo(p, anchoModulo, 'lavaplatos');
  const frentesA = generarFrenteEstandar(p, seccionFrente, anchoModulo);

  const piezasBLocal = piezasEstructuraModulo(p, anchoModulo, 'lavaplatos');
  const frentesBLocal = generarFrenteEstandar(p, seccionFrente, anchoModulo);
  const piezasB = [...piezasBLocal, ...frentesBLocal.piezas]
    .map(pz => espejarBrazo2(pz, anchoModulo, giro));

  // El lateral lejano del brazo 2, ya espejado, queda en z:[anchoModulo-e,
  // anchoModulo] ('derecha') o z:[e-anchoModulo, 2e-anchoModulo]
  // ('izquierda') — el travesaño en T se pone a esa misma Z para topar
  // justo contra él, y arranca en el lateral interior del brazo 1
  // (x: anchoModulo-e) para cruzar también por encima de ese lateral. La
  // X no cambia con el giro (solo la Z se espeja).
  const travesanoT = {
    id: 'travesano_esquina_t',
    ancho: Pm + e, alto: ALTO_TRAVIESA, espesor: e,
    cantos: [],
    cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: {
      x: anchoModulo - e,
      y: e + H - ALTO_TRAVIESA,
      z: giro === 'izquierda' ? e - anchoModulo : anchoModulo - e,
    },
    rotacion: 'vertical_frontal',
  };

  const repisasA = frentesA.piezas.filter(pz => pz.id.startsWith('repisa_'));
  const repisasB = piezasB.filter(pz => pz.id.startsWith('repisa_'));
  const soportesRepisa = piezasSoporteRepisasEsquinero(repisasA, repisasB, e, colorExterior);

  // "brazo1_"/"brazo2_" (con número, no letra) porque el visor 3D ya trae
  // soporte para brazos rotados con ese patrón exacto (ver ejesDePieza y
  // signoHaciaAfuera en Visor3D.jsx) — quedó de un esquinero anterior.
  const piezas = [
    ...piezasA.map(pz => ({ ...pz, id: `brazo1_${pz.id}` })),
    ...frentesA.piezas.map(pz => ({ ...pz, id: `brazo1_${pz.id}` })),
    ...piezasB.map(pz => ({ ...pz, id: `brazo2_${pz.id}` })),
    travesanoT,
    ...soportesRepisa,
  ];

  const totalPuertas = 2;
  const totalRepisas = repisasA.length + repisasB.length;

  const notas = [
    `Esquinero: dos brazos de ${Math.round(anchoModulo)}mm, cada uno con su puerta — usan bisagra de 165° ` +
    'para poder abrir sin chocar entre sí.' +
    (totalRepisas > 0 ? ' Las repisas llevan un travesaño de soporte por abajo, en el rincón.' : ''),
  ];

  return { piezas, notas, totalCajones: 0, totalPuertas, totalRepisas };
}

// Travesaño de soporte para las repisas del esquinero: va por debajo de la
// repisa más corta (su alcance real, ya con el giro aplicado — no siempre
// es la del brazo 2), de costado a costado de esa repisa, centrado en su
// profundidad — y por quedar tan cerca del rincón compartido, también
// apoya la repisa del otro brazo.
function piezasSoporteRepisasEsquinero(repisasA, repisasB, e, colorExterior) {
  const piezas = [];
  for (let i = 0; i < repisasA.length; i++) {
    const rA = repisasA[i];
    const rB = repisasB[i];
    if (!rA || !rB) continue;
    const corta = rA.alto <= rB.alto ? rA : rB;
    const zMedio = corta.posicion.z + corta.alto / 2;
    // De costado a costado de la repisa más corta, pero estirado hasta
    // cubrir también el ancho de la más larga (unión de los dos rangos en
    // X) — a la altura Z de la más corta igual queda dentro del rango de
    // la más larga (son perpendiculares, comparten el rincón), así que
    // apoya a las dos.
    const x0 = Math.min(rA.posicion.x, rB.posicion.x);
    const x1 = Math.max(rA.posicion.x + rA.ancho, rB.posicion.x + rB.ancho);
    piezas.push({
      id: `travesano_soporte_repisa_${i + 1}`,
      ancho: x1 - x0, alto: e, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: x0, y: corta.posicion.y - e, z: zMedio - e / 2 },
      rotacion: 'vertical_frontal',
    });
  }
  return piezas;
}

// ---------- 1. Estructura de un módulo ----------
// El piso queda por DEBAJO de los laterales (ancho completo del módulo);
// los laterales se apoyan encima. Van en color interior: quedan tapados
// contra el módulo vecino (o, en los 2 extremos del mueble, los cubre la
// tapa lateral — ver piezasTapasLaterales).
function piezasEstructuraModulo(p, anchoModulo, tipo) {
  const { e, isla, colorInterior, colorExterior } = p;
  const H = alturaLateralModulo(p);
  const Pm = profundidadModulo(p);

  const piezas = [
    {
      id: 'lateral_izq',
      ancho: Pm, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: e, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'lateral_der',
      ancho: Pm, alto: H, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: anchoModulo - e, y: e, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];

  // El lavavajillas se instala directo sobre el piso real de la cocina
  // (no sobre un piso de melamina) — se deja el hueco libre hasta abajo.
  // Cómo queda sujeto el módulo sin piso propio todavía está por resolver
  // (por eso este tipo de módulo, por ahora, no está disponible para el
  // público general — ver esAdmin en Configurador.jsx).
  if (tipo !== 'lavavajillas') {
    piezas.push({
      id: 'piso',
      ancho: anchoModulo, alto: Pm, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'horizontal',
    });
  }

  if (tipo === 'lavaplatos' || tipo === 'horno') {
    // El lavaplatos (cubeta + grifería) y el horno empotrado (panel de
    // control) necesitan el hueco superior libre para poder entrar — un
    // travesaño acostado (100mm de profundidad tapando la parte de
    // arriba) estorbaría. Se dejan de canto (parados), igual que en
    // mueble aéreo: ocupan solo su espesor (15mm) de profundidad en vez
    // de 100mm, mismo aporte de rigidez arriba.
    piezas.push(
      {
        id: 'travesano_delantero',
        ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorExterior, cara: 'exterior',
        posicion: { x: e, y: e + H - ALTO_TRAVIESA, z: Pm - e },
        rotacion: 'vertical_frontal',
      },
      {
        id: 'travesano_trasero',
        ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e, y: e + H - ALTO_TRAVIESA, z: 0 },
        rotacion: 'vertical_frontal',
      },
    );
  } else {
    piezas.push(
      {
        // Acostado — apoya contra el borde delantero de los laterales,
        // justo debajo de la cubierta. Va en melamina de color porque
        // queda a la vista al abrir un cajón.
        id: 'travesano_delantero',
        ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
        cantos: ['delantero'],
        cantidad: 1,
        color: colorExterior, cara: 'exterior',
        posicion: { x: e, y: H, z: Pm - ALTO_TRAVIESA },
        rotacion: 'horizontal',
      },
      {
        id: 'travesano_trasero',
        ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e, y: H, z: 0 },
        rotacion: 'horizontal',
      },
    );
  }

  // En isla el respaldo (ver piezasRespaldoModulo) hace de refuerzo trasero
  // por sí solo — no hace falta el travesaño trasero inferior.
  if (!isla) {
    piezas.push({
      id: 'travesano_trasero_inferior',
      ancho: anchoModulo - 2 * e, alto: ALTO_TRAVIESA, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    });
  }

  piezas.push(...piezasRespaldoModulo(p, anchoModulo));

  return piezas;
}

// ---------- 2. Respaldo de un módulo ----------
function piezasRespaldoModulo(p, anchoModulo) {
  const { e, isla, colorExterior } = p;
  const H = alturaLateralModulo(p);
  if (isla) {
    return [{
      id: 'respaldo',
      ancho: anchoModulo - 2 * e, alto: H, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: e, y: e, z: 0 },
      rotacion: 'vertical_frontal',
    }];
  }
  // Sobresale por los 4 lados para cubrir el canto trasero del módulo (no va
  // en una ranura real) — antes 8mm por lado, ahora 6mm por lado.
  return [{
    id: 'respaldo',
    ancho: anchoModulo - 2 * e + 12, alto: H - 2 * e + 12, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'MDF',
    color: 'blanco',
    posicion: { x: e - 6, y: e + e - 6, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

// ---------- 3. Tapas laterales (una sola vez, en los 2 extremos del mueble) ----------
// Paneles cosméticos del mismo color que las puertas — tapan el canto del
// lateral (oculto, color interior) del primer y último módulo, más el
// canto del piso (bajan más que los laterales del módulo) y el canto de
// las puertas (vuelan más profundo que los laterales del módulo).
function piezasTapasLaterales(p, anchoTotal) {
  const { e, espesorPuertas, colorExterior } = p;
  // Baja hasta el piso real (con solo 2mm de holgura): además del tramo
  // que tapa el canto del lateral del módulo (H - zócalo - cubierta), se
  // extiende 98mm más hacia abajo para cubrir también la franja del
  // zócalo/patas — el borde superior no se mueve, solo crece hacia abajo.
  const alto = p.H - RESERVA_ZOCALO - RESERVA_CUBIERTA + 98;
  const yInferior = -98;
  const profundidad = profundidadModulo(p) + espesorPuertas;

  return [
    {
      id: 'tapa_lateral_izq',
      ancho: profundidad, alto, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: -e, y: yInferior, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'tapa_lateral_der',
      ancho: profundidad, alto, espesor: e,
      cantos: ['todos'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: anchoTotal, y: yInferior, z: 0 },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3c. Patas plásticas (referencia visual en el 3D) ----------
// No son una pieza de melamina — no entran en el nesting ni en el resumen
// de material. Representan dónde van las 4 patas regulables de cada módulo
// (ya contadas en el herraje `pata_plastica_regulable`), para que se vea
// claramente su ubicación en el plano 3D. Ocupan la franja reservada del
// zócalo (RESERVA_ZOCALO), desde el piso real hasta el canto de abajo del
// piso del módulo.
const ALTO_PATA_VISUAL = RESERVA_ZOCALO;
const SECCION_PATA_VISUAL = 30;

function piezasPatasVisuales(anchoModulo, profundidad) {
  const insetX = Math.min(40, anchoModulo / 4);
  const insetZ = Math.min(40, profundidad / 4);
  const xs = [insetX, anchoModulo - insetX];
  const zs = [insetZ, profundidad - insetZ];
  const piezas = [];
  let n = 0;
  xs.forEach(x => {
    zs.forEach(z => {
      n++;
      piezas.push({
        id: `pata_${n}`,
        descripcion: 'Pata plástica regulable (referencia visual — ver herraje pata_plastica_regulable)',
        soloVisual: true,
        ancho: SECCION_PATA_VISUAL, alto: ALTO_PATA_VISUAL, espesor: SECCION_PATA_VISUAL,
        material: 'plastico',
        posicion: { x: x - SECCION_PATA_VISUAL / 2, y: -ALTO_PATA_VISUAL, z: z - SECCION_PATA_VISUAL / 2 },
        rotacion: 'vertical_frontal',
      });
    });
  });
  return piezas;
}

// ---------- 3b. Cubierta (superficie), una sola vez para todo el mueble ----------
const OVERHANG_LADOS_CUBIERTA = 25;

function piezasCubierta(p, anchoTotal) {
  const H = p.H - RESERVA_CUBIERTA;
  const { material, espesor } = p.cubierta;

  const pieza = {
    id: 'cubierta',
    ancho: anchoTotal + 2 * OVERHANG_LADOS_CUBIERTA, alto: p.P, espesor,
    cantos: ['todos'],
    cantidad: 1,
    posicion: { x: -OVERHANG_LADOS_CUBIERTA, y: H, z: 0 },
    rotacion: 'horizontal',
  };

  if (material === 'melamina') {
    pieza.color = p.colorExterior;
    pieza.cara = 'exterior';
  } else {
    pieza.material = material;
  }

  return [pieza];
}

// ---------- 4. Frentes de un módulo (puertas/cajones/mixto/abierto) ----------
// Reparte n frentes iguales en el ancho del módulo, con 2mm de holgura
// entre ellos si hay más de uno. Sin holgura de divisor: cada módulo es su
// propia caja, sus frentes se reparten en todo su ancho tal cual.
function repartirFrentesModulo(anchoModulo, n) {
  const anchoDisponible = anchoModulo - (n - 1) * 2;
  const anchoFrente = anchoDisponible / n;
  const posiciones = [];
  let x = 0;
  for (let i = 0; i < n; i++) {
    posiciones.push(x);
    x += anchoFrente + 2;
  }
  return { anchoFrente, posiciones };
}

function generarPuertasLavaplatos(p, anchoModulo) {
  const nP = anchoModulo > 500 ? 2 : 1;
  const { anchoFrente, posiciones } = repartirFrentesModulo(anchoModulo, nP);
  const alto = lineaSuperiorFrentes(p);
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `puerta_${i + 1}`,
      ancho: anchoFrente, alto, espesor: p.espesorPuertas,
      cantos: ['todos'],
      cantidad: 1,
      color: p.colorExterior, cara: 'exterior',
      posicion: { x: posiciones[i], y: 2, z: profundidadModulo(p) },
      rotacion: 'vertical_frontal',
    });
  }
  return { piezas, cajaInfos: [] };
}

// Accesorio lavaplatos: caja aproximada del pozo (o los dos pozos), embutida
// en la cubierta, en el centro del módulo. No es una pieza de melamina —
// no entra en el nesting ni en el resumen de material.
// Posición en coordenadas LOCALES al módulo (x: 0 a anchoModulo) — el
// llamador la traslada/rota igual que cualquier otra pieza del módulo.
function accesorioLavaplatos(p, anchoModulo) {
  const H = p.H - RESERVA_CUBIERTA;
  const dosPozos = anchoModulo > 700;
  const anchoCubeta = Math.min(anchoModulo - 100, dosPozos ? 780 : 450);
  const profundidadCubeta = 400;
  const alturaCubeta = 180;
  const espesorCubierta = p.cubierta.espesor;

  return [{
    id: 'lavaplatos',
    descripcion: dosPozos ? 'Lavaplatos doble pozo (acero inoxidable)' : 'Lavaplatos un pozo (acero inoxidable)',
    ancho: anchoCubeta, alto: profundidadCubeta, espesor: alturaCubeta,
    posicion: {
      x: (anchoModulo - anchoCubeta) / 2,
      y: H + espesorCubierta - alturaCubeta,
      z: (p.P - profundidadCubeta) / 2,
    },
    rotacion: 'horizontal',
    color: 'acero_inoxidable',
  }];
}

// Módulo estándar: puertas, cajones o mixto, repartidos en todo su ancho
// (sin separador interno, aunque tenga 2 puertas — cada una hinge contra
// su propio lateral del módulo).
function generarFrenteEstandar(p, seccion, anchoModulo) {
  const H = lineaSuperiorFrentes(p);
  const config = seccion.config || 'solo_cajones';
  const nP = seccion.nP || 0;
  const nC = seccion.nC || 0;
  const piezas = [];
  const cajaInfos = [];

  if (config === 'abierto') {
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, p.e, H - p.e));
  }

  if (config === 'solo_puertas') {
    const { anchoFrente, posiciones } = repartirFrentesModulo(anchoModulo, nP);
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoFrente, alto: H, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: posiciones[i], y: 2, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, p.e, H - p.e));
  }

  if (config === 'solo_cajones') {
    // El cajón de más abajo tiene que apoyarse sobre el piso (que ocupa
    // y=0 a y=p.e), no sobre el borde exterior del módulo — antes el "3"
    // se medía desde y=0 y el cajón de abajo quedaba incrustado en el piso.
    const alturaUtil = H - p.e - nC * 3;
    const alturaCajon = alturaUtil / nC;
    const { anchoFrente } = repartirFrentesModulo(anchoModulo, 1);
    for (let i = 0; i < nC; i++) {
      const y = p.e + 3 + i * (alturaCajon + 3);
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoFrente, alto: alturaCajon, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
        grupo: `cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajon, posicionY: y, anchoModulo });
    }
  }

  if (config === 'mixto') {
    const alturaCajonUnidad = 150;
    const gap = 3;
    const nCajones = Math.max(1, nC);
    const { anchoFrente: anchoCajonFrente } = repartirFrentesModulo(anchoModulo, 1);
    let ySiguiente = H;
    for (let i = 0; i < nCajones; i++) {
      const y = ySiguiente - alturaCajonUnidad;
      piezas.push({
        id: `frente_cajon_${i + 1}`,
        ancho: anchoCajonFrente, alto: alturaCajonUnidad, espesor: p.e,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: 0, y, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
        grupo: `cajon${i + 1}`,
      });
      cajaInfos.push({ alturaFrente: alturaCajonUnidad, posicionY: y, anchoModulo });
      ySiguiente = y - gap;
    }

    const alturaPuertas = ySiguiente - gap;
    if (alturaPuertas < 100) {
      throw new Error(
        `Con ${nCajones} cajón(es) de ${alturaCajonUnidad}mm no queda espacio para las puertas. Reduce cajones o aumenta el alto (H).`
      );
    }
    const { anchoFrente: anchoPuerta, posiciones: posicionesPuertas } = repartirFrentesModulo(anchoModulo, nP);
    for (let i = 0; i < nP; i++) {
      piezas.push({
        id: `puerta_${i + 1}`,
        ancho: anchoPuerta, alto: alturaPuertas, espesor: p.espesorPuertas,
        cantos: ['todos'],
        cantidad: 1,
        color: p.colorExterior, cara: 'exterior',
        posicion: { x: posicionesPuertas[i], y: gap, z: profundidadModulo(p) },
        rotacion: 'vertical_frontal',
      });
    }
    piezas.push(...piezasRepisasModulo(p, seccion, anchoModulo, gap, ySiguiente));
  }

  return { piezas, cajaInfos };
}

// Repisas intermedias dentro del hueco de puertas — recesadas "e" desde el
// fondo para no chocar con el travesaño trasero (mismo criterio de siempre).
function piezasRepisasModulo(p, seccion, anchoModulo, yInferior, ySuperior) {
  const nRepisas = seccion.repisas || 0;
  if (nRepisas <= 0) return [];

  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      // -2*e: faltaba descontar el espesor de los dos laterales — quedaba
      // incrustada 13mm dentro de cada uno en vez de calzar entre ellos
      // (mismo criterio ya usado en despensa.js/closet.js: ancho - 2*e - 2,
      // x = e + 1 — 1mm de holgura por lado).
      id: `repisa_${i + 1}`,
      ancho: anchoModulo - 2 * p.e - 2, alto: profundidadModulo(p) - 20 - p.e, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: p.e + 1, y, z: p.e },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Cajas de cajón de un módulo ----------
function piezasCajasModulo(p, cajaInfos, anchoModulo) {
  const { e, correderaTipo, colorInterior } = p;
  const P = profundidadModulo(p);
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajaInfos.forEach((cajon, idx) => {
    const n = idx + 1;
    const { alturaFrente, posicionY } = cajon;
    // El costado de la caja no puede pasar por encima del travesaño
    // delantero: se recorta la altura interior en vez de invadir su lugar.
    const H = alturaLateralModulo(p);
    const altoInterior = Math.min(alturaFrente - 30, H - posicionY);
    if (altoInterior < 60) {
      throw new Error(
        `El cajón de más arriba queda demasiado bajo (${Math.round(altoInterior)}mm de alto interior) por la cercanía al travesaño delantero. Reduce la cantidad de cajones o aumenta el alto (H).`
      );
    }
    // -2*e: el frente/trasera/fondo de la caja van ENTRE los dos costados,
    // no incluyen su espesor (mismo criterio que vanitorioBano.js/velador.js
    // — acá faltaba y la pieza quedaba 2*e más ancha de lo que cabía).
    const anchoCaja = anchoModulo - descuentoAncho - 2 * e;
    const prefix = `cajon${n}`;

    piezas.push(
      {
        id: `${prefix}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: anchoModulo - descuentoAncho / 2 - e, y: posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: prefix,
      },
      {
        id: `${prefix}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: prefix,
      },
      {
        id: `${prefix}_fondo`,
        ancho: anchoCaja, alto: P - 50, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: descuentoAncho / 2 + e, y: posicionY, z: 50 },
        rotacion: 'horizontal',
        grupo: prefix,
      }
    );
  });

  return piezas;
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p, { infoPorModulo, totalCajones, totalPuertas, totalRepisas, numModulos, numEsquineros, totalModulosConPatas, anchoTotal, piezas }) {
  const herrajes = [];
  const H = alturaLateralModulo(p);

  // El respaldo estructural del modo isla es melamina gruesa, va atornillado
  // (ver piezasRespaldoModulo) — solo el respaldo delgado de MDF (modo
  // normal) necesita grapas; grapasParaRespaldos ya filtra por eso solo.
  const grapasRespaldo = grapasParaRespaldos(piezas);
  if (grapasRespaldo > 0) {
    herrajes.push({ tipo: 'grapa_carpintero_6mm', cantidad: grapasRespaldo });
  }

  if (totalRepisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_duplo / escuadra_triangular_soporte_repisa', cantidad: totalRepisas * 4 });
  }

  if (totalPuertas > 0) {
    const bisagrasPorPuerta = bisagrasPorAltura(H);
    // Las puertas del esquinero necesitan bisagra de 165° para poder abrir
    // sin chocar entre sí en el rincón — el resto usa la bisagra normal.
    // Cada esquina tiene siempre 2 puertas (una por brazo).
    const totalPuertasEsquinero = numEsquineros * 2;
    const totalPuertasNormales = totalPuertas - totalPuertasEsquinero;
    if (totalPuertasNormales > 0) {
      herrajes.push({ tipo: 'bisagra_codo_35mm', cantidad: totalPuertasNormales * bisagrasPorPuerta });
    }
    if (totalPuertasEsquinero > 0) {
      herrajes.push({ tipo: 'bisagra_165_grados', cantidad: totalPuertasEsquinero * bisagrasPorPuerta });
    }
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: totalPuertas });
  }
  if (totalCajones > 0) {
    const largoCorredera = largoCorrederaComercial(profundidadModulo(p) - 60);
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${largoCorredera}mm`
      : `corredera_oculta_${largoCorredera}mm`;
    herrajes.push({ tipo: correderaId, cantidad: totalCajones, unidad: 'par' });
    herrajes.push({ tipo: 'manilla_cajon_negra_moderna', cantidad: totalCajones });
  }

  const modulosLavavajillas = infoPorModulo.filter(m => m.tipo === 'lavavajillas').length;
  const modulosHorno = infoPorModulo.filter(m => m.tipo === 'horno').length;
  if (modulosLavavajillas > 0) {
    herrajes.push({ tipo: 'escuadra_fijacion_lavavajillas', cantidad: modulosLavavajillas * 2 });
  }
  if (modulosHorno > 0) {
    herrajes.push({ tipo: 'riel_soporte_horno', cantidad: modulosHorno * 2 });
  }

  // Zócalo de aluminio (a lo largo de todo el frente del mueble) + patas
  // plásticas regulables, 4 por módulo — reemplaza al zócalo de melamina.
  herrajes.push({ tipo: 'zocalo_aluminio_ml', cantidad: Math.ceil(anchoTotal / 1000), unidad: 'm' });
  herrajes.push({ tipo: 'pata_plastica_regulable', cantidad: totalModulosConPatas * 4 });

  // Por cada módulo: 2 laterales x (2 tornillos a piso + 2 a cada uno de
  // los 3 travesaños) = 2 + 2*3 = 8 puntos de fijación por lateral... en la
  // práctica cada módulo lleva 8 tornillos estructurales base (repartidos
  // entre piso y travesaños) + 2 por cajón (caja). El esquinero son 2 cajas
  // (brazo 1 + brazo 2), así que cuenta doble.
  const tornillosPorModulo = 8;
  herrajes.push({
    tipo: 'tornillo_confirmat / tornillo_1_5/8',
    cantidad: (numModulos + numEsquineros) * tornillosPorModulo + totalCajones * 2,
  });

  // Uniones lateral con lateral (módulo con módulo vecino, y cada tapa
  // lateral con el lateral del módulo del extremo): son 2 tableros
  // delgados (15/18mm) cara contra canto, así que van con un tornillo más
  // corto que el confirmat/1-5/8 — 30mm, 6 por junta (3 alturas x 2, para
  // repartir bien la carga a lo alto).
  const TORNILLOS_POR_JUNTA_LATERAL = 6;
  // Solo cuentan las juntas DENTRO de cada tramo (módulo con módulo vecino
  // del mismo tramo recto) — entre tramos distintos no hay junta lateral
  // directa, ahí va la esquina (ya sumada aparte, más abajo).
  const juntasEntreModulos = Math.max(0, numModulos - numEsquineros - 1);
  const juntasTapasLaterales = 2; // tapa_lateral_izq + tapa_lateral_der
  // Cada esquinero suma 1 junta más: el travesaño delantero en T del brazo
  // A contra el lateral lejano del brazo B (ver generarModuloEsquinero).
  herrajes.push({
    tipo: 'tornillo_30mm',
    cantidad: (juntasEntreModulos + juntasTapasLaterales + numEsquineros) * TORNILLOS_POR_JUNTA_LATERAL,
  });

  const tornillosMontaje = tornillosMontajeHerrajes(herrajes);
  if (tornillosMontaje > 0) {
    herrajes.push({ tipo: 'tornillo_aglomerado_3_5x15', cantidad: tornillosMontaje });
  }

  return herrajes;
}

export { generarDespiece };
