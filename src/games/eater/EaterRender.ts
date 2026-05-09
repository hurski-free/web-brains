import type { IRender } from "../../game/render/IRender";
import type { EaterGame } from "./EaterGame";

export class EaterRender implements IRender {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(game: EaterGame): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, game.width, game.height);

    ctx.save();
    ctx.translate(-game.camera.x, -game.camera.y);

    const food = game.foodPool.getTypedArray(0);
    const foodCount = game.foodPool.activeCount;

    for (let i = 0; i < foodCount; i += 8) {
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

    ctx.restore();
  }
}