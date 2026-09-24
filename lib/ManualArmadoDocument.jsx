import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  styles, Tabla, DiagramaConfirmat, DiagramaCorredera, DiagramaBisagra,
  DiagramaRielCorredera, DiagramaPataRegulable, DiagramaEscuadraPared, DiagramaTravesanoPared,
  ListaPasos, Seccion,
  HERRAMIENTAS, ANTES_DE_EMPEZAR, ORDEN_CUERPO, PASOS_CONFIRMAT, PASOS_CORREDERAS,
  PASOS_BISAGRAS, PASOS_CORREDIZAS_CLOSET, PASOS_PATAS, PASOS_FIJACION_PARED,
  PASOS_FIJACION_TRAVESANO_PARED, PASOS_MANILLAS, CONSEJOS_FINALES,
} from './pdfArmadoComun';

// Manual de armado PERSONALIZADO — a diferencia de la guía general
// (GuiaArmadoDocument.jsx, igual para cualquier mueble), este se genera a
// partir de un despiece real: solo incluye las secciones que aplican a las
// piezas y herrajes de ESE diseño (si no tiene puertas correderas de
// closet, no aparece esa sección; si no tiene cajones, no aparece la de
// correderas de cajón), y nombra las piezas reales por su id y medida en
// vez de hablar en genérico. El contenido base (diagramas, textos de
// pasos) viene de ./pdfArmadoComun, compartido con la guía general.

const NOMBRE_MODULO = {
  bajo_cocina: 'Mueble cocina',
  alto_cocina: 'Mueble aéreo',
  vanitorio_bano: 'Vanitorio de baño',
  closet: 'Closet / armario ropero',
  despensa: 'Despensa',
  velador: 'Velador',
  escritorio: 'Escritorio',
  librero: 'Librero',
  baul: 'Baúl',
};

// Mueble cocina y mueble aéreo se arman como módulos independientes (cada
// uno su propia caja, atornillados entre sí) — ver lib/muebleBajoCocina.js
// y lib/muebleAltoCocina.js. El resto de los módulos todavía arma un solo
// cuerpo compartido con la lógica de siempre.
const MODULOS_INDEPENDIENTES = ['bajo_cocina', 'alto_cocina'];

const NOMBRE_TIPO_SECCION = {
  lavaplatos: 'lavaplatos',
  lavavajillas: 'lavavajillas',
  horno: 'horno empotrado',
};

function Pie() {
  return (
    <Text style={styles.footer} fixed>
      Manual de armado personalizado · armandolo.com · generado para este diseño específico
    </Text>
  );
}

function nombrePieza(p) {
  return `${p.id} (${Math.round(p.alto)}×${Math.round(p.ancho)}mm)`;
}

// Excluye piezas del zócalo aunque calcen con el patrón (ej. "zocalo_lateral_izq"
// contiene "lateral" pero no es un lateral del cuerpo — se instala junto con las
// patas, en su propia sección).
function porPatron(piezas, patron) {
  return piezas.filter(p => p.id.includes(patron) && !p.id.includes('zocalo'));
}

// Todas las piezas de un mismo cajón (frente + costados + trasera + fondo)
// comparten el campo `grupo` — ver piezasCajasSeccion en cada módulo.
function agruparCajones(piezas) {
  const mapa = new Map();
  piezas.forEach(p => {
    if (!p.grupo) return;
    if (!mapa.has(p.grupo)) mapa.set(p.grupo, []);
    mapa.get(p.grupo).push(p);
  });
  return [...mapa.entries()];
}

// Agrupa las piezas de un despiece de módulos independientes por el
// prefijo "mN_" que les puso trasladarYPrefijar en el motor (ver
// generarDespiece en muebleBajoCocina.js/muebleAltoCocina.js) — así el
// manual describe cada caja por separado, en vez de mezclar los laterales
// y travesaños de todos los módulos en una sola lista como si fueran un
// solo cuerpo. Las piezas sin prefijo (tapas laterales, cubierta) son del
// mueble completo, no de un módulo — quedan fuera de los grupos.
function agruparPorModulo(piezas) {
  const mapa = new Map();
  piezas.forEach(p => {
    const m = p.id.match(/^m(\d+)_/);
    if (!m) return;
    const n = Number(m[1]);
    if (!mapa.has(n)) mapa.set(n, []);
    mapa.get(n).push(p);
  });
  return [...mapa.entries()].sort((a, b) => a[0] - b[0]);
}

