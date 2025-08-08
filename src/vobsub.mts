import { readFileSync, writeFileSync } from "node:fs";
import ps from "./ps/index.mts";
import extract from "./pes/index.mts";
import vob from "./vob/index.mts";

const file = readFileSync('vobsub_subtitles.sub');

let global_index = 0;
for (const { offset, packet } of extract(ps(file))) {
  console.log(offset.toString(16), packet)
  const { extent: [width, height], data } = vob(Buffer.from(packet))
  {
    let text = `P1\n${width} ${height}\n`;
    for (let i = 0; i < height; i++) {
      text += data.slice((i + 0) * width, (i + 1) * width).map((e) => e === 3  ? '1' : '0').join(' ') + '\n';
    }
    writeFileSync(`${global_index}.pbm`, text);
  }
  global_index++;
}

