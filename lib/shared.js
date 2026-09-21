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

export { resumirPlanchas, MATERIALES_SIN_NESTING, tornillosMontajeHerrajes };
