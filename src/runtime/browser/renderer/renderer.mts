import type { VOBData } from "../../../vob/index.mts";

export interface Renderer {
  node(): Node;
  render({ extent, origin, data }: VOBData): void;
  clear(): void;
  show(): void;
  hide(): void;
}
