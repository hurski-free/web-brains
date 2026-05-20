import type { vec3 } from "../../../game/math";
import type { IOrganismCreate } from "./Organism";

export const ORGANISM_DEFAULT = {
  brains: {
    neurons: 500, // 
    synapses: 100, // synapses per neuron
  },
  body: {
    polygon: [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
    ],
    color: [255, 0, 0] as vec3,
  },
  limbs: [
    {
      length: 40,
      width: 4,
      angle: 0,
      parentLimbAttachmentPoint: [0, 0],
      muscles: [],
      limbs: [],
    },
  ],
} satisfies IOrganismCreate;
