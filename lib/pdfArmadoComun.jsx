import { Text, View, StyleSheet, Svg, Rect, Line, Circle, Path } from '@react-pdf/renderer';

// Contenido compartido entre la guía general de armado (lib/GuiaArmadoDocument.jsx,
// igual para cualquier mueble) y el manual de armado personalizado
// (lib/ManualArmadoDocument.jsx, generado por despiece) — mismos diagramas y
// mismos textos de pasos, para no mantener dos copias que se puedan desalinear.

export const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9.5, fontFamily: 'Helvetica', color: '#2b2620' },
  marca: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#a8552f', marginBottom: 14 },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: '#7a7166', fontSize: 9, marginBottom: 10 },
  h2: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, color: '#a8552f' },
  h3: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 5, color: '#5c3018' },
  intro: { fontSize: 9, color: '#4a443c', marginBottom: 6, lineHeight: 1.4 },
  paso: { fontSize: 9, color: '#2b2620', marginBottom: 3, lineHeight: 1.35 },
  nota: { fontSize: 8.5, color: '#555', marginBottom: 4 },
  footer: { position: 'absolute', bottom: 20, left: 34, right: 34, fontSize: 7.5, color: '#999', textAlign: 'center' },
  diagramaBox: { alignItems: 'center', marginBottom: 6 },
  herramientasCaja: { borderWidth: 0.5, borderColor: '#e7e0d6', borderRadius: 4, padding: 8, marginBottom: 10 },
  headerRow: { flexDirection: 'row', backgroundColor: '#f3e4d9', paddingVertical: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e7e0d6', paddingVertical: 3, paddingHorizontal: 4 },
  headerCell: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  cell: { flex: 1, fontSize: 8.5 },
});

export const COLOR_LINEA = '#5c3018';
export const COLOR_RELLENO = '#f3e4d9';
export const COLOR_BORDE = '#a8552f';

