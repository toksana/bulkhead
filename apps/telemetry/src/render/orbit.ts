const TAU = Math.PI * 2;

/** Marks trace a Lissajous curve: x completes 3 oscillations per lap, y completes 2. */
const X_FREQUENCY = 3;
const Y_FREQUENCY = 2;
const X_PERIOD_MS = 5_600;
const Y_PERIOD_MS = 4_400;

const X_RINGS = 7;
const Y_RINGS = 5;
const MIN_RING_SCALE = 0.4;
const MAX_RING_SCALE = 0.9;

/** Distance kept between the outermost orbit and the canvas edge, in pixels. */
export const ORBIT_PADDING = 8;

export interface Mark {
  readonly phase: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

/** Spreads marks over `rings` concentric orbits, from the smallest to the largest ring scale. */
const ringScale = (index: number, rings: number): number =>
  MIN_RING_SCALE + ((MAX_RING_SCALE - MIN_RING_SCALE) * (index % rings)) / (rings - 1);

/** Static layout: computed once, read every frame. */
export const createMarks = (count: number): readonly Mark[] =>
  Array.from({ length: count }, (_, index) => ({
    phase: (index / count) * TAU,
    scaleX: ringScale(index, X_RINGS),
    scaleY: ringScale(index, Y_RINGS),
  }));

export const markX = (mark: Mark, time: number, width: number): number =>
  width / 2 +
  Math.cos(mark.phase * X_FREQUENCY + (time / X_PERIOD_MS) * TAU) *
    (width / 2 - ORBIT_PADDING) *
    mark.scaleX;

export const markY = (mark: Mark, time: number, height: number): number =>
  height / 2 +
  Math.sin(mark.phase * Y_FREQUENCY + (time / Y_PERIOD_MS) * TAU) *
    (height / 2 - ORBIT_PADDING) *
    mark.scaleY;
