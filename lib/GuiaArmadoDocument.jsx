import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  styles, DiagramaConfirmat, DiagramaCorredera, DiagramaBisagra,
  DiagramaRielCorredera, DiagramaPataRegulable, DiagramaEscuadraPared, ListaPasos, Seccion,
  HERRAMIENTAS, ANTES_DE_EMPEZAR, ORDEN_CUERPO, PASOS_CONFIRMAT, PASOS_CORREDERAS,
  PASOS_BISAGRAS, PASOS_CORREDIZAS_CLOSET, PASOS_PATAS, PASOS_FIJACION_PARED, PASOS_MANILLAS,
  CONSEJOS_FINALES,
} from './pdfArmadoComun';

// Guía general de armado — genérica, igual para cualquier mueble de
// melamina (no depende de un despiece en particular). Es un PDF aparte
// del entregable específico de cada mueble, y también vive como página
// pública en /guia-armado — mismo contenido en los dos formatos. El
// contenido en sí (diagramas y textos de pasos) vive en ./pdfArmadoComun,
// compartido con el manual de armado personalizado (ManualArmadoDocument.jsx).

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
          Guía general y detallada, paso a paso, para cualquier mueble de melamina — generada el {fecha}.
          Los diagramas son esquemáticos, no a escala.
        </Text>

        <Text style={styles.h2}>Antes de empezar</Text>
        <Text style={styles.h3}>Herramientas necesarias</Text>
        <View style={styles.herramientasCaja}>
          {HERRAMIENTAS.map((t, i) => (
            <Text key={i} style={styles.paso}>• {t}</Text>
          ))}
        </View>
        <Text style={styles.h3}>Preparación</Text>
        <ListaPasos items={ANTES_DE_EMPEZAR} />

        <Text style={styles.h2}>Orden de armado del cuerpo</Text>
        <ListaPasos items={ORDEN_CUERPO} />
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Uniones entre piezas</Text>
        <Seccion
          titulo="Tornillo directo (confirmat / tornillo 1-5/8)"
          Diagrama={DiagramaConfirmat}
          intro="Todas las uniones entre tableros de melamina (cuerpo, cajas de cajón) se hacen con un tornillo directo a través de la cara de una pieza hacia el canto de la otra — el tipo exacto (confirmat o tornillo 1-5/8) depende de tu despiece, pero se instalan igual."
          pasos={PASOS_CONFIRMAT}
        />
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Cajones y puertas abatibles</Text>
        <Seccion titulo="Correderas de cajón y armado de la caja" Diagrama={DiagramaCorredera} pasos={PASOS_CORREDERAS} />
        <Seccion titulo="Bisagras de puerta abatible" Diagrama={DiagramaBisagra} pasos={PASOS_BISAGRAS} />
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Puertas correderas para closet</Text>
        <Seccion
          titulo="Instalación de riel y puertas corredizas"
          Diagrama={DiagramaRielCorredera}
          diagramaAncho={230}
          diagramaAlto={146}
          intro="A diferencia de las puertas abatibles con bisagra, los closets suelen usar puertas correderas que se deslizan sobre un riel. Esta sección aplica si tu proyecto incluye ese sistema."
          pasos={PASOS_CORREDIZAS_CLOSET}
        />
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Fijación de la estructura</Text>
        <Seccion titulo="Patas regulables y nivelación" Diagrama={DiagramaPataRegulable} pasos={PASOS_PATAS} />
        <Seccion titulo="Fijación a la pared (muebles altos o colgados)" Diagrama={DiagramaEscuadraPared} pasos={PASOS_FIJACION_PARED} />
        <Pie />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Manillas y tiradores</Text>
        <ListaPasos items={PASOS_MANILLAS} />

        <Text style={styles.h2}>Consejos para principiantes</Text>
        {CONSEJOS_FINALES.map((t, i) => (
          <Text key={i} style={styles.nota}>• {t}</Text>
        ))}
        <Pie />
      </Page>
    </Document>
  );
}
