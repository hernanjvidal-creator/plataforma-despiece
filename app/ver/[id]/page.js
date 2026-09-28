import VerMueblePublico from '@/components/VerMueblePublico';

export const metadata = {
  title: 'Mueble compartido — Armandolo',
  robots: { index: false, follow: false },
};

export default function VerMueblePage({ params }) {
  return <VerMueblePublico id={params.id} />;
}
