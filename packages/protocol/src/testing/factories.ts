import { faker } from '@faker-js/faker';
import { z } from 'zod';

import { createEnvelope, createEnvelopeSchema } from '../envelope.ts';
import type { Envelope } from '../envelope.ts';

export const samplePayloadSchema = z.object({
  deviceId: z.string().min(1),
  value: z.number(),
  tags: z.array(z.string()),
});

export type SamplePayload = z.infer<typeof samplePayloadSchema>;

export const SAMPLE_TYPE = 'sample.reading';

export const sampleEnvelopeSchema = createEnvelopeSchema(SAMPLE_TYPE, samplePayloadSchema);

export const buildSamplePayload = (overrides: Partial<SamplePayload> = {}): SamplePayload => ({
  deviceId: faker.string.alphanumeric({ length: 8 }),
  value: faker.number.float({ min: -1000, max: 1000, fractionDigits: 3 }),
  tags: faker.helpers.multiple(() => faker.word.noun(), { count: { min: 0, max: 4 } }),
  ...overrides,
});

export const buildSampleEnvelope = (
  payload: SamplePayload = buildSamplePayload(),
): Envelope<typeof SAMPLE_TYPE, SamplePayload> =>
  createEnvelope({
    type: SAMPLE_TYPE,
    payload,
    seq: faker.number.int({ min: 0, max: 1_000_000 }),
    ts: faker.date.recent().getTime(),
  });
