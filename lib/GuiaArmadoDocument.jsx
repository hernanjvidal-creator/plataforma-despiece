import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Circle, Path } from '@react-pdf/renderer';

// Guía general de armado — genérica, igual para cualquier mueble de
// melamina (no depende de un despiece en particular). Es un PDF aparte
// del entregable específico de cada mueble, y también vive como página
// pública en /guia-armado — mismo contenido en los dos formatos.

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9.5, fontFamily: 'Helvetica', color: '#2b2620' },
  marca: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a8552f', marginBottom: 14 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: '#7a7166', fontSize: 9, marginBottom: 10 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, color: '#a8552f' },
  nota: { fontSize: 8.5, color: '#555', marginBottom: 4 },
  footer: { position: 'absolute', bottom: 20, left: 34, right: 34, fontSize: 7.5, color: '#999', textAlign: 'center' },
  guiaFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  guiaBox: { width: '48%', borderWidth: 0.5, borderColor: '#e7e0d6', borderRadius: 4, padding: 8 },
  guiaTitulo: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 4, color: '#5c3018' },
});

const COLOR_LINEA = '#5c3018';
const COLOR_RELLENO = '#f3e4d9';
const COLOR_BORDE = '#a8552f';

function DiagramaMinifix() {
  return (
    <Svg width={220} height={140}>
      <Rect x={30} y={10} width={16} height={110} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={46} y={94} width={150} height={16} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Line x1={46} y1={102} x2={90} y2={102} stroke={COLOR_LINEA} strokeWidth={2} />
      <Circle cx={90} cy={102} r={7} fill="#fff" stroke={COLOR_LINEA} strokeWidth={1.2} />
      <Circle cx={90} cy={102} r={2.2} fill={COLOR_LINEA} />
      <Path d="M 90 92 A 10 10 0 1 1 82 98" stroke={COLOR_LINEA} strokeWidth={1} fill="none" />
      <Text x={108} y={100} fontSize={7} fill={COLOR_LINEA}>Cazoleta: gira 90°</Text>
      <Text x={108} y={108} fontSize={7} fill={COLOR_LINEA}>para trabar el tarugo</Text>
      <Text x={48} y={72} fontSize={7} fill={COLOR_LINEA}>Tarugo pegado</Text>
      <Text x={48} y={80} fontSize={7} fill={COLOR_LINEA}>a presión en el canto</Text>
    </Svg>
  );
}

function DiagramaConfirmat() {
  return (
    <Svg width={220} height={140}>
      <Rect x={30} y={10} width={16} height={110} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={46} y={50} width={150} height={16} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Line x1={8} y1={58} x2={60} y2={58} stroke={COLOR_LINEA} strokeWidth={2} />
      <Circle cx={8} cy={58} r={3} fill={COLOR_LINEA} />
      <Text x={0} y={38} fontSize={7} fill={COLOR_LINEA}>Avellanar</Text>
      <Text x={0} y={46} fontSize={7} fill={COLOR_LINEA}>la cara</Text>
      <Text x={100} y={38} fontSize={7} fill={COLOR_LINEA}>Tornillo confirmat</Text>
      <Text x={90} y={126} fontSize={7} fill={COLOR_LINEA}>Pre-taladrar el canto para que no raje</Text>
    </Svg>
  );
}

function DiagramaCorredera() {
  return (
    <Svg width={220} height={140}>
      <Rect x={10} y={10} width={14} height={110} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={70} y={40} width={12} height={60} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Line x1={0} y1={70} x2={200} y2={70} stroke="#bbb" strokeWidth={0.6} strokeDasharray="2,2" />
      <Line x1={24} y1={70} x2={70} y2={70} stroke={COLOR_LINEA} strokeWidth={2.2} />
      <Line x1={82} y1={70} x2={140} y2={70} stroke={COLOR_LINEA} strokeWidth={2.2} strokeDasharray="3,2" />
      <Text x={150} y={66} fontSize={7} fill={COLOR_LINEA}>Misma altura</Text>
      <Text x={150} y={74} fontSize={7} fill={COLOR_LINEA}>en ambos lados</Text>
      <Text x={8} y={124} fontSize={7} fill={COLOR_LINEA}>Marcar la altura con regla</Text>
      <Text x={8} y={132} fontSize={7} fill={COLOR_LINEA}>antes de atornillar el riel</Text>
    </Svg>
  );
}

function DiagramaBisagra() {
  return (
    <Svg width={220} height={140}>
      <Rect x={60} y={10} width={70} height={120} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Circle cx={82} cy={30} r={8} fill="#fff" stroke={COLOR_LINEA} strokeWidth={1.2} />
      <Circle cx={82} cy={110} r={8} fill="#fff" stroke={COLOR_LINEA} strokeWidth={1.2} />
      <Line x1={60} y1={30} x2={82} y2={30} stroke="#999" strokeWidth={0.6} strokeDasharray="2,2" />
      <Line x1={82} y1={10} x2={82} y2={30} stroke="#999" strokeWidth={0.6} strokeDasharray="2,2" />
      <Text x={10} y={24} fontSize={7} fill={COLOR_LINEA}>~22mm</Text>
      <Text x={6} y={32} fontSize={7} fill={COLOR_LINEA}>del canto</Text>
      <Text x={140} y={26} fontSize={7} fill={COLOR_LINEA}>~100mm desde</Text>
      <Text x={140} y={34} fontSize={7} fill={COLOR_LINEA}>arriba y abajo</Text>
    </Svg>
  );
}

