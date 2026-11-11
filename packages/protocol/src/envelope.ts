import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

/** Every message on the wire is wrapped in an envelope with a version, a type tag and a sequence number. */
export interface Envelope<TType extends string = string, TPayload = unknown> {
  readonly v: typeof PROTOCOL_VERSION;
  readonly type: TType;
  /** Monotonic per stream; lets consumers detect gaps and reordering. */
  readonly seq: number;
  /** Producer timestamp, epoch milliseconds. */
  readonly ts: number;
  readonly payload: TPayload;
}

const envelopeHeader = {
  v: z.literal(PROTOCOL_VERSION),
  seq: z.int().nonnegative(),
  ts: z.int().nonnegative(),
};

export type EnvelopeSchema<TType extends string, TPayload extends z.ZodType> = z.ZodObject<{
  v: z.ZodLiteral<typeof PROTOCOL_VERSION>;
  seq: z.ZodInt;
  ts: z.ZodInt;
  type: z.ZodLiteral<TType>;
  payload: TPayload;
}>;

/** Builds the schema for one message type: a fixed type tag plus its payload schema. */
export const createEnvelopeSchema = <TType extends string, TPayload extends z.ZodType>(
  type: TType,
  payload: TPayload,
): EnvelopeSchema<TType, TPayload> =>
  z.object({ ...envelopeHeader, type: z.literal(type), payload });

/** Accepts any well-formed envelope; used to route a message before its payload is validated. */
export const anyEnvelopeSchema = z.object({
  ...envelopeHeader,
  type: z.string().min(1),
  payload: z.unknown(),
});

export interface CreateEnvelopeInput<TType extends string, TPayload> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly seq: number;
  readonly ts: number;
}

export const createEnvelope = <TType extends string, TPayload>({
  type,
  payload,
  seq,
  ts,
}: CreateEnvelopeInput<TType, TPayload>): Envelope<TType, TPayload> => ({
  v: PROTOCOL_VERSION,
  type,
  seq,
  ts,
  payload,
});
