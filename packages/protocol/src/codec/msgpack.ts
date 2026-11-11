import { Decoder, Encoder } from '@msgpack/msgpack';

import type { Codec } from './codec.ts';

export const createMsgpackCodec = (): Codec => {
  const encoder = new Encoder({ ignoreUndefined: true });
  const decoder = new Decoder();

  return {
    name: 'msgpack',
    contentType: 'application/msgpack',
    encode: (value) => encoder.encode(value),
    decode: (bytes) => decoder.decode(bytes),
  };
};
