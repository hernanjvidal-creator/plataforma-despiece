// Límites de un diseño: qué medidas y combinaciones dan un mueble que de
// verdad se puede construir. Los motores ya rechazan lo que no pueden calcular
// (medidas vacías, cajones que no caben en altura); esto agrega lo que sí
// calculaban sin reclamar pero no sirve: una puerta de 900 mm, tres puertas en
// un módulo sin divisor, un cajón de 60 mm de ancho, un mueble de 3 m de alto.
//
// Vive aparte de los motores, en un solo lugar, porque lo usan dos partes:
// el formulario (para los mínimos y máximos de cada casilla) y
// generarDespiecePorModulo (para rechazar el diseño con un mensaje claro).
// Sin dependencias: sirve igual en el navegador y en el servidor.

// Rangos en mm: [mínimo, máximo]. A = ancho, H = alto, P = profundidad.
// Son amplios a propósito: dejan pasar cualquier mueble razonable y cortan
// solo lo que claramente es un error de tipeo o no se puede armar.
export const LIMITES = {
  bajo_cocina: { H: [600, 1200], P: [400, 1200], anchoModulo: [100, 1200] },
  alto_cocina: { H: [250, 1200], P: [200, 700], anchoModulo: [150, 1200] },
  vanitorio_bano: { A: [300, 1200], H: [350, 1100], P: [300, 800] },
  closet: { H: [600, 2800], P: [350, 900], anchoSeccion: [230, 1500] },
  despensa: { A: [250, 1200], H: [600, 2800], P: [250, 800] },
  velador: { A: [250, 900], H: [350, 1000], P: [330, 700] },
  escritorio: { A: [800, 2400], H: [600, 1200], P: [400, 1000], anchoCajonera: [250, 900] },
  librero: { H: [400, 2800], P: [150, 700], anchoSeccion: [230, 1200] },
  baul: { A: [300, 1800], H: [200, 900], P: [250, 900] },
};

// Una puerta con bisagras más ancha que esto pesa demasiado para sus bisagras
// y se descuelga; más angosta, no deja lugar para la cazoleta.
export const ANCHO_PUERTA = [100, 600];
// Un módulo sin divisor lleva a lo más 2 puertas (una con bisagras en cada
// lateral): una tercera, al medio, no tendría dónde llevarlas.
export const MAX_PUERTAS_POR_MODULO = 2;
// Ancho mínimo del hueco que recibe un cajón: menos que esto, y descontadas
// las correderas y los costados, la caja queda de menos de 15 cm por dentro.
export const ANCHO_MINIMO_CON_CAJONES = 250;

const NOMBRE_MEDIDA = { A: 'El ancho', H: 'El alto', P: 'La profundidad' };

function fueraDeRango(valor, [minimo, maximo]) {
  const n = Number(valor);
  return !Number.isFinite(n) || n < minimo || n > maximo;
}

function mensajeRango(nombre, valor, [minimo, maximo]) {
  const n = Number(valor);
  const ingresado = Number.isFinite(n) && valor !== '' && valor != null ? ` (tiene ${Math.round(n)})` : '';
  return `${nombre} debe estar entre ${minimo} y ${maximo} mm${ingresado}.`;
}

// Problemas de las puertas con bisagras de un tramo de `ancho` mm que lleva
// `nP` puertas. `donde` es cómo nombrar el tramo ("Módulo 2", "El mueble").
function problemasPuertas(donde, ancho, nP, queAchicar, alternativaAUnaPuerta = 'Usa 2 puertas') {
  if (!(nP > 0)) return [];
  if (nP > MAX_PUERTAS_POR_MODULO) {
    return [`${donde}: con ${nP} puertas, la del medio no tiene un panel donde llevar bisagras. Usa 1 o 2 puertas${queAchicar === 'módulo' ? ', o divide el módulo en dos' : ''}.`];
  }
  const anchoPuerta = ancho / nP;
  if (anchoPuerta > ANCHO_PUERTA[1] + 5) {
    const salida = nP === 1 ? `${alternativaAUnaPuerta} o achica ${queAchicar === 'módulo' ? 'el módulo' : 'el ancho'}` : (queAchicar === 'módulo' ? 'Divide el módulo en dos o achícalo' : 'Achica el ancho');
    return [`${donde}: cada puerta quedaría de ${Math.round(anchoPuerta)} mm de ancho, y lo máximo para una puerta con bisagras son ${ANCHO_PUERTA[1]} mm. ${salida}.`];
  }
  if (anchoPuerta < ANCHO_PUERTA[0]) {
    return [`${donde}: cada puerta quedaría de solo ${Math.round(anchoPuerta)} mm de ancho. Usa 1 puerta o agranda ${queAchicar === 'módulo' ? 'el módulo' : 'el ancho'}.`];
  }
  return [];
}

