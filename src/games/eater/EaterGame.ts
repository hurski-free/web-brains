import { Game, type IGameConfig } from "../../game/Game";
import { ObjectPool } from "../../game/objects/ObjectPool";

interface IEaterGameConfig extends IGameConfig {
  ctx: CanvasRenderingContext2D;
}

export class EaterGame extends Game {
  /**
   * food info
   * 
   * [x, y, radius, colorR, colorG, colorB, calories, edible]
   * 
   */
  // private foodPool: ObjectPool<Float32Array<ArrayBuffer>>;

  constructor(cfg: IEaterGameConfig) {
    super(cfg);

    // this.foodPool = new ObjectPool(100, 'float32', 2);
  }

  protected initStartData(): void {
    void this;
  }
}