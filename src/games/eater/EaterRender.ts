import type { IRender } from "../../game/render/IRender";
import type { EaterGame } from "./EaterGame";

export class EaterRender implements IRender {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(game: EaterGame): void {
    void this.ctx;
    void game;
  }
}