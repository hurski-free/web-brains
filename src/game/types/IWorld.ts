export interface IWorld<WorldData = unknown> {
  clear(): void;
  freeMemory(): void;

  readonly worldObject: WorldData;
}
