export interface IBrainsCreate {
  neurons: number;
  synapses: number;
  leak?: number;
  threshold?: number;
  resetPotential?: number;
  refractoryTicks?: number;
  noiseMin?: number;
  noiseMax?: number;
  model?: IBrainsModel;
}

export interface IBrainsModel {
  neurons: number;
  synapses: number;
  leak: number;
  threshold: number;
  resetPotential: number;
  refractoryTicks: number;
  noiseMin: number;
  noiseMax: number;
  inputs: number[][];
  weights: number[][];
}

export class Brains {
  private readonly neurons: number;
  private readonly synapses: number;
  private readonly leak: number;
  private readonly threshold: number;
  private readonly resetPotential: number;
  private readonly refractoryTicks: number;
  private readonly noiseMin: number;
  private readonly noiseMax: number;

  private readonly membranePotential: Float32Array;
  private readonly refractoryLeft: Int16Array;
  private readonly lastSpikes: Uint8Array;
  private readonly spikes: Uint8Array;
  private readonly inputs: number[][];
  private readonly weights: number[][];
  private rewardSignal = 0;

  constructor(cfg: IBrainsCreate) {
    const model = cfg.model;

    this.neurons = model?.neurons ?? cfg.neurons;
    this.synapses = model?.synapses ?? cfg.synapses;
    this.leak = model?.leak ?? cfg.leak ?? 0.95;
    this.threshold = model?.threshold ?? cfg.threshold ?? 1;
    this.resetPotential = model?.resetPotential ?? cfg.resetPotential ?? 0;
    this.refractoryTicks = model?.refractoryTicks ?? cfg.refractoryTicks ?? 2;
    this.noiseMin = model?.noiseMin ?? cfg.noiseMin ?? -0.05;
    this.noiseMax = model?.noiseMax ?? cfg.noiseMax ?? 0.12;

    this.membranePotential = new Float32Array(this.neurons);
    this.refractoryLeft = new Int16Array(this.neurons);
    this.lastSpikes = new Uint8Array(this.neurons);
    this.spikes = new Uint8Array(this.neurons);
    this.inputs = Array.from({ length: this.neurons }, () => []);
    this.weights = Array.from({ length: this.neurons }, () => []);

    if (model) {
      this.loadModelSynapses(model);
    } else {
      this.buildRandomSynapses();
    }
  }

  get neuronCount(): number {
    return this.neurons;
  }

  step(externalCurrentByNeuron: ArrayLike<number> = []): void {
    const effectiveThreshold = Math.max(0.4, this.threshold - this.rewardSignal * 0.2);

    for (let neuronIndex = 0; neuronIndex < this.neurons; neuronIndex++) {
      this.spikes[neuronIndex] = 0;

      if (this.refractoryLeft[neuronIndex] > 0) {
        this.refractoryLeft[neuronIndex] -= 1;
        this.membranePotential[neuronIndex] = this.resetPotential;
        continue;
      }

      let synapticCurrent = 0;
      const neuronInputs = this.inputs[neuronIndex];
      const neuronWeights = this.weights[neuronIndex];

      for (let i = 0; i < neuronInputs.length; i++) {
        const fromNeuron = neuronInputs[i];
        if (this.lastSpikes[fromNeuron] === 1) {
          synapticCurrent += neuronWeights[i];
        }
      }

      const externalCurrent = externalCurrentByNeuron[neuronIndex] ?? 0;
      const noiseCurrent = this.random(this.noiseMin, this.noiseMax);
      const nextPotential = this.membranePotential[neuronIndex] * this.leak + synapticCurrent + externalCurrent + noiseCurrent;

      if (nextPotential >= effectiveThreshold) {
        this.spikes[neuronIndex] = 1;
        this.membranePotential[neuronIndex] = this.resetPotential;
        this.refractoryLeft[neuronIndex] = this.refractoryTicks;
      } else {
        this.membranePotential[neuronIndex] = nextPotential;
      }
    }

    this.applyRewardModulatedPlasticity();
    this.lastSpikes.set(this.spikes);
    this.rewardSignal *= 0.96;
  }

