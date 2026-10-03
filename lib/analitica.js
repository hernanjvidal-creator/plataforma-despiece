// Eventos del embudo de compra: se guardan en nuestra base (para verlos en el
// panel de admin, sin depender de bloqueadores de anuncios) y, si existe,
// también en Google Analytics. Nunca debe poder romper ni frenar la compra.

export function registrarEvento(evento, { modulo, userId } = {}) {
  try {
    fetch('/api/registrar-evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento, modulo: modulo || null, userId: userId || null }),
      keepalive: true,
    }).catch(() => {});
  } catch {}

  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', evento, { modulo: modulo || undefined });
    }
  } catch {}
}

export function gtagSeguro(nombre, parametros) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', nombre, parametros);
    }
  } catch {}
}
