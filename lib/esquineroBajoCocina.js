/**
 * MOTOR DE REGLAS — Mueble Esquinero Ciego (Bajo Cocina)
 * -----------------------------------------------------------
 * Dos "brazos" rectangulares (cuerpos de mueble bajo estándar) que se
 * encuentran en 90° en una esquina, compartiendo el mismo piso/pared.
 * El Brazo A corre a lo largo de la Pared 1 (eje X global). El Brazo B
 * corre a lo largo de la Pared 2 (eje Z global), perpendicular al A.
 *
 * Como todo el resto de la app trabaja en un solo plano (x=ancho,
 * z=profundidad), el Brazo B se genera primero en SU PROPIO plano local
 * (igual que un mueble lineal normal) y después se rota 90° hacia el
 * espacio global: alto/ancho locales que corrían en X pasan a correr en Z
 * y viceversa (ver `rotarPiezaBrazoB`). Es una rotación en múltiplos de
 * 90°, así que basta con permutar ejes — no hace falta trigonometría.
 *
 * El Brazo B es el "ciego": su tramo más cercano a la esquina
 * (zonaCiega mm) no lleva puerta — es la zona de difícil acceso típica
 * de un esquinero, que en la práctica se deja como espacio muerto o se
 * accede con un herraje tipo carrusel (no incluido en este modelo).
 *
 * Sistema de coordenadas global (mm), igual que el resto de los módulos:
 *   x: distancia a lo largo de la Pared 1 (0 = esquina)
 *   y: altura (0 = piso del cuerpo, sin contar patas)
 *   z: distancia a lo largo de la Pared 2 (0 = esquina)
 */

import { resumirPlanchas } from './shared';

const DEFAULTS = {
  anchoA: 900,   // largo del Brazo A medido desde la esquina
  anchoB: 900,   // largo del Brazo B medido desde la esquina
  H: 700,        // alto exterior del cuerpo (sin patas)
  P: 560,        // profundidad de cada brazo
  e: 15,         // espesor tablero estructural
  gp: 18,        // espesor de puertas
  hp: 100,       // altura patas
  r: 50,         // retranqueo zócalo
  zonaCiega: 300, // mm sin puerta en el Brazo B, pegados a la esquina
  colorInterior: 'blanco',
  colorExterior: 'blanco',
};

function generarDespiece(paramsUsuario = {}) {
  const p = { ...DEFAULTS, ...paramsUsuario };
  validarParametros(p);

  // Brazo A: se genera directo en el plano global (sin transformar).
  const piezasA = [
    ...generarCuerpoBrazo('a', p.anchoA, p),
    ...generarRespaldoBrazo('a', p.anchoA, p),
    ...generarZocaloBrazo('a', p.anchoA, p, { x: 0, z: p.r }),
    ...generarPuertasBrazo('a', p.anchoA, p, 0),
  ];

  // Brazo B: se genera en su plano local (como un mueble lineal normal) y
  // se rota 90° hacia el espacio global, calzando su origen con la esquina.
  const piezasBLocal = [
    ...generarCuerpoBrazo('b', p.anchoB, p),
    ...generarRespaldoBrazo('b', p.anchoB, p),
    ...generarZocaloBrazo('b', p.anchoB, p, { x: 0, z: p.r }),
    ...generarPuertasBrazo('b', p.anchoB, p, p.zonaCiega),
  ];
  const piezasB = piezasBLocal.map(pieza => rotarPiezaBrazoB(pieza));

  const piezas = [...piezasA, ...piezasB];
  const herrajes = generarHerrajes(p);
  const notas = generarNotas(p);

  return {
    modulo: 'esquinero_bajo_cocina',
    parametros: p,
    piezas,
    herrajes,
    notas,
    resumen: resumirPlanchas(piezas),
  };
}

// ---------- Validación básica ----------
function validarParametros(p) {
  if (p.anchoA < 300 || p.anchoA > 3000) throw new Error('Ancho del brazo A fuera de rango 300-3000mm');
  if (p.anchoB < 300 || p.anchoB > 3000) throw new Error('Ancho del brazo B fuera de rango 300-3000mm');
  if (p.H < 50 || p.H > 3000) throw new Error('Alto (H) fuera de rango 50-3000mm');
  if (p.P < 300 || p.P > 1000) throw new Error('Profundidad (P) fuera de rango 300-1000mm');
  if (p.zonaCiega < 0) throw new Error('La zona ciega no puede ser negativa');
  if (p.zonaCiega > p.anchoB - 200) {
    throw new Error('La zona ciega es casi todo el brazo B: reduce zonaCiega o aumenta anchoB');
  }
}

// ---------- 1. Cuerpo de un brazo (igual patrón que muebleBajoCocina, parametrizado) ----------
function generarCuerpoBrazo(prefijo, ancho, p) {
  const { H, P, e, colorInterior } = p;
  return [
    {
      id: `${prefijo}_lateral_izq`,
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'], cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: 0, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: `${prefijo}_lateral_der`,
      ancho: P, alto: H, espesor: e,
      cantos: ['delantero'], cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: ancho - e, y: 0, z: 0 },
      rotacion: 'vertical_profundidad',
    },
    {
      id: `${prefijo}_piso`,
      ancho: ancho - 2 * e, alto: P - 20, espesor: e,
      cantos: [], cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: 0, z: 0 },
      rotacion: 'horizontal',
    },
    {
      id: `${prefijo}_traviesa_delantera`,
      ancho: ancho - 2 * e, alto: 100, espesor: e,
      cantos: ['inferior'], cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: P - 100 },
      rotacion: 'horizontal',
    },
    {
      id: `${prefijo}_traviesa_trasera`,
      ancho: ancho - 2 * e, alto: 100, espesor: e,
      cantos: [], cantidad: 1,
      color: colorInterior, cara: 'interior',
      posicion: { x: e, y: H - e, z: 0 },
      rotacion: 'horizontal',
    },
  ];
}

