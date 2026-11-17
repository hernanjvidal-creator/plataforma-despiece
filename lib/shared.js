/**
 * Utilidades compartidas entre los motores de reglas de cada módulo
 * (muebleBajoCocina.js, muebleAltoCocina.js, vanitorioBano.js).
 */

// Materiales de cubierta que NO se cortan de una plancha de melamina estándar
// (piedra: se fabrica a medida por otro proveedor). optimizadorCorte.js los
// excluye del nesting pero igual se listan en el despiece y en "Material requerido".
const MATERIALES_SIN_NESTING = ['cuarzo', 'granito', 'marmol'];

// Resumen de material (m² por espesor+material+color, para cotizar tableros)
function resumirPlanchas(piezas) {
  const resumen = {};
  for (const pieza of piezas) {
    const key = `${pieza.espesor}mm_${pieza.material || 'melamina'}_${pieza.color || 'sin_color'}`;
    const areaM2 = (pieza.ancho * pieza.alto) / 1_000_000 * (pieza.cantidad || 1);
    resumen[key] = (resumen[key] || 0) + areaM2;
  }
  for (const key in resumen) {
    resumen[key] = Math.round(resumen[key] * 100) / 100;
  }
  return resumen;
}

// ---------- Tapacanto ----------
// Largo (mm) del borde de una pieza que nombra cada canto. `ancho` y `alto`
// son las medidas de plancha de la pieza, y a qué borde corresponde cada una
// depende de cómo va puesta:
//   - Pieza vertical (lateral, puerta, frente): `ancho` es su medida
//     horizontal y `alto` la vertical. Los cantos superior e inferior corren a
//     lo ancho; el delantero, el trasero y los de los costados, a lo alto.
//   - Pieza horizontal (piso, techo, repisa): `ancho` va de lado a lado y
//     `alto` es su fondo. El canto delantero y el trasero corren a lo ancho;
//     los de los costados, a lo largo del fondo. Si el tramo del mueble está
//     girado 90° (esquinero), las dos medidas quedan cambiadas entre sí — el
//     motor lo marca con `ejesGirados`.
function largoCanto(pieza, canto) {
  const { ancho, alto } = pieza;
  if (canto === 'todos') return 2 * (ancho + alto);
  const delanteroOTrasero = canto === 'delantero' || canto === 'trasero';
  const correALoAncho = pieza.rotacion === 'horizontal'
    ? delanteroOTrasero !== Boolean(pieza.ejesGirados)
    : canto === 'superior' || canto === 'inferior';
  return correALoAncho ? ancho : alto;
}

// Metros de tapacanto que pide el mueble, por espesor de tablero y color —
// para comprarlo o para que la maderera cotice el enchapado. Redondea hacia
// arriba a los 10 cm; no incluye holgura por despunte.
function resumirTapacantos(piezas) {
  const milimetros = {};
  for (const pieza of piezas) {
    if (!pieza.cantos || pieza.cantos.length === 0) continue;
    if (pieza.material && pieza.material !== 'melamina') continue; // la piedra y el MDF no se enchapan
    const cantos = pieza.cantos.includes('todos') ? ['todos'] : pieza.cantos;
    const largo = cantos.reduce((suma, canto) => suma + largoCanto(pieza, canto), 0);
    const key = `${pieza.espesor}mm_${pieza.color || 'sin_color'}`;
    milimetros[key] = (milimetros[key] || 0) + largo * (pieza.cantidad || 1);
  }
  const resumen = {};
  for (const key in milimetros) {
    resumen[key] = Math.ceil(milimetros[key] / 100) / 10;
  }
  return resumen;
}

// ---------- Veta ----------
// Las melaminas que imitan madera tienen veta, y en la plancha corre a lo
// largo (por su lado largo). Si el optimizador de corte gira una pieza para
// que quepa mejor, esa pieza queda con la veta atravesada — en una puerta se
// nota de lejos. asignarVeta marca, en cada pieza de un color con veta, qué
// medida de la pieza tiene que seguir la veta ('alto' o 'ancho', las mismas
// del listado de piezas), y el optimizador solo la acomoda en la orientación
// que lo cumple (ver orientacionesPermitidas en optimizadorCorte.js).
const COLORES_CON_VETA = ['sahara', 'olmo_alpino', 'coigue', 'roble', 'nogal', 'nogal_africano', 'cerezo', 'fresno_humo'];

// Piezas paradas largas y bajas: la veta corre a lo largo, horizontal.
const REGEX_VETA_HORIZONTAL = /zocalo|travesano|traviesa/;

