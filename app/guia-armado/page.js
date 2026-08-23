// Guía general de armado — página pública (sin login), igual para
// cualquier mueble de melamina. Mismo contenido que el PDF descargable en
// /api/guia-armado (lib/GuiaArmadoDocument.jsx), pero como HTML/SVG.

const COLOR_LINEA = '#5c3018';
const COLOR_RELLENO = '#f3e4d9';
const COLOR_BORDE = '#a8552f';

export const metadata = {
  title: 'Guía general de armado — Despiece',
  description: 'Guía paso a paso para armar muebles de melamina: uniones, correderas, bisagras, puertas correderas de closet, nivelación y fijación a la pared.',
};

function DiagramaMinifix() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <rect x="30" y="10" width="16" height="110" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="46" y="94" width="150" height="16" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <line x1="46" y1="102" x2="90" y2="102" stroke={COLOR_LINEA} strokeWidth="2" />
      <circle cx="90" cy="102" r="7" fill="#fff" stroke={COLOR_LINEA} strokeWidth="1.2" />
      <circle cx="90" cy="102" r="2.2" fill={COLOR_LINEA} />
      <path d="M 90 92 A 10 10 0 1 1 82 98" stroke={COLOR_LINEA} strokeWidth="1" fill="none" />
      <text x="108" y="100" fontSize="7" fill={COLOR_LINEA}>Cazoleta: gira 90°</text>
      <text x="108" y="108" fontSize="7" fill={COLOR_LINEA}>para trabar el tarugo</text>
      <text x="48" y="72" fontSize="7" fill={COLOR_LINEA}>Tarugo pegado</text>
      <text x="48" y="80" fontSize="7" fill={COLOR_LINEA}>a presión en el canto</text>
    </svg>
  );
}

function DiagramaConfirmat() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <rect x="30" y="10" width="16" height="110" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="46" y="50" width="150" height="16" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <line x1="8" y1="58" x2="60" y2="58" stroke={COLOR_LINEA} strokeWidth="2" />
      <circle cx="8" cy="58" r="3" fill={COLOR_LINEA} />
      <text x="0" y="38" fontSize="7" fill={COLOR_LINEA}>Avellanar</text>
      <text x="0" y="46" fontSize="7" fill={COLOR_LINEA}>la cara</text>
      <text x="100" y="38" fontSize="7" fill={COLOR_LINEA}>Tornillo confirmat</text>
      <text x="24" y="126" fontSize="7" fill={COLOR_LINEA}>Pre-taladrar el canto para que no raje</text>
    </svg>
  );
}

function DiagramaCorredera() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <rect x="10" y="10" width="14" height="110" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="70" y="40" width="12" height="60" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <line x1="0" y1="70" x2="200" y2="70" stroke="#bbb" strokeWidth="0.6" strokeDasharray="2,2" />
      <line x1="24" y1="70" x2="70" y2="70" stroke={COLOR_LINEA} strokeWidth="2.2" />
      <line x1="82" y1="70" x2="140" y2="70" stroke={COLOR_LINEA} strokeWidth="2.2" strokeDasharray="3,2" />
      <text x="150" y="66" fontSize="7" fill={COLOR_LINEA}>Misma altura</text>
      <text x="150" y="74" fontSize="7" fill={COLOR_LINEA}>en ambos lados</text>
      <text x="8" y="124" fontSize="7" fill={COLOR_LINEA}>Marcar la altura con regla</text>
      <text x="8" y="132" fontSize="7" fill={COLOR_LINEA}>antes de atornillar el riel</text>
    </svg>
  );
}

function DiagramaBisagra() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <rect x="60" y="10" width="70" height="120" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <circle cx="82" cy="30" r="8" fill="#fff" stroke={COLOR_LINEA} strokeWidth="1.2" />
      <circle cx="82" cy="110" r="8" fill="#fff" stroke={COLOR_LINEA} strokeWidth="1.2" />
      <line x1="60" y1="30" x2="82" y2="30" stroke="#999" strokeWidth="0.6" strokeDasharray="2,2" />
      <line x1="82" y1="10" x2="82" y2="30" stroke="#999" strokeWidth="0.6" strokeDasharray="2,2" />
      <text x="10" y="24" fontSize="7" fill={COLOR_LINEA}>~22mm</text>
      <text x="6" y="32" fontSize="7" fill={COLOR_LINEA}>del canto</text>
      <text x="140" y="26" fontSize="7" fill={COLOR_LINEA}>~100mm desde</text>
      <text x="140" y="34" fontSize="7" fill={COLOR_LINEA}>arriba y abajo</text>
    </svg>
  );
}

