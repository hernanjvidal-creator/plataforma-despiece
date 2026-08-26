import { Suspense } from 'react';
import MisMuebles from '@/components/MisMuebles';

export default function MisMueblesPage() {
  return (
    <Suspense fallback={null}>
      <MisMuebles />
    </Suspense>
  );
}
