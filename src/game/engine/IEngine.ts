import type { Game } from "../Game";

export interface IEngine {
  process(game: Game): void;
}