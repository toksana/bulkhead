import type { ReactElement } from 'react';

import { RenderSurface } from './render/RenderSurface.tsx';

export default function App(): ReactElement {
  return (
    <section aria-label="Telemetry">
      <h2>Telemetry</h2>
      <RenderSurface />
    </section>
  );
}
