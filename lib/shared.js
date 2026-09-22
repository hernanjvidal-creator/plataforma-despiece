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

export { resumirPlanchas, MATERIALES_SIN_NESTING, tornillosMontajeHerrajes, largoCorrederaComercial, bisagrasPorAltura };
