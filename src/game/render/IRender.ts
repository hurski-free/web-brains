import type { Game } from "../Game";

export interface IRender {
  render(ctx: Game): void;
}