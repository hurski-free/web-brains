import { Game } from "../../game/Game";
import type { IFrameView } from "../../game/types/IFrameView";
import type { IGameSession } from "../../game/types/IGameSession";
import { EaterEngine } from "./EaterEngine";
import { EaterRender } from "./EaterRender";
import { EaterWorld } from "./EaterWorld";

export function createEaterGame(ctx: CanvasRenderingContext2D) {
  const world = new EaterWorld({ foodCapacity: 10000 });
  const engine = new EaterEngine();
  const renderer = new EaterRender(ctx);
  const frameView = {
    width: 0,
    height: 0,
    halfWidth: 0,
    halfHeight: 0,
    camera: [0, 0],
  } satisfies IFrameView;
  const gameSession = {
    gameState: 'wait_for_start',
    sessionObject: {},
  } satisfies IGameSession<unknown>;

  return new Game(
    world,
    engine,
    renderer,
    frameView,
    gameSession,
  );
}