function DiagramaRielCorredera() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <text x="2" y="8" fontSize="6.5" fill={COLOR_LINEA}>Riel superior: la rueda cuelga la puerta</text>
      <rect x="10" y="14" width="200" height="7" fill="#ccc" stroke="#888" strokeWidth="0.8" />
      <circle cx="30" cy="11" r="4" fill="#fff" stroke={COLOR_LINEA} strokeWidth="1" />
      <circle cx="190" cy="11" r="4" fill="#fff" stroke={COLOR_LINEA} strokeWidth="1" />
      <rect x="14" y="22" width="100" height="90" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="100" y="22" width="106" height="90" fill={COLOR_RELLENO} fillOpacity="0.55" stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="10" y="114" width="200" height="6" fill="#ddd" stroke="#bbb" strokeWidth="0.6" />
      <text x="2" y="128" fontSize="7" fill={COLOR_LINEA}>Traslape 20-30mm al centro</text>
      <text x="128" y="128" fontSize="7" fill={COLOR_LINEA}>Guía inferior: solo de tope</text>
    </svg>
  );
}

function DiagramaPataRegulable() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <line x1="0" y1="120" x2="220" y2="120" stroke="#999" strokeWidth="1.2" />
      <rect x="60" y="70" width="100" height="20" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <rect x="100" y="90" width="8" height="20" fill="#ccc" stroke="#888" strokeWidth="0.8" />
      <circle cx="104" cy="116" r="9" fill="#ccc" stroke="#888" strokeWidth="0.8" />
      <path d="M 122 106 A 10 10 0 1 1 116 98" stroke={COLOR_LINEA} strokeWidth="1" fill="none" />
      <text x="132" y="100" fontSize="7" fill={COLOR_LINEA}>Girar para</text>
      <text x="132" y="108" fontSize="7" fill={COLOR_LINEA}>subir/bajar</text>
      <text x="8" y="46" fontSize="7" fill={COLOR_LINEA}>Nivelar con nivel de burbuja</text>
      <text x="8" y="54" fontSize="7" fill={COLOR_LINEA}>antes de fijar el zócalo</text>
    </svg>
  );
}

function DiagramaEscuadraPared() {
  return (
    <svg viewBox="0 0 220 140" width="100%" height="auto">
      <rect x="150" y="0" width="10" height="140" fill="#ddd" stroke="#bbb" strokeWidth="0.6" />
      <rect x="40" y="30" width="110" height="14" fill={COLOR_RELLENO} stroke={COLOR_BORDE} strokeWidth="1" />
      <path d="M 130 30 L 130 10 L 150 10" stroke={COLOR_LINEA} strokeWidth="2" fill="none" />
      <circle cx="135" cy="20" r="2" fill={COLOR_LINEA} />
      <circle cx="150" cy="10" r="2" fill={COLOR_LINEA} />
      <text x="10" y="70" fontSize="7" fill={COLOR_LINEA}>Escuadra atornillada</text>
      <text x="10" y="78" fontSize="7" fill={COLOR_LINEA}>a la traviesa superior</text>
      <text x="155" y="90" fontSize="7" fill={COLOR_LINEA}>Taco fischer</text>
      <text x="155" y="98" fontSize="7" fill={COLOR_LINEA}>+ tornillo a la pared</text>
    </svg>
  );
}

const HERRAMIENTAS = [
  'Taladro/atornillador inalámbrico (18V recomendado)',
  'Set de brocas: 3mm (pilotos), 5mm (tarugos/minifix/confirmat) y 8mm (patas)',
  'Broca avellanadora, para esconder cabezas de tornillo confirmat',
  'Destornillador Phillips manual, de respaldo',
  'Mazo de goma',
  'Nivel de burbuja (idealmente de 40cm o más)',
  'Huincha de medir (flexómetro)',
  'Lápiz de carpintero y escuadra',
  'Detector de montantes (o golpear suave y escuchar el sonido) para fijar a la pared',
  'Tacos y tornillos para pared, según el tipo de muro (albañilería, hormigón o tabique)',
];

