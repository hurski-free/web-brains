import { BufferSoAPool } from "../../game/objects/BufferSoAPool";
import type { IWorld } from "../../game/types/IWorld";
import { Organism } from "./organism/Organism";
import type { IBrainsModel } from "./organism/Brains";
import { ORGANISM_DEFAULT } from "./organism/organism.default";

export interface IEaterWorldData {
  /**
   * ARRAY[0] - [x, y, radius, colorR, colorG, colorB, calories, lifetime]
   *
   * ARRAY[1] - [edible]
   */
  foodPool: BufferSoAPool;

  organism: Organism;
}

interface IEaterWorldCreate {
  foodCapacity: number;
}

export class EaterWorld implements IWorld<IEaterWorldData> {
  readonly worldObject: Readonly<IEaterWorldData>;

  constructor(cfg: IEaterWorldCreate) {
    const foodPool = new BufferSoAPool(cfg.foodCapacity);
    const organism = new Organism(ORGANISM_DEFAULT);

    foodPool.createArrayBuffer({
      name: 'food',
      countElements: cfg.foodCapacity,
      valuesPerElement: 8,
      typedConstructor: Float32Array,
    });

    foodPool.createArrayBuffer({
      name: 'flags',
      countElements: cfg.foodCapacity,
      valuesPerElement: 1,
      typedConstructor: Int32Array,
    });

    this.worldObject = {
      foodPool,
      organism,
    };
  }

  clear(): void {
    this.worldObject.foodPool.clearObjects();
  }

  reset(): void {
    this.worldObject.foodPool.clearObjects();
    (this.worldObject as IEaterWorldData).organism = new Organism(ORGANISM_DEFAULT);
  }

  resetWithSavedModel(): void {
    this.worldObject.foodPool.clearObjects();
    const savedModel = this.worldObject.organism.saveBrainModel();
    (this.worldObject as IEaterWorldData).organism = this.createOrganismWithModel(savedModel);
  }

  freeMemory(): void {
    this.worldObject.foodPool.freeMemory();
  }

  private createOrganismWithModel(model: IBrainsModel): Organism {
    return new Organism({
      ...ORGANISM_DEFAULT,
      brains: {
        ...ORGANISM_DEFAULT.brains,
        model,
      },
    });
  }
}