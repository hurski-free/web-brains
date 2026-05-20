import type { vec2 } from "../../../game/math";
import { Muscle, type IMuscleCreate } from "./Muscle";

export interface ILimbCreate {
  length: number;
  width: number;

  angle: number;

  parentLimbAttachmentPoint: vec2;

  muscles: IMuscleCreate[];

  // children limbs
  limbs: ILimbCreate[];
}

export class Limb {
  readonly length: number;
  readonly width: number;
  readonly parentLimbAttachmentPoint: vec2;

  readonly muscles: Muscle[];

  readonly childrenLimbs: Limb[];

  constructor(cfg: ILimbCreate) {
    this.length = cfg.length;
    this.width = cfg.width;
    this.parentLimbAttachmentPoint = cfg.parentLimbAttachmentPoint;

    this.muscles = cfg.muscles.map(muscle => new Muscle(muscle));
    this.childrenLimbs = cfg.limbs.map(limb => new Limb(limb));
  }
}