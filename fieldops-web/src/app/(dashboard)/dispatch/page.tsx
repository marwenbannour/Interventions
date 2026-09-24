import { Suspense } from 'react';
import { DispatchBoard } from '@/features/dispatch/components/DispatchBoard';

export default function DispatchPage() {
  return (
    <Suspense>
      <DispatchBoard />
    </Suspense>
  );
}
