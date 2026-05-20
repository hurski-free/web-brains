import type { ImmutableFrameView } from "./IFrameView";
import type { IGameSession } from "./IGameSession";
import type { IWorld } from "./IWorld";

export interface IEngine<WorldData = unknown, SessionObject = unknown> {
  process(world: IWorld<WorldData>, frameView: ImmutableFrameView, session: IGameSession<SessionObject>): void;
  generateInitialData(world: IWorld<WorldData>, frameView: ImmutableFrameView, session: IGameSession<SessionObject>): void;
}