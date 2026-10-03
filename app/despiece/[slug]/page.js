import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PAGINAS_MUEBLE, paginaPorSlug } from '@/lib/paginasMueble';

export function generateStaticParams() {
  return PAGINAS_MUEBLE.map(p => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const pagina = paginaPorSlug(params.slug);
  if (!pagina) return {};
  const url = `/despiece/${pagina.slug}`;
  return {
    title: `${pagina.titulo} | Armandolo`,
    description: pagina.descripcion,
    alternates: { canonical: url },
    openGraph: {
      title: pagina.titulo,
      description: pagina.descripcion,
      url,
      siteName: 'Armandolo',
      locale: 'es_CL',
      type: 'article',
    },
  };
}

const PASOS = [
  ['Configura tu mueble', 'Ingresa las medidas, la distribución y los colores. Ves el resultado en 3D al instante, gratis y sin crear cuenta.'],
  ['Revisa el plano 3D', 'Rota el mueble, comprueba que sea lo que imaginabas y ajusta lo que quieras cuantas veces necesites.'],
  ['Desbloquea el despiece', 'Con un pago único por mueble obtienes las medidas exactas de cada pieza, los herrajes, el diagrama de corte por plancha y el PDF de entrega.'],
];

export default function PaginaMueble({ params }) {
  const pagina = paginaPorSlug(params.slug);
  if (!pagina) notFound();

  const otras = PAGINAS_MUEBLE.filter(p => p.slug !== pagina.slug);
  const enlaceDisenar = `/configurador?modulo=${pagina.modulo}`;

  return (
    <main className="container" style={{ maxWidth: 820 }}>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
        <Link href="/" style={{ color: 'var(--color-accent)' }}>Inicio</Link>
        {' / '}
        Despiece
        {' / '}
        {pagina.nombreLargo}
      </p>

      <h1>{pagina.h1}</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{pagina.intro}</p>

      <Link href={enlaceDisenar}>
        <button style={{ maxWidth: 320, marginTop: 8 }}>Diseñar mi {pagina.nombre} →</button>
      </Link>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
        Diseñar y ver el plano 3D es gratis y sin crear cuenta.
      </p>

      <h2>Qué incluye el diseño</h2>
      <ul style={{ lineHeight: 1.7 }}>
        {pagina.incluye.map(item => <li key={item}>{item}</li>)}
      </ul>

      <h2>Cómo funciona</h2>
      <ol style={{ lineHeight: 1.7 }}>
        {PASOS.map(([titulo, detalle]) => (
          <li key={titulo}><strong>{titulo}.</strong> {detalle}</li>
        ))}
      </ol>

      <h2>Medidas de partida</h2>
      <p style={{ lineHeight: 1.6 }}>{pagina.medidas}</p>

      <h2>Qué recibes al desbloquear el despiece</h2>
      <ul style={{ lineHeight: 1.7 }}>
        <li>Listado de piezas con medidas, cantidades, colores y cantos.</li>
        <li>Listado de herrajes y materiales para comprar en la ferretería.</li>
        <li>Diagrama de corte optimizado para la plancha de melamina de tu país.</li>
        <li>PDF de entrega y manual de armado, listos para llevar a la maderera o centro de corte.</li>
      </ul>
      <p style={{ fontSize: 14 }}>
        Precios en dólares, pago único por mueble y más los impuestos que apliquen según tu país.{' '}
        <Link href="/precios" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Ver precios</Link>.
      </p>

      <h2>Preguntas frecuentes</h2>
      {pagina.faq.map(({ q, a }) => (
        <div key={q} style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 4, fontSize: 17 }}>{q}</h3>
          <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{a}</p>
        </div>
      ))}

      <div className="card" style={{ textAlign: 'center', marginTop: 28 }}>
        <h3 style={{ marginTop: 0 }}>Empieza a diseñar tu {pagina.nombre}</h3>
        <Link href={enlaceDisenar}>
          <button style={{ maxWidth: 320, margin: '0 auto' }}>Ir al configurador →</button>
        </Link>
      </div>

      <h2>Otros muebles que puedes diseñar</h2>
      <ul style={{ lineHeight: 1.9 }}>
        {otras.map(p => (
          <li key={p.slug}>
            <Link href={`/despiece/${p.slug}`} style={{ color: 'var(--color-accent)' }}>{p.titulo}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
