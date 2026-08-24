'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const NOMBRE_MODULO = {
  bajo_cocina: 'Mueble cocina',
  alto_cocina: 'Mueble aéreo',
  vanitorio_bano: 'Vanitorio de baño',
  closet: 'Closet / armario ropero',
};

export default function MisMuebles() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const router = useRouter();
  const [muebles, setMuebles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.push('/login?redirect=/mis-muebles');
      return;
    }
    cargarMuebles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth]);

  async function cargarMuebles() {
    setError(null);
    const { data, error: err } = await supabase
      .from('muebles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (err) { setError(err.message); return; }
    setMuebles(data);
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este mueble guardado? No se puede deshacer.')) return;
    const { error: err } = await supabase.from('muebles').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setMuebles(m => m.filter(x => x.id !== id));
  }

  if (cargandoAuth || (usuario && muebles === null && !error)) {
    return <main className="container"><p>Cargando...</p></main>;
  }

  if (!usuario) return null; // se está redirigiendo a /login

  return (
    <main className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Mis muebles</h1>
        <Link href="/configurador">
          <button style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}>+ Nuevo mueble</button>
        </Link>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {muebles && muebles.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Todavía no has guardado ningún mueble. Configura uno y presiona "Guardar mueble".
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {muebles && muebles.map(m => (
          <div key={m.id} className="card">
            <h4 style={{ marginBottom: 4 }}>{m.nombre}</h4>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-muted)' }}>
              {NOMBRE_MODULO[m.modulo] || m.modulo}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
              Editado {new Date(m.updated_at).toLocaleDateString('es-CL')}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Link href={`/configurador?muebleId=${m.id}`} style={{ flex: 1 }}>
                <button style={{ marginTop: 0 }}>Abrir</button>
              </Link>
              <button
                type="button"
                onClick={() => eliminar(m.id)}
                style={{ marginTop: 0, width: 'auto', padding: '11px 14px', background: 'var(--color-danger)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
