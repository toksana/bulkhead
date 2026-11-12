import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';

import styles from './App.module.css';

const Response = lazy(() => import('response/App'));
const Telemetry = lazy(() => import('telemetry/App'));

export default function App(): ReactElement {
  return (
    <main className={styles.shell}>
      <h1>Bulkhead</h1>
      <div className={styles.slot}>
        <Suspense fallback={<p>Loading response…</p>}>
          <Response />
        </Suspense>
      </div>
      <div className={styles.slot}>
        <Suspense fallback={<p>Loading telemetry…</p>}>
          <Telemetry />
        </Suspense>
      </div>
    </main>
  );
}
