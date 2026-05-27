import { random } from "../../game/math";
import { OBJECT_STATE_DELETED } from "../../game/objects/object.types";
import type { IEngine } from "../../game/types/IEngine";
import type { IFrameView } from "../../game/types/IFrameView";
import type { ImmutableFrameView } from "../../game/types/IFrameView";
import type { IGameSession } from "../../game/types/IGameSession";
import type { IWorld } from "../../game/types/IWorld";
import type { IEaterWorldData } from "./EaterWorld";
import { Organism } from "./organism/Organism";

const FOOD_APPEAR_INTERVAL = 100; // 100 ticks

const FOOD_LIFETIME_MIN = 1000;
const FOOD_LIFETIME_MAX = 10000;
const FOOD_REWARD_SCALE = 0.35;
const FOOD_EDIBLE_CHANCE = 0.72;
const INEDIBLE_HUNGER_SCALE = 0.05;
const FOOD_COLOR_EDIBLE: [number, number, number] = [90, 230, 110];
const FOOD_COLOR_INEDIBLE: [number, number, number] = [220, 70, 90];
const MOTOR_NEURONS_LEFT = [0, 2, 4, 6];
const MOTOR_NEURONS_RIGHT = [1, 3, 5, 7];
const MOTOR_EXPLORATION_NOISE = 0.42;

export class EaterEngine implements IEngine<IEaterWorldData, unknown> {
  private foodAppearInterval = FOOD_APPEAR_INTERVAL;
  private sensoryCurrentByNeuron = new Float32Array(128);

