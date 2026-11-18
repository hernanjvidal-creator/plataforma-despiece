// Nombres legibles para lo que ve el cliente (pantalla, PDF, manual, Excel).
//
// Los motores identifican cada pieza y cada herraje con un id corto en clave
// (`t1_m2_puerta_1`, `tornillo_confirmat / tornillo_1_5/8`) y varias partes del
// código dependen de esos ids tal cual (el visor 3D, el manual de armado, el
// conteo de tornillos). Por eso los ids no se tocan: acá solo se traducen al
// momento de mostrarlos. Sin dependencias: sirve igual en el navegador y en el
// servidor.

const SEPARADOR = ' · ';

// ---------- Piezas ----------

// De afuera hacia adentro: dónde está la pieza dentro del mueble.
const PREFIJOS_PIEZA = [
  [/^t(\d+)_/, 'Tramo $1', 'soloConVariosTramos'],
  [/^esquina(\d+)_/, 'Esquina $1'],
  [/^brazo(\d+)_/, 'Brazo $1'],
  [/^m(\d+)_/, 'Módulo $1'],
  [/^cuerpo(\d+)_/, 'Cuerpo $1'],
  [/^s(\d+)_/, 'Sección $1'],
  [/^cajonera_(?!remate$)/, 'Cajonera'],
  [/^cajon(\d+)_/, 'Cajón $1'],
];

const NOMBRES_PIEZA = [
  [/^lateral_izq$/, 'Lateral izquierdo'],
  [/^lateral_der$/, 'Lateral derecho'],
  [/^lateral_trasero$/, 'Panel trasero'],
  [/^frente$/, 'Panel frontal'],
  [/^tapa$/, 'Tapa'],
  [/^piso$/, 'Piso'],
  [/^techo$/, 'Techo'],
  [/^respaldo$/, 'Respaldo'],
  [/^cubierta$/, 'Cubierta'],
  [/^panel_solido$/, 'Panel de apoyo'],
  [/^(?:travesano|traviesa)_delanter[oa]$/, 'Travesaño delantero'],
  [/^(?:travesano|traviesa)_traser[oa]$/, 'Travesaño trasero'],
  [/^(?:travesano|traviesa)_traser[oa]_superior$/, 'Travesaño trasero superior'],
  [/^(?:travesano|traviesa)_traser[oa]_inferior$/, 'Travesaño trasero inferior'],
  [/^travesano_esquina_t$/, 'Travesaño de la esquina'],
  [/^travesano_soporte_repisa_(\d+)$/, 'Soporte de la repisa $1'],
  [/^tapa_lateral_izq$/, 'Tapa lateral izquierda'],
  [/^tapa_lateral_der$/, 'Tapa lateral derecha'],
  [/^zocalo_frontal$/, 'Zócalo frontal'],
  [/^zocalo_trasero$/, 'Zócalo trasero'],
  [/^zocalo_lateral_izq$/, 'Zócalo lateral izquierdo'],
  [/^zocalo_lateral_der$/, 'Zócalo lateral derecho'],
  [/^divisor_(\d+)$/, 'Divisor $1'],
  [/^repisa_(\d+)$/, 'Repisa $1'],
  [/^puerta_corredera_(\d+)$/, 'Puerta corredera $1'],
  [/^puerta_(\d+)$/, 'Puerta $1'],
  [/^frente_cajon_(\d+)$/, 'Frente del cajón $1'],
  [/^cajonera_remate$/, 'Tapa de la cajonera'],
  [/^costado_izq$/, 'Costado izquierdo'],
  [/^costado_der$/, 'Costado derecho'],
  [/^frente_caja$/, 'Frente de la caja'],
  [/^trasera_caja$/, 'Trasera de la caja'],
  [/^trasera_izq$/, 'Trasera izquierda de la caja'],
  [/^trasera_der$/, 'Trasera derecha de la caja'],
  [/^recorte_lado_izq$/, 'Lado izquierdo del recorte del sifón'],
  [/^recorte_lado_der$/, 'Lado derecho del recorte del sifón'],
  [/^recorte_frente$/, 'Frente del recorte del sifón'],
  [/^fondo$/, 'Fondo'],
  [/^fondo_delantero$/, 'Fondo delantero'],
  [/^fondo_izq$/, 'Fondo izquierdo'],
  [/^fondo_der$/, 'Fondo derecho'],
  [/^sifon_(?:bajada|salida)$/, 'Sifón (referencia)'],
  [/^lavaplatos$/, 'Lavaplatos'],
  [/^lavamanos$/, 'Lavamanos'],
  [/^pata_(\d+)$/, 'Pata $1'],
];