const ANTES_DE_EMPEZAR = [
  'Despeja una superficie de trabajo plana y amplia; protege el piso con cartón o una manta para no rayar las caras de melamina.',
  'Abre todos los paquetes y separa las piezas por tipo: laterales, piso, techo, repisas, puertas, frentes de cajón, fondos de cajón y respaldo.',
  'Cuenta los herrajes (tarugos, minifix, tornillos, bisagras, correderas, patas, manillas) contra la lista de tu PDF de despiece — es más fácil pedir una pieza faltante antes de empezar que a mitad de armado.',
  'Ten a mano el diagrama de corte y la vista 3D de tu proyecto como referencia mientras armas.',
];

const ORDEN_CUERPO = [
  'Ubica las piezas base: los dos laterales, el piso y el techo (o traviesas superiores).',
  'Une primero un lateral al piso y al techo con tarugo+minifix o confirmat (según cómo venga tu despiece), sin apretar del todo.',
  'Repite con el segundo lateral, cerrando la caja del cuerpo.',
  'Si el mueble tiene divisiones verticales o repisas fijas, instálalas ahora, antes de apretar todo — es más fácil ajustar con el cuerpo "suelto".',
  'Verifica que el cuerpo quede a escuadra midiendo las dos diagonales de la caja: si ambas miden lo mismo, está cuadrado. Si no, empuja suavemente hacia el lado que corresponda hasta emparejarlas.',
  'Recién con el cuerpo a escuadra, aprieta todas las uniones a fondo.',
  'Clava o atornilla el respaldo (fondo posterior) contra el cuerpo ya escuadrado, cada 15cm aprox. — el respaldo es el que mantiene la escuadra en el tiempo, así que va siempre al final.',
];

const PASOS_MINIFIX = [
  'Inserta el tarugo de madera a presión en el orificio del canto de la pieza; puedes darle un golpe suave con el mazo de goma para que quede al ras.',
  'Atornilla la cazoleta (excéntrico) minifix en el orificio de cara de la pieza opuesta, dejándola firme pero sin forzar.',
  'Encaja las dos piezas: el tarugo entra en el agujero de la cazoleta.',
  'Gira la cazoleta 90° en sentido horario con un destornillador plano o Phillips (según el modelo) hasta sentir que traba — eso tensa el tarugo y aprieta la unión.',
  'Verifica que las piezas queden a ras, sin escalón entre ellas; si no, afloja, reacomoda y vuelve a apretar.',
];

const PASOS_CONFIRMAT = [
  'Marca la posición del tornillo en ambas piezas antes de taladrar (usa el orificio de fábrica si tu pieza ya viene perforada).',
  'Pre-taladra la primera pieza (la que se atraviesa) con una broca de 5mm.',
  'Avellana esa misma cara para que la cabeza del tornillo quede escondida y no sobresalga.',
  'Pre-taladra la segunda pieza (el canto que recibe el tornillo) con una broca de 5mm, sin pasar de profundidad para no rajar la melamina ni salir por el otro lado.',
  'Atornilla el confirmat hasta que la cabeza quede al ras — no lo sobre-aprietes, el exceso de fuerza puede reventar el canto.',
];

const PASOS_CORREDERAS = [
  'Marca con lápiz y nivel la altura donde va cada corredera dentro del mueble, a la misma altura en ambos lados.',
  'Atornilla el cuerpo de la corredera (la parte fija) al lateral del mueble usando primero los orificios ranurados, sin apretar del todo, para poder ajustar la posición.',
  'Verifica con el nivel que cada corredera quede horizontal, y que ambas queden a la misma altura y en paralelo.',
  'Aprieta los tornillos definitivos una vez verificada la nivelación.',
  'Arma la caja del cajón: une los laterales con la trasera usando tarugo+minifix, desliza el fondo en el calado, y fija el frente a la caja con tarugo+minifix ajustable desde adentro.',
  'Atornilla la parte móvil de la corredera al lateral de la caja del cajón, alineada con la marca y a ras con el borde frontal.',
  'Inserta el cajón en el mueble y prueba que deslice suave, sin trabarse ni rozar; ajusta el frente con los tornillos de la unión minifix hasta que quede parejo con las puertas y otros cajones.',
];

