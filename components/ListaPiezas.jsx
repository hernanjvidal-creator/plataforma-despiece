'use client';

const COLOR_BADGE = {
  blanco: '#b8b6ad',
  gris_claro: '#9c9c98',
  gris_grafito: '#3f3f3f',
  nogal: '#5b3a29',
  roble: '#b98a53',
};

export default function ListaPiezas({ despiece }) {
  const { piezas, accesorios, herrajes, resumen, notas } = despiece;

  function exportarCSV() {
    const encabezado = ['id', 'ancho_mm', 'alto_mm', 'espesor_mm', 'material', 'color', 'cara', 'cantos'];
    const filas = piezas.map(p => [
      p.id,
      Math.round(p.ancho),
      Math.round(p.alto),
      p.espesor,
      p.material || 'melamina',
      p.color || '-',
      p.cara || '-',
      (p.cantos || []).join('|') || '-',
    ]);
    const csv = [encabezado, ...filas].map(f => f.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'despiece.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Ancho (mm)</th>
            <th>Alto (mm)</th>
            <th>Esp.</th>
            <th>Color</th>
            <th>Cantos</th>
          </tr>
        </thead>
        <tbody>
          {piezas.map((p, i) => (
            <tr key={i}>
              <td>{p.id}</td>
              <td>{Math.round(p.ancho)}</td>
              <td>{Math.round(p.alto)}</td>
              <td>{p.espesor}mm {p.material || ''}</td>
              <td>
                {p.color && (
                  <span
                    className="badge"
                    style={{ background: COLOR_BADGE[p.color] || '#ccc' }}
                  >
                    {p.color}
                  </span>
                )}
              </td>
              <td>{(p.cantos || []).join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={exportarCSV} style={{ maxWidth: 220 }}>
        Descargar CSV (ferretería)
      </button>

      {accesorios && accesorios.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>Accesorios (referencia — no se cortan de melamina)</h4>
          <table>
            <thead>
              <tr><th>Accesorio</th><th>Descripción</th><th>Ancho (mm)</th><th>Profundidad (mm)</th></tr>
            </thead>
            <tbody>
              {accesorios.map((a, i) => (
                <tr key={i}>
                  <td>{a.id}</td>
                  <td>{a.descripcion}</td>
                  <td>{Math.round(a.ancho)}</td>
                  <td>{Math.round(a.alto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 style={{ marginTop: 24 }}>Herrajes</h4>
      <table>
        <thead>
          <tr><th>Tipo</th><th>Cantidad</th></tr>
        </thead>
        <tbody>
          {herrajes.map((h, i) => (
            <tr key={i}><td>{h.tipo}</td><td>{h.cantidad}{h.unidad ? ` ${h.unidad}(es)` : ''}</td></tr>
          ))}
        </tbody>
      </table>

      <h4 style={{ marginTop: 24 }}>Material requerido</h4>
      <table>
        <thead>
          <tr><th>Grupo (espesor/material/color)</th><th>m²</th></tr>
        </thead>
        <tbody>
          {Object.entries(resumen).map(([key, m2]) => (
            <tr key={key}><td>{key}</td><td>{m2} m²</td></tr>
          ))}
        </tbody>
      </table>

      {notas && notas.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>Notas de producción</h4>
          <ul style={{ fontSize: 13, color: '#555', paddingLeft: 18 }}>
            {notas.map((n, i) => <li key={i} style={{ marginBottom: 4 }}>{n}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