export function Tabla({ columnas, filas }) {
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

export function DiagramaConfirmat({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
      <Rect x={30} y={10} width={16} height={110} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={46} y={50} width={150} height={16} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Line x1={8} y1={58} x2={60} y2={58} stroke={COLOR_LINEA} strokeWidth={2} />
      <Circle cx={8} cy={58} r={3} fill={COLOR_LINEA} />
      <Text x={0} y={38} fontSize={7} fill={COLOR_LINEA}>Avellanar</Text>
      <Text x={0} y={46} fontSize={7} fill={COLOR_LINEA}>la cara</Text>
      <Text x={100} y={38} fontSize={7} fill={COLOR_LINEA}>Tornillo directo</Text>
      <Text x={90} y={126} fontSize={7} fill={COLOR_LINEA}>Pre-taladrar el canto para que no raje</Text>
    </Svg>
  );
}

export function DiagramaCorredera({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
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

export function DiagramaBisagra({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
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

export function DiagramaRielCorredera({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
      <Text x={2} y={8} fontSize={6.5} fill={COLOR_LINEA}>Riel superior: la rueda cuelga la puerta</Text>
      <Rect x={10} y={14} width={200} height={7} fill="#ccc" stroke="#888" strokeWidth={0.8} />
      <Circle cx={30} cy={11} r={4} fill="#fff" stroke={COLOR_LINEA} strokeWidth={1} />
      <Circle cx={190} cy={11} r={4} fill="#fff" stroke={COLOR_LINEA} strokeWidth={1} />
      <Rect x={14} y={22} width={100} height={90} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={100} y={22} width={106} height={90} fill={COLOR_RELLENO} fillOpacity={0.55} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={10} y={114} width={200} height={6} fill="#ddd" stroke="#bbb" strokeWidth={0.6} />
      <Text x={2} y={128} fontSize={7} fill={COLOR_LINEA}>Traslape 20-30mm al centro</Text>
      <Text x={128} y={128} fontSize={7} fill={COLOR_LINEA}>Guía inferior: solo de tope</Text>
    </Svg>
  );
}

export function DiagramaPataRegulable({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
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

export function DiagramaEscuadraPared({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
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

export function DiagramaTravesanoPared({ w = 220, h = 140 }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 220 140">
      <Rect x={150} y={0} width={10} height={140} fill="#ddd" stroke="#bbb" strokeWidth={0.6} />
      <Rect x={40} y={18} width={110} height={18} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Rect x={40} y={104} width={110} height={18} fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth={1} />
      <Line x1={95} y1={27} x2={155} y2={27} stroke={COLOR_LINEA} strokeWidth={2} />
      <Circle cx={155} cy={27} r={2.5} fill={COLOR_LINEA} />
      <Line x1={95} y1={113} x2={155} y2={113} stroke={COLOR_LINEA} strokeWidth={2} />
      <Circle cx={155} cy={113} r={2.5} fill={COLOR_LINEA} />
      <Text x={2} y={13} fontSize={7} fill={COLOR_LINEA}>Travesaño superior</Text>
      <Text x={2} y={98} fontSize={7} fill={COLOR_LINEA}>Travesaño inferior</Text>
      <Text x={160} y={60} fontSize={7} fill={COLOR_LINEA}>Tornillo directo</Text>
      <Text x={160} y={68} fontSize={7} fill={COLOR_LINEA}>desde adentro,</Text>
      <Text x={160} y={76} fontSize={7} fill={COLOR_LINEA}>al taco fischer</Text>
      <Text x={160} y={84} fontSize={7} fill={COLOR_LINEA}>en el muro</Text>
    </Svg>
  );
}

export function ListaPasos({ items }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {items.map((texto, i) => (
        <Text key={i} style={styles.paso}>{i + 1}. {texto}</Text>
      ))}
    </View>
  );
}

export function Seccion({ titulo, Diagrama, diagramaAncho = 200, diagramaAlto = 127, intro, pasos }) {
  return (
    <View wrap={false}>
      <Text style={styles.h3}>{titulo}</Text>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
      {Diagrama ? (
        <View style={styles.diagramaBox}>
          <Diagrama w={diagramaAncho} h={diagramaAlto} />
        </View>
      ) : null}
      <ListaPasos items={pasos} />
    </View>
  );
}

// ---- Textos de cada sección (comunes a la guía general y al manual personalizado) ----

export const HERRAMIENTAS = [
  'Taladro/atornillador inalámbrico (18V recomendado)',
  'Set de brocas: 3mm (piloto de tornillos de montaje), 5mm (tornillo 1-5/8 y confirmat) y 8mm (patas)',
  'Broca avellanadora, para esconder cabezas de tornillo',
  'Destornillador Phillips manual, de respaldo',
  'Mazo de goma',
  'Nivel de burbuja (idealmente de 40cm o más)',
  'Huincha de medir (flexómetro)',
  'Lápiz de carpintero y escuadra',
  'Detector de montantes (o golpear suave y escuchar el sonido) para fijar a la pared',
  'Tacos y tornillos para pared, según el tipo de muro (albañilería, hormigón o tabique)',
];

export const ANTES_DE_EMPEZAR = [
  'Despeja una superficie de trabajo plana y amplia; protege el piso con cartón o una manta para no rayar las caras de melamina.',
  'Abre todos los paquetes y separa las piezas por tipo: laterales, piso, travesaños, repisas, puertas, frentes de cajón, fondos de cajón y respaldo.',
  'Cuenta los herrajes (tornillos, soportes duplo o escuadras triangulares, bisagras, correderas, patas, manillas) contra la lista de tu PDF de despiece — es más fácil pedir una pieza faltante antes de empezar que a mitad de armado.',
  'Ten a mano el diagrama de corte y la vista 3D de tu proyecto como referencia mientras armas.',
];

// Nota: estos dos primeros pasos son la versión genérica (vale para
// cualquier módulo). El manual personalizado (ManualArmadoDocument.jsx)
// los reemplaza por una versión exacta según si tu despiece real trae
// techo o travesaños — ver pasosOrdenCuerpo ahí.
export const ORDEN_CUERPO = [
  'Ubica las piezas base: los dos laterales, el piso y el techo o los travesaños (delantero y trasero) — según cómo venga tu diseño.',
  'Une primero un lateral al piso y al techo o a los travesaños con tornillo directo (confirmat o tornillo 1-5/8, según cómo venga tu despiece), sin apretar del todo.',
  'Repite con el segundo lateral, cerrando la caja del cuerpo.',
  'Si el mueble tiene divisiones verticales o repisas fijas, instálalas ahora, antes de apretar todo — es más fácil ajustar con el cuerpo "suelto".',
  'Verifica que el cuerpo quede a escuadra midiendo las dos diagonales de la caja: si ambas miden lo mismo, está cuadrado. Si no, empuja suavemente hacia el lado que corresponda hasta emparejarlas.',
  'Recién con el cuerpo a escuadra, aprieta todas las uniones a fondo.',
  'Clava o atornilla el respaldo (fondo posterior) contra el cuerpo ya escuadrado, cada 15cm aprox. — el respaldo es el que mantiene la escuadra en el tiempo, así que va siempre al final.',
];

export const PASOS_CONFIRMAT = [
  'Marca la posición del tornillo en ambas piezas antes de taladrar (usa el orificio de fábrica si tu pieza ya viene perforada).',
  'Pre-taladra la primera pieza (la que se atraviesa) con una broca de 5mm.',
  'Avellana esa misma cara para que la cabeza del tornillo quede escondida y no sobresalga.',
  'Pre-taladra la segunda pieza (el canto que recibe el tornillo) con una broca de 5mm, sin pasar de profundidad para no rajar la melamina ni salir por el otro lado.',
  'Atornilla (confirmat o tornillo 1-5/8, según venga en tu despiece) hasta que la cabeza quede al ras — no lo sobre-aprietes, el exceso de fuerza puede reventar el canto.',
];

export const PASOS_CORREDERAS = [
  'Marca con lápiz y nivel la altura donde va cada corredera dentro del mueble, a la misma altura en ambos lados.',
  'Atornilla el cuerpo de la corredera (la parte fija) al lateral del mueble usando primero los orificios ranurados, sin apretar del todo, para poder ajustar la posición.',
  'Verifica con el nivel que cada corredera quede horizontal, y que ambas queden a la misma altura y en paralelo.',
  'Aprieta los tornillos definitivos una vez verificada la nivelación.',
  'Arma la caja del cajón: une los laterales con la trasera con tornillo directo (confirmat o tornillo 1-5/8, pre-taladrando igual que en el cuerpo), apoya el fondo sobre el marco y fíjalo con tornillo aglomerado 3,5x15, y fija el frente a la caja con tornillo directo.',
  'Atornilla la parte móvil de la corredera al lateral de la caja del cajón, alineada con la marca y a ras con el borde frontal.',
  'Inserta el cajón en el mueble y prueba que deslice suave, sin trabarse ni rozar; ajusta el frente aflojando y reacomodando los tornillos hasta que quede parejo con las puertas y otros cajones.',
];

export const PASOS_BISAGRAS = [
  'Si la puerta no viene con el orificio de bisagra pre-perforado, hazlo con broca copa (Forstner) de 35mm, a unos 22mm del canto y 12-13mm de profundidad, sin pasar el espesor de la puerta.',
  'Encaja la cazoleta de la bisagra en el orificio y atorníllala a la puerta (normalmente 2 tornillos pequeños).',
  'Atornilla la base (placa de montaje) al lateral del mueble, a unos 100mm del borde superior e inferior de la puerta como referencia.',
  'Encaja el brazo de la bisagra sobre la base — la mayoría queda a presión con un clic, y se puede soltar con una pestaña para desmontar la puerta sin destornillar nada.',
  'Cierra la puerta y ajusta con los tornillos de la bisagra en sus 3 ejes: profundidad (que no choque con el cuerpo), lateral (separación pareja con la puerta vecina) y altura.',
  'Deja todas las bisagras del mueble sin apretar del todo hasta colocar todas las puertas, y recién ahí haz el ajuste fino en conjunto — es más fácil emparejar varias puertas juntas que una por una.',
];

export const PASOS_CORREDIZAS_CLOSET = [
  'Identifica el sistema de tu herraje: con riel superior de aluminio (el más común — la puerta cuelga de ruedas que corren dentro del riel, y la guía inferior solo evita que la puerta se mueva hacia adelante o atrás) o sistema ranurado sin riel visible (la puerta desliza directamente en una ranura hecha en el piso y techo del mueble, típico en muebles bajos).',
  'Mide el ancho y el alto del hueco en al menos 3 puntos (arriba, medio y abajo) — las paredes y cuerpos de mueble casi nunca son perfectamente rectos, así que usa siempre la medida más chica para no quedar corto.',
  'Corta el riel superior a la medida exacta del hueco si no viene ya cortado (con sierra de metal fina si es de aluminio).',
  'Marca con nivel de burbuja la línea donde va el riel superior — debe quedar perfectamente horizontal, no solo "pegado arriba".',
  'Pre-taladra y atornilla el riel superior sobre esa línea.',
  'Marca la posición de la guía inferior con una plomada o nivel desde el riel superior, para que quede exactamente alineada en vertical con él — si no, las puertas quedan chuecas.',
  'Atornilla la guía inferior.',
  'Instala las ruedas o carros en la parte superior de cada puerta, según el kit (normalmente 2 por puerta, cerca de cada esquina superior).',
  'Cuelga cada puerta: inclínala levemente, encaja primero las ruedas dentro del riel superior, y luego bájala hasta que la base entre en la guía inferior.',
  'Prueba el deslizamiento de ambas puertas varias veces antes de ajustar nada.',
  'Ajusta la altura de cada puerta con el tornillo regulador de los carros superiores (la mayoría trae uno) hasta que ambas queden a la misma altura y no rocen el piso ni el techo del mueble.',
  'Verifica que las puertas se traslapen entre 20 y 30mm en el centro cuando están cerradas — ese traslape es el que evita que se vea el hueco entre ambas.',
  'Si el kit trae topes anti-descarrile, instálalos en los extremos del riel para que las puertas no se salgan al abrir del todo.',
];

export const PASOS_PATAS = [
  'Atornilla las patas en los orificios de la base del mueble (vienen premarcados en tu despiece).',
  'Ubica el mueble en su posición final antes de nivelar — nivelar y después mover el mueble puede desnivelarlo de nuevo si el piso no es parejo.',
  'Apoya el nivel de burbuja sobre el piso del mueble (no sobre la cubierta) en sentido longitudinal y transversal.',
  'Gira cada pata (a mano o con una llave, según el modelo) hasta que la burbuja quede centrada en ambos sentidos.',
  'Repite la medición en varios puntos si el mueble es muy largo — puede estar nivelado de un lado y no del otro.',
  'Recién con el mueble nivelado, fija el zócalo a las patas (normalmente con presillas o clips a presión).',
];

export const PASOS_FIJACION_PARED = [
  'Ubica los pies derechos o montantes de la pared con un detector, o golpeando suave con los nudillos y escuchando el cambio de sonido (hueco vs. macizo) si no tienes detector.',
  'Con el mueble ya nivelado en su posición final, marca en la pared los puntos de anclaje a la altura de las escuadras o rieles de fijación del mueble.',
  'Verifica el tipo de muro (albañilería, hormigón, tabique de yeso-cartón) para elegir el taco correcto — un taco para yeso-cartón no sirve en hormigón, ni al revés.',
  'Taladra con la broca indicada para ese taco e insértalo con un golpe suave de martillo si es necesario.',
  'Atornilla la escuadra o riel de fijación a la pared, y luego al mueble (o al revés, según el orden que permita tu herraje).',
  'Usa al menos 2 puntos de anclaje por mueble, y un tercero al centro si el mueble es ancho (más de 1 metro) o va a cargar mucho peso.',
  'Verifica la fijación tirando suavemente del borde superior del mueble hacia adelante — no debería moverse ni separarse de la pared.',
  'Si el muro es de yeso-cartón y no hay un montante donde lo necesitas, usa tacos especiales con garra (tipo mariposa o metálicos de expansión) — nunca tacos plásticos comunes en muebles con peso.',
];

export const PASOS_FIJACION_TRAVESANO_PARED = [
  'Ubica los pies derechos o montantes de la pared con un detector, o golpeando suave con los nudillos y escuchando el cambio de sonido (hueco vs. macizo) si no tienes detector.',
  'Con el mueble sostenido en su posición final (pide ayuda o apóyalo sobre un soporte temporal — no lo sueltes sin fijar), marca en la pared la altura de los dos travesaños traseros mirando por dentro del cuerpo, con nivel de burbuja.',
  'Verifica el tipo de muro (albañilería, hormigón, tabique de yeso-cartón) para elegir el taco correcto — un taco para yeso-cartón no sirve en hormigón, ni al revés.',
  'Taladra la pared con la broca indicada para ese taco e insértalo con un golpe suave de martillo si es necesario.',
  'Atornilla directo desde dentro del mueble, a través de cada travesaño trasero y hacia el taco en la pared — no lleva escuadras intermedias, el travesaño mismo es el punto de fijación.',
  'Usa al menos 2 tornillos por travesaño (uno cerca de cada lateral), y un tercero al centro si el mueble es ancho (más de 90cm).',
  'Repite en el travesaño inferior — nunca cuelgues el mueble solo del travesaño superior: el inferior es el que evita que se despegue de la pared por abajo con el peso del contenido.',
  'Verifica la fijación tirando suavemente del borde inferior del mueble hacia adelante — no debería moverse ni separarse de la pared.',
  'Si el muro es de yeso-cartón y no hay un montante donde lo necesitas, usa tacos especiales con garra (tipo mariposa o metálicos de expansión) — nunca tacos plásticos comunes en muebles con peso.',
];

export const PASOS_MANILLAS = [
  'Marca la posición de la manilla en la puerta o cajón — normalmente centrada en el ancho de la pieza y a una altura cómoda (ya viene definida en tu despiece si compraste el detalle).',
  'Pre-taladra con broca de 5mm desde la cara interior/trasera de la pieza hacia afuera, para que cualquier astillado quede escondido por dentro.',
  'Atornilla la manilla desde adentro hacia afuera con los tornillos que trae el herraje.',
  'Verifica que quede firme y sin bailar; si el orificio quedó holgado, un poco de cola de madera en el tornillo ayuda a fijarlo mejor.',
];

export const CONSEJOS_FINALES = [
  'Siempre pre-taladra antes de atornillar: sin pre-taladro, la melamina se raja fácil, sobre todo cerca de los cantos.',
  'Usa una broca más delgada que el tornillo (aprox. 2/3 del diámetro) y no taladres más profundo de lo necesario.',
  'No aprietes los tornillos del todo hasta haber armado todo el cuerpo — deja margen para reajustar la escuadra.',
  'Deja los herrajes (bisagras, correderas) sin apretar del todo hasta ajustar puertas y cajones parejos, y recién ahí aprieta todo firme.',
  'En cocina, fija primero los muebles altos y los bajos por separado, a nivel, antes de instalar la cubierta — la cubierta se apoya sobre los bajos ya nivelados.',
  'Si vas a instalar el mueble sobre piso flotante o alfombra, revisa la nivelación de nuevo a la semana — puede asentarse un poco los primeros días.',
  'Guarda los herrajes y tornillos sobrantes: siempre quedan uno o dos de repuesto, útiles si alguno se pierde después.',
];