function DiagramaPataRegulable() {
  return (
    <Svg width={220} height={140}>
      <Line x1={0} y1={120} x2={220} y2={120} stroke="#999" strokeWidth={1.2} />
      <Rect x={60} y={70} width={100} height={20} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={100} y={90} width={8} height={20} fill="#ccc" stroke="#888" strokeWidth={0.8} />
      <Circle cx={104} cy={116} r={9} fill="#ccc" stroke="#888" strokeWidth={0.8} />
      <Path d="M 122 106 A 10 10 0 1 1 116 98" stroke={COLOR_LINEA} strokeWidth={1} fill="none" />
      <Text x={132} y={100} fontSize={7} fill={COLOR_LINEA}>Girar para</Text>
      <Text x={132} y={108} fontSize={7} fill={COLOR_LINEA}>subir/bajar</Text>
      <Text x={8} y={46} fontSize={7} fill={COLOR_LINEA}>Nivelar con nivel de burbuja</Text>
      <Text x={8} y={54} fontSize={7} fill={COLOR_LINEA}>antes de fijar el zócalo</Text>
    </Svg>
  );
}

function DiagramaEscuadraPared() {
  return (
    <Svg width={220} height={140}>
      <Rect x={150} y={0} width={10} height={140} fill="#ddd" stroke="#bbb" strokeWidth={0.6} />
      <Rect x={40} y={30} width={110} height={14} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Path d="M 130 30 L 130 10 L 150 10" stroke={COLOR_LINEA} strokeWidth={2} fill="none" />
      <Circle cx={135} cy={20} r={2} fill={COLOR_LINEA} />
      <Circle cx={150} cy={10} r={2} fill={COLOR_LINEA} />
      <Text x={10} y={70} fontSize={7} fill={COLOR_LINEA}>Escuadra atornillada</Text>
      <Text x={10} y={78} fontSize={7} fill={COLOR_LINEA}>a la traviesa superior</Text>
      <Text x={155} y={90} fontSize={7} fill={COLOR_LINEA}>Taco fischer</Text>
      <Text x={155} y={98} fontSize={7} fill={COLOR_LINEA}>+ tornillo a la pared</Text>
    </Svg>
  );
}

function GuiaItem({ titulo, children }) {
  return (
    <View style={styles.guiaBox} wrap={false}>
      <Text style={styles.guiaTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Pie() {
  return (
    <Text style={styles.footer} fixed>
      Guía general de armado · armandolo.com · aplica a cualquier mueble de melamina
    </Text>
  );
}

export function crearGuiaArmadoPdf() {
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document title="Guía general de armado">
      <Page size="A4" style={styles.page}>
        <Text style={styles.marca}>GUÍA DE ARMADO</Text>
        <Text style={styles.h1}>Cómo armar tu mueble de melamina</Text>
        <Text style={styles.muted}>
          Guía general para cualquier mueble — generada el {fecha}. Los diagramas son esquemáticos, no a escala.
        </Text>

        <Text style={styles.h2}>Uniones entre piezas</Text>
        <View style={styles.guiaFila}>
          <GuiaItem titulo="Tarugo minifix (cajas y cuerpos)"><DiagramaMinifix /></GuiaItem>
          <GuiaItem titulo="Tornillo confirmat"><DiagramaConfirmat /></GuiaItem>
        </View>

        <Text style={styles.h2}>Herrajes móviles</Text>
        <View style={styles.guiaFila}>
          <GuiaItem titulo="Correderas de cajón"><DiagramaCorredera /></GuiaItem>
          <GuiaItem titulo="Bisagras de puerta"><DiagramaBisagra /></GuiaItem>
        </View>

        <Text style={styles.h2}>Consejos para principiantes</Text>
        <Text style={styles.nota}>• Siempre pre-taladra antes de atornillar: sin pre-taladro, la melamina se raja fácil, sobre todo cerca de los cantos.</Text>
        <Text style={styles.nota}>• Usa una broca más delgada que el tornillo (aprox. 2/3 del diámetro) y no taladres más profundo de lo necesario.</Text>
        <Text style={styles.nota}>• Arma primero el cuerpo (laterales + piso + traviesas/techo) en escuadra antes de fijar el respaldo — el respaldo es el que deja todo "cuadrado".</Text>
        <Text style={styles.nota}>• Verifica que el mueble quede a escuadra midiendo las dos diagonales: si miden igual, está cuadrado.</Text>
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Fijación de la estructura</Text>
        <View style={styles.guiaFila}>
          <GuiaItem titulo="Patas regulables (muebles bajos)"><DiagramaPataRegulable /></GuiaItem>
          <GuiaItem titulo="Fijación a la pared (muebles altos/colgados)"><DiagramaEscuadraPared /></GuiaItem>
        </View>

        <Text style={styles.h2}>Consejos para principiantes</Text>
        <Text style={styles.nota}>• Nivela primero el mueble con las patas regulables (o con calzos si no tiene patas) antes de fijarlo a la pared o atornillar el zócalo.</Text>
        <Text style={styles.nota}>• Para colgar un mueble a la pared, ubica los pies derechos (montantes) con un detector o golpeando suave — un taco fischer en yeso cartón sin pillar un montante no aguanta el peso.</Text>
        <Text style={styles.nota}>• En cocina, fija primero los muebles altos y los bajos por separado, a nivel, antes de instalar la cubierta — la cubierta se apoya sobre los bajos ya nivelados.</Text>
        <Text style={styles.nota}>• Deja los herrajes (bisagras, correderas) sin apretar del todo hasta ajustar puertas y cajones parejos, y recién ahí aprieta todo firme.</Text>
        <Pie />
      </Page>
    </Document>
  );
}