  process(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, _session: IGameSession<unknown>): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray<Float32Array>(0);
    const foodFlags = foodPool.getTypedArray<Int32Array>(1);
    const foodCount = foodPool.activeCount;
    const organism = world.worldObject.organism;
    
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
    this.fillSensoryInput(foodData, foodFlags, foodPool.activeCount, organism);
    organism.step(this.sensoryCurrentByNeuron);
    this.processEating(foodData, foodFlags, foodPool.activeCount, foodPool.states, organism);
    foodPool.swapAndPop();
    this.updateCamera(frameView, organism);
  }

  generateInitialData(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, _session: IGameSession<unknown>): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray<Float32Array>(0);
    const foodFlags = foodPool.getTypedArray<Int32Array>(1);
    const organism = world.worldObject.organism;

    organism.position[0] = frameView.halfWidth;
    organism.position[1] = frameView.halfHeight;
    this.updateCamera(frameView, organism);

    for (let i = 0; i < 2500; i++) {
      const objIndex = foodPool.getNewObject();
      this.createFoodObject(foodData, foodFlags, objIndex, frameView);
    }
  }

  generateFood(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView): void {
    const foodPool = world.worldObject.foodPool;
    const foodData = foodPool.getTypedArray<Float32Array>(0);
    const foodFlags = foodPool.getTypedArray<Int32Array>(1);

    const objIndex = foodPool.getNewObject();
    this.createFoodObject(foodData, foodFlags, objIndex, frameView);
  }

  private fillSensoryInput(foodData: Float32Array, foodFlags: Int32Array, foodCount: number, organism: Organism): void {
    this.ensureSensoryInputBuffer(organism.getNeuronCount());
    this.sensoryCurrentByNeuron.fill(0);

    if (foodCount > 0) {
      this.fillNearestFoodSensors(foodData, foodCount, organism);
    }

    this.fillVisionSensors(foodData, foodFlags, foodCount, organism);
    this.fillSmellSensors(foodData, foodCount, organism);
    this.applyHungerMotivation(foodData, foodFlags, foodCount, organism);
  }

  private fillNearestFoodSensors(foodData: Float32Array, foodCount: number, organism: Organism): void {
    let nearestIndex = 0;
    let nearestDistSq = Number.POSITIVE_INFINITY;
    const organismX = organism.position[0];
    const organismY = organism.position[1];

    for (let i = 0; i < foodCount; i++) {
      const x = foodData[i * 8];
      const y = foodData[i * 8 + 1];
      const dx = x - organismX;
      const dy = y - organismY;
      const distSq = dx * dx + dy * dy;

      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestIndex = i;
      }
    }

    const nearestX = foodData[nearestIndex * 8];
    const nearestY = foodData[nearestIndex * 8 + 1];
    const dx = nearestX - organismX;
    const dy = nearestY - organismY;

    const cosA = Math.cos(-organism.angle);
    const sinA = Math.sin(-organism.angle);
    const localX = dx * cosA - dy * sinA;
    const localY = dx * sinA + dy * cosA;

    const distance = Math.sqrt(nearestDistSq);
    const intensity = 1 / (1 + distance * 0.03);

    this.sensoryCurrentByNeuron[Organism.SENSOR_NEAREST_FOOD_LEFT] = Math.max(0, -localX) * intensity * 0.04;
    this.sensoryCurrentByNeuron[Organism.SENSOR_NEAREST_FOOD_RIGHT] = Math.max(0, localX) * intensity * 0.04;
    this.sensoryCurrentByNeuron[Organism.SENSOR_NEAREST_FOOD_FRONT] = Math.max(0, localY) * intensity * 0.04;
    this.sensoryCurrentByNeuron[Organism.SENSOR_NEAREST_FOOD_BACK] = Math.max(0, -localY) * intensity * 0.04;
    this.sensoryCurrentByNeuron[Organism.SENSOR_NEAREST_FOOD_INTENSITY] = intensity;
  }

  private processEating(foodData: Float32Array, foodFlags: Int32Array, foodCount: number, foodStates: Uint8Array, organism: Organism): void {
    const organismX = organism.position[0];
    const organismY = organism.position[1];
    const organismRadius = organism.getEatRadius();
    let totalReward = 0;
    let totalHungerPenalty = 0;

    for (let i = 0; i < foodCount; i++) {
      const foodX = foodData[i * 8];
      const foodY = foodData[i * 8 + 1];
      const foodRadius = foodData[i * 8 + 2];
      const dx = foodX - organismX;
      const dy = foodY - organismY;
      const contactDist = organismRadius + foodRadius;

      if (dx * dx + dy * dy <= contactDist * contactDist) {
        foodStates[i] = OBJECT_STATE_DELETED;
        const calories = foodData[i * 8 + 6];
        const isEdible = foodFlags[i] === 1;
        if (isEdible) {
          totalReward += calories * FOOD_REWARD_SCALE;
        } else {
          totalHungerPenalty += calories * INEDIBLE_HUNGER_SCALE;
        }
      }
    }

    if (totalReward !== 0) {
      organism.applyReward(totalReward);
      organism.feed(totalReward / FOOD_REWARD_SCALE);
    }
    if (totalHungerPenalty !== 0) {
      organism.applyHungerPenalty(totalHungerPenalty);
    }
  }

  private createFoodObject(foodData: Float32Array, foodFlags: Int32Array, objIndex: number, frameView: ImmutableFrameView): void {
    const isEdible = Math.random() < FOOD_EDIBLE_CHANCE ? 1 : 0;
    const color = isEdible === 1 ? FOOD_COLOR_EDIBLE : FOOD_COLOR_INEDIBLE;

    foodData[objIndex * 8] = random(-frameView.width * 2, frameView.width * 2);
    foodData[objIndex * 8 + 1] = random(-frameView.height * 2, frameView.height * 2);
    foodData[objIndex * 8 + 2] = random(5, 15);
    foodData[objIndex * 8 + 3] = color[0];
    foodData[objIndex * 8 + 4] = color[1];
    foodData[objIndex * 8 + 5] = color[2];
    foodData[objIndex * 8 + 6] = 1;
    foodData[objIndex * 8 + 7] = random(FOOD_LIFETIME_MIN, FOOD_LIFETIME_MAX);

    foodFlags[objIndex] = isEdible;
  }

  private updateCamera(frameView: ImmutableFrameView, organism: Organism): void {
    const mutableFrame = frameView as IFrameView;
    mutableFrame.camera[0] = organism.position[0] - frameView.halfWidth;
    mutableFrame.camera[1] = organism.position[1] - frameView.halfHeight;
  }

  private ensureSensoryInputBuffer(targetSize: number): void {
    if (this.sensoryCurrentByNeuron.length >= targetSize) {
      return;
    }

    this.sensoryCurrentByNeuron = new Float32Array(targetSize);
  }

  private fillVisionSensors(foodData: Float32Array, foodFlags: Int32Array, foodCount: number, organism: Organism): void {
    const visionHalfSize = Organism.SENSOR_VISION_SIZE_PX / 2;
    const cellSize = Organism.SENSOR_VISION_SIZE_PX / Organism.SENSOR_VISION_GRID;
    const startNeuron = Organism.SENSOR_VISION_START;
    const totalVisionNeurons = Organism.SENSOR_VISION_NEURONS;
    const cosA = Math.cos(-organism.angle);
    const sinA = Math.sin(-organism.angle);
    const organismX = organism.position[0];
    const organismY = organism.position[1];

    for (let i = 0; i < foodCount; i++) {
      const dx = foodData[i * 8] - organismX;
      const dy = foodData[i * 8 + 1] - organismY;
      const localX = dx * cosA - dy * sinA;
      const localY = dx * sinA + dy * cosA;

      if (localX < -visionHalfSize || localX >= visionHalfSize || localY < -visionHalfSize || localY >= visionHalfSize) {
        continue;
      }

      const gridX = Math.floor((localX + visionHalfSize) / cellSize);
      const gridY = Math.floor((localY + visionHalfSize) / cellSize);
      const neuronOffset = gridY * Organism.SENSOR_VISION_GRID + gridX;
      const neuronIndex = startNeuron + neuronOffset;

      if (neuronOffset < 0 || neuronOffset >= totalVisionNeurons || neuronIndex >= this.sensoryCurrentByNeuron.length) {
        continue;
      }

      const radius = foodData[i * 8 + 2];
      const calories = foodData[i * 8 + 6];
      const intensity = Math.min(1.5, (radius / 15) * calories);
      const signedIntensity = foodFlags[i] === 1 ? intensity : -intensity;
      this.sensoryCurrentByNeuron[neuronIndex] += signedIntensity;
    }

    for (let i = 0; i < totalVisionNeurons; i++) {
      const neuronIndex = startNeuron + i;
      if (neuronIndex >= this.sensoryCurrentByNeuron.length) {
        break;
      }

      // Clamp local image-like sensor current with sign for food type.
      this.sensoryCurrentByNeuron[neuronIndex] = Math.max(-2, Math.min(2, this.sensoryCurrentByNeuron[neuronIndex]));
    }
  }

  private fillSmellSensors(foodData: Float32Array, foodCount: number, organism: Organism): void {
    const smellRadius = Organism.SENSOR_SMELL_RADIUS;
    const smellRadiusSq = smellRadius * smellRadius;
    const organismX = organism.position[0];
    const organismY = organism.position[1];
    const cosA = Math.cos(-organism.angle);
    const sinA = Math.sin(-organism.angle);

    let totalIntensity = 0;
    let gradLeft = 0;
    let gradRight = 0;
    let gradFront = 0;
    let gradBack = 0;

    for (let i = 0; i < foodCount; i++) {
      const dx = foodData[i * 8] - organismX;
      const dy = foodData[i * 8 + 1] - organismY;
      const distSq = dx * dx + dy * dy;

      if (distSq > smellRadiusSq) {
        continue;
      }

      const distance = Math.sqrt(distSq);
      const calories = foodData[i * 8 + 6];
      const radius = foodData[i * 8 + 2];
      const smellStrength = calories * (radius / 15) * (1 - distance / smellRadius);

      if (smellStrength <= 0) {
        continue;
      }

      const localX = dx * cosA - dy * sinA;
      const localY = dx * sinA + dy * cosA;

      totalIntensity += smellStrength;
      gradLeft += Math.max(0, -localX) * smellStrength;
      gradRight += Math.max(0, localX) * smellStrength;
      gradFront += Math.max(0, localY) * smellStrength;
      gradBack += Math.max(0, -localY) * smellStrength;
    }

    const norm = totalIntensity > 1e-6 ? 1 / totalIntensity : 0;
    const scale = 0.03;

    this.sensoryCurrentByNeuron[Organism.SENSOR_SMELL_LEFT] = gradLeft * norm * scale;
    this.sensoryCurrentByNeuron[Organism.SENSOR_SMELL_RIGHT] = gradRight * norm * scale;
    this.sensoryCurrentByNeuron[Organism.SENSOR_SMELL_FRONT] = gradFront * norm * scale;
    this.sensoryCurrentByNeuron[Organism.SENSOR_SMELL_BACK] = gradBack * norm * scale;
    this.sensoryCurrentByNeuron[Organism.SENSOR_SMELL_INTENSITY] = Math.min(3, totalIntensity * scale);
  }

  private applyHungerMotivation(foodData: Float32Array, foodFlags: Int32Array, foodCount: number, organism: Organism): void {
    const hunger = organism.getHunger();
    if (hunger <= 0.05) {
      return;
    }

    const organismX = organism.position[0];
    const organismY = organism.position[1];
    const smellRadius = Organism.SENSOR_SMELL_RADIUS;
    const smellRadiusSq = smellRadius * smellRadius;
    const cosA = Math.cos(-organism.angle);
    const sinA = Math.sin(-organism.angle);

    let weightedX = 0;
    let weightedY = 0;
    let totalWeight = 0;

    for (let i = 0; i < foodCount; i++) {
      if (foodFlags[i] !== 1) {
        continue;
      }

      const dx = foodData[i * 8] - organismX;
      const dy = foodData[i * 8 + 1] - organismY;
      const distSq = dx * dx + dy * dy;
      if (distSq > smellRadiusSq) {
        continue;
      }

      const distance = Math.sqrt(distSq);
      const radius = foodData[i * 8 + 2];
      const calories = foodData[i * 8 + 6];
      const weight = (1 - distance / smellRadius) * (radius / 15) * calories;
      if (weight <= 0) {
        continue;
      }

      const localX = dx * cosA - dy * sinA;
      const localY = dx * sinA + dy * cosA;
      weightedX += localX * weight;
      weightedY += localY * weight;
      totalWeight += weight;
    }

    if (totalWeight <= 1e-6) {
      return;
    }

    const dirX = weightedX / totalWeight;
    const dirY = weightedY / totalWeight;
    const hungerDrive = hunger * hunger * 0.65;
    const forward = Math.max(0, dirY / smellRadius) * hungerDrive * 0.5;
    const backward = Math.max(0, -dirY / smellRadius) * hungerDrive * 0.28;
    const turnRight = Math.max(0, dirX / smellRadius) * hungerDrive * 0.8;
    const turnLeft = Math.max(0, -dirX / smellRadius) * hungerDrive * 0.8;
    const explorationBase = (Math.random() * 2 - 1) * hungerDrive * MOTOR_EXPLORATION_NOISE;
    const explorationLeft = Math.max(0, -explorationBase) + Math.random() * hungerDrive * 0.1;
    const explorationRight = Math.max(0, explorationBase) + Math.random() * hungerDrive * 0.1;

    for (const idx of MOTOR_NEURONS_LEFT) {
      if (idx < this.sensoryCurrentByNeuron.length) {
        this.sensoryCurrentByNeuron[idx] += forward + turnRight + backward * 0.4 + explorationLeft;
      }
    }

    for (const idx of MOTOR_NEURONS_RIGHT) {
      if (idx < this.sensoryCurrentByNeuron.length) {
        this.sensoryCurrentByNeuron[idx] += forward + turnLeft + backward * 0.4 + explorationRight;
      }
    }
  }
}