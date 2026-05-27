import type { vec2 } from "../../../game/math";
import { Body, type IBodyCreate } from "./Body";
import { Brains, type IBrainsCreate, type IBrainsModel } from "./Brains";
import { Limb, type ILimbCreate } from "./Limb";

export interface IOrganismCreate {
  brains: IBrainsCreate;
  body: IBodyCreate;
  limbs: ILimbCreate[];
}

export class Organism {
  static readonly SENSOR_NEAREST_FOOD_LEFT = 8;
  static readonly SENSOR_NEAREST_FOOD_RIGHT = 9;
  static readonly SENSOR_NEAREST_FOOD_FRONT = 10;
  static readonly SENSOR_NEAREST_FOOD_BACK = 11;
  static readonly SENSOR_NEAREST_FOOD_INTENSITY = 12;
  static readonly SENSOR_HUNGER = 13;
  static readonly SENSOR_ENERGY = 14;
  static readonly SENSOR_HEALTH = 15;
  static readonly SENSOR_STARVATION = 16;
  static readonly SENSOR_VISION_START = 32;
  static readonly SENSOR_VISION_GRID = 16;
  static readonly SENSOR_VISION_NEURONS = Organism.SENSOR_VISION_GRID * Organism.SENSOR_VISION_GRID;
  static readonly SENSOR_VISION_SIZE_PX = 128;
  static readonly SENSOR_SMELL_LEFT = Organism.SENSOR_VISION_START + Organism.SENSOR_VISION_NEURONS;
  static readonly SENSOR_SMELL_RIGHT = Organism.SENSOR_SMELL_LEFT + 1;
  static readonly SENSOR_SMELL_FRONT = Organism.SENSOR_SMELL_LEFT + 2;
  static readonly SENSOR_SMELL_BACK = Organism.SENSOR_SMELL_LEFT + 3;
  static readonly SENSOR_SMELL_INTENSITY = Organism.SENSOR_SMELL_LEFT + 4;
  static readonly SENSOR_SMELL_RADIUS = 500;

  position: vec2 = [0, 0];
  velocity: vec2 = [0, 0];
  angle: number = 0;
  angularVelocity: number = 0;

  readonly brains: Brains;
  readonly body: Body;
  readonly limbs: Limb[];
  private readonly bodyCenterX: number;
  private readonly bodyRadius: number;
  private sensorySnapshot: Float32Array;
  private neuralInputBuffer: Float32Array;
  private proprioceptiveFeedback: Float32Array;
  private readonly hungerTickRate = 0.000045;
  private readonly movementEnergyCost = 0.000018;
  private readonly effortEnergyCost = 0.00006;
  private readonly starvationHealthLossRate = 0.0015;
  private energy = 1;
  private health = 1;

  constructor(cfg: IOrganismCreate) {
    this.brains = new Brains(cfg.brains);
    this.body = new Body(cfg.body);
    this.limbs = cfg.limbs.map(limb => new Limb(limb, cfg.body.color));
    this.bodyCenterX = this.body.polygon.reduce((sum, point) => sum + point[0], 0) / this.body.polygon.length;
    this.bodyRadius = this.computeBodyRadius();
    this.sensorySnapshot = new Float32Array(this.brains.neuronCount);
    this.neuralInputBuffer = new Float32Array(this.brains.neuronCount);
    this.proprioceptiveFeedback = new Float32Array(this.brains.neuronCount);
  }

  step(externalCurrentByNeuron: ArrayLike<number> = []): void {
    this.prepareNeuralInput(externalCurrentByNeuron);
    this.captureSensorySnapshot(this.neuralInputBuffer);
    this.brains.step(this.neuralInputBuffer);

    this.proprioceptiveFeedback.fill(0);

    let totalForwardImpulse = 0;
    let totalAngularImpulse = 0;
    let totalMetabolicLoad = 0;

    for (const limb of this.limbs) {
      const sideRaw = Math.sign(limb.parentLimbAttachmentPoint[0] - this.bodyCenterX);
      const sideSign = sideRaw === 0 ? 1 : sideRaw;
      const output = limb.step(
        (motorNeuronIndex) => this.brains.didSpike(motorNeuronIndex),
        sideSign,
        (neuronIndex, current) => {
          if (neuronIndex >= 0 && neuronIndex < this.proprioceptiveFeedback.length) {
            this.proprioceptiveFeedback[neuronIndex] += current;
          }
        }
      );
      totalForwardImpulse += output.forwardImpulse;
      totalAngularImpulse += output.angularImpulse;
      totalMetabolicLoad += output.metabolicLoad;
    }

    this.angularVelocity = this.angularVelocity * 0.94 + totalAngularImpulse;
    this.angle += this.angularVelocity;

    const worldDirX = Math.cos(this.angle + Math.PI / 2);
    const worldDirY = Math.sin(this.angle + Math.PI / 2);
    this.velocity[0] = this.velocity[0] * 0.92 + worldDirX * totalForwardImpulse;
    this.velocity[1] = this.velocity[1] * 0.92 + worldDirY * totalForwardImpulse;

    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];

