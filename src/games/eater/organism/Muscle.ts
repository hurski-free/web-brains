export interface IMuscleCreate {
  motorNeuronIndex: number;
  afferentNeuronIndex?: number;
  direction: -1 | 1;
  torque: number;
  contractionGain?: number;
  fatigueRate?: number;
  recoveryRate?: number;
}

export interface IMuscleStepOutput {
  torque: number;
  feedbackCurrent: number;
  metabolicLoad: number;
}

export class Muscle {
  readonly motorNeuronIndex: number;
  readonly afferentNeuronIndex: number | null;
  readonly direction: -1 | 1;
  readonly torque: number;
  readonly contractionGain: number;
  readonly fatigueRate: number;
  readonly recoveryRate: number;

  private activation: number = 0;
  private fatigue: number = 0;

  constructor(cfg: IMuscleCreate) {
    this.motorNeuronIndex = cfg.motorNeuronIndex;
    this.afferentNeuronIndex = cfg.afferentNeuronIndex ?? null;
    this.direction = cfg.direction;
    this.torque = cfg.torque;
    this.contractionGain = cfg.contractionGain ?? 0.35;
    this.fatigueRate = cfg.fatigueRate ?? 0.028;
    this.recoveryRate = cfg.recoveryRate ?? 0.014;
  }

  step(isMotorNeuronActive: boolean): IMuscleStepOutput {
    if (isMotorNeuronActive) {
      this.activation += (1 - this.activation) * this.contractionGain;
    } else {
      this.activation *= 1 - this.contractionGain;
    }

    this.fatigue += this.activation * this.fatigueRate;
    this.fatigue -= (1 - this.activation) * this.recoveryRate;

    if (this.fatigue < 0) {
      this.fatigue = 0;
    } else if (this.fatigue > 1) {
      this.fatigue = 1;
    }

    const effectiveActivation = this.activation * (1 - this.fatigue * 0.85);
    const torque = effectiveActivation * this.torque * this.direction;
    const feedbackCurrent = this.activation * 0.35 + this.fatigue * 0.65;
    const metabolicLoad = this.activation * (1 + this.fatigue * 0.5);

    return {
      torque,
      feedbackCurrent,
      metabolicLoad,
    };
  }
}