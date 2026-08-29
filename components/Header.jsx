'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { EMAIL_ADMIN } from '@/lib/admin';

function MarcaIcono() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-mark">
      <rect x="2" y="2" width="22" height="7" rx="1.5" fill="var(--color-accent)" />
      <rect x="2" y="11.5" width="14" height="7" rx="1.5" fill="var(--color-accent-dark)" />
      <rect x="18" y="11.5" width="6" height="12.5" rx="1.5" fill="var(--color-text)" opacity="0.85" />
      <rect x="2" y="20.5" width="14" height="3.5" rx="1.5" fill="var(--color-accent)" opacity="0.6" />
    </svg>
  );
}

export default function Header() {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <MarcaIcono />
          Despiece
        </Link>
        <nav className="site-nav">
          <Link href="/">Inicio</Link>
          <Link href="/configurador" className="nav-cta">Diseñar</Link>
          <Link href="/guia-armado">Guía de armado</Link>
          {!cargando && usuario && <Link href="/mis-muebles">Mis muebles</Link>}
          {!cargando && usuario?.email === EMAIL_ADMIN && <Link href="/admin/estadisticas">Estadísticas</Link>}
          {!cargando && usuario?.email === EMAIL_ADMIN && <Link href="/admin/feedback">Feedback</Link>}
          {!cargando && !usuario && <Link href="/login">Iniciar sesión</Link>}
          {!cargando && usuario && (
            <button
              type="button"
              onClick={cerrarSesion}
              style={{ margin: 0, width: 'auto', padding: '6px 0', background: 'none', color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 600 }}
            >
              Salir
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
