import type { vec2, vec3 } from "../../../game/math";

export interface IBodyCreate {
  polygon: vec2[];
  color: vec3;
}

export class Body {
  readonly polygon: vec2[];
  readonly color: vec3;

  constructor(cfg: IBodyCreate) {
    this.polygon = cfg.polygon;
    this.color = cfg.color;
  }
}