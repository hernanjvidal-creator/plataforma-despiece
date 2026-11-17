import { MODO_GRATIS_TEMPORAL } from '@/lib/modoGratisTemporal';

export default function Footer() {
  return (
    <footer className="site-footer">
      Armandolo — configurador de muebles de melamina · plano 3D, listado de piezas y diagrama de corte
      <br />
      Contacto: <a href="mailto:contacto@armandolo.com">contacto@armandolo.com</a>
      <br />
      {/* Sin cobro, los precios y la política de reembolso no aplican: las páginas siguen existiendo, pero sin enlace. */}
      {!MODO_GRATIS_TEMPORAL && (
        <>
          <a href="/precios">Precios</a>
          {' · '}
        </>
      )}
      <a href="/privacidad">Política de privacidad</a>
      {' · '}
      <a href="/terminos">Términos y condiciones</a>
      {!MODO_GRATIS_TEMPORAL && (
        <>
          {' · '}
          <a href="/reembolsos">Política de reembolso</a>
        </>
      )}
    </footer>
  );
}
