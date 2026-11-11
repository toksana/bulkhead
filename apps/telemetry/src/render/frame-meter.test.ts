import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { createFrameMeter } from './frame-meter.ts';
import type { FrameSample } from './frame-meter.ts';

/** Feeds `count` frames at a steady rate, starting at a random timestamp. */
const runFrames = (meter: (time: number) => void, count: number, fps: number): void => {
  const start = faker.number.float({ min: 0, max: 1e6 });
  const frameMs = 1000 / fps;
  Array.from({ length: count }, (_, index) => start + index * frameMs).forEach(meter);
};

const buildInterval = (): number => faker.number.int({ min: 5, max: 60 });

const collect = (): { samples: FrameSample[]; onSample: (sample: FrameSample) => void } => {
  const samples: FrameSample[] = [];
  return { samples, onSample: (sample) => samples.push(sample) };
};

describe('createFrameMeter', () => {
  it('reports nothing before a full interval has elapsed', () => {
    // Arrange
    const interval = buildInterval();
    const { samples, onSample } = collect();
    const meter = createFrameMeter(interval, onSample);

    // Act
    runFrames(meter, interval, 60);

    // Assert
    expect(samples).toEqual([]);
  });

  it.each([30, 60, 120])('reports %i fps when frames arrive at that rate', (fps) => {
    // Arrange
    const interval = buildInterval();
    const { samples, onSample } = collect();
    const meter = createFrameMeter(interval, onSample);

    // Act
    runFrames(meter, interval + 1, fps);

    // Assert
    expect(samples).toEqual([{ frames: interval + 1, fps }]);
  });

  it('reports each window separately and keeps the frame total running', () => {
    // Arrange
    const interval = buildInterval();
    const windows = faker.number.int({ min: 2, max: 5 });
    const { samples, onSample } = collect();
    const meter = createFrameMeter(interval, onSample);

    // Act
    runFrames(meter, interval * windows + 1, 60);

    // Assert
    expect(samples.map((sample) => sample.frames)).toEqual(
      Array.from({ length: windows }, (_, index) => interval * (index + 1) + 1),
    );
    expect(samples.map((sample) => sample.fps)).toEqual(Array<number>(windows).fill(60));
  });

  it('reports 0 fps instead of Infinity when no time has passed', () => {
    // Arrange
    const interval = buildInterval();
    const time = faker.number.float({ min: 0, max: 1e6 });
    const { samples, onSample } = collect();
    const meter = createFrameMeter(interval, onSample);

    // Act
    Array.from({ length: interval + 1 }, () => time).forEach(meter);

    // Assert
    expect(samples).toEqual([{ frames: interval + 1, fps: 0 }]);
  });
});
