import { createFrameMeter } from './frame-meter.ts';
import type { MainToWorker, WorkerToMain } from './messages.ts';
import { createMarks, markX, markY } from './orbit.ts';
import type { Mark } from './orbit.ts';

const MARK_COUNT = 400;
const MARK_SIZE = 3;
const STATS_INTERVAL_FRAMES = 30;

const marks = createMarks(MARK_COUNT);
let running = false;

const post = (message: WorkerToMain): void => {
  self.postMessage(message);
};

/** One path and a single fill per frame instead of one draw call per mark. */
const drawFrame = (
  context: OffscreenCanvasRenderingContext2D,
  frameMarks: readonly Mark[],
  time: number,
): void => {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.beginPath();
  for (const mark of frameMarks) {
    const x = markX(mark, time, width) - MARK_SIZE / 2;
    const y = markY(mark, time, height) - MARK_SIZE / 2;
    context.rect(x, y, MARK_SIZE, MARK_SIZE);
  }
  context.fill();
};

const start = (canvas: OffscreenCanvas, markColor: string): void => {
  // A second init would start a second loop on the same canvas; it can only come from a bug.
  if (running) throw new Error('The render worker is already running');

  const context = canvas.getContext('2d');
  if (!context) {
    post({ type: 'failed', message: 'A 2D context is not available on the offscreen canvas' });
    return;
  }
  running = true;
  context.fillStyle = markColor;
  post({ type: 'ready', scriptUrl: self.location.href });

  const measure = createFrameMeter(STATS_INTERVAL_FRAMES, (sample) => {
    post({ type: 'stats', ...sample });
  });

  const tick = (time: number): void => {
    drawFrame(context, marks, time);
    measure(time);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

self.addEventListener('message', (event: MessageEvent<MainToWorker>) => {
  start(event.data.canvas, event.data.markColor);
});
