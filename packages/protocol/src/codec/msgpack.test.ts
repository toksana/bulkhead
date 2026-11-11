import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';

import { createMsgpackCodec } from './msgpack.ts';
import { buildSampleEnvelope } from '../testing/factories.ts';

describe('createMsgpackCodec', () => {
  it('round-trips an envelope unchanged', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const envelope = buildSampleEnvelope();

    // Act
    const decoded = codec.decode(codec.encode(envelope));

    // Assert
    expect(decoded).toEqual(envelope);
  });

  it('keeps millisecond timestamps above 2^32 exact', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const ts = faker.date.future({ years: 50 }).getTime();

    // Act
    const decoded = codec.decode(codec.encode({ ts }));

    // Assert
    expect(decoded).toEqual({ ts });
  });

  it('drops undefined fields instead of encoding them as nil', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const value = { id: faker.string.uuid(), note: undefined };

    // Act
    const decoded = codec.decode(codec.encode(value));

    // Assert
    expect(decoded).toEqual({ id: value.id });
    expect(Object.keys(decoded as object)).toEqual(['id']);
  });

  it('returns independent buffers for consecutive encodes', () => {
    // Arrange
    const codec = createMsgpackCodec();
    const first = buildSampleEnvelope();
    const second = buildSampleEnvelope();

    // Act
    const firstBytes = codec.encode(first);
    codec.encode(second);

    // Assert
    expect(codec.decode(firstBytes)).toEqual(first);
  });

  it('declares its name and content type', () => {
    // Arrange
    const codec = createMsgpackCodec();

    // Act
    const { name, contentType } = codec;

    // Assert
    expect(name).toBe('msgpack');
    expect(contentType).toBe('application/msgpack');
  });
});
