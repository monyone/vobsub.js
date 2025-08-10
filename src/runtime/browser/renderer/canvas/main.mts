import type { VOBData } from "../../../../vob/index.mts";
import { CanvasRenderer } from "./base.mts";

export class CanvasMainThreadRenderer extends CanvasRenderer {
  public constructor(size: [number, number]) {
    super(size);
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