function vetaDePieza(pieza) {
  if (!COLORES_CON_VETA.includes(pieza.color)) return null;
  if (pieza.material && pieza.material !== 'melamina') return null;
  if (pieza.rotacion === 'horizontal') {
    // Cubiertas, tapas y repisas: la veta corre de lado a lado del mueble.
    // En un tramo girado 90° (esquinero de cocina) el ancho y el fondo de la
    // pieza quedaron cambiados entre sí (ejesGirados).
    return pieza.ejesGirados ? 'alto' : 'ancho';
  }
  // Piezas paradas (laterales, puertas, frentes de cajón): veta vertical,
  // salvo zócalos y travesaños.
  return REGEX_VETA_HORIZONTAL.test(pieza.id) ? 'ancho' : 'alto';
}

function asignarVeta(piezas) {
  return piezas.map(pieza => {
    const veta = vetaDePieza(pieza);
    return veta ? { ...pieza, veta } : pieza;
  });
}

// ---------- Tornillos para instalar herrajes sobre melamina ----------
// Cantidad estimada de "tornillo aglomerado 3,5x15mm" por unidad de cada
// herraje que se atornilla a un tablero (rieles, correderas, bisagras,
// manillas, escuadras) — no incluye tornillos de unión estructural entre
// dos tableros (ver tornillo_1_5/8) ni los de fijación a la pared (ver
// taco_fischer_tornillo). Son cantidades estimadas, fáciles de ajustar acá
// si en terreno se necesita otra cantidad.
const TORNILLOS_POR_HERRAJE_MONTAJE = [
  { patron: /bisagra/, cantidad: 4 },
  { patron: /manilla/, cantidad: 2 },
  { patron: /^corredera_/, cantidad: 8 },
  { patron: /^riel_corredera|^riel_guia/, cantidad: 6 },
  { patron: /^kit_ruedas/, cantidad: 4 },
  { patron: /^escuadra_/, cantidad: 2 },
  { patron: /^riel_soporte_horno/, cantidad: 2 },
  { patron: /^tirador_/, cantidad: 2 },
  { patron: /^soporte_tubo_colgador/, cantidad: 2 },
];

function tornillosMontajeHerrajes(herrajes) {
  let total = 0;
  herrajes.forEach(h => {
    const regla = TORNILLOS_POR_HERRAJE_MONTAJE.find(r => r.patron.test(h.tipo));
    if (regla) total += h.cantidad * regla.cantidad;
  });
  return total;
}

// ---------- Largo comercial de corredera de cajón ----------
// Las correderas (bola u ocultas) se venden en largos fijos de fábrica, no en
// cualquier medida — pedir "353mm" en una ferretería no tiene sentido, no
// existe ese producto. Se redondea siempre HACIA ABAJO (nunca hacia arriba: una
// corredera más larga que el hueco disponible no calza) al tamaño comercial
// más cercano.
const LARGOS_CORREDERA_ESTANDAR = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700];

function largoCorrederaComercial(largoIdeal) {
  const candidatos = LARGOS_CORREDERA_ESTANDAR.filter(l => l <= largoIdeal);
  if (candidatos.length === 0) {
    throw new Error(
      `Con esta profundidad, el cajón queda muy poco profundo para una corredera comercial (mínimo ${LARGOS_CORREDERA_ESTANDAR[0]}mm) — sube la Profundidad del mueble.`
    );
  }
  return candidatos[candidatos.length - 1];
}

// ---------- Luz entre frentes vecinos ----------
// Dos puertas o frentes de cajón que quedan uno al lado del otro necesitan
// aire entre sí para no rozarse al abrir (Arauco recomienda unos 3mm para
// tableros de 15-18mm). En los muebles modulares (cocina/aéreo) cada módulo
// deja la mitad en cada uno de sus dos bordes: así entre dos módulos vecinos,
// y entre un frente y la tapa lateral, siempre queda luz, sin que ningún
// módulo tenga que saber qué tiene al lado.
const LUZ_ENTRE_FRENTES = 3;

// ---------- Caja de cajón ----------
// Una sola definición para todos los muebles con cajones (cocina, closet,
// vanitorio, velador, escritorio) — antes cada motor traía su propia copia y
// un arreglo hecho en uno no llegaba a los demás.
//
// Vista desde arriba, de un panel del mueble al otro (`xHueco` es la cara
// interior del panel izquierdo, `anchoHueco` el espacio libre entre ambos):
//
//   panel | corredera | costado | frente / trasera / fondo | costado | corredera | panel
//
// Los dos costados corren todo el largo de la caja (de zTrasero a
// zDelantero). El frente y la trasera de la caja van ENTRE los costados, a
// ras de cada punta, y el fondo va entre las cuatro piezas — atornillado por
// los cuatro lados, sin cantos a la vista. El frente decorativo (el de color)
// no es parte de la caja: lo arma cada motor y se atornilla contra
// `frente_caja`.
function descuentoAnchoCorredera(correderaTipo) {
  return correderaTipo === 'bola' ? 26 : 22;
}

