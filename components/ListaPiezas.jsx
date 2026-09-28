'use client';

const COLOR_BADGE = {
  blanco: '#b8b6ad',
  gris_claro: '#9c9c98',
  gris_grafito: '#3f3f3f',
  nogal: '#5b3a29',
  roble: '#b98a53',
};

// Estilo aplicado a las medidas cuando `medidasBloqueadas` está activo: se
// ven los números ahí (así el cliente entiende que la info existe), pero
// ilegibles — la idea es dejar clara la complejidad/calidad del mueble sin
// regalar el dato con el que se podría cortar sin pagar.
const ESTILO_MEDIDA_BLOQUEADA = { filter: 'blur(5px)', userSelect: 'none' };

function Medida({ valor, bloqueada }) {
  if (!bloqueada) return valor;
  return <span style={ESTILO_MEDIDA_BLOQUEADA}>{valor}</span>;
}

export default function ListaPiezas({ despiece, medidasBloqueadas = false }) {
  const { piezas, accesorios, herrajes, resumen, notas } = despiece;
  // Las patas plásticas se agregan a `accesorios` solo para que se vean en
  // el 3D (dónde van) — ya están contadas en el herraje
  // `pata_plastica_regulable`, así que no deben duplicarse en esta tabla.
  const accesoriosVisibles = (accesorios || []).filter(a => !a.soloVisual);

  // Excel en configuración regional chilena/latam usa la coma como separador
  // decimal, así que espera ";" como separador de columnas en un CSV — si se
  // usa "," ahí, Excel mete la fila entera en una sola celda. Por eso el
  // separador acá es ";", cada valor va entre comillas (por si trae acentos,
  // espacios o algún ";" propio) y se agrega BOM UTF-8 para que Excel
  // reconozca bien las tildes/ñ.
  function celda(valor) {
    return `"${String(valor).replace(/"/g, '""')}"`;
  }

  function filasACSV(encabezado, filas) {
    return '﻿' + [encabezado, ...filas].map(f => f.map(celda).join(';')).join('\r\n');
  }

  function descargarCSV(nombreArchivo, contenido) {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarCSV() {
    const encabezado = ['Pieza', 'Alto (mm)', 'Ancho (mm)', 'Espesor (mm)', 'Material', 'Color', 'Cara', 'Cantos'];
    const filas = piezas.map(p => [
      p.id,
      Math.round(p.alto),
      Math.round(p.ancho),
      p.espesor,
      p.material || 'melamina',
      p.color || '-',
      p.cara || '-',
      (p.cantos || []).join(' / ') || '-',
    ]);
    descargarCSV('despiece_piezas.csv', filasACSV(encabezado, filas));
  }

  function exportarHerrajesCSV() {
    const encabezado = ['Tipo', 'Cantidad', 'Unidad'];
    const filas = herrajes.map(h => [h.tipo, h.cantidad, h.unidad || '-']);
    descargarCSV('despiece_herrajes.csv', filasACSV(encabezado, filas));
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Alto (mm)</th>
            <th>Ancho (mm)</th>
            <th>Esp.</th>
            <th>Color</th>
            <th>Cantos</th>
          </tr>
        </thead>
        <tbody>
          {piezas.map((p, i) => (
            <tr key={i}>
              <td>{p.id}</td>
              <td><Medida valor={Math.round(p.alto)} bloqueada={medidasBloqueadas} /></td>
              <td><Medida valor={Math.round(p.ancho)} bloqueada={medidasBloqueadas} /></td>
              <td><Medida valor={`${p.espesor}mm ${p.material || ''}`} bloqueada={medidasBloqueadas} /></td>
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

      {medidasBloqueadas ? (
        <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
          Estas son las piezas que va a tener tu mueble — las medidas exactas de cada una se
          desbloquean al comprar el despiece.
        </p>
      ) : (
        <button onClick={exportarCSV} style={{ maxWidth: 220 }}>
          Descargar piezas (Excel/CSV)
        </button>
      )}

      {accesoriosVisibles.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>Accesorios (referencia — no se cortan de melamina)</h4>
          <table>
            <thead>
              <tr><th>Accesorio</th><th>Descripción</th><th>Ancho (mm)</th><th>Profundidad (mm)</th></tr>
            </thead>
            <tbody>
              {accesoriosVisibles.map((a, i) => (
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
      <button onClick={exportarHerrajesCSV} style={{ maxWidth: 220 }}>
        Descargar herrajes (Excel/CSV)
      </button>

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
