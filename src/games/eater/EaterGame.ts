import { Game, type IGameConfig } from "../../game/Game";
import { random } from "../../game/math";
import { BufferSoAPool } from "../../game/objects/BufferSoAPool";

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
  private _foodPool: BufferSoAPool;

  constructor(cfg: IEaterGameConfig) {
    super(cfg);

    this._foodPool = new BufferSoAPool(10000);

    this._foodPool.createArrayBuffer({
      name: 'food',
      countElements: 10000,
      valuesPerElement: 8,
      typedConstructor: Float32Array,
    });
  }

  get foodPool() {
    return this._foodPool;
  }

  protected initStartData(): void {
    const food = this._foodPool.getTypedArray(0);

    for (let i = 0; i < 1000; i++) {
      const objIndex = this._foodPool.getNewObject();

      food[objIndex * 8] = random(-this.halfWidth, this.halfWidth);
      food[objIndex * 8 + 1] = random(-this.halfHeight, this.halfHeight);
      food[objIndex * 8 + 2] = random(5, 15);
      food[objIndex * 8 + 3] = random(0, 255);
      food[objIndex * 8 + 4] = random(0, 255);
      food[objIndex * 8 + 5] = random(0, 255);
      food[objIndex * 8 + 6] = random(100, 1000);
      food[objIndex * 8 + 7] = 1;
    }
  }

  protected clearObjects(): void {
    this._foodPool.clearObjects();
  }
}