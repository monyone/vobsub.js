import type { VOBData } from "./vob/index.mts";

export class MainThreadRenderer {
  private onscreen: HTMLCanvasElement | null = null;
  // From IDX
  private size: [number, number];

  public constructor(size: [number, number]) {
    this.size = size;
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.onscreen = canvas;
    this.onscreen.width = this.size[0];
    this.onscreen.height = this.size[1];
  }

  public detachCanvas(): void {
    this.onscreen = null;
  }

  public render({ extent, origin, data }: VOBData): void {
    if (this.onscreen == null) { return; }
    const on_context = this.onscreen.getContext('2d');
    if (on_context == null) { return; }

    on_context.clearRect(0, 0, this.onscreen.width, this.onscreen.height);
    //@ts-ignore: SharedArrayBuffer not compatible ImageDataArray
    on_context.putImageData(new ImageData(data, extent[0], extent[1]), origin[0], origin[1]);
  }

  public clear(): void {
     if (this.onscreen == null) { return; }
    const on_context = this.onscreen.getContext('2d');
    if (on_context == null) { return; }

    on_context.clearRect(0, 0, this.onscreen.width, this.onscreen.height);
  }
}
