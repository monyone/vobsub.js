import type { PSDemuxResult } from "../ps/index.mts";
import { ByteReader } from "../utils/byte-reader.mts";
import concat from "../utils/concat.mts";

export type PESDemuxResult = {
  offset: number;
  pts: number;
  data: Uint8Array;
}

export default (ps: PSDemuxResult[]): PESDemuxResult[] => {
  const result: PESDemuxResult[] = [];

  let ps_offset: number | null = null;
  let packets: Uint8Array[] = [];

  for (const { offset, pack } of ps) {
    const reader = new ByteReader(pack);
    reader.skip(14);

    while (reader.exists(3)) {
      const start_code = reader.peekU24();
      if (start_code !== 0x000001) { reader.skip(1); continue; }
      const begin = reader.consumed();
      reader.skip(3);
      const stream_type = reader.readU8();
      const pes_length = reader.readU16()
      reader.skip(pes_length);

      const pes = pack.subarray(begin, begin + 6 + pes_length);

      // 0xbd <- ok
      // 0xbe <- padding
      if (stream_type === 0xbd) {
        const to_data = 6 + 2 + (1 + pes[6 + 2]);
        const has_PTS = (pes[6 + 1] & 0x80) !== 0;
        const payload = pes.subarray(to_data);

        const subtitle_id = payload[0] & 0x1F;
        if (subtitle_id !== 0) { continue; }

        if (has_PTS) {
          //parse(packet);
          if (ps_offset != null) {
            result.push({
              offset: ps_offset,
              pts: 0,
              data: concat(packets)
            })
          }
          ps_offset = offset;
          packets = [payload.subarray(1)];
        } else {
          packets.push(payload.subarray(1))
        }
      }
    }
  }

  if (ps_offset != null) {
    result.push({
      offset: ps_offset,
      pts: 0,
      data: concat(packets),
    })
  }

  return result;
}