function piezasCajaCajon({ prefijoId, grupo, xHueco, anchoHueco, y, alto, zTrasero, zDelantero, e, color, correderaTipo }) {
  const descuentoAncho = descuentoAnchoCorredera(correderaTipo);
  const largo = zDelantero - zTrasero;
  const xCostadoIzq = xHueco + descuentoAncho / 2;
  const xCostadoDer = xHueco + anchoHueco - descuentoAncho / 2 - e;
  const anchoCaja = anchoHueco - descuentoAncho - 2 * e;
  const comun = { espesor: e, cantidad: 1, color, cara: 'interior', grupo };

  return [
    {
      ...comun,
      id: `${prefijoId}_costado_izq`,
      ancho: largo, alto,
      cantos: ['superior'],
      posicion: { x: xCostadoIzq, y, z: zTrasero },
      rotacion: 'vertical_profundidad',
    },
    {
      ...comun,
      id: `${prefijoId}_costado_der`,
      ancho: largo, alto,
      cantos: ['superior'],
      posicion: { x: xCostadoDer, y, z: zTrasero },
      rotacion: 'vertical_profundidad',
    },
    {
      ...comun,
      id: `${prefijoId}_frente_caja`,
      ancho: anchoCaja, alto,
      cantos: ['superior'],
      posicion: { x: xCostadoIzq + e, y, z: zDelantero - e },
      rotacion: 'vertical_frontal',
    },
    {
      ...comun,
      id: `${prefijoId}_trasera_caja`,
      ancho: anchoCaja, alto,
      cantos: ['superior'],
      posicion: { x: xCostadoIzq + e, y, z: zTrasero },
      rotacion: 'vertical_frontal',
    },
    {
      ...comun,
      id: `${prefijoId}_fondo`,
      ancho: anchoCaja, alto: largo - 2 * e,
      cantos: [],
      posicion: { x: xCostadoIzq + e, y, z: zTrasero + e },
      rotacion: 'horizontal',
    },
  ];
}

// ---------- Muebles por secciones armados en varios cuerpos ----------
// Un mueble ancho de secciones (closet, librero) no se arma como una sola
// caja: su piso, su techo y su respaldo corren de lado a lado y, pasado
// cierto ancho, dejan de caber en la plancha — partirlos con una unión
// cualquiera los debilita justo donde más trabajan. Se reparte en CUERPOS
// independientes, cada uno con sus propios laterales, que se atornillan
// entre sí (mismo criterio que los módulos del mueble de cocina).

// Largo máximo (mm) que puede tener una pieza cuyo otro lado mide
// `otroLado`, para que quepa entera en la plancha en alguna de sus dos
// orientaciones — mismo criterio (márgenes y grosor de disco) que el
// optimizador de corte (ver medidasUtilesPlancha). 0 si ni siquiera ese otro
// lado cabe.
function largoMaximoPieza(otroLado, { anchoUtil, altoUtil, kerf }) {
  let largo = 0;
  if (otroLado + kerf <= altoUtil) largo = Math.max(largo, anchoUtil - kerf);
  if (otroLado + kerf <= anchoUtil) largo = Math.max(largo, altoUtil - kerf);
  return largo;
}

