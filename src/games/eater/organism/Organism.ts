import type { vec2 } from "../../../game/math";
import { Body, type IBodyCreate } from "./Body";
import { Brains, type IBrainsCreate } from "./Brains";
import { Limb, type ILimbCreate } from "./Limb";

export interface IOrganismCreate {
  brains: IBrainsCreate;
  body: IBodyCreate;
  limbs: ILimbCreate[];
}

export class Organism {
  position: vec2 = [0, 0];
  angle: number = 0;

  readonly brains: Brains;
  readonly body: Body;
  readonly limbs: Limb[];

  constructor(cfg: IOrganismCreate) {
    this.brains = new Brains(cfg.brains);
    this.body = new Body(cfg.body);
    this.limbs = cfg.limbs.map(limb => new Limb(limb));
  }
}