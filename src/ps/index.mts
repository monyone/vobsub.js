import { ByteReader } from "../utils/byte-reader.mts";
import EOFError from "../utils/eof.mts";

export type PSDemuxResult = {
  offset: number;
  pack: Uint8Array;
};

export default (binary: Uint8Array): PSDemuxResult[] => {
  const reader = new ByteReader(binary);
  const result: PSDemuxResult[] = [];

  let base = null;
  while (reader.exists(4)) {
    const magic = reader.peekU32();
    if (magic !== 0x000001ba) { reader.skip(1); continue; }

    if (base != null) {
      result.push({
        offset: base,
        pack: binary.subarray(base, reader.consumed()),
      });
    }
    base = reader.consumed();
    reader.skip(4);
  }

  if (base != null) {
    result.push({
      offset: base,
      pack: binary.subarray(base),
    });
  }

  return result;
};
