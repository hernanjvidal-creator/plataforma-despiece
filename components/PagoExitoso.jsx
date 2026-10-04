'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const INTENTOS_MAXIMOS = 40; // ~80 segundos

export default function PagoExitoso() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoId = searchParams.get('pedido');
  const token = searchParams.get('t');

  const [estado, setEstado] = useState('esperando'); // esperando | cuenta_existente | demora | error
  const [correo, setCorreo] = useState('');

  useEffect(() => {
    if (!pedidoId || !token) {
      setEstado('error');
      return;
    }
    let cancelado = false;
    let intentos = 0;

    async function reclamar() {
      try {
        const res = await fetch('/api/pedido-invitado/reclamar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoId, token }),
        });
        const data = await res.json();
        if (cancelado) return;

        if (res.ok && data.estado === 'listo') {
          const { error } = await supabase.auth.verifyOtp({ token_hash: data.hashedToken, type: 'magiclink' });
          if (cancelado) return;
          if (error) { setEstado('demora'); return; }
          router.replace(`/mis-muebles?pedidoPago=${pedidoId}`);
          return;
        }
        if (res.ok && data.estado === 'cuenta_existente') {
          setCorreo(data.correo || '');
          setEstado('cuenta_existente');
          return;
        }
        if (!res.ok && res.status === 404) { setEstado('error'); return; }
      } catch {
        // se reintenta abajo
      }
      intentos += 1;
      if (intentos < INTENTOS_MAXIMOS) setTimeout(reclamar, 2000);
      else if (!cancelado) setEstado('demora');
    }

    reclamar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, token]);

  return (
    <div className="card" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
      {estado === 'esperando' && (
        <>
          <h3>Confirmando tu pago…</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Estamos creando tu acceso y desbloqueando tu despiece. Esto toma unos segundos, no cierres esta página.
          </p>
        </>
      )}
      {estado === 'cuenta_existente' && (
        <>
          <h3>¡Pago recibido!</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Ese correo{correo ? ` (${correo})` : ''} ya tenía una cuenta en Armandolo, así que agregamos tu mueble a ella.
            Inicia sesión para ver tu despiece desbloqueado.
          </p>
          <Link href="/login?redirect=/mis-muebles"><button>Iniciar sesión</button></Link>
        </>
      )}
      {estado === 'demora' && (
        <>
          <h3>Tu pago está siendo confirmado</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Está tardando más de lo normal. No te preocupes: tu mueble queda guardado en la cuenta de tu correo.
            En unos minutos puedes entrar con ese correo desde Iniciar sesión (con Google, o con "¿Olvidaste tu contraseña?").
          </p>
          <Link href="/login?redirect=/mis-muebles"><button>Iniciar sesión</button></Link>
        </>
      )}
      {estado === 'error' && (
        <>
          <h3>No pudimos mostrar tu compra</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Este enlace no es válido o ya se usó. Si ya pagaste, inicia sesión con el correo que usaste en el pago
            y tu mueble estará en "Mis muebles".
          </p>
          <Link href="/login?redirect=/mis-muebles"><button>Iniciar sesión</button></Link>
        </>
      )}
    </div>
  );
}
