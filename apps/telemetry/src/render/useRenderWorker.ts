import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { MainToWorker, WorkerToMain } from './messages.ts';

export type RenderWorkerStatus =
  | { readonly state: 'starting' }
  | {
      readonly state: 'running';
      readonly frames: number;
      readonly fps: number;
      readonly origin: string;
    }
  | { readonly state: 'failed'; readonly message: string };

export interface RenderWorkerHandle {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly status: RenderWorkerStatus;
}

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 240;

const createCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Live render surface');
  return canvas;
};

const reduceStatus = (
  previous: RenderWorkerStatus,
  message: WorkerToMain,
  origin: string,
): RenderWorkerStatus => {
  switch (message.type) {
    case 'ready':
      return { state: 'running', frames: 0, fps: 0, origin: new URL(message.scriptUrl).origin };
    case 'stats':
      return { state: 'running', frames: message.frames, fps: message.fps, origin };
    case 'failed':
      return { state: 'failed', message: message.message };
    default:
      return previous;
  }
};

/**
 * Hands a canvas to a module worker. The canvas is created inside the effect because
 * `transferControlToOffscreen()` can run only once per canvas, and React re-runs effects in
 * development.
 */
export const useRenderWorker = (): RenderWorkerHandle => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RenderWorkerStatus>({ state: 'starting' });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = createCanvas();
    container.append(canvas);
    const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
    let origin = '';

    worker.addEventListener('message', (event: MessageEvent<WorkerToMain>) => {
      if (event.data.type === 'ready') origin = new URL(event.data.scriptUrl).origin;
      setStatus((previous) => reduceStatus(previous, event.data, origin));
    });
    worker.addEventListener('error', (event) => {
      setStatus({ state: 'failed', message: event.message || 'The render worker failed to load' });
    });

    const offscreen = canvas.transferControlToOffscreen();
    const init: MainToWorker = {
      type: 'init',
      canvas: offscreen,
      markColor: getComputedStyle(container).color,
    };
    worker.postMessage(init, [offscreen]);

    return () => {
      worker.terminate();
      canvas.remove();
    };
  }, []);

  return { containerRef, status };
};
