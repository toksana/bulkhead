import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { decodeMessage, encodeMessage } from './message.ts';
import { createMsgpackCodec } from './msgpack.ts';
import { buildSampleEnvelope, sampleEnvelopeSchema } from '../testing/factories.ts';

describe('decodeMessage', () => {
  it('returns the typed value for valid bytes', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const envelope = buildSampleEnvelope();
    const bytes = codec.encode(envelope);

    // Act
    const result = decodeMessage(codec, bytes, sampleEnvelopeSchema);

    // Assert
    expect(result).toEqual({ ok: true, value: envelope });
  });

  it('reports malformed bytes without throwing', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const truncated = codec.encode(buildSampleEnvelope()).subarray(0, 5);

    // Act
    const result = decodeMessage(codec, truncated, sampleEnvelopeSchema);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.kind).toBe('malformed');
  });

  it('reports a schema mismatch as invalid', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const bytes = codec.encode({ ...buildSampleEnvelope(), seq: faker.word.noun() });

    // Act
    const result = decodeMessage(codec, bytes, sampleEnvelopeSchema);

    // Assert
    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.kind).toBe('invalid');
    expect(result.ok ? null : result.error.message).toContain('seq');
  });
});

describe('encodeMessage', () => {
  it('encodes a valid value', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const envelope = buildSampleEnvelope();

    // Act
    const bytes = encodeMessage(codec, sampleEnvelopeSchema, envelope);

    // Assert
    expect(codec.decode(bytes)).toEqual(envelope);
  });

  it('throws on a value that does not match the schema', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const invalid = { ...buildSampleEnvelope(), ts: -1 };

    // Act
    const encode = (): Uint8Array => encodeMessage(codec, sampleEnvelopeSchema, invalid);

    // Assert
    expect(encode).toThrow();
  });
});
