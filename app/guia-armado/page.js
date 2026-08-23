// Guía general de armado — página pública (sin login), igual para
// cualquier mueble de melamina. Mismo contenido que el PDF descargable en
// /api/guia-armado (lib/GuiaArmadoDocument.jsx), pero como HTML/SVG.

const COLOR_LINEA = '#5c3018';
const COLOR_RELLENO = '#f3e4d9';
const COLOR_BORDE = '#a8552f';

export const metadata = {
  title: 'Guía general de armado — Despiece',
  description: 'Cómo unir piezas de melamina, instalar correderas y bisagras, y fijar el mueble a piso o pared.',
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

function TarjetaDiagrama({ titulo, children }) {
  return (
    <div className="card">
      <h4 style={{ marginBottom: 10 }}>{titulo}</h4>
      {children}
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
        Esta guía es general — aplica a cualquier mueble de melamina, no solo a los que armas en este
        configurador. Está pensada para alguien que arma por primera vez. Los diagramas son esquemáticos,
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

      <h3>Uniones entre piezas</h3>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <TarjetaDiagrama titulo="Tarugo minifix (cajas y cuerpos)"><DiagramaMinifix /></TarjetaDiagrama>
        <TarjetaDiagrama titulo="Tornillo confirmat"><DiagramaConfirmat /></TarjetaDiagrama>
      </div>

      <h3>Herrajes móviles</h3>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <TarjetaDiagrama titulo="Correderas de cajón"><DiagramaCorredera /></TarjetaDiagrama>
        <TarjetaDiagrama titulo="Bisagras de puerta"><DiagramaBisagra /></TarjetaDiagrama>
      </div>

      <h3>Fijación de la estructura</h3>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        <TarjetaDiagrama titulo="Patas regulables (muebles bajos)"><DiagramaPataRegulable /></TarjetaDiagrama>
        <TarjetaDiagrama titulo="Fijación a la pared (muebles altos/colgados)"><DiagramaEscuadraPared /></TarjetaDiagrama>
      </div>

      <h3>Consejos para principiantes</h3>
      <div className="card" style={{ marginBottom: 40 }}>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
          <li>Siempre pre-taladra antes de atornillar: sin pre-taladro, la melamina se raja fácil, sobre todo cerca de los cantos.</li>
          <li>Usa una broca más delgada que el tornillo (aprox. 2/3 del diámetro) y no taladres más profundo de lo necesario.</li>
          <li>Arma primero el cuerpo (laterales + piso + traviesas/techo) en escuadra antes de fijar el respaldo — el respaldo es el que deja todo "cuadrado".</li>
          <li>Verifica que el mueble quede a escuadra midiendo las dos diagonales: si miden igual, está cuadrado.</li>
          <li>Nivela primero el mueble con las patas regulables (o con calzos si no tiene patas) antes de fijarlo a la pared o atornillar el zócalo.</li>
          <li>Para colgar un mueble a la pared, ubica los pies derechos (montantes) con un detector o golpeando suave — un taco fischer en yeso cartón sin pillar un montante no aguanta el peso.</li>
          <li>En cocina, fija primero los muebles altos y los bajos por separado, a nivel, antes de instalar la cubierta — la cubierta se apoya sobre los bajos ya nivelados.</li>
          <li>Deja los herrajes (bisagras, correderas) sin apretar del todo hasta ajustar puertas y cajones parejos, y recién ahí aprieta todo firme.</li>
        </ul>
      </div>
    </main>
  );
}
