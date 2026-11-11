import { z } from 'zod';

import type { Codec } from './codec.ts';

export interface DecodeError {
  /** `malformed`: the bytes are not valid for the codec. `invalid`: they decode but fail the schema. */
  readonly kind: 'malformed' | 'invalid';
  readonly message: string;
}

export type DecodeResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DecodeError };

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const tryDecode = (codec: Codec, bytes: Uint8Array): DecodeResult<unknown> => {
  try {
    return { ok: true, value: codec.decode(bytes) };
  } catch (error) {
    return { ok: false, error: { kind: 'malformed', message: errorMessage(error) } };
  }
};

/** Decodes bytes and validates them against a schema. Never throws: inbound data is untrusted. */
export const decodeMessage = <TSchema extends z.ZodType>(
  codec: Codec,
  bytes: Uint8Array,
  schema: TSchema,
): DecodeResult<z.output<TSchema>> => {
  const decoded = tryDecode(codec, bytes);
  if (!decoded.ok) return decoded;

  const parsed = schema.safeParse(decoded.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: { kind: 'invalid', message: z.prettifyError(parsed.error) } };
};

/** Validates before encoding. Throws on invalid input, because outbound data is produced by our own code. */
export const encodeMessage = <TSchema extends z.ZodType>(
  codec: Codec,
  schema: TSchema,
  value: z.input<TSchema>,
): Uint8Array => codec.encode(schema.parse(value));
