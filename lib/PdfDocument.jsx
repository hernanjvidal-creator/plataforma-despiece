import { Document, Page, Text, View, Image, StyleSheet, Svg, Rect, G } from '@react-pdf/renderer';
import {
  nombradorDePiezas, nombreHerraje, cantidadHerraje, nombreColor, nombreGrupoMaterial, nombreTapacanto, nombreCantos, numero,
  nombreVeta, avisoVetaPlancha,
} from './nombres';

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

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9.5, fontFamily: 'Helvetica', color: '#2b2620' },
  marca: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a8552f', marginBottom: 14 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: '#7a7166', fontSize: 9, marginBottom: 4 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, color: '#a8552f' },
  imagen: { width: '100%', height: 280, objectFit: 'contain', marginVertical: 10, borderWidth: 1, borderColor: '#e7e0d6' },
  headerRow: { flexDirection: 'row', backgroundColor: '#f3e4d9', paddingVertical: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e7e0d6', paddingVertical: 3, paddingHorizontal: 4 },
  headerCell: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  cell: { flex: 1, fontSize: 8.5 },
  nota: { fontSize: 8.5, color: '#555', marginBottom: 4 },
  footer: { position: 'absolute', bottom: 20, left: 34, right: 34, fontSize: 7.5, color: '#999', textAlign: 'center' },
  planchaBox: { borderWidth: 0.5, borderColor: '#e7e0d6', borderRadius: 4, padding: 8, marginBottom: 8 },
  planchaTitulo: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
});

// `anchos` (opcional): peso relativo de cada columna — por defecto todas iguales.
function Tabla({ columnas, filas, anchos }) {
  const flex = j => ({ flex: anchos?.[j] ?? 1 });
  return (
    <View>
      <View style={styles.headerRow} wrap={false}>
        {columnas.map((c, i) => <Text key={i} style={[styles.headerCell, flex(i)]}>{c}</Text>)}
      </View>
      {filas.map((fila, i) => (
        <View key={i} style={styles.row} wrap={false}>
          {fila.map((valor, j) => <Text key={j} style={[styles.cell, flex(j)]}>{valor}</Text>)}
        </View>
      ))}
    </View>
  );
}

// Diagrama de corte gráfico (misma idea que components/DiagramaCorte.jsx en
// pantalla): un rectángulo por plancha con cada pieza dibujada a escala en su
// posición real, en vez de solo listar los nombres en texto — mucho más fácil
// de seguir para armar el corte.
const MAX_ANCHO_DIAGRAMA = 470;
const MAX_ALTO_DIAGRAMA = 600;

