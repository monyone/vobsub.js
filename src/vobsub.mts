import { readFileSync, writeFileSync } from "node:fs";
import ps from "./ps/index.mts";
import extract from "./pes/index.mts";
import vob from "./vob/index.mts";
import idx from "./idx/index.mts";

const file = readFileSync('vobsub_subtitles.sub');
const index = idx(readFileSync('vobsub_subtitles.idx', { encoding: 'utf-8' }));

let global_index = 0;
for (const { offset, packet } of extract(ps(file))) {
  const { extent: [width, height], data } = vob(Buffer.from(packet), index.palette);

  //*
  {
    let text = `P3\n${width} ${height}\n255\n`;
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        text += `${data[4 * ((i * width) + j) + 0]} ${data[4 * ((i * width) + j) + 1]} ${data[4 * ((i * width) + j) + 2]} `
      }
      text += '\n';
    }
    writeFileSync(`${global_index}.ppm`, text);
  }
  //*/
  global_index++;
}

