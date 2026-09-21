'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Visor3D from './Visor3D';
import ListaPiezas from './ListaPiezas';
import DiagramaCorte from './DiagramaCorte';

const NOMBRE_MODULO = {
  bajo_cocina: 'Mueble cocina',
  alto_cocina: 'Mueble aéreo',
  vanitorio_bano: 'Vanitorio de baño',
  closet: 'Closet / armario ropero',
  despensa: 'Despensa',
  velador: 'Velador',
  escritorio: 'Escritorio',
  librero: 'Librero',
  baul: 'Baúl',
};

// Vista de solo lectura de un mueble guardado, sin login — pensada para que
// el dueño le pase el link a un maestro externo que le está armando el
// mueble (u otra persona que quiera verlo), sin que necesite crear una
// cuenta. Reusa los mismos componentes que el configurador (Visor3D,
// ListaPiezas, DiagramaCorte) pero sin el formulario editable ni nada de
// pago/cuenta — los datos vienen de /api/mueble-publico/[id].
export default function VerMueblePublico({ id }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [descargandoManual, setDescargandoManual] = useState(false);
  const visor3DRef = useRef(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    fetch(`/api/mueble-publico/${id}`)
      .then(async res => {
        const data = await res.json();
        if (cancelado) return;
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el mueble');
        setDatos(data);
      })
      .catch(e => { if (!cancelado) setError(e.message); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [id]);

  async function descargarPdf() {
    if (!datos) return;
    setDescargandoPdf(true);
    setError(null);
    try {
      const imagen3D = visor3DRef.current?.capturarImagen() || null;
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datos.nombre,
          modulo: datos.modulo,
          despiece: datos.despiece,
          corte: datos.corte,
          imagen3D,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error generando el PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `despiece_${datos.modulo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('No se pudo descargar el PDF: ' + e.message);
    } finally {
      setDescargandoPdf(false);
    }
  }

  async function descargarManual() {
    if (!datos) return;
    setDescargandoManual(true);
    setError(null);
    try {
      const res = await fetch('/api/manual-armado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: datos.nombre, modulo: datos.modulo, despiece: datos.despiece }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error generando el manual');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual_armado_${datos.modulo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('No se pudo descargar el manual: ' + e.message);
    } finally {
      setDescargandoManual(false);
    }
  }

  if (cargando) {
    return <main className="container"><p>Cargando mueble...</p></main>;
  }

  if (error || !datos) {
    return (
      <main className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <h3>No se pudo abrir este mueble</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {error || 'El link puede estar mal copiado, o el mueble fue eliminado.'}
          </p>
          <Link href="/"><button style={{ maxWidth: 240, margin: '12px auto 0' }}>Ir a armandolo.com</button></Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <p style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        Vista compartida — solo lectura
      </p>
      <h1 style={{ marginBottom: 4 }}>{datos.nombre}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 24 }}>
        {NOMBRE_MODULO[datos.modulo] || datos.modulo} — rota el plano, hace doble clic para abrir puertas/cajones o ver la medida de cada pieza.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Plano 3D</h3>
        <Visor3D
          ref={visor3DRef}
          piezas={datos.despiece.piezas}
          accesorios={datos.despiece.accesorios}
          parametros={datos.despiece.parametros}
        />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Listado de piezas y herrajes</h3>
        <ListaPiezas despiece={datos.despiece} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Diagrama de corte</h3>
        <DiagramaCorte corte={datos.corte} />
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <button onClick={descargarPdf} disabled={descargandoPdf} style={{ display: 'block', width: '100%', maxWidth: 320, margin: '0 auto' }}>
          {descargandoPdf ? 'Generando PDF...' : 'Descargar PDF de entrega'}
        </button>
        <button
          onClick={descargarManual}
          disabled={descargandoManual}
          style={{ display: 'block', width: '100%', maxWidth: 320, margin: '10px auto 0' }}
        >
          {descargandoManual ? 'Generando manual...' : 'Descargar manual de armado de este mueble'}
        </button>
        <p style={{ fontSize: 13, marginTop: 12 }}>
          <a href="/guia-armado" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Ver guía general de armado
          </a>
          {' '}— cómo unir las piezas, instalar correderas/bisagras y fijar el mueble
        </p>
        {error && <p style={{ color: 'var(--color-danger)', marginTop: 10 }}>{error}</p>}
      </div>
    </main>
  );
}