  didSpike(neuronIndex: number): boolean {
    if (neuronIndex < 0 || neuronIndex >= this.neurons) {
      return false;
    }

    return this.lastSpikes[neuronIndex] === 1;
  }

  applyReward(reward: number): void {
    this.rewardSignal += reward;

    if (this.rewardSignal > 4) {
      this.rewardSignal = 4;
    } else if (this.rewardSignal < -4) {
      this.rewardSignal = -4;
    }
  }

  saveModel(): IBrainsModel {
    return {
      neurons: this.neurons,
      synapses: this.synapses,
      leak: this.leak,
      threshold: this.threshold,
      resetPotential: this.resetPotential,
      refractoryTicks: this.refractoryTicks,
      noiseMin: this.noiseMin,
      noiseMax: this.noiseMax,
      inputs: this.inputs.map((row) => row.slice()),
      weights: this.weights.map((row) => row.slice()),
    };
  }

  private buildRandomSynapses(): void {
    for (let toNeuron = 0; toNeuron < this.neurons; toNeuron++) {
      const neuronInputs = this.inputs[toNeuron];
      const neuronWeights = this.weights[toNeuron];

      for (let i = 0; i < this.synapses; i++) {
        const fromNeuron = Math.floor(this.random(0, this.neurons));
        neuronInputs.push(fromNeuron);

        // Mostly excitatory, but with small inhibitory population.
        const isInhibitory = this.random(0, 1) < 0.2;
        const weight = isInhibitory ? this.random(-0.7, -0.05) : this.random(0.05, 0.7);
        neuronWeights.push(weight);
      }
    }
  }

  private loadModelSynapses(model: IBrainsModel): void {
    const rowCount = Math.min(this.neurons, model.inputs.length, model.weights.length);

    for (let toNeuron = 0; toNeuron < rowCount; toNeuron++) {
      const srcInputs = model.inputs[toNeuron];
      const srcWeights = model.weights[toNeuron];
      const count = Math.min(srcInputs.length, srcWeights.length);

      const neuronInputs = this.inputs[toNeuron];
      const neuronWeights = this.weights[toNeuron];

      for (let i = 0; i < count; i++) {
        const fromNeuron = srcInputs[i];
        if (fromNeuron < 0 || fromNeuron >= this.neurons) {
          continue;
        }
        neuronInputs.push(fromNeuron);
        neuronWeights.push(srcWeights[i]);
      }
    }

    for (let toNeuron = 0; toNeuron < this.neurons; toNeuron++) {
      if (this.inputs[toNeuron].length === 0) {
        for (let i = 0; i < this.synapses; i++) {
          const fromNeuron = Math.floor(this.random(0, this.neurons));
          this.inputs[toNeuron].push(fromNeuron);
          this.weights[toNeuron].push(this.random(0.05, 0.7));
        }
      }
    }
  }

  private applyRewardModulatedPlasticity(): void {
    if (Math.abs(this.rewardSignal) < 1e-4) {
      return;
    }

    const learningRate = 0.0012;

    for (let toNeuron = 0; toNeuron < this.neurons; toNeuron++) {
      if (this.spikes[toNeuron] === 0) {
        continue;
      }

      const neuronInputs = this.inputs[toNeuron];
      const neuronWeights = this.weights[toNeuron];

      for (let i = 0; i < neuronInputs.length; i++) {
        const fromNeuron = neuronInputs[i];
        if (this.lastSpikes[fromNeuron] === 0) {
          continue;
        }

        const nextWeight = neuronWeights[i] + learningRate * this.rewardSignal;
        neuronWeights[i] = Math.max(-1.5, Math.min(1.5, nextWeight));
      }
    }
  }

  private random(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}