// Último recurso para un id que todavía no tenga traducción: al menos sin
// guiones bajos y con mayúscula inicial.
function humanizar(texto) {
  const limpio = String(texto).replace(/_/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function traducir(texto, tabla) {
  for (const [regex, nombre] of tabla) {
    if (regex.test(texto)) return texto.replace(regex, nombre);
  }
  return null;
}

/**
 * Nombre legible de una pieza a partir de su id.
 * `variosTramos`: el mueble dobla en una esquina y tiene más de un tramo — solo
 * entonces vale la pena decir en qué tramo está cada módulo.
 */
export function nombrePieza(id, { variosTramos = false } = {}) {
  let resto = String(id);
  let sufijo = '';
  const empalme = resto.match(/_empalme_(\d+)de(\d+)$/);
  if (empalme) {
    sufijo = ` (parte ${empalme[1]} de ${empalme[2]})`;
    resto = resto.slice(0, empalme.index);
  }

  const partes = [];
  for (const [regex, nombre, condicion] of PREFIJOS_PIEZA) {
    const m = resto.match(regex);
    if (!m) continue;
    if (condicion !== 'soloConVariosTramos' || variosTramos) partes.push(m[0].replace(regex, nombre));
    resto = resto.slice(m[0].length);
  }
  partes.push(traducir(resto, NOMBRES_PIEZA) || humanizar(resto));

  return partes.join(SEPARADOR) + sufijo;
}

/** Devuelve la función que nombra las piezas de UN mueble (sabe si tiene varios tramos). */
export function nombradorDePiezas(piezas = []) {
  const variosTramos = piezas.some(p => /^t(?:[2-9]|\d\d+)_/.test(p.id));
  return id => nombrePieza(id, { variosTramos });
}

// ---------- Herrajes ----------

const NOMBRES_HERRAJE = [
  [/^grapa_carpintero_6mm$/, 'Grapas de carpintero de 6 mm'],
  [/^soporte_repisa_duplo \/ escuadra_triangular_soporte_repisa$/, 'Soporte de repisa (duplo o escuadra triangular)'],
  [/^bisagra_codo_35mm$/, 'Bisagra de cazoleta 35 mm, recta'],
  [/^bisagra_codo_semicurva_35mm$/, 'Bisagra de cazoleta 35 mm, semicurva'],
  [/^bisagra_codo_cierre_suave_35mm$/, 'Bisagra de cazoleta 35 mm, con cierre suave'],
  [/^bisagra_165_grados$/, 'Bisagra de 165° (esquinero)'],
  [/^manilla_puerta_negra_moderna$/, 'Manilla para puerta'],
  [/^manilla_cajon_negra_moderna$/, 'Manilla para cajón'],
  [/^corredera_bola_(\d+)mm$/, 'Corredera telescópica de $1 mm'],
  [/^corredera_oculta_(\d+)mm$/, 'Corredera oculta de $1 mm'],
  [/^zocalo_aluminio_ml$/, 'Zócalo de aluminio'],
  [/^pata_plastica_regulable$/, 'Pata plástica regulable'],
  [/^pata_regulable$/, 'Pata regulable'],
  [/^tope_plastico_redondo$/, 'Tope plástico redondo'],
  [/^tornillo_confirmat \/ tornillo_1_5\/8$/, 'Tornillo estructural (confirmat o de 1-5/8")'],
  [/^tornillo_1_5\/8$/, 'Tornillo de 1-5/8"'],
  [/^tornillo_30mm$/, 'Tornillo de 30 mm'],
  [/^tornillo_aglomerado_3_5x15$/, 'Tornillo para aglomerado de 3,5 × 15 mm'],
  [/^escuadra_colgado_pared$/, 'Escuadra de fijación a la pared'],
  [/^taco_fischer_tornillo$/, 'Taco con tornillo para pared'],
  [/^tubo_colgador_redondo_(\d+)mm_seccion(\d+)$/, 'Tubo colgador de $1 mm (sección $2)'],
  [/^soporte_tubo_colgador$/, 'Soporte para tubo colgador'],
  [/^riel_corredera_superior_empotrado_(\d+)mm$/, 'Riel superior para puerta corredera, de $1 mm'],
  [/^riel_guia_inferior_empotrado_(\d+)mm$/, 'Guía inferior para puerta corredera, de $1 mm'],
  [/^kit_ruedas_puerta_corredera$/, 'Kit de ruedas para puerta corredera'],
  [/^tirador_embutido_o_perfil_uñero$/, 'Tirador embutido o perfil uñero'],
  [/^escuadra_fijacion_lavavajillas$/, 'Escuadra de fijación para lavavajillas'],
  [/^riel_soporte_horno$/, 'Riel de soporte para horno'],
];

export function nombreHerraje(tipo) {
  return traducir(String(tipo), NOMBRES_HERRAJE) || humanizar(tipo);
}

/** "4 pares", "2 m", "16" — la cantidad de un herraje con su unidad. */
export function cantidadHerraje({ cantidad, unidad }) {
  if (unidad === 'par') return `${cantidad} ${cantidad === 1 ? 'par' : 'pares'}`;
  if (unidad) return `${cantidad} ${unidad}`;
  return String(cantidad);
}

/** Número con coma decimal, como se escribe acá: 19.26 → "19,26". */
export function numero(n) {
  return String(n).replace('.', ',');
}

// ---------- Colores, materiales y cantos ----------

// Mismos nombres que muestra el configurador al elegir el color.
const NOMBRES_COLOR = {
  blanco: 'Blanco',
  gris_claro: 'Gris claro',
  gris_ceniza: 'Gris ceniza',
  aluminio: 'Aluminio',
  concreto_metropolitan: 'Concreto Metropolitan',
  vison: 'Visón',
  gris_grafito: 'Gris grafito',
  negro: 'Negro',
  sahara: 'Sahara',
  olmo_alpino: 'Olmo Alpino',
  coigue: 'Coigüe',
  roble: 'Roble',
  nogal: 'Nogal',
  nogal_africano: 'Nogal Africano',
  cerezo: 'Cerezo',
  fresno_humo: 'Fresno Humo',
  terracota_charyn: 'Terracota Charyn',
  azul_acero: 'Azul Acero',
  verde_glaciar: 'Verde Glaciar',
  acero_inoxidable: 'Acero inoxidable',
  ceramica: 'Cerámica',
};

export function nombreColor(color) {
  if (!color) return '—';
  return NOMBRES_COLOR[color] || humanizar(color);
}

const NOMBRES_MATERIAL = {
  melamina: 'Melamina',
  postformada: 'Cubierta postformada',
  MDF: 'MDF',
  cuarzo: 'Cuarzo',
  granito: 'Granito',
  marmol: 'Mármol',
};

/** "15mm_melamina_gris_claro" → "Melamina de 15 mm · Gris claro" (las claves de `resumen` y del corte). */
export function nombreGrupoMaterial(clave) {
  const m = String(clave).match(/^(\d+(?:\.\d+)?)mm_([^_]+)_(.+)$/);
  if (!m) return humanizar(clave);
  const [, espesor, material, color] = m;
  const base = `${NOMBRES_MATERIAL[material] || humanizar(material)} de ${espesor} mm`;
  return color === 'sin_color' ? base : `${base}${SEPARADOR}${nombreColor(color)}`;
}

/** "15mm_gris_claro" → "Para melamina de 15 mm · Gris claro" (las claves de `tapacantos`). */
export function nombreTapacanto(clave) {
  const m = String(clave).match(/^(\d+(?:\.\d+)?)mm_(.+)$/);
  if (!m) return humanizar(clave);
  return `Para melamina de ${m[1]} mm${SEPARADOR}${nombreColor(m[2])}`;
}

const NOMBRES_CANTO = {
  delantero: 'delantero',
  trasero: 'trasero',
  superior: 'superior',
  inferior: 'inferior',
  izquierdo: 'izquierdo',
  derecho: 'derecho',
};

/** Hacia dónde corre la veta de la pieza, respecto de sus medidas del listado (ver asignarVeta en shared.js). */
export function nombreVeta(veta) {
  if (veta === 'alto') return 'A lo alto';
  if (veta === 'ancho') return 'A lo ancho';
  return '—';
}

/** Aviso del diagrama de corte para un grupo de planchas de un color con veta. */
export function avisoVetaPlancha(ejeVeta) {
  const direccion = ejeVeta === 'x' ? 'de lado a lado' : 'de arriba abajo';
  return `La veta corre a lo largo de la plancha (${direccion} en el dibujo): las piezas de este color están acomodadas para seguirla, aunque eso ocupe algo más de plancha.`;
}

/** Qué bordes de la pieza llevan tapacanto, en palabras. */
export function nombreCantos(cantos) {
  if (!cantos || cantos.length === 0) return '—';
  if (cantos.includes('todos')) return 'Los 4 cantos';
  const nombres = cantos.map(c => NOMBRES_CANTO[c] || humanizar(c).toLowerCase());
  const ultimo = nombres[nombres.length - 1];
  const conjuncion = /^h?i/.test(ultimo) ? 'e' : 'y'; // "superior e inferior"
  const texto = nombres.length === 1 ? ultimo : `${nombres.slice(0, -1).join(', ')} ${conjuncion} ${ultimo}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
