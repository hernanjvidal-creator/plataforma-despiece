import { Suspense } from 'react';
import PagoExitoso from '@/components/PagoExitoso';

export const metadata = {
  title: 'Confirmando tu pago — Armandolo',
  robots: { index: false, follow: false },
};

export default function PagoExitosoPage() {
  return (
    <main className="container">
      <Suspense fallback={null}>
        <PagoExitoso />
      </Suspense>
    </main>
  );
}
