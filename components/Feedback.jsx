'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function Feedback() {
  const { usuario } = useAuth();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  async function enviar() {
    if (!mensaje.trim()) {
      setError('Cuéntanos aunque sea brevemente qué te pareció.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('feedback').insert({
        user_id: usuario?.id || null,
        email: usuario?.email || null,
        mensaje: mensaje.trim(),
        calificacion: calificacion ? Number(calificacion) : null,
        pagina: pathname,
      });
      if (err) throw err;
      setEnviado(true);
      setMensaje('');
      setCalificacion('');
    } catch (e) {
      setError('No se pudo enviar: ' + e.message);
    } finally {
      setEnviando(false);
    }
  }

  function cerrar() {
    setAbierto(false);
    setEnviado(false);
    setError(null);
  }

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}>
      {abierto && (
        <div
          className="card"
          style={{ width: 300, marginBottom: 12, boxShadow: '0 4px 18px rgba(0,0,0,0.15)' }}
        >
          {enviado ? (
            <>
              <p style={{ margin: '0 0 12px', fontWeight: 700 }}>¡Gracias por tu opinión!</p>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                Nos ayuda mucho para seguir mejorando la plataforma.
              </p>
              <button type="button" onClick={cerrar} style={{ marginTop: 0 }}>Cerrar</button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px', fontWeight: 700 }}>¿Qué te pareció Despiece?</p>
              <label style={{ fontSize: 13 }}>Tu comentario</label>
              <textarea
                rows={4}
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                placeholder="¿Te sirvió? ¿Qué le agregarías o cambiarías?"
                style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, padding: 8, borderRadius: 6, border: '1px solid var(--color-border)' }}
              />
              <label style={{ fontSize: 13, marginTop: 8 }}>Calificación (opcional)</label>
              <select value={calificacion} onChange={e => setCalificacion(e.target.value)}>
                <option value="">Sin calificar</option>
                <option value="5">5 — Excelente</option>
                <option value="4">4 — Buena</option>
                <option value="3">3 — Regular</option>
                <option value="2">2 — Mala</option>
                <option value="1">1 — Muy mala</option>
              </select>
              {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={enviar} disabled={enviando} style={{ marginTop: 0 }}>
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
                <button
                  type="button"
                  onClick={cerrar}
                  style={{ marginTop: 0, width: 'auto', padding: '11px 14px', background: '#fff', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          style={{
            marginTop: 0, width: 'auto', padding: '12px 18px', borderRadius: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          }}
        >
          Danos tu opinión
        </button>
      )}
    </div>
  );
}