function generarRespaldoBrazo(prefijo, ancho, p) {
  const { H, e } = p;
  return [{
    id: `${prefijo}_respaldo`,
    ancho: ancho - 2 * e + 16, alto: H - 30, espesor: 3,
    cantos: [], cantidad: 1,
    material: 'HDF',
    posicion: { x: e - 8, y: 15, z: 0 },
    rotacion: 'vertical_frontal',
  }];
}

function generarZocaloBrazo(prefijo, ancho, p) {
  const { hp, e, colorExterior, r } = p;
  return [{
    id: `${prefijo}_panel_zocalo`,
    ancho, alto: hp - 10, espesor: e,
    cantos: ['superior'], cantidad: 1,
    color: colorExterior, cara: 'exterior',
    posicion: { x: 0, y: -hp, z: r },
    rotacion: 'vertical_frontal',
  }];
}

// Puertas del brazo, dejando libre (sin puerta) los primeros `zonaCiega` mm
// desde x=0 (el extremo que, tras la rotación, queda pegado a la esquina).
function generarPuertasBrazo(prefijo, ancho, p, zonaCiega) {
  const { H, gp, colorExterior } = p;
  const anchoConPuerta = ancho - zonaCiega;
  if (anchoConPuerta < 200) return [];

  const nP = anchoConPuerta > 500 ? 2 : 1;
  const anchoUtil = anchoConPuerta - (nP + 1) * 2;
  const anchoPuerta = anchoUtil / nP;
  const piezas = [];
  for (let i = 0; i < nP; i++) {
    piezas.push({
      id: `${prefijo}_puerta_${i + 1}`,
      ancho: anchoPuerta, alto: H - 4, espesor: gp,
      cantos: ['todos'], cantidad: 1,
      color: colorExterior, cara: 'exterior',
      posicion: { x: zonaCiega + 2 + i * (anchoPuerta + 2), y: 2, z: -gp },
      rotacion: 'vertical_frontal',
    });
  }
  return piezas;
}

// ---------- 2. Rotación 90° del Brazo B hacia el espacio global ----------
// vertical_frontal <-> vertical_profundidad se intercambian (ambos ya usan
// el campo "ancho" para un eje horizontal, solo cambia cuál). Las piezas
// horizontales intercambian directamente ancho<->alto. En los tres casos,
// la posición se pasa de (x,y,z) local a (z,y,x) global.
function rotarPiezaBrazoB(pieza) {
  const { x, y, z } = pieza.posicion;

  if (pieza.rotacion === 'horizontal') {
    return {
      ...pieza,
      id: pieza.id,
      ancho: pieza.alto,
      alto: pieza.ancho,
      posicion: { x: z, y, z: x },
    };
  }

  const nuevaRotacion = pieza.rotacion === 'vertical_frontal' ? 'vertical_profundidad' : 'vertical_frontal';
  return {
    ...pieza,
    rotacion: nuevaRotacion,
    posicion: { x: z, y, z: x },
  };
}

// ---------- 3. Herrajes ----------
function generarHerrajes(p) {
  const herrajes = [];

  const anchoConPuertaA = p.anchoA;
  const anchoConPuertaB = p.anchoB - p.zonaCiega;
  const nPA = anchoConPuertaA > 500 ? 2 : 1;
  const nPB = anchoConPuertaB >= 200 ? (anchoConPuertaB > 500 ? 2 : 1) : 0;
  const totalPuertas = nPA + nPB;

  const bisagrasPorPuerta = p.H > 900 ? 3 : 2;
  herrajes.push({ tipo: 'bisagra_codo', cantidad: totalPuertas * bisagrasPorPuerta });
  herrajes.push({ tipo: 'tirador_o_sistema_push', cantidad: totalPuertas });

  const patas = (p.anchoA + p.anchoB) > 1800 ? 8 : 6; // un apoyo extra cerca de la esquina
  herrajes.push({ tipo: 'pata_regulable', cantidad: patas });
  herrajes.push({ tipo: 'tornillo_golfari', cantidad: 16 });
  herrajes.push({ tipo: 'tarugo_minifix', cantidad: 16 });

  return herrajes;
}

// ---------- 4. Notas de producción ----------
function generarNotas(p) {
  const notas = [
    `Los primeros ${p.zonaCiega}mm del brazo B (junto a la esquina) quedan sin puerta — es la zona "ciega" de difícil acceso. Puede dejarse como espacio muerto o resolverse en obra con un herraje tipo carrusel/canasto giratorio (no incluido en este despiece).`,
    'Los dos brazos comparten la esquina pero son cuerpos independientes: no llevan un panel de esquina compartido en este modelo — revisar en terreno si se necesita un refuerzo o unión adicional donde se encuentran.',
  ];
  return notas;
}

export { generarDespiece };
