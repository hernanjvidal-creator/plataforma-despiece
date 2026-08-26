'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { EMAIL_ADMIN } from '@/lib/admin';

export default function AdminFeedback() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.push('/login?redirect=/admin/feedback');
      return;
    }
    if (usuario.email !== EMAIL_ADMIN) return; // se muestra "No autorizado" abajo

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth]);

  async function cargar() {
    setError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const accessToken = sesion.session?.access_token;
      const res = await fetch(`/api/admin/feedback?accessToken=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando el feedback');
      setFeedback(data.feedback);
    } catch (e) {
      setError(e.message);
    }
  }

  if (cargandoAuth) return <main className="container"><p>Cargando...</p></main>;
  if (!usuario) return null; // se está redirigiendo a /login

  if (usuario.email !== EMAIL_ADMIN) {
    return (
      <main className="container">
        <h1>No autorizado</h1>
        <p>Esta página es solo para la cuenta administradora.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Feedback de usuarios</h1>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {feedback === null && !error && <p>Cargando...</p>}
      {feedback && feedback.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Todavía no hay comentarios.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {feedback && feedback.map(f => (
          <div key={f.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <strong>{f.calificacion ? `${f.calificacion}/5` : 'Sin calificar'}</strong>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {new Date(f.created_at).toLocaleString('es-CL')}
              </span>
            </div>
            <p style={{ margin: '8px 0' }}>{f.mensaje}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
              {f.email || 'Anónimo'} · página: {f.pagina || '—'}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