// Reparte las secciones (por su ancho nominal) en cuerpos contiguos de a lo
// más `anchoMaximo` cada uno: primero la menor cantidad de cuerpos posible y,
// entre esas, la repartición más pareja (la que deja más angosto al cuerpo
// más ancho) — dos cuerpos de 1200 en vez de uno de 1800 y otro de 600. Una
// sección que por sí sola ya es más ancha que el máximo queda sola en su
// cuerpo (no se puede cortar a la mitad). Devuelve los índices de las
// secciones de cada cuerpo.
function dividirEnCuerpos(anchos, anchoMaximo) {
  const n = anchos.length;
  const suma = (desde, hasta) => anchos.slice(desde, hasta).reduce((a, b) => a + b, 0);
  const sirve = (desde, hasta) => hasta - desde === 1 || suma(desde, hasta) <= anchoMaximo;

  // mejor[j]: la mejor forma de repartir las primeras j secciones.
  const mejor = [{ cortes: [], cantidad: 0, mayor: 0 }];
  for (let j = 1; j <= n; j++) {
    let elegido = null;
    for (let i = 0; i < j; i++) {
      if (!mejor[i] || !sirve(i, j)) continue;
      const candidato = { cortes: [...mejor[i].cortes, j], cantidad: mejor[i].cantidad + 1, mayor: Math.max(mejor[i].mayor, suma(i, j)) };
      if (!elegido || candidato.cantidad < elegido.cantidad || (candidato.cantidad === elegido.cantidad && candidato.mayor < elegido.mayor)) {
        elegido = candidato;
      }
    }
    mejor[j] = elegido;
  }

  const cuerpos = [];
  let desde = 0;
  for (const hasta of mejor[n].cortes) {
    cuerpos.push(Array.from({ length: hasta - desde }, (_, k) => desde + k));
    desde = hasta;
  }
  return cuerpos;
}

// Lleva una pieza de un cuerpo (coordenadas locales a él) a su lugar dentro
// del mueble completo, con el prefijo de su cuerpo en el id.
function trasladarAlCuerpo(pieza, xOffset, prefijo) {
  return {
    ...pieza,
    id: `${prefijo}${pieza.id}`,
    grupo: pieza.grupo ? `${prefijo}${pieza.grupo}` : pieza.grupo,
    posicion: { ...pieza.posicion, x: pieza.posicion.x + xOffset },
  };
}

// Suma los herrajes de todos los cuerpos: un mismo tipo, una sola fila, en
// el orden que da `orden` (una lista de patrones, el mismo en que el motor
// lista los herrajes de un solo cuerpo) — si no, lo que trae solo el segundo
// cuerpo quedaría al final, después de los tornillos.
function sumarHerrajes(listas, orden = []) {
  const porTipo = new Map();
  for (const lista of listas) {
    for (const h of lista) {
      const previo = porTipo.get(h.tipo);
      if (previo) previo.cantidad += h.cantidad;
      else porTipo.set(h.tipo, { ...h });
    }
  }
  const posicion = tipo => {
    const i = orden.findIndex(regex => regex.test(tipo));
    return i < 0 ? orden.length : i;
  };
  return [...porTipo.values()].sort((a, b) => posicion(a.tipo) - posicion(b.tipo));
}

// Tornillos de 30 mm por cada unión entre dos cuerpos vecinos, lateral con
// lateral (3 alturas x 2, igual que las uniones entre módulos de cocina).
const TORNILLOS_POR_UNION_CUERPOS = 6;

// ---------- Cantidad de bisagras por alto de puerta ----------
// Antes cada módulo traía su propio umbral (650/800/900mm para pasar de 2 a
// 3 bisagras, y solo closet/despensa llegaban a un cuarto gancho a los
// 1800mm) — puertas muy altas en bajo_cocina/alto_cocina/vanitorio (H llega
// hasta 3000mm en varios módulos) se quedaban con 3 bisagras nomás. Se
// unifica en un solo criterio, escalando cada ~600-700mm de alto.
function bisagrasPorAltura(H) {
  if (H > 2400) return 5;
  if (H > 1800) return 4;
  if (H > 900) return 3;
  return 2;
}

// ---------- Grapas para fijar los respaldos de MDF ----------
// El respaldo delgado (3mm MDF) se fija por su perímetro con grapas de
// carpintero, no con tornillos (muy fino para eso). Se estima 1 grapa cada
// ~100mm de perímetro, redondeando hacia arriba — filtra por `material ===
// 'MDF'` sobre la lista de piezas ya armada (después de trasladarYPrefijar,
// si corresponde), así sirve igual para un solo cuerpo o para varios
// módulos, cada uno con su propio respaldo.
function grapasParaRespaldos(piezas, espaciadoMm = 100) {
  return piezas
    .filter(pz => pz.material === 'MDF')
    .reduce((total, pz) => total + Math.ceil((2 * (pz.ancho + pz.alto)) / espaciadoMm) * (pz.cantidad || 1), 0);
}

export {
  resumirPlanchas, MATERIALES_SIN_NESTING, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura,
  grapasParaRespaldos, LUZ_ENTRE_FRENTES, piezasCajaCajon, resumirTapacantos,
  largoMaximoPieza, dividirEnCuerpos, trasladarAlCuerpo, sumarHerrajes, TORNILLOS_POR_UNION_CUERPOS,
  COLORES_CON_VETA, asignarVeta,
};