function problemaCajones(donde, ancho) {
  if (Number(ancho) >= ANCHO_MINIMO_CON_CAJONES) return [];
  return [`${donde}: con cajones necesita al menos ${ANCHO_MINIMO_CON_CAJONES} mm de ancho (tiene ${Math.round(Number(ancho) || 0)}) — si no, la caja del cajón queda demasiado angosta.`];
}

/**
 * Revisa un diseño contra los límites. Devuelve la lista de problemas en
 * palabras (vacía si está todo bien). No lanza errores: quien llama decide si
 * rechaza el diseño o solo lo avisa.
 */
export function revisarLimites(modulo, parametros) {
  const limites = LIMITES[modulo];
  const p = parametros || {};
  if (!limites) return [];
  const problemas = [];

  for (const medida of ['A', 'H', 'P']) {
    // Una medida que no viene usa la de partida del motor: no hay nada que revisar.
    if (limites[medida] && p[medida] != null && fueraDeRango(p[medida], limites[medida])) {
      problemas.push(mensajeRango(NOMBRE_MEDIDA[medida], p[medida], limites[medida]));
    }
  }

  const secciones = Array.isArray(p.secciones) ? p.secciones : [];

  if (modulo === 'bajo_cocina' || modulo === 'alto_cocina') {
    secciones.forEach((s, i) => {
      if (s.tipo === 'esquinero') return;
      const donde = `Módulo ${i + 1}`;
      // Lavaplatos, horno y lavavajillas traen su ancho estándar si no se indica.
      if (s.ancho == null && s.tipo && s.tipo !== 'estandar') return;
      if (fueraDeRango(s.ancho, limites.anchoModulo)) {
        problemas.push(mensajeRango(`${donde}: el ancho`, s.ancho, limites.anchoModulo));
        return;
      }
      if (modulo === 'alto_cocina') {
        problemas.push(...problemasPuertas(donde, s.ancho, Number(s.nP) || 0, 'módulo'));
        return;
      }
      if (s.tipo && s.tipo !== 'estandar') return;
      const config = s.config || 'solo_cajones';
      if (config === 'solo_puertas' || config === 'mixto') {
        problemas.push(...problemasPuertas(donde, s.ancho, Number(s.nP) || 0, 'módulo'));
      }
      if (config === 'solo_cajones' || config === 'mixto') {
        problemas.push(...problemaCajones(donde, s.ancho));
      }
    });
  }

  if (modulo === 'closet' || modulo === 'librero') {
    secciones.forEach((s, i) => {
      if (s.ancho != null && fueraDeRango(s.ancho, limites.anchoSeccion)) {
        problemas.push(mensajeRango(`Sección ${i + 1}: el ancho`, s.ancho, limites.anchoSeccion));
      }
    });
  }

  if (modulo === 'vanitorio_bano') {
    const config = p.config || 'solo_cajones';
    if (config === 'solo_puertas' || config === 'mixto') {
      problemas.push(...problemasPuertas('Puertas', p.A ?? 600, Number(p.nP) || 0, 'ancho'));
    }
  }

  if (modulo === 'despensa') {
    problemas.push(...problemasPuertas('Puertas', p.A ?? 450, Number(p.nP) || 0, 'ancho'));
  }

  if (modulo === 'velador' && (p.tipoInferior || 'puerta') === 'puerta') {
    // El velador lleva una sola puerta: la salida es cambiar la parte de abajo.
    problemas.push(...problemasPuertas('Puerta', p.A ?? 450, 1, 'ancho', 'Deja la parte de abajo con repisa o abierta,'));
  }

  if (modulo === 'escritorio') {
    if (p.anchoCajonera != null && fueraDeRango(p.anchoCajonera, limites.anchoCajonera)) {
      problemas.push(mensajeRango('El ancho de la cajonera', p.anchoCajonera, limites.anchoCajonera));
    } else if (p.configCajonera === 'cajon_puerta' && Number(p.anchoCajonera ?? 450) > ANCHO_PUERTA[1] + 5) {
      problemas.push(`Cajonera: su puerta quedaría de ${Math.round(Number(p.anchoCajonera))} mm de ancho, y lo máximo para una puerta con bisagras son ${ANCHO_PUERTA[1]} mm. Achica la cajonera o elige solo cajones.`);
    }
  }

  return problemas;
}