function DiagramaPlanchaPdf({ ancho, alto, piezas = [], numeroPorId = {} }) {
  if (!ancho || !alto) return null;
  const escala = Math.min(MAX_ANCHO_DIAGRAMA / ancho, MAX_ALTO_DIAGRAMA / alto);
  const anchoPx = ancho * escala;
  const altoPx = alto * escala;

  return (
    <Svg width={anchoPx} height={altoPx} style={{ marginTop: 4, marginBottom: 4 }}>
      <Rect x={0} y={0} width={anchoPx} height={altoPx} fill="#ffffff" stroke="#e7e0d6" strokeWidth={1} />
      {piezas.map((p, i) => {
        const w = p.ancho * escala;
        const h = p.alto * escala;
        // Cada pieza lleva su N° del listado y, si cabe, la medida de corte.
        const tamanoNumero = Math.max(5, Math.min(13, Math.min(w, h) / 2.2));
        const tamanoMedida = Math.max(4, tamanoNumero * 0.55);
        const cabeMedida = h > tamanoNumero + tamanoMedida + 4 && w > tamanoMedida * 5.5;
        const cx = p.x * escala + w / 2;
        const cy = p.y * escala + h / 2;
        return (
          <G key={i}>
            <Rect x={p.x * escala} y={p.y * escala} width={w} height={h} fill="#f3e4d9" stroke="#a8552f" strokeWidth={1} />
            <Text
              x={cx}
              y={cabeMedida ? cy : cy + tamanoNumero / 3}
              style={{ fontSize: tamanoNumero, fontFamily: 'Helvetica-Bold' }}
              fill="#5c3018"
              textAnchor="middle"
            >
              {String(numeroPorId[p.id] ?? '')}
            </Text>
            {cabeMedida && (
              <Text
                x={cx}
                y={cy + tamanoMedida + 2}
                style={{ fontSize: tamanoMedida }}
                fill="#5c3018"
                textAnchor="middle"
              >
                {Math.round(p.ancho) + ' x ' + Math.round(p.alto)}
              </Text>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function Pie() {
  return (
    <Text style={styles.footer} fixed>
      Armandolo — configurador de muebles de melamina · documento generado automáticamente
    </Text>
  );
}

export function crearDocumentoPdf({ nombre, modulo, despiece, corte, imagen3D }) {
  const { piezas = [], accesorios = [], herrajes = [], resumen = {}, tapacantos = {}, notas = [] } = despiece || {};
  // Los ids de los motores se traducen a nombres legibles; el N° de cada pieza
  // es el mismo con que aparece rotulada en el diagrama de corte.
  const nombrar = nombradorDePiezas(piezas);
  const numeroPorId = Object.fromEntries(piezas.map((p, i) => [p.id, i + 1]));
  const filasTapacanto = Object.entries(tapacantos);
  // La columna de veta solo aparece si el mueble lleva algún color que imita madera.
  const conVeta = piezas.some(p => p.veta);
  // Las patas plásticas se agregan a `accesorios` solo para que se vean en
  // el 3D (dónde van) — ya están contadas en el herraje
  // `pata_plastica_regulable`, así que no deben duplicarse en esta tabla.
  const accesoriosVisibles = accesorios.filter(a => !a.soloVisual);
  const fecha = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Document title={nombre}>
      {/* ---------- Página 1: portada + plano 3D ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.marca}>DESPIECE</Text>
        <Text style={styles.h1}>{nombre}</Text>
        <Text style={styles.muted}>{NOMBRE_MODULO[modulo] || modulo} — generado el {fecha}</Text>

        {imagen3D && <Image src={imagen3D} style={styles.imagen} />}

        {notas.length > 0 && (
          <View>
            <Text style={styles.h2}>Notas de producción</Text>
            {notas.map((n, i) => <Text key={i} style={styles.nota}>• {n}</Text>)}
          </View>
        )}
        <Pie />
      </Page>

      {/* ---------- Página 2: listado de piezas ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Listado de piezas</Text>
        <Tabla
          columnas={['N°', 'Pieza', 'Alto (mm)', 'Ancho (mm)', 'Esp.', 'Color', 'Cantos', ...(conVeta ? ['Veta'] : [])]}
          anchos={[0.35, 2.6, 0.8, 0.8, 0.8, 1.1, 1.5, ...(conVeta ? [0.9] : [])]}
          filas={piezas.map((p, i) => [
            String(i + 1),
            nombrar(p.id),
            String(Math.round(p.alto)),
            String(Math.round(p.ancho)),
            `${p.espesor} mm ${p.material || ''}`.trim(),
            nombreColor(p.color),
            nombreCantos(p.cantos),
            ...(conVeta ? [nombreVeta(p.veta)] : []),
          ])}
        />

        {accesoriosVisibles.length > 0 && (
          <View>
            <Text style={styles.h2}>Accesorios (referencia, no se cortan de melamina)</Text>
            <Tabla
              columnas={['Accesorio', 'Descripción', 'Ancho (mm)', 'Profundidad (mm)']}
              filas={accesoriosVisibles.map(a => [nombrar(a.id), a.descripcion, String(Math.round(a.ancho)), String(Math.round(a.alto))])}
            />
          </View>
        )}
        <Pie />
      </Page>

      {/* ---------- Página 3: herrajes + material ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Herrajes</Text>
        <Tabla
          columnas={['Herraje', 'Cantidad']}
          anchos={[3, 1]}
          filas={herrajes.map(h => [nombreHerraje(h.tipo), cantidadHerraje(h)])}
        />

        <Text style={styles.h2}>Material requerido</Text>
        <Tabla
          columnas={['Tablero', 'm²']}
          anchos={[3, 1]}
          filas={Object.entries(resumen).map(([key, m2]) => [nombreGrupoMaterial(key), `${numero(m2)} m²`])}
        />

        {filasTapacanto.length > 0 && (
          <View>
            <Text style={styles.h2}>Tapacanto</Text>
            <Tabla
              columnas={['Tapacanto', 'Metros']}
              anchos={[3, 1]}
              filas={filasTapacanto.map(([key, metros]) => [nombreTapacanto(key), `${numero(metros)} m`])}
            />
            <Text style={[styles.nota, { marginTop: 4 }]}>
              Suma de los bordes que llevan canto (columna "Cantos" de cada pieza). Compra o cotiza un 10% más, por los despuntes.
            </Text>
          </View>
        )}
        <Pie />
      </Page>

      {/* ---------- Página 4: diagrama de corte (por plancha) ---------- */}
      {corte && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Diagrama de corte</Text>
          <Text style={styles.muted}>
            Plancha base: {corte.plancha?.nombre} ({corte.plancha?.ancho}x{corte.plancha?.alto}mm) — {corte.resumen?.totalPlanchas} plancha(s) en total
          </Text>
          <Text style={styles.muted}>
            El número de cada pieza es su N° en el listado de piezas; debajo va la medida de corte en mm.
          </Text>

          {Object.entries(corte.resultadosPorMaterial || {}).map(([grupo, resultado]) => (
            <View key={grupo}>
              <Text style={[styles.h2, { marginTop: 10 }]}>{nombreGrupoMaterial(grupo)}</Text>
              {resultado.conVeta && <Text style={styles.muted}>{avisoVetaPlancha(corte.ejeVeta)}</Text>}
              {resultado.planchas.map(p => (
                <View key={p.numero} style={styles.planchaBox} wrap={false}>
                  <Text style={styles.planchaTitulo}>
                    Plancha #{p.numero} — aprovechamiento {numero(p.aprovechamientoPct)}%
                  </Text>
                  <DiagramaPlanchaPdf ancho={corte.plancha?.ancho} alto={corte.plancha?.alto} piezas={p.piezas} numeroPorId={numeroPorId} />
                </View>
              ))}
            </View>
          ))}
          <Pie />
        </Page>
      )}
    </Document>
  );
}
