import ps from "../../ps/index.mts";
import extract_pes from "../../pes/index.mts";
import extract_idx from "../../idx/index.mts";
import render_vob, { type VOBData } from "../../vob/index.mts";
import { CanvasMainThreadRenderer } from "./renderer/canvas/main.mts";
import type { Renderer } from "./renderer/renderer.mts";

export default class Controller {
  private media: HTMLMediaElement | null = null;
  private container: HTMLElement | null = null;
  private isShowing: boolean = true;
  private renderer: Renderer | null;
  // VOB
  private origin: [number, number];
  // Subtitle Data
  private subtitles: VOBData[];
  // Handler
  private timer: number | null = null;
  private priviousIndex: number | null = null;
  private renderHandler = this.render.bind(this);

  public constructor(vob: Uint8Array | ArrayBuffer, idx: string) {
    vob = vob instanceof Uint8Array ? vob : new Uint8Array(vob);

    const { cues, palette, size, origin } = extract_idx(idx);
    const file_to_time = new Map<number, number>(cues.map(({ filepos, seconds }) => [filepos, seconds]));
    this.renderer = new CanvasMainThreadRenderer(size);
    this.origin = origin;

    this.subtitles = extract_pes(ps(vob)).filter(({ offset }) => {
      return file_to_time.has(offset);
    }).map(({ offset, packet }) => {
      const time = file_to_time.get(offset)!;
      const result = render_vob(packet, palette);
      return {
        ... result,
        begin: time + result.begin,
        end: result.end != null ? time + result.end : null
      };
    });
  }

  private search(time: number): number | null {
    //time -= this.option.timeshift;

    {
      const first = this.subtitles[0];
      if (!first) { return null; }
      if (time < first.begin) { return null; }
    }

    let begin = 0, end = this.subtitles.length;
    while (begin + 1 < end) {
      const middle = Math.floor((begin + end) / 2);
      const middle_time = this.subtitles[middle].begin;

      if (middle_time <= time) {
        begin = middle;
      } else {
        end = middle;
      }
    }

    if (this.subtitles[begin] == null) {
      return null;
    } else if (this.subtitles[begin].begin <= time && time < (this.subtitles[begin].end ?? Number.POSITIVE_INFINITY)) {
      return begin;
    } else {
      return null;
    }
  }

  public render(): void {
    if (this.renderer == null) { return; }

    if (!this.isShowing) { return; }
    this.timer = requestAnimationFrame(this.renderHandler);

    if (this.media == null) { return; }
    const currentTime = this.media.currentTime;
    const index = this.search(currentTime);
    // Not Found
    if (this.priviousIndex === index) { return; }
    this.priviousIndex = index;

    // Render
    if (index != null) {
      this.renderer.render(this.subtitles[index]);
    } else {
      this.renderer.clear();
    }
  }

  public attachMedia(media: HTMLMediaElement, container?: HTMLElement): void {
    this.media = media;
    this.container = container ?? media.parentElement;
    if (this.renderer != null) { this.attachRenderer(this.renderer); }
    if (this.timer != null) { return; }
    this.timer = requestAnimationFrame(this.renderHandler);
  }

  public detachMedia(): void {
    if (this.renderer) { this.detachRenderer(); }
    this.media = this.container = null;
    if (this.timer == null) { return; }
    cancelAnimationFrame(this.timer);
    this.timer = null;
  }

  public attachRenderer(renderer: Renderer): void {
    this.container?.appendChild(renderer.node());
    this.renderer = renderer;
    this.render();
  }

  public detachRenderer(): void {
    if (this.renderer == null) { return; }
    this.container?.removeChild(this.renderer.node());
    this.renderer.clear();
    this.renderer = null;
  }

  public showing(): boolean {
    return this.isShowing;
  }

  public show(): void {
    this.isShowing = true;
    this.renderer?.show();
    if (this.timer != null) { return; }
    this.timer = requestAnimationFrame(this.renderHandler);
  }

  public hide(): void {
    this.isShowing = false;
    this.renderer?.hide();
    if (this.timer == null) { return; }
    cancelAnimationFrame(this.timer);
    this.timer = null;
  }
}