    const speed = Math.sqrt(this.velocity[0] * this.velocity[0] + this.velocity[1] * this.velocity[1]);
    const energyLoss = this.hungerTickRate + speed * this.movementEnergyCost + totalMetabolicLoad * this.effortEnergyCost;
    this.energy = Math.max(0, this.energy - energyLoss);

    if (this.energy <= 0) {
      this.health = Math.max(0, this.health - this.starvationHealthLossRate);
    }
  }

  applyReward(reward: number): void {
    this.brains.applyReward(reward);
  }

  feed(calories: number): void {
    const energyGain = calories * 0.022;
    this.energy = Math.max(0, Math.min(1, this.energy + energyGain));
  }

  applyHungerPenalty(amount: number): void {
    if (amount <= 0) {
      return;
    }

    this.energy = Math.max(0, this.energy - amount);
  }

  getEatRadius(): number {
    return this.bodyRadius;
  }

  getNeuronCount(): number {
    return this.brains.neuronCount;
  }

  getVisionCellIntensity(cellIndex: number): number {
    if (cellIndex < 0 || cellIndex >= Organism.SENSOR_VISION_NEURONS) {
      return 0;
    }

    const sensorIndex = Organism.SENSOR_VISION_START + cellIndex;
    if (sensorIndex >= this.sensorySnapshot.length) {
      return 0;
    }

    return this.sensorySnapshot[sensorIndex];
  }

  getSmellSensorValue(sensorIndex: number): number {
    if (sensorIndex < 0 || sensorIndex >= this.sensorySnapshot.length) {
      return 0;
    }

    return this.sensorySnapshot[sensorIndex];
  }

  getHunger(): number {
    return 1 - this.energy;
  }

  getEnergy(): number {
    return this.energy;
  }

  getHealth(): number {
    return this.health;
  }

  saveBrainModel(): IBrainsModel {
    return this.brains.saveModel();
  }

  private computeBodyRadius(): number {
    let maxDistanceSq = 0;

    for (const point of this.body.polygon) {
      const dx = point[0] - this.bodyCenterX;
      const dy = point[1];
      const distSq = dx * dx + dy * dy;

      if (distSq > maxDistanceSq) {
        maxDistanceSq = distSq;
      }
    }

    return Math.sqrt(maxDistanceSq);
  }

  private captureSensorySnapshot(externalCurrentByNeuron: ArrayLike<number>): void {
    if (this.sensorySnapshot.length !== this.brains.neuronCount) {
      this.sensorySnapshot = new Float32Array(this.brains.neuronCount);
    }

    this.sensorySnapshot.fill(0);
    const limit = Math.min(this.sensorySnapshot.length, externalCurrentByNeuron.length);
    for (let i = 0; i < limit; i++) {
      this.sensorySnapshot[i] = externalCurrentByNeuron[i] ?? 0;
    }
  }

  private prepareNeuralInput(externalCurrentByNeuron: ArrayLike<number>): void {
    if (this.neuralInputBuffer.length !== this.brains.neuronCount) {
      this.neuralInputBuffer = new Float32Array(this.brains.neuronCount);
      this.proprioceptiveFeedback = new Float32Array(this.brains.neuronCount);
    }

    this.neuralInputBuffer.fill(0);
    const limit = Math.min(this.neuralInputBuffer.length, externalCurrentByNeuron.length);
    for (let i = 0; i < limit; i++) {
      this.neuralInputBuffer[i] = externalCurrentByNeuron[i] ?? 0;
    }

    for (let i = 0; i < this.proprioceptiveFeedback.length; i++) {
      if (this.proprioceptiveFeedback[i] !== 0) {
        this.neuralInputBuffer[i] += this.proprioceptiveFeedback[i];
      }
    }

    const hunger = 1 - this.energy;
    if (Organism.SENSOR_HUNGER < this.neuralInputBuffer.length) {
      this.neuralInputBuffer[Organism.SENSOR_HUNGER] = hunger * hunger * 4;
    }
    if (Organism.SENSOR_ENERGY < this.neuralInputBuffer.length) {
      this.neuralInputBuffer[Organism.SENSOR_ENERGY] = this.energy * 0.8;
    }
    if (Organism.SENSOR_HEALTH < this.neuralInputBuffer.length) {
      this.neuralInputBuffer[Organism.SENSOR_HEALTH] = this.health;
    }
    if (Organism.SENSOR_STARVATION < this.neuralInputBuffer.length) {
      this.neuralInputBuffer[Organism.SENSOR_STARVATION] = this.energy <= 0 ? (1 - this.health) * 2 + 0.5 : 0;
    }
  }
}