import type { IEngine } from "../../game/engine/IEngine";
import type { EaterGame } from "./EaterGame";

export class EaterEngine implements IEngine {
  process(game: EaterGame): void {
    void game;
  }
}