// Piezas estructurales de un módulo (laterales, piso, techo, travesaños,
// respaldo) — deja fuera puertas, repisas y cajones, que ya se listan en
// sus propias secciones más adelante en el manual.
function piezasEstructuraDeModulo(piezasMod) {
  const patrones = ['lateral', 'piso', 'techo', 'traviesa', 'travesano', 'respaldo'];
  return piezasMod.filter(p => !p.grupo && patrones.some(pat => p.id.includes(pat)));
}

function ListaPiezasPersonalizada({ piezas }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {piezas.map((p, i) => (
        <Text key={i} style={styles.paso}>• {nombrePieza(p)}</Text>
      ))}
    </View>
  );
}

// ---- Pasos específicos de mueble cocina / mueble aéreo (módulos independientes) ----

const PASOS_MODULAR_BAJO_COCINA_ARMAR = [
  'Arma cada uno de tus módulos por separado, uno a la vez — no los unas todavía entre sí.',
  'En cada módulo, parte por el piso: apóyalo y únelo a los dos laterales con tornillo directo (confirmat o tornillo 1-5/8), sin apretar del todo.',
  'Une los travesaños (delantero y trasero) a los mismos dos laterales, cerrando la caja de ese módulo, y clava o atornilla su respaldo.',
  'Con el módulo todavía abierto y fácil de manipular, aprovecha para dejar hechos los orificios de bisagra de sus puertas, y atornillar en sus laterales las placas de bisagra, las escuadras de repisa o los rieles de corredera que correspondan — mucho más cómodo ahora que una vez unido a sus vecinos.',
  'Atornilla las 4 patas plásticas regulables en la base de ese módulo, por debajo del piso.',
  'Repite los pasos anteriores con cada uno de tus módulos restantes.',
];

const PASOS_MODULAR_BAJO_COCINA_UNIR = [
  'Ubica tus módulos ya armados en el orden de tu diseño, de izquierda a derecha.',
  'Une cada módulo con su vecino, lateral con lateral, con tornillo de 30mm (ver la sección de uniones más adelante) — al menos 6 tornillos por unión, repartidos en distintas alturas.',
  'Atornilla los dos laterales de tapa en los dos extremos del mueble completo, también con tornillo de 30mm, desde ADENTRO del cuerpo hacia afuera para que no se vea ninguna cabeza de tornillo por fuera.',
  'Cuelga las puertas de cada módulo en las bisagras que ya dejaste instaladas (ver la sección de bisagras para el detalle de ajuste).',
  'Instala las repisas (apoyadas en las escuadras) y los cajones — arma cada caja de cajón por separado primero, ver la sección de cajones más adelante.',
  'Ubica el mueble completo en su posición final y nivélalo con las patas antes de seguir — nivelar y después mover el mueble puede desnivelarlo de nuevo.',
  'Instala el zócalo de aluminio en el frente del mueble, retranqueado unos 5cm hacia atrás del borde delantero — no va a ras del frente.',
];

const PASOS_MODULAR_ALTO_COCINA_ARMAR = [
  'Arma cada uno de tus módulos por separado, uno a la vez — no los unas todavía entre sí.',
  'En cada módulo, une el piso y el techo a los dos laterales con tornillo directo (confirmat o tornillo 1-5/8), sin apretar del todo.',
  'Une los travesaños (delantero y trasero) a los mismos dos laterales, cerrando la caja de ese módulo, y clava o atornilla su respaldo.',
  'Con el módulo todavía abierto y fácil de manipular, aprovecha para dejar hechos los orificios de bisagra de sus puertas, y atornillar en sus laterales las placas de bisagra o las escuadras de repisa que correspondan.',
  'Repite los pasos anteriores con cada uno de tus módulos restantes.',
];

