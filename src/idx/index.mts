export type VODSUBCue = {
  seconds: number;
  filepos: number;
};

export type IDXContext = {
  size: [number, number],
  origin: [number, number],
  palette: string[],
  cues: VODSUBCue[]
};

const to_seconds = (ts: string[]) => {
  const [hours, minutes, seconds, mills] =ts.map((e) => Number.parseInt(e, 10));
  return hours * 3600 + minutes * 60 + seconds + mills / 1000;
}

export default (idx: string): IDXContext => {
  const lines = idx.split(/\r?\n/);

  let size: [number, number] | null = null;
  let origin: [number, number] | null = null;
  let palette: string[] | null = null;
  const cues: VODSUBCue[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) { continue; }

    if (line.startsWith('size')) {
      const [x, y] = line.split(':')[1].split('x').map((e) => e.trim());;
      size = [Number.parseInt(x, 10), Number.parseInt(y, 10)];
    } else if (line.startsWith('org')) {
      const [x, y] = line.split(':')[1].split(',').map((e) => e.trim());
      origin = [Number.parseInt(x, 10), Number.parseInt(y, 10)];
    } else if (line.startsWith('palette')) {
      palette = line.split(':')[1].split(',').map((e) => e.trim());
    } else if (line.startsWith('timestamp')) {
      const [ts, pos] = line.split(',');
      const seconds = to_seconds(ts.split(':').slice(1).map((e) => e.trim()));
      const filepos = Number.parseInt(pos.split(':')[1].trim(), 16);
      cues.push({ seconds, filepos });
    }
  }

  if (size == null || origin == null || palette == null) {
    throw new Error('Insufficient Information');
  }

  return {
    size,
    origin,
    palette,
    cues
  };
}
