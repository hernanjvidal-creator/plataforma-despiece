'use client';

export default function DiagramaCorte({ corte }) {
  const { plancha, resultadosPorMaterial, resumen } = corte;

  return (
    <div>
      <p>
        Plancha base: <strong>{plancha.nombre}</strong> ({plancha.ancho}x{plancha.alto}mm) —{' '}
        <strong>{resumen.totalPlanchas}</strong> plancha(s) en total.
      </p>

      {Object.entries(resultadosPorMaterial).map(([grupo, resultado]) => (
        <div key={grupo} style={{ marginBottom: 28 }}>
          <h4>{grupo} — {resultado.planchasNecesarias} plancha(s)</h4>

          {resultado.planchas.map(p => (
            <div key={p.numero} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#666' }}>
                Plancha #{p.numero} — aprovechamiento {p.aprovechamientoPct}%
              </p>
              <SvgPlancha ancho={plancha.ancho} alto={plancha.alto} piezas={p.piezas} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SvgPlancha({ ancho, alto, piezas }) {
  // viewBox 1:1 con las dimensiones reales en mm, escalado a un ancho fijo en pantalla
  const anchoDisplay = 600;
  const altoDisplay = Math.round((alto / ancho) * anchoDisplay);

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width={anchoDisplay}
      height={altoDisplay}
      style={{ border: '1px solid #e7e0d6', background: '#fff' }}
    >
      {piezas.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x} y={p.y} width={p.ancho} height={p.alto}
            fill="#f3e4d9" stroke="#a8552f" strokeWidth={3}
          />
          <text
            x={p.x + p.ancho / 2} y={p.y + p.alto / 2}
            fontSize={Math.min(p.ancho, p.alto) / 6}
            textAnchor="middle" dominantBaseline="middle"
            fill="#5c3018"
          >
            {p.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
