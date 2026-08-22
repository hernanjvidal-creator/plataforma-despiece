'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, supabaseConfigurado } from '@/lib/supabaseClient';

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectA = searchParams.get('redirect') || '/mis-muebles';

  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setMensaje(null);

    try {
      if (modo === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(redirectA);
        router.refresh();
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMensaje('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
        setModo('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h3>Cuentas aún no configuradas</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Falta conectar el proyecto de Supabase (variables de entorno) para que el login funcione.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h3>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>

      <form onSubmit={enviar}>
        <label>Correo</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />

        <label>Contraseña</label>
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        {mensaje && <p style={{ color: 'var(--color-ok)', fontSize: 13, marginTop: 10 }}>{mensaje}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Un momento...' : modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setModo(m => m === 'login' ? 'registro' : 'login'); setError(null); setMensaje(null); }}
        style={{ marginTop: 10, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
      >
        {modo === 'login' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta, iniciar sesión'}
      </button>
    </div>
  );
}
