'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Tarjeta para quien compró sin cuenta: ya tiene acceso (se le creó con su
// correo), pero con una contraseña puede entrar también desde otro dispositivo.
export default function CrearContrasenaOpcional({ usuario }) {
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [oculta, setOculta] = useState(false);
  const [listo, setListo] = useState(false);

  const aplica = usuario?.user_metadata?.origen === 'compra_invitado' && !usuario?.user_metadata?.contrasena_creada;
  if (!aplica || oculta) return null;

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    if (password !== repetir) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password, data: { contrasena_creada: true } });
      if (err) throw err;
      setListo(true);
      setTimeout(() => setOculta(true), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      {listo ? (
        <p style={{ margin: 0, color: 'var(--color-ok)', fontWeight: 600 }}>Contraseña guardada ✓</p>
      ) : (
        <>
          <h4 style={{ marginTop: 0 }}>Crea una contraseña (opcional)</h4>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Creamos tu cuenta con el correo de tu compra ({usuario.email}). Ya estás dentro, pero si quieres entrar desde
            otro dispositivo, crea una contraseña. También puedes entrar siempre con Google usando ese mismo correo.
          </p>
          <form onSubmit={enviar}>
            <label>Contraseña</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
            <label>Repite la contraseña</label>
            <input type="password" required minLength={6} value={repetir} onChange={e => setRepetir(e.target.value)} />
            {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={guardando} style={{ maxWidth: 240 }}>
              {guardando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOculta(true)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', width: 'auto', padding: 0, marginTop: 8, fontSize: 12 }}
          >
            Más tarde
          </button>
        </>
      )}
    </div>
  );
}
