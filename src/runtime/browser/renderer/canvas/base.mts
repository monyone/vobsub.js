import type { VOBData } from "../../../../vob/index.mts";
import type { Renderer } from "../renderer.mts";

export abstract class CanvasRenderer implements Renderer {
  protected onscreen: HTMLCanvasElement = document.createElement('canvas');
  // From IDX
  protected size: [number, number];

  public constructor(size: [number, number]) {
    this.size = size;
    this.onscreen.width = size[0];
    this.onscreen.height = size[1];
    this.onscreen.style.pointerEvents = 'none';
    this.onscreen.style.position = 'absolute';
    this.onscreen.style.width = '100%';
    this.onscreen.style.height = '100%';
    this.onscreen.style.objectFit = 'contain';
    this.onscreen.style.left = this.onscreen.style.right = '0';
    this.onscreen.style.top = this.onscreen.style.bottom = '0';
  }

  public node() { return this.onscreen; }
  public abstract render({ extent, origin, data }: VOBData): void;
  public abstract clear(): void;
  public show(): void {
    this.onscreen.style.visibility = 'visible';
  }
  public hide(): void {
    this.onscreen.style.visibility = 'hidden';
  }
}
