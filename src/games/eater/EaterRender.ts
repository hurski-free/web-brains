import type { ImmutableFrameView } from "../../game/types/IFrameView";
import type { IGameSession } from "../../game/types/IGameSession";
import type { IRender } from "../../game/types/IRender";
import type { IWorld } from "../../game/types/IWorld";
import type { IEaterWorldData } from "./EaterWorld";
import type { Organism } from "./organism/Organism";

export class EaterRender implements IRender<IEaterWorldData, unknown> {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, session: IGameSession<unknown>): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, frameView.width, frameView.height);

    ctx.save();
    ctx.translate(-frameView.camera[0], -frameView.camera[1]);

    const food = world.worldObject.foodPool.getTypedArray(0);
    const foodCount = world.worldObject.foodPool.activeCount;

    for (let i = 0; i < foodCount; i++) {
      const x = food[i * 8];
      const y = food[i * 8 + 1];
      const radius = food[i * 8 + 2];
      const colorR = food[i * 8 + 3];
      const colorG = food[i * 8 + 4];
      const colorB = food[i * 8 + 5];

      ctx.fillStyle = `rgb(${colorR}, ${colorG}, ${colorB})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    this.renderOrganism(ctx, world.worldObject.organism);

    ctx.restore();
  }

  private renderOrganism(ctx: CanvasRenderingContext2D, organism: Organism): void {
    ctx.save();
    ctx.translate(organism.position[0], organism.position[1]);
    ctx.rotate(organism.angle);

    // draw body polygon
    const body = organism.body;
    ctx.fillStyle = `rgb(${body.color[0]}, ${body.color[1]}, ${body.color[2]})`;
    ctx.beginPath();
    ctx.moveTo(body.polygon[0][0], body.polygon[0][1]);
    for (let i = 1; i < body.polygon.length; i++) {
      ctx.lineTo(body.polygon[i][0], body.polygon[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    const limbs = organism.limbs;

    for (const limb of limbs) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.rect(0, 0, limb.width, limb.length);
      ctx.fill();
    }

    ctx.restore();
  }
}