const PASOS_MODULAR_ALTO_COCINA_UNIR = [
  'Ubica tus módulos ya armados en el orden de tu diseño, de izquierda a derecha, y únelos entre sí, lateral con lateral, con tornillo de 30mm — al menos 6 tornillos por unión.',
  'Con ayuda de otra persona (o un soporte temporal), levanta el conjunto ya unido hasta su posición final en la pared — no lo sueltes sin fijar.',
  'Fija el conjunto a la pared atornillando directo desde dentro de CADA módulo, a través de su propio travesaño trasero (ver la sección de fijación a pared más adelante) — cada módulo es su propio punto de anclaje, no dependas solo del módulo del centro.',
  'Atornilla los dos laterales de tapa en los dos extremos del mueble completo, con tornillo de 30mm desde ADENTRO del cuerpo hacia afuera.',
  'Cuelga las puertas de cada módulo en las bisagras que ya dejaste instaladas.',
  'Instala las repisas interiores, apoyadas en las escuadras que ya dejaste puestas.',
];

const PASOS_UNION_MODULOS = [
  'Alinea las caras de los dos módulos (o del módulo y su lateral de tapa) a la misma altura, apoyados en una superficie plana y nivelada.',
  'Marca al menos 3 alturas distintas a lo largo de la unión (por ejemplo junto al piso, al centro y junto a la parte de arriba), separadas unos 5cm de cada borde para no astillar.',
  'Pre-taladra ambas piezas en cada marca, igual que con el tornillo confirmat (broca fina en la pieza que se atraviesa, sin pasar de profundidad en el canto que recibe el tornillo).',
  'Atornilla con tornillo de 30mm en cada marca — al menos 6 tornillos repartidos en las distintas alturas por cada unión.',
  'Para los laterales de tapa: atornilla siempre desde ADENTRO del cuerpo hacia afuera, para que ninguna cabeza de tornillo quede a la vista en su cara exterior.',
];

const PASOS_FIJACION_TRAVESANO_PARED_MODULAR = [
  'Ubica los pies derechos o montantes de la pared con un detector, o golpeando suave con los nudillos y escuchando el cambio de sonido (hueco vs. macizo) si no tienes detector.',
  'Con el conjunto de módulos ya unidos entre sí y sostenido en su posición final (pide ayuda o apóyalo sobre un soporte temporal — no lo sueltes sin fijar), marca en la pared la altura del travesaño trasero de cada módulo, mirando por dentro del cuerpo, con nivel de burbuja.',
  'Verifica el tipo de muro (albañilería, hormigón, tabique de yeso-cartón) para elegir el taco correcto — un taco para yeso-cartón no sirve en hormigón, ni al revés.',
  'Taladra la pared con la broca indicada para ese taco e insértalo con un golpe suave de martillo si es necesario.',
  'Atornilla directo desde dentro de CADA módulo, a través de su propio travesaño trasero y hacia el taco en la pared — no lleva escuadras intermedias, el travesaño mismo es el punto de fijación.',
  'Usa al menos 2 tornillos por travesaño (uno cerca de cada lateral del módulo).',
  'Repite en TODOS los módulos — no dependas solo del anclaje de uno o dos módulos para sostener todo el conjunto.',
  'Verifica la fijación tirando suavemente del borde inferior del mueble hacia adelante, en varios puntos a lo ancho — no debería moverse ni separarse de la pared en ningún módulo.',
  'Si el muro es de yeso-cartón y no hay un montante donde lo necesitas, usa tacos especiales con garra (tipo mariposa o metálicos de expansión) — nunca tacos plásticos comunes en muebles con peso.',
];

