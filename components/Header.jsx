import Link from 'next/link';

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
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <MarcaIcono />
          Despiece
        </Link>
        <nav className="site-nav">
          <Link href="/">Inicio</Link>
          <Link href="/configurador">Configurador</Link>
        </nav>
      </div>
    </header>
  );
}
