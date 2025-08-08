import { ByteReader } from "../utils/byte-reader.mts";
import EOFError from "../utils/eof.mts";

export type VOBData = {
  begin: number,
  end: number | null,
  origin: [number, number];
  extent: [number, number];
  data: Uint8Array; // RGBA
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

export default (packet: Uint8Array, palette: string[]): VOBData => {
  const reader = new ByteReader(packet);
  const rgb = palette.map((color) => {
    const R = Number.parseInt(color.slice(0, 2), 16);
    const G = Number.parseInt(color.slice(2, 4), 16);
    const B = Number.parseInt(color.slice(4, 6), 16);
    return [R, G, B];
  });

  reader.skip(2); // subtitle_size
  const data_packet_size = reader.readU16();
  const data_packet = reader.read(data_packet_size - 4);

  let begin = 0, end = null;
  let offsets: [number, number] | null = null;
  let coords: [number, number, number, number] | null = null;
  let index: [number, number, number, number] | null = null;
  let alpha: [number, number, number, number] | null = null;

  while (!reader.isEmpty()) {
    const curr = reader.consumed();
    const seconds = reader.readU16() / 100;
    const next = reader.readU16();
    const is_end = curr === next;

    LOOP:
    while (reader.exists(1)) {
      switch (reader.readU8()) {
        case 0x00: { // FORCE DISPLAYING
          break;
        }
        case 0x01: { // START CAPTION
          begin = seconds;
          break;
        }
        case 0x02: { // STOP CAPTION
          end = seconds;
          break;
        }
        case 0x03: { // PALETTE
          const nibbles = extract_nibbles(reader.read(2));
          index = [nibbles[0], nibbles[1], nibbles[2], nibbles[3]];
          break;
        }
        case 0x04: { // ALPHA
          const nibbles = extract_nibbles(reader.read(2));
          alpha = [nibbles[0] | (nibbles[0] << 4), nibbles[1] | (nibbles[1] << 4), nibbles[2] | (nibbles[2] << 4), nibbles[3] | (nibbles[3] << 4)];
          break;
        }
        case 0x05: { // COORD
          const nibbles = extract_nibbles(reader.read(6));
          coords = [
            (nibbles[0] << 8) | (nibbles[1] << 4) | (nibbles[2] << 0),
            (nibbles[3] << 8) | (nibbles[4] << 4) | (nibbles[5] << 0),
            (nibbles[6] << 8) | (nibbles[7] << 4) | (nibbles[8] << 0),
            (nibbles[9] << 8) | (nibbles[10] << 4) | (nibbles[11] << 0),
          ];
          break;
        }
        case 0x06: { // RLE OFFSET
          offsets = [reader.readU16(), reader.readU16()];
          break;
        }
        case 0xFF: {
          break LOOP;
        }
      }
    }
    if (is_end) { break; }
  }

  if (coords == null || offsets == null || index == null || alpha == null) {
    throw new Error('Invalid!');
  }
  console.log(index, alpha, palette, rgb);

  const width = (coords[1] - coords[0] + 1);
  const height = (coords[3] - coords[2] + 1);
  const data = new Uint8Array(width * height * 4);

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
      const color = 0b11 - (rle & 0b11);

      for (let i = 0; i < run; i++) {
        const nx = x + i;
        if (y < 0 || y >= height || nx < 0 || nx >= width) { break; }
        data[4 * (y * width + nx) + 0] = rgb[index[color]][0];
        data[4 * (y * width + nx) + 1] = rgb[index[color]][1];
        data[4 * (y * width + nx) + 2] = rgb[index[color]][2];
        data[4 * (y * width + nx) + 3] = alpha[color];
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
    begin,
    end,
    origin: [coords[0], coords[2]],
    extent: [width, height],
    data,
  };
}
