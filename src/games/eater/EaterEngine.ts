import { random } from "../../game/math";
import { OBJECT_STATE_DELETED } from "../../game/objects/object.types";
import type { IEngine } from "../../game/types/IEngine";
import type { ImmutableFrameView } from "../../game/types/IFrameView";
import type { IGameSession } from "../../game/types/IGameSession";
import type { IWorld } from "../../game/types/IWorld";
import type { IEaterWorldData } from "./EaterWorld";

const FOOD_APPEAR_INTERVAL = 100; // 100 ticks

const FOOD_LIFETIME_MIN = 1000;
const FOOD_LIFETIME_MAX = 10000;

export class EaterEngine implements IEngine<IEaterWorldData, unknown> {
  private foodAppearInterval = FOOD_APPEAR_INTERVAL;

  process(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, session: IGameSession<unknown>): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray(0);
    const foodCount = foodPool.activeCount;
    
    this.foodAppearInterval -= 1;

    if (this.foodAppearInterval <= 0) {
      this.foodAppearInterval = FOOD_APPEAR_INTERVAL;
      this.generateFood(world, frameView);
    }

    for (let i = 0; i < foodCount; i++) {
      foodData[i * 8 + 7] -= 1;

      if (foodData[i * 8 + 7] <= 0) {
        foodPool.states[i] = OBJECT_STATE_DELETED;
      }
    }

    foodPool.swapAndPop();
  }

  generateInitialData(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, session: IGameSession<unknown>): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray(0);

    for (let i = 0; i < 50; i++) {
      const objIndex = foodPool.getNewObject();

      foodData[objIndex * 8] = random(-frameView.width, frameView.width);
      foodData[objIndex * 8 + 1] = random(-frameView.height, frameView.height);
      foodData[objIndex * 8 + 2] = random(5, 15);
      foodData[objIndex * 8 + 3] = random(0, 255);
      foodData[objIndex * 8 + 4] = random(0, 255);
      foodData[objIndex * 8 + 5] = random(0, 255);
      foodData[objIndex * 8 + 6] = 1;
      foodData[objIndex * 8 + 7] = random(FOOD_LIFETIME_MIN, FOOD_LIFETIME_MAX);
    }
  }

  generateFood(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray(0);

    const objIndex = foodPool.getNewObject();

    foodData[objIndex * 8] = random(-frameView.width, frameView.width);
    foodData[objIndex * 8 + 1] = random(-frameView.height, frameView.height);
    foodData[objIndex * 8 + 2] = random(5, 15);
    foodData[objIndex * 8 + 3] = random(0, 255);
    foodData[objIndex * 8 + 4] = random(0, 255);
    foodData[objIndex * 8 + 5] = random(0, 255);
    foodData[objIndex * 8 + 6] = 1;
    foodData[objIndex * 8 + 7] = random(FOOD_LIFETIME_MIN, FOOD_LIFETIME_MAX);
  }
}