import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const NOMBRE_MODULO = {
  bajo_cocina: 'Mueble bajo de cocina',
  alto_cocina: 'Mueble alto de cocina (alacena)',
  vanitorio_bano: 'Vanitorio de baño',
  closet: 'Closet / armario ropero',
  esquinero_bajo_cocina: 'Esquinero bajo de cocina',
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

function Tabla({ columnas, filas }) {
  return (
    <View>
      <View style={styles.headerRow} wrap={false}>
        {columnas.map((c, i) => <Text key={i} style={styles.headerCell}>{c}</Text>)}
      </View>
      {filas.map((fila, i) => (
        <View key={i} style={styles.row} wrap={false}>
          {fila.map((valor, j) => <Text key={j} style={styles.cell}>{valor}</Text>)}
        </View>
      ))}
    </View>
  );
}

function Pie() {
  return (
    <Text style={styles.footer} fixed>
      Despiece — configurador de muebles de melamina · documento generado automáticamente
    </Text>
  );
}

export function crearDocumentoPdf({ nombre, modulo, despiece, corte, imagen3D }) {
  const { piezas = [], accesorios = [], herrajes = [], resumen = {}, notas = [] } = despiece || {};
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
          columnas={['Pieza', 'Ancho (mm)', 'Alto (mm)', 'Esp.', 'Color', 'Cantos']}
          filas={piezas.map(p => [
            p.id,
            String(Math.round(p.ancho)),
            String(Math.round(p.alto)),
            `${p.espesor}mm ${p.material || ''}`.trim(),
            p.color || '—',
            (p.cantos || []).join(', ') || '—',
          ])}
        />

        {accesorios.length > 0 && (
          <View>
            <Text style={styles.h2}>Accesorios (referencia, no se cortan de melamina)</Text>
            <Tabla
              columnas={['Accesorio', 'Descripción', 'Ancho (mm)', 'Profundidad (mm)']}
              filas={accesorios.map(a => [a.id, a.descripcion, String(Math.round(a.ancho)), String(Math.round(a.alto))])}
            />
          </View>
        )}
        <Pie />
      </Page>

      {/* ---------- Página 3: herrajes + material ---------- */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Herrajes</Text>
        <Tabla
          columnas={['Tipo', 'Cantidad']}
          filas={herrajes.map(h => [h.tipo, `${h.cantidad}${h.unidad ? ` ${h.unidad}(es)` : ''}`])}
        />

        <Text style={styles.h2}>Material requerido</Text>
        <Tabla
          columnas={['Grupo (espesor/material/color)', 'm²']}
          filas={Object.entries(resumen).map(([key, m2]) => [key, `${m2} m²`])}
        />
        <Pie />
      </Page>

      {/* ---------- Página 4: diagrama de corte (por plancha) ---------- */}
      {corte && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h2}>Diagrama de corte</Text>
          <Text style={styles.muted}>
            Plancha base: {corte.plancha?.nombre} ({corte.plancha?.ancho}x{corte.plancha?.alto}mm) — {corte.resumen?.totalPlanchas} plancha(s) en total
          </Text>

          {Object.entries(corte.resultadosPorMaterial || {}).map(([grupo, resultado]) => (
            <View key={grupo}>
              <Text style={[styles.h2, { marginTop: 10 }]}>{grupo}</Text>
              {resultado.planchas.map(p => (
                <View key={p.numero} style={styles.planchaBox} wrap={false}>
                  <Text style={styles.planchaTitulo}>
                    Plancha #{p.numero} — aprovechamiento {p.aprovechamientoPct}%
                  </Text>
                  <Text style={styles.nota}>{p.piezas.map(pz => pz.id).join(', ')}</Text>
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
