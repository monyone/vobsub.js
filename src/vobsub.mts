import { readFileSync, writeFileSync } from "node:fs";
import ps from "./ps/index.mts";
import { ByteReader } from "./utils/byte-reader.mts";
import extract from "./pes/index.mts";

const file = readFileSync('vobsub_subtitles.sub');

const pack_header_size = 14;

let global_index = 0;
const parse = (packet: Buffer): void => {
  if (packet.byteLength === 0) { return; }

  const subtitle_size = packet.readUint16BE(0);
  const data_packet_size = packet.readUint16BE(2);
  console.log(`Subtitle Size: ${subtitle_size}`)
  console.log(`Data Size: ${data_packet_size}`)

  let start = 0, end = null;
  let offsets = [-1, -1];
  let coords = [-1, -1, -1, -1];

  let control_index = data_packet_size;
  while (control_index < packet.byteLength) {
    const seconds = packet.readUint16BE(control_index + 0) / 100;
    const next = packet.readUint16BE(control_index + 2);
    const is_end = next === control_index;
    control_index += 4;

    LOOP:
    while (control_index < packet.byteLength) {
      switch (packet.readUInt8(control_index)) {
        case 0x00: // FORCE DISPLAYING
          console.log('FORCE');
          control_index += 1 + 0;
          break;
        case 0x01: // START CAPTION
          console.log('START');
          start = seconds;
          control_index += 1 + 0;
          break;
        case 0x02: // STOP CAPTION
          console.log('STOP');
          end = seconds;
          control_index += 1 + 0;
          break;
        case 0x03: // PALLET
          console.log('PALLET');
          control_index += 1 + 2;
          break;
        case 0x04: // ALPHA
          console.log('ALPHA');
          control_index += 1 + 2;
          break;
        case 0x05: // COORD
          console.log('COORD');
          const x1 = ((packet.readUint8(control_index + 1 + 0) & 0xFF) << 8) | ((packet.readUInt8(control_index + 1 + 1) & 0xF0) >> 4);
          const x2 = ((packet.readUint8(control_index + 1 + 1) & 0x0F) << 8) | ((packet.readUInt8(control_index + 1 + 2) & 0xFF) >> 0);
          const y1 = ((packet.readUint8(control_index + 1 + 3) & 0xFF) << 8) | ((packet.readUInt8(control_index + 1 + 4) & 0xF0) >> 4);
          const y2 = ((packet.readUint8(control_index + 1 + 4) & 0x0F) << 8) | ((packet.readUInt8(control_index + 1 + 5) & 0xFF) >> 0);
          coords = [x1, x2, y1, y2];
          control_index += 1 + 6;
          break;
        case 0x06: // RLE OFFSET
          console.log('OFFSET');
          offsets = [packet.readUint16BE(control_index + 1 + 0), packet.readUint16BE(control_index + 1 + 2)]
          control_index += 1 + 4;
          break;
        case 0xFF:
          console.log('END');
          control_index += 1 + 0;
          break LOOP;
      }
    }
    if (is_end) { break; }
  }

  const screen = [];
  for (let i = 0; i < (coords[1] - coords[0] + 1); i++) {
    const line = [];
    for (let j = 0; j < (coords[3] - coords[2] + 1); j++) {
      line.push(0);
    }
    screen.push(line)
  }

  console.log(offsets[0], offsets[1], data_packet_size)
  for (const [offset, start, end] of [[0, offsets[0], offsets[1]], [1, offsets[1], data_packet_size]]){
    const nibbles = [];
    for (let i = start; i < end; i++) {
      nibbles.push((packet.readUint8(i) & 0xF0) >> 4);
      nibbles.push((packet.readUint8(i) & 0x0F) >> 0);
    }

    let index = 0;
    let x = 0, y = 0 + offset;
    while (index < nibbles.length) {
      let rle = nibbles[index++];
      if (rle < 0x4) {
        rle = (rle << 4) | nibbles[index++];
        if (rle < 0x10) {
          rle = (rle << 4) | nibbles[index++];
          if (rle < 0x040) {
            rle = (rle << 4) | nibbles[index++];
            if (rle < 0x0004) {
              rle = (((coords[1] - coords[0] + 1) - x) << 2) | (rle & 0b11)
            }
          }
        }
      }
      const run = rle >> 2;
      const color = rle & 0b11;
      if (global_index === 0) {
        console.log(run, color, '[', coords[0], coords[0] + x, coords[1], ']',  '[', coords[2], coords[2] + y, coords[3], ']');
      }

      for (let i = 0; i < run; i++) {
        const nx = x + i;
        if (y < 0 || y >= (coords[3] - coords[2] + 1) || nx < 0 || nx >= (coords[1] - coords[0] + 1)) { break; }
        screen[y][nx] = color;
      }

      x += run;
      if (x >= (coords[1] - coords[0] + 1)) {
        x = 0;
        y += 2;
        if (index % 2 === 1) { index++; }
      }
    }
  }

  {
    let text = `P1\n${(coords[1] - coords[0] + 1)} ${(coords[3] - coords[2] + 1)}\n`;
    for (let i = 0; i < (coords[3] - coords[2] + 1); i++) {
      text += screen[i].map((e) => e === 3  ? '1' : '0').join(' ') + '\n';
    }
    writeFileSync(`${global_index}.pbm`, text);
  }
  global_index++;

  console.log(offsets, start, end);
}

for (const { offset, data } of extract(ps(file))) {
  console.log(offset.toString(16), data)
  parse(Buffer.from(data));
}