const PASOS_BISAGRAS = [
  'Si la puerta no viene con el orificio de bisagra pre-perforado, hazlo con broca copa (Forstner) de 35mm, a unos 22mm del canto y 12-13mm de profundidad, sin pasar el espesor de la puerta.',
  'Encaja la cazoleta de la bisagra en el orificio y atorníllala a la puerta (normalmente 2 tornillos pequeños).',
  'Atornilla la base (placa de montaje) al lateral del mueble, a unos 100mm del borde superior e inferior de la puerta como referencia.',
  'Encaja el brazo de la bisagra sobre la base — la mayoría queda a presión con un clic, y se puede soltar con una pestaña para desmontar la puerta sin destornillar nada.',
  'Cierra la puerta y ajusta con los tornillos de la bisagra en sus 3 ejes: profundidad (que no choque con el cuerpo), lateral (separación pareja con la puerta vecina) y altura.',
  'Deja todas las bisagras del mueble sin apretar del todo hasta colocar todas las puertas, y recién ahí haz el ajuste fino en conjunto — es más fácil emparejar varias puertas juntas que una por una.',
];

const PASOS_CORREDIZAS_CLOSET = [
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

const PASOS_PATAS = [
  'Atornilla las patas en los orificios de la base del mueble (vienen premarcados en tu despiece).',
  'Ubica el mueble en su posición final antes de nivelar — nivelar y después mover el mueble puede desnivelarlo de nuevo si el piso no es parejo.',
  'Apoya el nivel de burbuja sobre el piso del mueble (no sobre la cubierta) en sentido longitudinal y transversal.',
  'Gira cada pata (a mano o con una llave, según el modelo) hasta que la burbuja quede centrada en ambos sentidos.',
  'Repite la medición en varios puntos si el mueble es muy largo — puede estar nivelado de un lado y no del otro.',
  'Recién con el mueble nivelado, fija el zócalo a las patas (normalmente con presillas o clips a presión).',
];

const PASOS_FIJACION_PARED = [
  'Ubica los pies derechos o montantes de la pared con un detector, o golpeando suave con los nudillos y escuchando el cambio de sonido (hueco vs. macizo) si no tienes detector.',
  'Con el mueble ya nivelado en su posición final, marca en la pared los puntos de anclaje a la altura de las escuadras o rieles de fijación del mueble.',
  'Verifica el tipo de muro (albañilería, hormigón, tabique de yeso-cartón) para elegir el taco correcto — un taco para yeso-cartón no sirve en hormigón, ni al revés.',
  'Taladra con la broca indicada para ese taco e insértalo con un golpe suave de martillo si es necesario.',
  'Atornilla la escuadra o riel de fijación a la pared, y luego al mueble (o al revés, según el orden que permita tu herraje).',
  'Usa al menos 2 puntos de anclaje por mueble, y un tercero al centro si el mueble es ancho (más de 1 metro) o va a cargar mucho peso.',
  'Verifica la fijación tirando suavemente del borde superior del mueble hacia adelante — no debería moverse ni separarse de la pared.',
  'Si el muro es de yeso-cartón y no hay un montante donde lo necesitas, usa tacos especiales con garra (tipo mariposa o metálicos de expansión) — nunca tacos plásticos comunes en muebles con peso.',
];

const PASOS_MANILLAS = [
  'Marca la posición de la manilla en la puerta o cajón — normalmente centrada en el ancho de la pieza y a una altura cómoda (ya viene definida en tu despiece si compraste el detalle).',
  'Pre-taladra con broca de 5mm desde la cara interior/trasera de la pieza hacia afuera, para que cualquier astillado quede escondido por dentro.',
  'Atornilla la manilla desde adentro hacia afuera con los tornillos que trae el herraje.',
  'Verifica que quede firme y sin bailar; si el orificio quedó holgado, un poco de cola de madera en el tornillo ayuda a fijarlo mejor.',
];

const CONSEJOS_FINALES = [
  'Siempre pre-taladra antes de atornillar: sin pre-taladro, la melamina se raja fácil, sobre todo cerca de los cantos.',
  'Usa una broca más delgada que el tornillo (aprox. 2/3 del diámetro) y no taladres más profundo de lo necesario.',
  'No cierres del todo las cazoletas minifix hasta haber armado todo el cuerpo — deja margen para reajustar la escuadra.',
  'Deja los herrajes (bisagras, correderas) sin apretar del todo hasta ajustar puertas y cajones parejos, y recién ahí aprieta todo firme.',
  'En cocina, fija primero los muebles altos y los bajos por separado, a nivel, antes de instalar la cubierta — la cubierta se apoya sobre los bajos ya nivelados.',
  'Si vas a instalar el mueble sobre piso flotante o alfombra, revisa la nivelación de nuevo a la semana — puede asentarse un poco los primeros días.',
  'Guarda los herrajes y tornillos sobrantes: siempre quedan uno o dos de repuesto, útiles si alguno se pierde después.',
];

function ListaPasos({ items }) {
  return (
    <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
      {items.map((texto, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{texto}</li>
      ))}
    </ol>
  );
}

function Seccion({ titulo, Diagrama, intro, pasos }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h4 style={{ marginBottom: 10 }}>{titulo}</h4>
      {intro ? <p style={{ color: 'var(--color-text-muted)', marginBottom: 14 }}>{intro}</p> : null}
      {Diagrama ? (
        <div style={{ maxWidth: 320, margin: '0 auto 16px' }}>
          <Diagrama />
        </div>
      ) : null}
      <ListaPasos items={pasos} />
    </div>
  );
}

