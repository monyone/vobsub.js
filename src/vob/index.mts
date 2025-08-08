import { ByteReader } from "../utils/byte-reader.mts";
import EOFError from "../utils/eof.mts";

export type RenderResult = {
  origin: [number, number];
  extent: [number, number];
  //data: Uint8Array; // RGBA
  data: number[];
};

const extract_nibbles = (data: Uint8Array) => {
  const nibbles = [];
  for (const datum of data) {
    nibbles.push((datum & 0xF0) >> 4);
    nibbles.push((datum & 0x0F) >> 0);
  }
  return nibbles;
}

class NibbleReader {
  private nibbles: number[];
  private offset: number;

  constructor(data: Uint8Array) {
    this.nibbles = extract_nibbles(data);
    this.offset = 0;
  }

  public exists(length: number): boolean {
    return this.offset + length <= this.nibbles.length;
  }

  public isEmpty(): boolean {
    return this.offset >= this.nibbles.length;
  }

  public peek(): number {
    if (!this.exists(1)) {
      throw new EOFError('Detected EOF!');
    }
    return this.nibbles[this.offset];
  }

  public read(): number {
    if (!this.exists(1)) {
      throw new EOFError('Detected EOF!');
    }
    return this.nibbles[this.offset++];
  }

  public bytealign(): void {
    this.offset = Math.min(this.nibbles.length, this.offset + (this.offset % 2));
  }
}

export default (packet: Uint8Array): RenderResult => {
  const reader = new ByteReader(packet);

  const subtitle_size = reader.readU16();
  const data_packet_size = reader.readU16();
  const data_packet = reader.read(data_packet_size - 4);

  console.log(`Subtitle Size: ${subtitle_size}`)
  console.log(`Data Size: ${data_packet_size}`)

  let start = 0, end = null;
  let offsets = [-1, -1];
  let coords = [-1, -1, -1, -1];

  while (!reader.isEmpty()) {
    const curr = reader.consumed();
    const seconds = reader.readU16() / 100;
    const next = reader.readU16();
    const is_end = curr === next;

    LOOP:
    while (reader.exists(1)) {
      switch (reader.readU8()) {
        case 0x00: // FORCE DISPLAYING
          console.log('FORCE');
          break;
        case 0x01: // START CAPTION
          console.log('START');
          start = seconds;
          break;
        case 0x02: // STOP CAPTION
          console.log('STOP');
          end = seconds;
          break;
        case 0x03: // PALETTE
          console.log('PALETTE');
          const palette = extract_nibbles(reader.read(2));
          break;
        case 0x04: // ALPHA
          console.log('ALPHA');
          const alpha = extract_nibbles(reader.read(2));
          break;
        case 0x05: // COORD
          console.log('COORD');
          const nibbles = extract_nibbles(reader.read(6));
          coords = [
            (nibbles[0] << 8) | (nibbles[1] << 4) | (nibbles[2] << 0),
            (nibbles[3] << 8) | (nibbles[4] << 4) | (nibbles[5] << 0),
            (nibbles[6] << 8) | (nibbles[7] << 4) | (nibbles[8] << 0),
            (nibbles[9] << 8) | (nibbles[10] << 4) | (nibbles[11] << 0),
          ];
          break;
        case 0x06: // RLE OFFSET
          console.log('OFFSET');
          offsets = [reader.readU16(), reader.readU16()];
          break;
        case 0xFF:
          console.log('END');
          break LOOP;
      }
    }
    if (is_end) { break; }
  }

  const width = (coords[1] - coords[0] + 1);
  const height = (coords[3] - coords[2] + 1);
  const data = Array.from({ length: width * height }, () => 0);

  for (const [offset, start, end] of [[0, offsets[0], offsets[1]], [1, offsets[1], data_packet_size]]){
    const reader = new NibbleReader(data_packet.subarray(start - 4, end - 4));

    let x = 0, y = 0 + offset;
    while (!reader.isEmpty()) {
      let rle = reader.read();
      if (rle < 0x4) {
        rle = (rle << 4) | reader.read();
        if (rle < 0x10) {
          rle = (rle << 4) | reader.read();
          if (rle < 0x040) {
            rle = (rle << 4) | reader.read();
            if (rle < 0x0004) {
              rle = ((width - x) << 2) | (rle & 0b11)
            }
          }
        }
      }
      const run = rle >> 2;
      const color = rle & 0b11;

      for (let i = 0; i < run; i++) {
        const nx = x + i;
        if (y < 0 || y >= height || nx < 0 || nx >= width) { break; }
        data[y * width + nx] = color;
      }

      x += run;
      if (x >= width) {
        x = 0;
        y += 2;
        reader.bytealign();
      }
    }
  }

  return {
    origin: [coords[0], coords[2]],
    extent: [width, height],
    data,
  };
}
