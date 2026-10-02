'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';

export default function RestablecerForm() {
  const router = useRouter();
  const { usuario, cargando: cargandoAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    if (password !== repetir) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.push('/mis-muebles');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (cargandoAuth) return <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>Cargando...</div>;

  if (!usuario) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h3>Enlace no válido o vencido</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Este enlace ya se usó o expiró. Pide uno nuevo desde{' '}
          <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Iniciar sesión → ¿Olvidaste tu contraseña?</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h3>Crea tu nueva contraseña</h3>
      <form onSubmit={enviar}>
        <label>Nueva contraseña</label>
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />

        <label>Repite la contraseña</label>
        <input type="password" required minLength={6} value={repetir} onChange={e => setRepetir(e.target.value)} />

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
