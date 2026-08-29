'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { EMAIL_ADMIN } from '@/lib/admin';

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

export default function AdminEstadisticas() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.push('/login?redirect=/admin/estadisticas');
      return;
    }
    if (usuario.email !== EMAIL_ADMIN) return;

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth]);

  async function cargar() {
    setError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const accessToken = sesion.session?.access_token;
      const res = await fetch(`/api/admin/estadisticas?accessToken=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando las estadísticas');
      setStats(data);
    } catch (e) {
      setError(e.message);
    }
  }

  if (cargandoAuth) return <main className="container"><p>Cargando...</p></main>;
  if (!usuario) return null;

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
      <h1>Uso de la plataforma</h1>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {!stats && !error && <p>Cargando...</p>}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.totalMuebles}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Muebles diseñados (total)</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.mueblesUltimos7Dias}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Últimos 7 días</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.mueblesUltimos30Dias}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Últimos 30 días</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.usuariosUnicos}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Usuarios que diseñaron algo</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{stats.totalFeedback}</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Comentarios de feedback</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
                {stats.promedioCalificacion ? stats.promedioCalificacion.toFixed(1) : '—'}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Calificación promedio</p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Muebles por tipo</h3>
            {Object.keys(stats.porModulo).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay muebles guardados.</p>
            )}
            {Object.entries(stats.porModulo)
              .sort((a, b) => b[1] - a[1])
              .map(([modulo, cantidad]) => (
                <div key={modulo} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>{NOMBRE_MODULO[modulo] || modulo}</span>
                  <strong>{cantidad}</strong>
                </div>
              ))}
          </div>
        </>
      )}
    </main>
  );
}
