import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { ORBIT_PADDING, createMarks, markX, markY } from './orbit.ts';

const TAU = Math.PI * 2;

const buildCanvasSize = (): { width: number; height: number } => ({
  width: faker.number.int({ min: 64, max: 4096 }),
  height: faker.number.int({ min: 64, max: 4096 }),
});

const buildTimes = (): number[] =>
  faker.helpers.multiple(() => faker.number.float({ min: 0, max: 1e9 }), { count: 20 });

describe('createMarks', () => {
  it('creates the requested number of marks', () => {
    // Arrange
    const count = faker.number.int({ min: 1, max: 1000 });

    // Act
    const marks = createMarks(count);

    // Assert
    expect(marks).toHaveLength(count);
  });

  it('spreads phases evenly over one full turn', () => {
    // Arrange
    const count = faker.number.int({ min: 2, max: 1000 });

    // Act
    const phases = createMarks(count).map((mark) => mark.phase);

    // Assert
    expect(phases[0]).toBe(0);
    expect(phases.at(-1)).toBeCloseTo((TAU * (count - 1)) / count);
  });

  it('keeps every ring scale between 40% and 90% of the radius', () => {
    // Arrange
    const count = faker.number.int({ min: 10, max: 1000 });

    // Act
    const scales = createMarks(count).flatMap((mark) => [mark.scaleX, mark.scaleY]);

    // Assert
    expect(Math.min(...scales)).toBeCloseTo(0.4);
    expect(Math.max(...scales)).toBeCloseTo(0.9);
  });
});

describe('markX and markY', () => {
  it('keep every mark inside the padded canvas at any time', () => {
    // Arrange
    const { width, height } = buildCanvasSize();
    const marks = createMarks(faker.number.int({ min: 50, max: 500 }));
    const times = buildTimes();

    // Act
    const points = times.flatMap((time) =>
      marks.map((mark) => ({ x: markX(mark, time, width), y: markY(mark, time, height) })),
    );

    // Assert
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(ORBIT_PADDING);
    expect(Math.max(...xs)).toBeLessThanOrEqual(width - ORBIT_PADDING);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(ORBIT_PADDING);
    expect(Math.max(...ys)).toBeLessThanOrEqual(height - ORBIT_PADDING);
  });

  it('return the same position for the same mark, time and size', () => {
    // Arrange
    const { width, height } = buildCanvasSize();
    const [mark] = createMarks(faker.number.int({ min: 1, max: 100 }));
    const time = faker.number.float({ min: 0, max: 1e9 });
    if (!mark) throw new Error('Expected at least one mark');

    // Act
    const first = [markX(mark, time, width), markY(mark, time, height)];
    const second = [markX(mark, time, width), markY(mark, time, height)];

    // Assert
    expect(second).toEqual(first);
  });
});
