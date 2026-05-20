import type { vec2 } from "../math";

export interface IFrameView {
  width: number;
  height: number;

  halfWidth: number;
  halfHeight: number;

  camera: vec2;
}

export type ImmutableFrameView = Readonly<IFrameView>;
