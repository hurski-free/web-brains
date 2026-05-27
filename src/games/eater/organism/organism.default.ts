import type { vec3 } from "../../../game/math";
import type { IOrganismCreate } from "./Organism";

export const ORGANISM_DEFAULT = {
  brains: {
    neurons: 2000, // 
    synapses: 50, // synapses per neuron
  },
  body: {
    polygon: [
      [0, 0],
      [20, 0],
      [20, 20],
      [0, 20],
    ],
    color: [255, 100, 0] as vec3,
  },
  limbs: [
    {
      length: 30,
      width: 4,
      angle: Math.PI / 2,
      color: [255, 0, 0] as vec3,
      parentLimbAttachmentPoint: [0, 0],
      muscles: [
        {
          motorNeuronIndex: 0,
          afferentNeuronIndex: 700,
          direction: 1,
          torque: 24,
        },
        {
          motorNeuronIndex: 1,
          afferentNeuronIndex: 701,
          direction: -1,
          torque: 22,
        },
      ],
      limbs: [
        {
          length: 20,
          width: 3,
          angle: -Math.PI / 4,
          color: [255, 70, 0] as vec3,
          parentLimbAttachmentPoint: [0, 30],
          muscles: [
            {
              motorNeuronIndex: 2,
              afferentNeuronIndex: 702,
              direction: 1,
              torque: 15,
            },
            {
              motorNeuronIndex: 3,
              afferentNeuronIndex: 703,
              direction: -1,
              torque: 15,
            },
          ],
          limbs: [],
        }
      ],
    },
    {
      length: 30,
      width: 4,
      angle: Math.PI * 3 / 2,
      color: [255, 0, 0] as vec3,
      parentLimbAttachmentPoint: [20, 0],
      muscles: [
        {
          motorNeuronIndex: 4,
          afferentNeuronIndex: 704,
          direction: 1,
          torque: 24,
        },
        {
          motorNeuronIndex: 5,
          afferentNeuronIndex: 705,
          direction: -1,
          torque: 22,
        },
      ],
      limbs: [
        {
          length: 20,
          width: 3,
          angle: Math.PI / 4,
          color: [255, 70, 0] as vec3,
          parentLimbAttachmentPoint: [0, 30],
          muscles: [
            {
              motorNeuronIndex: 6,
              afferentNeuronIndex: 706,
              direction: 1,
              torque: 15,
            },
            {
              motorNeuronIndex: 7,
              afferentNeuronIndex: 707,
              direction: -1,
              torque: 15,
            },
          ],
          limbs: [],
        }
      ],
    },
    {
      length: 28,
      width: 4,
      angle: Math.PI / 2,
      color: [255, 30, 30] as vec3,
      parentLimbAttachmentPoint: [0, 20],
      muscles: [
        {
          motorNeuronIndex: 8,
          afferentNeuronIndex: 708,
          direction: 1,
          torque: 23,
        },
        {
          motorNeuronIndex: 9,
          afferentNeuronIndex: 709,
          direction: -1,
          torque: 20,
        },
      ],
      limbs: [
        {
          length: 18,
          width: 3,
          angle: -Math.PI / 3,
          color: [255, 90, 20] as vec3,
          parentLimbAttachmentPoint: [0, 28],
          muscles: [
            {
              motorNeuronIndex: 10,
              afferentNeuronIndex: 710,
              direction: 1,
              torque: 14,
            },
            {
              motorNeuronIndex: 11,
              afferentNeuronIndex: 711,
              direction: -1,
              torque: 14,
            },
          ],
          limbs: [],
        }
      ],
    },
    {
      length: 28,
      width: 4,
      angle: Math.PI * 3 / 2,
      color: [255, 30, 30] as vec3,
      parentLimbAttachmentPoint: [20, 20],
      muscles: [
        {
          motorNeuronIndex: 12,
          afferentNeuronIndex: 712,
          direction: 1,
          torque: 23,
        },
        {
          motorNeuronIndex: 13,
          afferentNeuronIndex: 713,
          direction: -1,
          torque: 20,
        },
      ],
      limbs: [
        {
          length: 18,
          width: 3,
          angle: Math.PI / 3,
          color: [255, 90, 20] as vec3,
          parentLimbAttachmentPoint: [0, 28],
          muscles: [
            {
              motorNeuronIndex: 14,
              afferentNeuronIndex: 714,
              direction: 1,
              torque: 14,
            },
            {
              motorNeuronIndex: 15,
              afferentNeuronIndex: 715,
              direction: -1,
              torque: 14,
            },
          ],
          limbs: [],
        }
      ],
    },
  ],
} satisfies IOrganismCreate;
