'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { mueblesPagados } from '@/lib/pedidosCliente';
import { calcularPrecioUSD } from '@/lib/precios';
import { MODO_GRATIS_TEMPORAL } from '@/lib/modoGratisTemporal';

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

// Conversión "Compra despiece (código)" en Google Ads (Objetivos > Conversiones)
// — disparada a mano acá en vez de por detección automática de URL, para
// poder mandar el monto real de cada pedido en vez de un valor fijo.
const CONVERSION_ADS_COMPRA = 'AW-18412301415/Il2tCOj-lYUdEOfY1ctE';

// Evita contar la misma compra dos veces si el cliente recarga la página de
// confirmación (Google Ads también deduplica por transaction_id — esto es
// una segunda capa, del lado del navegador). Nunca debe poder romper el
// flujo de compra: cualquier falla acá se ignora en silencio.
function registrarConversionAdsSiCorresponde(pedidoId, total) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const clave = `conversion_ads_${pedidoId}`;
    if (localStorage.getItem(clave)) return;
    window.gtag('event', 'conversion', {
      send_to: CONVERSION_ADS_COMPRA,
      value: total,
      currency: 'USD',
      transaction_id: pedidoId,
    });
    localStorage.setItem(clave, '1');
  } catch {
    // Analítica de terceros nunca debe poder romper la confirmación de compra.
  }
}

