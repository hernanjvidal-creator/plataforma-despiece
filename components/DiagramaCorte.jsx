'use client';

import { nombreGrupoMaterial, numero, avisoVetaPlancha } from '@/lib/nombres';

export default function DiagramaCorte({ corte }) {
  const { plancha, resultadosPorMaterial, resumen } = corte;
  // Cada pieza se rotula con su N° del listado de piezas (mismo orden) y la
  // medida a la que se corta — el nombre completo no cabe en los rectángulos
  // chicos, y con el número se ubica igual en la lista.
  const numeroPorId = Object.fromEntries((corte.piezas || []).map((p, i) => [p.id, i + 1]));

  return (
    <div>
      <p>
        Plancha base: <strong>{plancha.nombre}</strong> ({plancha.ancho}x{plancha.alto}mm) —{' '}
        <strong>{resumen.totalPlanchas}</strong> plancha(s) en total.
      </p>
      <p style={{ fontSize: 13, color: '#666' }}>
        El número de cada pieza es su N° en el listado de piezas; debajo va la medida de corte en mm.
      </p>

      {Object.entries(resultadosPorMaterial).map(([grupo, resultado]) => (
        <div key={grupo} style={{ marginBottom: 28 }}>
          <h4>{nombreGrupoMaterial(grupo)} — {resultado.planchasNecesarias} plancha(s)</h4>
          {resultado.conVeta && (
            <p style={{ fontSize: 13, color: '#666' }}>{avisoVetaPlancha(corte.ejeVeta)}</p>
          )}

          {resultado.planchas.map(p => (
            <div key={p.numero} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#666' }}>
                Plancha #{p.numero} — aprovechamiento {numero(p.aprovechamientoPct)}%
              </p>
              <SvgPlancha ancho={plancha.ancho} alto={plancha.alto} piezas={p.piezas} numeroPorId={numeroPorId} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SvgPlancha({ ancho, alto, piezas, numeroPorId }) {
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
      {piezas.map((p, i) => {
        const lado = Math.min(p.ancho, p.alto);
        const tamanoNumero = Math.max(28, Math.min(90, lado / 3));
        const tamanoMedida = tamanoNumero * 0.5;
        // La medida solo si cabe debajo del número sin salirse del rectángulo.
        const cabeMedida = p.alto > tamanoNumero + tamanoMedida + 20 && p.ancho > tamanoMedida * 5;
        const cx = p.x + p.ancho / 2;
        const cy = p.y + p.alto / 2;
        return (
          <g key={i}>
            <rect
              x={p.x} y={p.y} width={p.ancho} height={p.alto}
              fill="#f3e4d9" stroke="#a8552f" strokeWidth={3}
            />
            <text
              x={cx} y={cabeMedida ? cy - tamanoMedida * 0.6 : cy}
              fontSize={tamanoNumero} fontWeight="700"
              textAnchor="middle" dominantBaseline="middle"
              fill="#5c3018"
            >
              {numeroPorId[p.id] ?? ''}
            </text>
            {cabeMedida && (
              <text
                x={cx} y={cy + tamanoNumero * 0.55}
                fontSize={tamanoMedida}
                textAnchor="middle" dominantBaseline="middle"
                fill="#5c3018"
              >
                {Math.round(p.ancho)} × {Math.round(p.alto)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
