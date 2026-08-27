/**
 * MOTOR DE REGLAS — Vanitorio de Baño
 * -------------------------------------
 * Mismo patrón que muebleBajoCocina.js (cuerpo + zócalo/patas + frentes +
 * cajas de cajón), con las particularidades de un vanitorio:
 *
 *   - soporte: 'patas' (apoyado en el piso, con zócalo) o 'suspendido'
 *     (colgado de la pared, sin patas ni zócalo — usa el mismo sistema de
 *     colgado que un mueble alto).
 *   - sifon: si es true, se deja constancia (nota de producción) de que
 *     el piso/respaldo necesita una perforación para el bajante y el
 *     sifón; el modelo de piezas es de cajas rectangulares, así que el
 *     corte exacto se indica como nota y se ejecuta en obra o se
 *     especifica aparte al proveedor de corte.
 *   - cubierta.incluir: si es true, agrega la pieza de cubierta y el
 *     accesorio de lavamanos. Si el material es piedra (cuarzo/granito/
 *     mármol), se excluye del nesting de melamina (otro proveedor).
 *
 * Alto (H) con soporte 'patas': es la altura TOTAL desde el piso hasta la
 * parte de arriba del cuerpo (sin contar la cubierta) — incluye el zócalo
 * estándar (`hp`, 110mm reservados para un panel de zócalo de 100mm, el
 * mínimo que acepta una máquina de corte, más 10mm de holgura); el cuerpo
 * mide H - hp. Con soporte 'suspendido' no hay zócalo, así que H es
 * directamente el alto del cuerpo colgado.
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

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  A: 600,        // ancho exterior
  H: 550,        // alto TOTAL desde el piso si soporte='patas' (incluye zócalo); alto del cuerpo si 'suspendido'
  P: 450,        // profundidad exterior
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
  sifon: true,            // si lleva lavamanos con sifón (afecta notas de producción)
  cubierta: {
    incluir: false,           // true = agrega la pieza de cubierta y el accesorio de lavamanos
    material: 'melamina',     // 'melamina' | 'cuarzo' | 'granito' | 'marmol'
    espesor: 20,
  },
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

// Altura real del cuerpo: con patas se descuenta el zócalo de la altura
// total; suspendido no tiene zócalo, así que H ya es el alto del cuerpo.
function alturaCuerpo(p) {
  return p.soporte === 'patas' ? p.H - p.hp : p.H;
}

// Profundidad real del cuerpo (laterales/piso/caja de cajón), descontando el
// espesor de la puerta de la profundidad TOTAL que ingresa el cliente: la
// puerta se monta por delante del borde del cuerpo, así que si el cuerpo
// también midiera P completo, el mueble terminado (cuerpo + puerta) quedaría
// espesorPuertas mm más profundo que lo que el cliente pidió.
function profundidadCuerpo(p) {
  return p.P - p.espesorPuertas;
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

  const accesorios = p.cubierta.incluir ? accesorioLavamanos(p) : [];

  const herrajes = generarHerrajes(p);
  const notas = generarNotas(p);

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

  const materialesCubierta = ['melamina', 'cuarzo', 'granito', 'marmol'];
  if (!materialesCubierta.includes(p.cubierta.material)) {
    throw new Error(`Material de cubierta desconocido: ${p.cubierta.material}`);
  }
}

// ---------- 1. Piezas del cuerpo (caja estructural) ----------
// Los laterales van en melamina color exterior: no se sabe de antemano qué
// lado del mueble queda contra una pared (o si queda alguno).
function piezasCuerpo(p) {
  const { A, e, colorInterior, colorExterior, sifon } = p;
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
      ancho: A - 2 * e, alto: P - 5, espesor: e,
      cantos: [],
      cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
      ...(sifon ? { mecanizado: 'hueco_paso_sifon_a_definir_en_obra' } : {}),
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
function piezasRespaldo(p) {
  const { A, e, sifon } = p;
  const H = alturaCuerpo(p);
  return [{
    id: 'respaldo',
    ancho: A - 2 * e + 16, alto: H - 2 * e + 16, espesor: 3,
    cantos: [],
    cantidad: 1,
    material: 'HDF',
    posicion: { x: e - 8, y: e - 8, z: 0 },
    rotacion: 'vertical_frontal',
    ...(sifon ? { mecanizado: 'recorte_paso_canerias_a_definir_en_obra' } : {}),
  }];
}

// ---------- 3. Zócalo (solo si soporte = 'patas') ----------
// Panel frontal + retornos en los dos laterales, no solo el frente.
function piezasZocalo(p) {
  const { A, P, e, hp, r, colorExterior } = p;
  const altoZocalo = hp - 10;
  const profundidadZocalo = P - r;

  return [
    {
      id: 'zocalo_frontal',
      ancho: A, alto: altoZocalo, espesor: e,
      cantos: ['superior'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: r },
      rotacion: 'vertical_frontal',
    },
    {
      id: 'zocalo_lateral_izq',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: 0, y: -hp, z: r },
      rotacion: 'vertical_profundidad',
    },
    {
      id: 'zocalo_lateral_der',
      ancho: profundidadZocalo, alto: altoZocalo, espesor: e,
      cantos: ['delantero'],
      cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: A - e, y: -hp, z: r },
      rotacion: 'vertical_profundidad',
    },
  ];
}

// ---------- 3b. Cubierta (superficie) ----------
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

// Accesorio lavamanos: caja aproximada del bowl, embutida en la cubierta,
// centrada en el ancho del mueble. No es una pieza de melamina — no entra
// en el nesting ni en el resumen de material.
function accesorioLavamanos(p) {
  const { A, P } = p;
  const H = alturaCuerpo(p);
  const anchoBowl = Math.min(A - 100, 500);
  const profundidadBowl = 380;
  const alturaBowl = 150;
  const espesorCubierta = p.cubierta.espesor;

  return [{
    id: 'lavamanos',
    descripcion: 'Lavamanos (loza/cerámica)',
    ancho: anchoBowl, alto: profundidadBowl, espesor: alturaBowl,
    posicion: {
      x: (A - anchoBowl) / 2,
      y: H + espesorCubierta - alturaBowl,
      z: (P - profundidadBowl) / 2,
    },
    rotacion: 'horizontal',
    color: 'ceramica',
  }];
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
        ancho: anchoPuerta, alto: H - 4, espesor: p.espesorPuertas,
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
    const alturaUtil = H - (nC + 1) * 3;
    const alturaCajon = alturaUtil / nC;
    for (let i = 0; i < nC; i++) {
      const y = 3 + i * (alturaCajon + 3);
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

    let ySiguiente = H - gap; // borde superior del próximo cajón a apilar (bajando desde arriba)
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
// ySuperior] del hueco de puertas.
function piezasRepisasZona(p, yInferior, ySuperior) {
  const nRepisas = p.repisas || 0;
  if (nRepisas <= 0) return [];

  const alturaZona = ySuperior - yInferior;
  if (alturaZona <= 0) return [];

  const piezas = [];
  for (let i = 0; i < nRepisas; i++) {
    const y = yInferior + ((i + 1) * alturaZona) / (nRepisas + 1);
    piezas.push({
      id: `repisa_${i + 1}`,
      ancho: p.A - 2 * p.e - 4, alto: profundidadCuerpo(p) - 20, espesor: p.e,
      cantos: ['delantero'],
      cantidad: 1,
      color: p.colorInterior, cara: 'interior',
      posicion: { x: p.e + 2, y, z: 0 },
      rotacion: 'horizontal',
    });
  }
  return piezas;
}

// ---------- 5. Cajas de cajón ----------
function piezasCajas(p, cajones) {
  const { A, e, correderaTipo, colorInterior } = p;
  const P = profundidadCuerpo(p);
  const descuentoAncho = correderaTipo === 'bola' ? 26 : 22;
  const piezas = [];

  cajones.forEach((cajon, idx) => {
    const n = idx + 1;
    const altoInterior = cajon.alturaFrente - 30;
    const anchoCaja = A - 2 * e - descuentoAncho;

    piezas.push(
      {
        id: `cajon${n}_costado_izq`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_costado_der`,
        ancho: P - 50, alto: altoInterior, espesor: e,
        cantos: ['superior'],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: A - e - descuentoAncho / 2 - e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_profundidad',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_frente_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2 + e, y: cajon.posicionY, z: 50 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_trasera_caja`,
        ancho: anchoCaja, alto: altoInterior, espesor: e,
        cantos: [],
        cantidad: 1,
        color: colorInterior, cara: 'interior',
        posicion: { x: e + descuentoAncho / 2 + e, y: cajon.posicionY, z: P - 30 },
        rotacion: 'vertical_frontal',
        grupo: `cajon_${n}`,
      },
      {
        id: `cajon${n}_fondo`,
        ancho: anchoCaja + 16, alto: P - 50 + 16, espesor: 3,
        cantos: [],
        cantidad: 1,
        material: 'HDF',
        posicion: { x: e + descuentoAncho / 2 - 8, y: cajon.posicionY + 15, z: 50 - 8 },
        rotacion: 'horizontal',
        grupo: `cajon_${n}`,
      }
    );
  });

  return piezas;
}

// ---------- 6. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];
  const H = alturaCuerpo(p);

  if (p.repisas > 0) {
    herrajes.push({ tipo: 'soporte_repisa_metalico', cantidad: p.repisas * 4 });
  }

  if (p.nP > 0) {
    const bisagrasPorPuerta = H > 650 ? 3 : 2;
    herrajes.push({ tipo: 'bisagra_codo', cantidad: p.nP * bisagrasPorPuerta });
    herrajes.push({ tipo: 'manilla_puerta_negra_moderna', cantidad: p.nP });
  }
  if (p.nC > 0) {
    const correderaId = p.correderaTipo === 'bola'
      ? `corredera_bola_${Math.round(profundidadCuerpo(p) - 60)}mm`
      : `corredera_oculta_${Math.round(profundidadCuerpo(p) - 60)}mm`;
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

  herrajes.push({ tipo: 'tornillo_golfari', cantidad: 8 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 12 });

  return herrajes;
}

// ---------- 7. Notas de producción ----------
function generarNotas(p) {
  const notas = [];
  if (!p.cubierta.incluir) {
    notas.push('La cubierta (piedra, cuarzo o similar) no está incluida en este despiece — actívala en "Cubierta" si quieres que se genere la pieza y el accesorio de lavamanos.');
  } else if (p.cubierta.material !== 'melamina') {
    notas.push(`Cubierta en ${p.cubierta.material}: se fabrica e instala aparte (otro proveedor). No entra en el nesting de melamina ni en el diagrama de corte — se lista solo para referencia de m².`);
  }
  if (p.cubierta.incluir) {
    notas.push('El accesorio de lavamanos es una referencia aproximada (medida real según el modelo que elija el cliente) — usarlo solo para ubicar el corte del bowl en la cubierta.');
  }
  if (p.sifon) {
    notas.push(
      'Lleva lavamanos con sifón: el piso y/o respaldo requieren una perforación para el paso de cañerías. La medida exacta se define en terreno o se indica aparte al proveedor de corte.'
    );
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