export default function MisMuebles() {
  const { usuario, cargando: cargandoAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoPagoParam = searchParams.get('pedidoPago');

  const [muebles, setMuebles] = useState(null);
  const [pagados, setPagados] = useState(new Set());
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [error, setError] = useState(null);
  const [comprando, setComprando] = useState(false);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [linkCopiadoId, setLinkCopiadoId] = useState(null);

  useEffect(() => {
    if (cargandoAuth) return;
    if (!usuario) {
      router.push('/login?redirect=/mis-muebles');
      return;
    }
    cargarMuebles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, cargandoAuth]);

  // Al volver del checkout de Lemon Squeezy (?pedidoPago=...), el webhook
  // puede tardar un par de segundos en confirmar el pago — se consulta cada
  // 2s (hasta 30 intentos) y se refresca el estado de "pagado" al confirmar.
  useEffect(() => {
    if (!pedidoPagoParam) return;
    let cancelado = false;
    let intentos = 0;

    async function verificar() {
      const { data, error: err } = await supabase
        .from('pedidos')
        .select('estado, total')
        .eq('id', pedidoPagoParam)
        .single();
      if (cancelado) return;

      if (!err && data?.estado === 'pagado') {
        setVerificandoPago(false);
        setSeleccionados(new Set());
        registrarConversionAdsSiCorresponde(pedidoPagoParam, data.total);
        await cargarMuebles();
        return;
      }
      intentos += 1;
      if (intentos < 30) {
        setTimeout(verificar, 2000);
      } else {
        setVerificandoPago(false);
        setError('Tu pago está siendo confirmado — si no aparece "Despiece disponible" en un momento, recarga la página.');
      }
    }

    setVerificandoPago(true);
    verificar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoPagoParam]);

  async function cargarMuebles() {
    setError(null);
    const { data, error: err } = await supabase
      .from('muebles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (err) { setError(err.message); return; }
    setMuebles(data);
    setPagados(await mueblesPagados(data.map(m => m.id)));
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este mueble guardado? No se puede deshacer.')) return;
    const { error: err } = await supabase.from('muebles').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setMuebles(m => m.filter(x => x.id !== id));
    setSeleccionados(s => { const copia = new Set(s); copia.delete(id); return copia; });
  }

  // Link de solo lectura (sin login) — cualquiera con el link puede ver el
  // plano 3D y el despiece, pensado para pasárselo a un maestro externo.
  async function compartir(id) {
    const url = `${window.location.origin}/ver/${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia este link:', url);
      return;
    }
    setLinkCopiadoId(id);
    setTimeout(() => setLinkCopiadoId(actual => (actual === id ? null : actual)), 2500);
  }

  function alternarSeleccion(id) {
    setSeleccionados(s => {
      const copia = new Set(s);
      if (copia.has(id)) copia.delete(id); else copia.add(id);
      return copia;
    });
  }

  async function comprar(ids) {
    if (ids.length === 0) return;
    setComprando(true);
    setError(null);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const accessToken = sesion.session?.access_token;
      if (!accessToken) throw new Error('Sesión no encontrada, vuelve a iniciar sesión');

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, muebleIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error iniciando el pago');

      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError('No se pudo iniciar el pago: ' + e.message);
      setComprando(false);
    }
  }

  if (cargandoAuth || (usuario && muebles === null && !error)) {
    return <main className="container"><p>Cargando...</p></main>;
  }

  if (!usuario) return null; // se está redirigiendo a /login

  return (
    <main className="container" style={{ paddingBottom: seleccionados.size > 0 ? 90 : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Mis muebles</h1>
        <Link href="/configurador">
          <button style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}>+ Nuevo mueble</button>
        </Link>
      </div>

      {verificandoPago && (
        <p style={{ color: 'var(--color-accent)', fontSize: 14 }}>Confirmando tu pago…</p>
      )}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {muebles && muebles.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Todavía no has guardado ningún mueble. Configura uno y presiona "Guardar mueble".
        </div>
      )}

      {!MODO_GRATIS_TEMPORAL && muebles && muebles.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 0 }}>
          Cada mueble pendiente tiene su botón "Comprar". Si quieres pagar varios juntos en un solo checkout,
          marca "Sumar a un pago conjunto" en cada uno y usa la barra de abajo.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {muebles && muebles.map(m => {
          const pagado = pagados.has(m.id);
          return (
            <div key={m.id} className="card" style={seleccionados.has(m.id) ? { borderColor: 'var(--color-accent)' } : undefined}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h4 style={{ margin: '0 0 4px' }}>{m.nombre}</h4>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {NOMBRE_MODULO[m.modulo] || m.modulo}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                Editado {new Date(m.updated_at).toLocaleDateString('es-CL')}
              </p>
              {!MODO_GRATIS_TEMPORAL && (pagado ? (
                <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: 'var(--color-ok)' }}>
                  ✓ Despiece disponible
                </p>
              ) : (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Pendiente de pago
                </p>
              ))}
              {!MODO_GRATIS_TEMPORAL && !pagado && (
                <>
                  <button
                    type="button"
                    onClick={() => comprar([m.id])}
                    disabled={comprando}
                    style={{ marginTop: 12 }}
                  >
                    {comprando ? 'Redirigiendo a pago...' : `Comprar despiece — US$${calcularPrecioUSD(m.modulo, m.parametros)}`}
                  </button>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    + impuestos aplicables según tu país
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={seleccionados.has(m.id)}
                      onChange={() => alternarSeleccion(m.id)}
                    />
                    Sumar a un pago conjunto
                  </label>
                </>
              )}
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
              <button
                type="button"
                onClick={() => compartir(m.id)}
                style={{ marginTop: 8, background: '#fff', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }}
              >
                {linkCopiadoId === m.id ? 'Link copiado ✓' : 'Copiar link para compartir'}
              </button>
            </div>
          );
        })}
      </div>

      {!MODO_GRATIS_TEMPORAL && seleccionados.size > 0 && (
        <div
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff',
            borderTop: '1px solid #e4e2dc', padding: '14px 20px', boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, zIndex: 10,
          }}
        >
          <span style={{ fontSize: 14 }}>
            {seleccionados.size} mueble{seleccionados.size > 1 ? 's' : ''} seleccionado{seleccionados.size > 1 ? 's' : ''}
            {' '}— total <strong>US${muebles
              .filter(m => seleccionados.has(m.id))
              .reduce((suma, m) => suma + calcularPrecioUSD(m.modulo, m.parametros), 0)}</strong>
          </span>
          <button
            onClick={() => comprar([...seleccionados])}
            disabled={comprando}
            style={{ marginTop: 0, width: 'auto', padding: '10px 22px' }}
          >
            {comprando ? 'Redirigiendo a pago...' : 'Comprar seleccionados'}
          </button>
        </div>
      )}
    </main>
  );
}
