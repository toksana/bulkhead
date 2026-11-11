import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';

const Response = lazy(() => import('response/App'));
const Telemetry = lazy(() => import('telemetry/App'));

export default function App(): ReactElement {
  return (
    <main>
      <h1>Bulkhead</h1>
      <Suspense fallback={<p>Loading response…</p>}>
        <Response />
      </Suspense>
      <Suspense fallback={<p>Loading telemetry…</p>}>
        <Telemetry />
      </Suspense>
    </main>
  );
}
