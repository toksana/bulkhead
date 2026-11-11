export interface FrameSample {
  readonly frames: number;
  readonly fps: number;
}

/**
 * Counts frames and reports the average rate once every `interval` frames.
 * The first frame only sets the reference timestamp, so each sample covers exactly
 * `interval` frame durations.
 */
export const createFrameMeter = (
  interval: number,
  onSample: (sample: FrameSample) => void,
): ((time: number) => void) => {
  let frames = 0;
  let windowFrames = 0;
  let windowStart: number | null = null;

  return (time) => {
    frames += 1;
    if (windowStart === null) {
      windowStart = time;
      return;
    }
    windowFrames += 1;
    if (windowFrames < interval) return;

    const elapsed = time - windowStart;
    onSample({ frames, fps: elapsed > 0 ? Math.round((windowFrames * 1000) / elapsed) : 0 });
    windowStart = time;
    windowFrames = 0;
  };
};
