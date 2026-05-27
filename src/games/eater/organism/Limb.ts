import type { vec2, vec3 } from "../../../game/math";
import { Muscle, type IMuscleCreate } from "./Muscle";

export interface ILimbCreate {
  length: number;
  width: number;

  angle: number;

  /**
   * Default is body color
   */
  color?: vec3;

  parentLimbAttachmentPoint: vec2;

  muscles: IMuscleCreate[];

  // children limbs
  limbs: ILimbCreate[];

  angularDamping?: number;
  angularStiffness?: number;
  angleLimitOffset?: number;
}

export interface ILimbStepOutput {
  forwardImpulse: number;
  angularImpulse: number;
  metabolicLoad: number;
}

export class Limb {
  readonly length: number;
  readonly width: number;
  readonly angle: number;
  readonly color: vec3;
  readonly parentLimbAttachmentPoint: vec2;
  readonly angularDamping: number;
  readonly angularStiffness: number;
  readonly angleLimitOffset: number;

  readonly muscles: Muscle[];

  readonly childrenLimbs: Limb[];
  angularVelocity: number = 0;
  currentAngle: number;

  constructor(cfg: ILimbCreate, bodyColor: vec3) {
    this.length = cfg.length;
    this.width = cfg.width;
    this.angle = cfg.angle;
    this.currentAngle = cfg.angle;
    this.color = cfg.color ?? bodyColor;
    this.parentLimbAttachmentPoint = cfg.parentLimbAttachmentPoint;
    this.angularDamping = cfg.angularDamping ?? 0.22;
    this.angularStiffness = cfg.angularStiffness ?? 0.12;
    this.angleLimitOffset = cfg.angleLimitOffset ?? Math.PI / 3;

    this.muscles = cfg.muscles.map(muscle => new Muscle(muscle));
    this.childrenLimbs = cfg.limbs.map(limb => new Limb(limb, bodyColor));
  }

  step(
    isMotorNeuronActive: (motorNeuronIndex: number) => boolean,
    sideSign: number,
    pushFeedbackCurrent: (neuronIndex: number, current: number) => void
  ): ILimbStepOutput {
    let muscleTorque = 0;
    let metabolicLoad = 0;

    for (const muscle of this.muscles) {
      const muscleStep = muscle.step(isMotorNeuronActive(muscle.motorNeuronIndex));
      muscleTorque += muscleStep.torque;
      metabolicLoad += muscleStep.metabolicLoad;

      if (muscle.afferentNeuronIndex !== null) {
        pushFeedbackCurrent(muscle.afferentNeuronIndex, muscleStep.feedbackCurrent);
      }
    }

    const springTorque = (this.angle - this.currentAngle) * this.angularStiffness;
    const dampingTorque = -this.angularVelocity * this.angularDamping;
    const angularAcceleration = (muscleTorque + springTorque + dampingTorque) / this.getInertia();

    this.angularVelocity += angularAcceleration;
    this.currentAngle += this.angularVelocity;

    const minAngle = this.angle - this.angleLimitOffset;
    const maxAngle = this.angle + this.angleLimitOffset;

    if (this.currentAngle < minAngle) {
      this.currentAngle = minAngle;
      this.angularVelocity = 0;
    } else if (this.currentAngle > maxAngle) {
      this.currentAngle = maxAngle;
      this.angularVelocity = 0;
    }

    const swingForce = Math.abs(this.angularVelocity) * this.length * 0.014;
    const directionalGain = Math.max(0, Math.sin(this.currentAngle));
    let output: ILimbStepOutput = {
      forwardImpulse: swingForce * directionalGain,
      angularImpulse: sideSign * (muscleTorque * 0.003 + this.angularVelocity * 0.0012),
      metabolicLoad,
    };

    for (const childLimb of this.childrenLimbs) {
      const childSideRaw = Math.sign(childLimb.parentLimbAttachmentPoint[0]);
      const childSideSign = childSideRaw === 0 ? sideSign : childSideRaw;
      const childOutput = childLimb.step(isMotorNeuronActive, childSideSign, pushFeedbackCurrent);
      output = {
        forwardImpulse: output.forwardImpulse + childOutput.forwardImpulse,
        angularImpulse: output.angularImpulse + childOutput.angularImpulse,
        metabolicLoad: output.metabolicLoad + childOutput.metabolicLoad,
      };
    }

    return output;
  }

  private getInertia(): number {
    return Math.max(1, (this.length * this.width * this.width) / 12);
  }
}