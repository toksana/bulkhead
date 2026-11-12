import type { ReactElement } from 'react';

import styles from './RenderSurface.module.css';
import { useRenderWorker } from './useRenderWorker.ts';
import type { RenderWorkerStatus } from './useRenderWorker.ts';

const describe = (status: RenderWorkerStatus): string => {
  switch (status.state) {
    case 'starting':
      return 'Render worker: starting';
    case 'running':
      return `Render worker: running, ${String(status.fps)} fps, ${String(status.frames)} frames, ${status.origin}`;
    case 'failed':
      return `Render worker: failed, ${status.message}`;
  }
};

export function RenderSurface(): ReactElement {
  const { containerRef, status } = useRenderWorker();

  return (
    <div className={styles.surface}>
      <div ref={containerRef} />
      <output className={styles.status} aria-live="off" data-state={status.state}>
        {describe(status)}
      </output>
    </div>
  );
}
