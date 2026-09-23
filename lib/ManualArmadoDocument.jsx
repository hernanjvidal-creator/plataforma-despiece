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

function ListaPiezasPersonalizada({ piezas }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {piezas.map((p, i) => (
        <Text key={i} style={styles.paso}>• {nombrePieza(p)}</Text>
      ))}
    </View>
  );
}

export function crearManualArmadoPdf({ nombre, modulo, despiece }) {
  const { piezas = [], herrajes = [], parametros = {} } = despiece || {};
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

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
  // mecanismo que una puerta abatible) — ver lib/baul.js.
  const puertasAbatibles = esPuertaCorrederaCloset
    ? []
    : [...porPatron(piezas, 'puerta'), ...porPatron(piezas, 'tapa')];

  // Los dos primeros pasos de ORDEN_CUERPO son genéricos ("techo o
  // travesaños, según tu diseño") porque cubren cualquier módulo; acá ya
  // sabemos qué trae ESTE despiece real, así que se reemplazan por la
  // versión exacta (bajo_cocina y vanitorio_bano usan travesaños; el resto
  // — despensa, alacena, closet, velador, librero — usan techo; el baúl no
  // lleva ninguno de los dos en esta etapa, su tapa va sobre bisagras).
  let pasoUbicarBase, pasoUnirLateral;
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
  const pasosOrdenCuerpo = [pasoUbicarBase, pasoUnirLateral, ...ORDEN_CUERPO.slice(2)];

  // ---------- Qué secciones aplican, según los herrajes reales ----------
  const tieneCajones = cajones.length > 0;
  const tienePuertasAbatibles = puertasAbatibles.length > 0;
  const tienePatas = herrajes.some(h => h.tipo === 'pata_regulable');
  const tieneFijacionParedEscuadra = herrajes.some(h => h.tipo === 'escuadra_colgado_pared');
  const tieneFijacionParedTravesano = travesanosTraseros.length > 0;
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

      {/* ---------- Página 2: orden de armado del cuerpo, con piezas reales ---------- */}
      <Page size="A4" style={styles.page}>
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
        <Pie />
      </Page>

      {/* ---------- Página 3: uniones básicas (siempre aplica) ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Uniones entre piezas</Text>
        <Seccion
          titulo="Tornillo directo (confirmat / tornillo 1-5/8)"
          Diagrama={DiagramaConfirmat}
          intro="Todas las uniones entre tableros de melamina de tu mueble (cuerpo, cajas de cajón) se hacen con un tornillo directo a través de la cara de una pieza hacia el canto de la otra."
          pasos={PASOS_CONFIRMAT}
        />
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
          <Seccion titulo="Correderas de cajón y armado de la caja" Diagrama={DiagramaCorredera} pasos={PASOS_CORREDERAS} />
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
      {(tienePatas || tieneFijacionPared) && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Fijación de la estructura</Text>
          {tienePatas && (
            <Seccion titulo="Patas regulables y nivelación" Diagrama={DiagramaPataRegulable} pasos={PASOS_PATAS} />
          )}
          {tieneFijacionParedTravesano && (
            <Seccion
              titulo="Fijación a la pared (a través de los travesaños traseros)"
              Diagrama={DiagramaTravesanoPared}
              intro="Tu mueble no lleva escuadras de colgado: los dos travesaños traseros (superior e inferior) son el punto de fijación real — se atornillan directo a la pared desde dentro del cuerpo."
              pasos={PASOS_FIJACION_TRAVESANO_PARED}
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