export default function GuiaArmadoPage() {
  return (
    <main className="container">
      <p style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        Guía general de armado
      </p>
      <h1>Cómo armar tu mueble de melamina</h1>
      <p style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 680 }}>
        Guía completa y paso a paso, pensada para alguien que arma por primera vez. Es general — aplica a
        cualquier mueble de melamina, no solo a los que armas en este configurador. Incluye desde las
        uniones básicas hasta cómo instalar puertas correderas de closet. Los diagramas son esquemáticos,
        no a escala.
      </p>
      <a
        href="/api/guia-armado"
        style={{
          display: 'inline-block', marginTop: 8, marginBottom: 32, padding: '11px 20px',
          background: 'var(--color-accent)', color: '#fff', borderRadius: 7,
          fontWeight: 600, fontSize: 15, textDecoration: 'none',
        }}
      >
        Descargar como PDF
      </a>

      <h2>Antes de empezar</h2>
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 10 }}>Herramientas necesarias</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          {HERRAMIENTAS.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
      <div className="card" style={{ marginBottom: 32 }}>
        <h4 style={{ marginBottom: 10 }}>Preparación</h4>
        <ListaPasos items={ANTES_DE_EMPEZAR} />
      </div>

      <h2>Orden de armado del cuerpo</h2>
      <div className="card" style={{ marginBottom: 32 }}>
        <ListaPasos items={ORDEN_CUERPO} />
      </div>

      <h2>Uniones entre piezas</h2>
      <Seccion titulo="Tarugo + minifix (cajas y cuerpos)" Diagrama={DiagramaMinifix} pasos={PASOS_MINIFIX} />
      <Seccion titulo="Tornillo confirmat" Diagrama={DiagramaConfirmat} pasos={PASOS_CONFIRMAT} />

      <h2 style={{ marginTop: 12 }}>Cajones y puertas abatibles</h2>
      <Seccion titulo="Correderas de cajón y armado de la caja" Diagrama={DiagramaCorredera} pasos={PASOS_CORREDERAS} />
      <Seccion titulo="Bisagras de puerta abatible" Diagrama={DiagramaBisagra} pasos={PASOS_BISAGRAS} />

      <h2 style={{ marginTop: 12 }}>Puertas correderas para closet</h2>
      <Seccion
        titulo="Instalación de riel y puertas corredizas"
        Diagrama={DiagramaRielCorredera}
        intro="A diferencia de las puertas abatibles con bisagra, los closets suelen usar puertas correderas que se deslizan sobre un riel. Esta sección aplica si tu proyecto incluye ese sistema."
        pasos={PASOS_CORREDIZAS_CLOSET}
      />

      <h2 style={{ marginTop: 12 }}>Fijación de la estructura</h2>
      <Seccion titulo="Patas regulables y nivelación" Diagrama={DiagramaPataRegulable} pasos={PASOS_PATAS} />
      <Seccion titulo="Fijación a la pared (muebles altos o colgados)" Diagrama={DiagramaEscuadraPared} pasos={PASOS_FIJACION_PARED} />

      <h2 style={{ marginTop: 12 }}>Manillas y tiradores</h2>
      <div className="card" style={{ marginBottom: 32 }}>
        <ListaPasos items={PASOS_MANILLAS} />
      </div>

      <h3>Consejos para principiantes</h3>
      <div className="card" style={{ marginBottom: 40 }}>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          {CONSEJOS_FINALES.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    </main>
  );
}
