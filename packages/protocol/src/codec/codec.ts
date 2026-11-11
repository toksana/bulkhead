/**
 * Serialization behind one seam: the wire format can change (MessagePack today, protobuf later)
 * without touching producers or consumers. A codec only turns values into bytes and back;
 * validation is a separate step, see `decodeMessage`.
 */
export interface Codec {
  readonly name: string;
  readonly contentType: string;
  encode: (value: unknown) => Uint8Array;
  decode: (bytes: Uint8Array) => unknown;
}
