export type GameState = 'wait_for_start' | 'running' | 'paused';

export interface IGameSession<SessionObject = unknown> {
  gameState: GameState;

  sessionObject: SessionObject;
}

export type ImmutableGameSession<SessionObject = unknown> = Readonly<IGameSession<SessionObject>>;