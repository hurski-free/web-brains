import type { ImmutableFrameView } from "./IFrameView";
import type { ImmutableGameSession } from "./IGameSession";
import type { IWorld } from "./IWorld";

export interface IRender<WorldData = unknown, SessionObject = unknown> {
  render(world: IWorld<WorldData>, frameView: ImmutableFrameView, session: ImmutableGameSession<SessionObject>): void;
}