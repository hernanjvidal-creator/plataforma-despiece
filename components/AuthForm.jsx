'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, supabaseConfigurado } from '@/lib/supabaseClient';
import { leerBorrador } from '@/lib/borradorConfigurador';

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectA = searchParams.get('redirect') || '/mis-muebles';

  const [modo, setModo] = useState('login'); // 'login' | 'registro' | 'recuperar'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [hayBorrador, setHayBorrador] = useState(false);

  useEffect(() => {
    setHayBorrador(Boolean(leerBorrador()));
  }, []);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setMensaje(null);

    try {
      if (modo === 'recuperar') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/restablecer',
        });
        if (err) throw err;
        setMensaje('Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también la carpeta de spam.');
      } else if (modo === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push(redirectA);
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          router.push(redirectA);
          router.refresh();
        } else {
          setMensaje('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
          setModo('login');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function entrarConGoogle() {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + redirectA },
    });
    if (err) setError(err.message);
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
      <h3>{modo === 'login' ? 'Iniciar sesión' : modo === 'registro' ? 'Crear cuenta' : 'Recuperar contraseña'}</h3>

      {hayBorrador && (
        <p style={{ color: 'var(--color-ok)', fontSize: 13, marginTop: 0 }}>
          Tu diseño está guardado: al entrar lo recuperamos y seguimos donde lo dejaste.
        </p>
      )}

      {modo !== 'recuperar' && (
        <>
          <button
            type="button"
            onClick={entrarConGoogle}
            style={{ background: '#fff', color: 'var(--color-text)', border: '1px solid #d8d4cc', marginBottom: 14 }}
          >
            Continuar con Google
          </button>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12, margin: '0 0 10px' }}>o con tu correo</p>
        </>
      )}
      {modo === 'recuperar' && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 0 }}>
          Escribe tu correo y te enviamos un enlace para crear una nueva contraseña.
        </p>
      )}

      <form onSubmit={enviar}>
        <label>Correo</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />

        {modo !== 'recuperar' && (
          <>
            <label>Contraseña</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          </>
        )}
        {modo === 'login' && (
          <button
            type="button"
            onClick={() => { setModo('recuperar'); setError(null); setMensaje(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', width: 'auto', padding: 0, margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
        {mensaje && <p style={{ color: 'var(--color-ok)', fontSize: 13, marginTop: 10 }}>{mensaje}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Un momento...' : modo === 'login' ? 'Iniciar sesión' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
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