export function crearManualArmadoPdf({ nombre, modulo, despiece }) {
  const { piezas = [], herrajes = [], parametros = {} } = despiece || {};
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const esModular = MODULOS_INDEPENDIENTES.includes(modulo);

  // ---------- Categorización de piezas del cuerpo ----------
  const laterales = porPatron(piezas, 'lateral');
  const piso = porPatron(piezas, 'piso');
  const techo = porPatron(piezas, 'techo');
  const traviesas = porPatron(piezas, 'traviesa');
  // Los travesaños traseros del mueble aéreo son un patrón distinto de las
  // "traviesa_trasera*" de mueble cocina/vanitorio: ahí son delantero+trasero
  // y sirven de apoyo a la cubierta o cajones; acá son superior+inferior y
  // son el punto real de fijación a la pared (no hay escuadra_colgado_pared).
  const travesanosTraseros = porPatron(piezas, 'travesano_trasero');
  const divisores = porPatron(piezas, 'divisor');
  const respaldo = porPatron(piezas, 'respaldo');
  const cajones = agruparCajones(piezas);
  const tipoPuertaCloset = parametros?.tipoPuerta;
  const esPuertaCorrederaCloset = tipoPuertaCloset === 'corredera';
  const puertasCorrederasCloset = esPuertaCorrederaCloset ? porPatron(piezas, 'puerta') : [];
  // La tapa del baúl también va sobre bisagras de cierre suave (mismo
  // mecanismo que una puerta abatible) — ver lib/baul.js. Ojo: se compara
  // por id EXACTO ("tapa"), no por substring — "tapa_lateral_izq/der" de
  // mueble cocina/aéreo también contienen "tapa" pero son paneles fijos
  // atornillados (ver tapasLaterales más abajo), no puertas con bisagra.
  const puertasAbatibles = esPuertaCorrederaCloset
    ? []
    : [...porPatron(piezas, 'puerta'), ...piezas.filter(p => p.id === 'tapa')];

  // ---------- Módulos independientes (mueble cocina / mueble aéreo) ----------
  const modulosIndependientes = esModular ? agruparPorModulo(piezas) : [];
  const tapasLaterales = esModular
    ? piezas.filter(p => p.id === 'tapa_lateral_izq' || p.id === 'tapa_lateral_der')
    : [];

  // Los dos primeros pasos de ORDEN_CUERPO son genéricos ("techo o
  // travesaños, según tu diseño") porque cubren cualquier módulo; acá ya
  // sabemos qué trae ESTE despiece real, así que se reemplazan por la
  // versión exacta (vanitorio_bano usa travesaños; despensa, closet, velador
  // y librero usan techo; el baúl no lleva ninguno de los dos en esta etapa,
  // su tapa va sobre bisagras). Mueble cocina y mueble aéreo no pasan por
  // acá: arman un cuerpo por módulo, con su propio orden — ver más abajo.
  let pasoUbicarBase, pasoUnirLateral;
  if (!esModular) {
    if (techo.length > 0 && travesanosTraseros.length > 0) {
      pasoUbicarBase = 'Ubica las piezas base: los dos laterales, el piso, el techo y los dos travesaños traseros (van por dentro, pegados a la parte de atrás: uno arriba y otro abajo).';
      pasoUnirLateral = 'Une primero un lateral al piso, al techo y a los dos travesaños traseros con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.';
    } else if (techo.length > 0 && traviesas.length > 0) {
      pasoUbicarBase = 'Ubica las piezas base: los dos laterales, el piso, el techo y los travesaños traseros de refuerzo (uno junto al techo y otro junto al piso — y uno intermedio si tu mueble es alto).';
      pasoUnirLateral = 'Une primero un lateral al piso, al techo y a cada travesaño trasero de refuerzo con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.';
    } else if (techo.length > 0) {
      pasoUbicarBase = 'Ubica las piezas base: los dos laterales, el piso y el techo.';
      pasoUnirLateral = 'Une primero un lateral al piso y al techo con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.';
    } else if (traviesas.length > 0) {
      pasoUbicarBase = 'Ubica las piezas base: los dos laterales, el piso y los travesaños (delantero y trasero).';
      pasoUnirLateral = 'Une primero un lateral al piso y a los travesaños (delantero y trasero) con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.';
    } else {
      pasoUbicarBase = 'Ubica las piezas base: los dos laterales y el piso.';
      pasoUnirLateral = 'Une primero un lateral al piso con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.';
    }
  }
  const pasosOrdenCuerpo = esModular ? [] : [pasoUbicarBase, pasoUnirLateral, ...ORDEN_CUERPO.slice(2)];

  // ---------- Qué secciones aplican, según los herrajes reales ----------
  const tieneCajones = cajones.length > 0;
  const tienePuertasAbatibles = puertasAbatibles.length > 0;
  // "pata_regulable" (despensa, vanitorio) y "pata_plastica_regulable"
  // (mueble cocina, desde el rediseño modular) son el mismo tipo de
  // herraje con nombres distintos según el módulo.
  const tienePatas = herrajes.some(h => h.tipo === 'pata_regulable' || h.tipo === 'pata_plastica_regulable');
  // En mueble cocina las patas ya quedan cubiertas paso a paso en el orden
  // de armado modular (junto con el zócalo de aluminio, que reemplazó al
  // zócalo de melamina a presión de PASOS_PATAS) — no repetir la sección
  // genérica acá.
  const mostrarPatasGenerico = tienePatas && modulo !== 'bajo_cocina';
  const tieneFijacionParedEscuadra = herrajes.some(h => h.tipo === 'escuadra_colgado_pared');
  // Requiere además el taco fischer: mueble cocina también tiene piezas
  // "travesano_trasero" (refuerzo estructural, no se atornilla a la pared)
  // — sin este chequeo, el manual le pedía a un mueble de piso que se
  // fijara al muro.
  const tieneFijacionParedTravesano = travesanosTraseros.length > 0 && herrajes.some(h => h.tipo === 'taco_fischer_tornillo');
  const tieneFijacionPared = tieneFijacionParedEscuadra || tieneFijacionParedTravesano;
  const tieneManillas = herrajes.some(h => h.tipo.includes('manilla'));
  const tieneCubierta = !!parametros?.cubierta?.incluir;

  return (
    <Document title={`Manual de armado — ${nombre}`}>
      {/* ---------- Página 1: portada + herramientas + herrajes reales ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.marca}>MANUAL DE ARMADO</Text>
        <Text style={styles.h1}>{nombre}</Text>
        <Text style={styles.muted}>
          {NOMBRE_MODULO[modulo] || modulo} — generado el {fecha}
        </Text>
        <Text style={styles.intro}>
          Este manual está armado específicamente para tu diseño: solo incluye los pasos que aplican a
          las piezas y herrajes de tu despiece (por ejemplo, si tu mueble no tiene puertas correderas,
          esa sección no aparece). Los diagramas son esquemáticos, no a escala.
        </Text>

        <Text style={styles.h2}>Herramientas necesarias</Text>
        <View style={styles.herramientasCaja}>
          {HERRAMIENTAS.map((t, i) => (
            <Text key={i} style={styles.paso}>• {t}</Text>
          ))}
        </View>

        <Text style={styles.h2}>Herrajes de tu despiece</Text>
        <Text style={styles.intro}>Cuenta que tengas todo esto antes de empezar a armar.</Text>
        <Tabla
          columnas={['Tipo', 'Cantidad']}
          filas={herrajes.map(h => [h.tipo, `${h.cantidad}${h.unidad ? ` ${h.unidad}(es)` : ''}`])}
        />

        <Text style={styles.h2}>Preparación</Text>
        <ListaPasos items={ANTES_DE_EMPEZAR} />
        <Pie />
      </Page>

      {/* ---------- Página 2: orden de armado ---------- */}
      <Page size="A4" style={styles.page}>
        {esModular ? (
          <>
            <Text style={styles.h2}>Orden de armado — módulo por módulo</Text>
            <Text style={styles.intro}>
              Tu mueble se arma como {modulosIndependientes.length} caja{modulosIndependientes.length === 1 ? '' : 's'} independiente{modulosIndependientes.length === 1 ? '' : 's'} que
              después se atornillan entre sí — arma cada módulo por separado antes de unirlos.
            </Text>
            {modulosIndependientes.map(([n, piezasMod]) => {
              const estructura = piezasEstructuraDeModulo(piezasMod);
              if (estructura.length === 0) return null;
              const seccionInfo = parametros?.secciones?.[n - 1];
              const etiquetaTipo = seccionInfo?.tipo && NOMBRE_TIPO_SECCION[seccionInfo.tipo];
              return (
                <View key={n} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={styles.h3}>Módulo {n}{etiquetaTipo ? ` — ${etiquetaTipo}` : ''}</Text>
                  <ListaPiezasPersonalizada piezas={estructura} />
                </View>
              );
            })}
            <ListaPasos items={modulo === 'bajo_cocina' ? PASOS_MODULAR_BAJO_COCINA_ARMAR : PASOS_MODULAR_ALTO_COCINA_ARMAR} />

            <Text style={styles.h3}>Une los módulos y termina el mueble</Text>
            {tapasLaterales.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={{ ...styles.paso, marginBottom: 4 }}>Laterales de tapa (van una sola vez, en los dos extremos del mueble completo):</Text>
                <ListaPiezasPersonalizada piezas={tapasLaterales} />
              </View>
            )}
            <ListaPasos items={modulo === 'bajo_cocina' ? PASOS_MODULAR_BAJO_COCINA_UNIR : PASOS_MODULAR_ALTO_COCINA_UNIR} />

            {modulo === 'bajo_cocina' && (
              <>
                <Text style={styles.nota}>Con esto tu mueble queda listo para que te instalen la cubierta.</Text>
                <Text style={styles.nota}>
                  Este mueble está diseñado para una cubierta SIN faldón (nariz/frente). Si quieres ese
                  detalle estético, agrega 2 travesaños o listones de melamina acostados en la parte de
                  arriba del mueble (suman 30mm de alto) y apoya la cubierta sobre ellos — queda
                  correctamente, aunque el mueble será 3cm más alto que la medida original.
                </Text>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.h2}>Orden de armado del cuerpo</Text>
            <Text style={styles.intro}>Las piezas de la estructura de tu mueble son:</Text>
            {laterales.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Laterales</Text>
                <ListaPiezasPersonalizada piezas={laterales} />
              </View>
            )}
            {piso.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Piso</Text>
                <ListaPiezasPersonalizada piezas={piso} />
              </View>
            )}
            {techo.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Techo</Text>
                <ListaPiezasPersonalizada piezas={techo} />
              </View>
            )}
            {traviesas.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Travesaños</Text>
                <ListaPiezasPersonalizada piezas={traviesas} />
              </View>
            )}
            {travesanosTraseros.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Travesaños traseros (fijación a pared)</Text>
                <ListaPiezasPersonalizada piezas={travesanosTraseros} />
              </View>
            )}
            {divisores.length > 0 && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.h3}>Separadores interiores</Text>
                <ListaPiezasPersonalizada piezas={divisores} />
              </View>
            )}

            <ListaPasos items={pasosOrdenCuerpo} />

            {respaldo.length > 0 && (
              <View>
                <Text style={styles.h3}>Respaldo (va al final, ver último paso arriba)</Text>
                <ListaPiezasPersonalizada piezas={respaldo} />
              </View>
            )}

            {tieneCubierta && (
              <Text style={styles.nota}>
                Tu mueble incluye cubierta: instálala recién cuando el cuerpo esté armado, a escuadra y
                nivelado — apóyala y atorníllala desde abajo con tornillos cortos, sin atravesar la superficie.
              </Text>
            )}
          </>
        )}
        <Pie />
      </Page>

      {/* ---------- Página 3: uniones básicas (siempre aplica) ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Uniones entre piezas</Text>
        <Seccion
          titulo="Tornillo directo (confirmat / tornillo 1-5/8)"
          Diagrama={DiagramaConfirmat}
          intro={esModular
            ? 'Dentro de cada módulo (piso, laterales, travesaños) y en las cajas de cajón, las uniones se hacen con un tornillo directo a través de la cara de una pieza hacia el canto de la otra.'
            : 'Todas las uniones entre tableros de melamina de tu mueble (cuerpo, cajas de cajón) se hacen con un tornillo directo a través de la cara de una pieza hacia el canto de la otra.'}
          pasos={PASOS_CONFIRMAT}
        />
        {esModular && (
          <Seccion
            titulo="Unión entre módulos y laterales de tapa (tornillo de 30mm)"
            Diagrama={DiagramaConfirmat}
            intro="Cada módulo es una caja independiente: se atornilla a su vecino lateral con lateral, y los dos laterales de tapa de los extremos del mueble se unen de la misma forma. Como son 2 tableros delgados cara contra canto, se usa un tornillo más corto que el confirmat/1-5/8: de 30mm."
            pasos={PASOS_UNION_MODULOS}
          />
        )}
        <Pie />
      </Page>

      {/* ---------- Cajones (solo si el despiece tiene) ---------- */}
      {tieneCajones && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Tus cajones</Text>
          {cajones.map(([grupo, piezasGrupo]) => (
            <View key={grupo} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={styles.h3}>{grupo}</Text>
              <ListaPiezasPersonalizada piezas={piezasGrupo} />
            </View>
          ))}
          <Seccion
            titulo="Correderas de cajón y armado de la caja"
            Diagrama={DiagramaCorredera}
            intro={esModular ? 'Si ya dejaste atornillada la parte fija de cada corredera al armar el módulo, salta directo al armado de la caja.' : undefined}
            pasos={PASOS_CORREDERAS}
          />
          <Pie />
        </Page>
      )}

      {/* ---------- Puertas abatibles con bisagra (solo si el despiece tiene) ---------- */}
      {tienePuertasAbatibles && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>{modulo === 'baul' ? 'Tu tapa' : 'Tus puertas'}</Text>
          <ListaPiezasPersonalizada piezas={puertasAbatibles} />
          <Seccion
            titulo={modulo === 'baul' ? 'Bisagras de cierre suave de la tapa' : 'Bisagras de puerta abatible'}
            Diagrama={DiagramaBisagra}
            intro={esModular ? 'Si ya dejaste perforadas las cazoletas y atornilladas las placas al armar cada módulo, acá tienes el detalle para colgar y ajustar cada puerta.' : undefined}
            pasos={PASOS_BISAGRAS}
          />
          <Pie />
        </Page>
      )}

      {/* ---------- Puertas correderas de closet (solo si tipoPuerta === 'corredera') ---------- */}
      {esPuertaCorrederaCloset && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Tus puertas correderas</Text>
          <ListaPiezasPersonalizada piezas={puertasCorrederasCloset} />
          <Seccion
            titulo="Instalación de riel y puertas corredizas"
            Diagrama={DiagramaRielCorredera}
            diagramaAncho={230}
            diagramaAlto={146}
            pasos={PASOS_CORREDIZAS_CLOSET}
          />
          <Pie />
        </Page>
      )}

      {/* ---------- Patas y/o fijación a pared (solo si aplica) ---------- */}
      {(mostrarPatasGenerico || tieneFijacionPared) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Fijación de la estructura</Text>
          {mostrarPatasGenerico && (
            <Seccion titulo="Patas regulables y nivelación" Diagrama={DiagramaPataRegulable} pasos={PASOS_PATAS} />
          )}
          {tieneFijacionParedTravesano && (
            <Seccion
              titulo="Fijación a la pared (a través de los travesaños traseros)"
              Diagrama={DiagramaTravesanoPared}
              intro={esModular
                ? 'Tu mueble no lleva escuadras de colgado: cada módulo tiene su propio travesaño trasero, y ES su punto de fijación real — se atornilla directo a la pared desde dentro de CADA módulo por separado, no solo desde uno.'
                : 'Tu mueble no lleva escuadras de colgado: los dos travesaños traseros (superior e inferior) son el punto de fijación real — se atornillan directo a la pared desde dentro del cuerpo.'}
              pasos={esModular ? PASOS_FIJACION_TRAVESANO_PARED_MODULAR : PASOS_FIJACION_TRAVESANO_PARED}
            />
          )}
          {tieneFijacionParedEscuadra && (
            <Seccion titulo="Fijación a la pared" Diagrama={DiagramaEscuadraPared} pasos={PASOS_FIJACION_PARED} />
          )}
          <Pie />
        </Page>
      )}

      {/* ---------- Manillas + consejos finales (siempre) ---------- */}
      <Page size="A4" style={styles.page}>
        {tieneManillas && (
          <View>
            <Text style={styles.h2}>Manillas y tiradores</Text>
            <ListaPasos items={PASOS_MANILLAS} />
          </View>
        )}
        <Text style={styles.h2}>Consejos para principiantes</Text>
        {CONSEJOS_FINALES.map((t, i) => (
          <Text key={i} style={styles.nota}>• {t}</Text>
        ))}
        <Pie />
      </Page>
    </Document>
  );
}
