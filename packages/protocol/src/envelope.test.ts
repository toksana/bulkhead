import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION, anyEnvelopeSchema } from './envelope.ts';
import {
  SAMPLE_TYPE,
  buildSampleEnvelope,
  buildSamplePayload,
  sampleEnvelopeSchema,
} from './testing/factories.ts';

describe('createEnvelope', () => {
  it('stamps the protocol version and keeps the given fields', () => {
    // Arrange
    const payload = buildSamplePayload();

    // Act
    const envelope = buildSampleEnvelope(payload);

    // Assert
    expect(envelope.v).toBe(PROTOCOL_VERSION);
    expect(envelope.type).toBe(SAMPLE_TYPE);
    expect(envelope.payload).toEqual(payload);
  });
});

describe('createEnvelopeSchema', () => {
  it('accepts an envelope of its own type', () => {
    // Arrange
    const envelope = buildSampleEnvelope();

    // Act
    const result = sampleEnvelopeSchema.safeParse(envelope);

    // Assert
    expect(result.success).toBe(true);
  });

  it('rejects an envelope with a different type tag', () => {
    // Arrange
    const envelope = { ...buildSampleEnvelope(), type: faker.string.alpha(10) };

    // Act
    const result = sampleEnvelopeSchema.safeParse(envelope);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects an unknown protocol version', () => {
    // Arrange
    const envelope = { ...buildSampleEnvelope(), v: PROTOCOL_VERSION + 1 };

    // Act
    const result = sampleEnvelopeSchema.safeParse(envelope);

    // Assert
    expect(result.success).toBe(false);
  });

  it('rejects a negative or fractional sequence number', () => {
    // Arrange
    const negative = { ...buildSampleEnvelope(), seq: -1 };
    const fractional = { ...buildSampleEnvelope(), seq: 1.5 };

    // Act
    const results = [negative, fractional].map((e) => sampleEnvelopeSchema.safeParse(e).success);

    // Assert
    expect(results).toEqual([false, false]);
  });

  it('rejects a payload that does not match the payload schema', () => {
    // Arrange
    const envelope = { ...buildSampleEnvelope(), payload: { deviceId: '' } };

    // Act
    const result = sampleEnvelopeSchema.safeParse(envelope);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('anyEnvelopeSchema', () => {
  it('accepts any type tag and leaves the payload unvalidated', () => {
    // Arrange
    const envelope = { ...buildSampleEnvelope(), type: 'other.type', payload: [1, 'x'] };

    // Act
    const result = anyEnvelopeSchema.safeParse(envelope);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.payload).toEqual([1, 'x']);
  });
});
