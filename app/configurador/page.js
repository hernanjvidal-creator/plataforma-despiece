import { Suspense } from 'react';
import Configurador from '@/components/Configurador';

export default function ConfiguradorPage() {
  return (
    <Suspense fallback={null}>
      <Configurador />
    </Suspense>
  );
}
