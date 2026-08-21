import Link from 'next/link';

const MODULOS = [
  { nombre: 'Mueble bajo de cocina', detalle: 'por secciones: lavaplatos, lavavajillas, horno, cajones olleros y cubiertos' },
  { nombre: 'Mueble alto de cocina', detalle: 'alacena con baldas y colgado a pared' },
  { nombre: 'Vanitorio de baño', detalle: 'con patas o suspendido, cubierta y lavamanos' },
  { nombre: 'Closet / armario ropero', detalle: 'por secciones: cajones, repisas y colgador' },
  { nombre: 'Esquinero bajo de cocina', detalle: 'ciego, en dos brazos a 90°' },
];

export default function Home() {
  return (
    <main className="container">
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 40,
          alignItems: 'center',
          marginTop: 32,
          marginBottom: 48,
        }}
      >
        <div>
          <p style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Configurador de muebles en melamina
          </p>
          <h1>Del parámetro al plano de corte, en un solo lugar</h1>
          <p style={{ fontSize: 16, color: 'var(--color-text-muted)', lineHeight: 1.6, maxWidth: 520 }}>
            Configura las medidas y la distribución de tu mueble y recibe al instante
            el plano 3D armado, el listado de piezas y herrajes para la ferretería,
            y el diagrama de corte optimizado por plancha.
          </p>
          <Link href="/configurador">
            <button style={{ maxWidth: 240, marginTop: 24 }}>
              Ir al configurador →
            </button>
          </Link>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: 'auto' }}>
            <rect width="400" height="300" fill="var(--color-accent-soft)" />
            <g transform="translate(70,60)">
              <rect x="0" y="0" width="220" height="160" fill="none" stroke="var(--color-accent-dark)" strokeWidth="3" />
              <rect x="0" y="0" width="14" height="160" fill="var(--color-accent-dark)" />
              <rect x="206" y="0" width="14" height="160" fill="var(--color-accent-dark)" />
              <rect x="14" y="10" width="192" height="42" fill="#fff" stroke="var(--color-accent)" strokeWidth="2" />
              <rect x="14" y="58" width="192" height="42" fill="#fff" stroke="var(--color-accent)" strokeWidth="2" />
              <rect x="14" y="106" width="192" height="46" fill="#fff" stroke="var(--color-accent)" strokeWidth="2" />
              <rect x="100" y="26" width="30" height="10" rx="4" fill="var(--color-accent)" />
              <rect x="100" y="74" width="30" height="10" rx="4" fill="var(--color-accent)" />
              <rect x="100" y="123" width="30" height="10" rx="4" fill="var(--color-accent)" />
            </g>
          </svg>
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 16 }}>Módulos disponibles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {MODULOS.map(m => (
            <div key={m.nombre} className="card">
              <h4 style={{ marginBottom: 6 }}>{m.nombre}</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{m.detalle}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
