import type { IEngine } from "./engine/IEngine";
import { type IVec2 } from "./math";
import type { IRender } from "./render/IRender";

export type GameState = 'wait_for_start' | 'running' | 'paused';

export interface IGameConfig {
  engine: IEngine;
  renderer: IRender;
}

/**
 * non-optimized game class
 * For SoA just use number for indexes
 */
export abstract class Game {
  protected engine: IEngine;
  protected renderer: IRender;

  protected animationFrameId: number = 0;
  protected _gameState: GameState = 'wait_for_start';

  protected _prevTimestamp: DOMHighResTimeStamp = 0;

  protected _width: number = 0;
  protected _height: number = 0;

  protected _halfWidth: number = 0;
  protected _halfHeight: number = 0;

  protected _camera: IVec2 = { x: 0, y: 0 };

  constructor(cfg: IGameConfig) {
    this.engine = cfg.engine;
    this.renderer = cfg.renderer;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get halfWidth() {
    return this._halfWidth;
  }

  get halfHeight() {
    return this._halfHeight;
  }

  get gameState() {
    return this._gameState;
  }

  get camera() {
    return this._camera;
  }

  start() {
    if (this._gameState === 'wait_for_start') {
      this._gameState = 'running';

      this._camera.x = -this.halfWidth;
      this._camera.y = -this.halfHeight;  

      this.initStartData();

      this.tick(performance.now());
    }
  }

  tick(now: DOMHighResTimeStamp) {
    if (this._gameState === 'running') {
      const deltaTime = now - this._prevTimestamp;
      this._prevTimestamp = now;

      if (deltaTime > 200) {
        // ignore cycle
        this.animationFrameId = requestAnimationFrame((now) => this.tick(now));
      } else {
        this.engine.process(this);
        this.renderer.render(this);
        this.animationFrameId = requestAnimationFrame((now) => this.tick(now));
      }
    }
  }

  /**
   * Initialize objects specific for game
   */
  protected abstract initStartData(): void;

  pause() {
    if (this._gameState === 'running') {
      this._gameState = 'paused';
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  resume() {
    if (this._gameState === 'paused') {
      this._gameState = 'running';
      this.tick(performance.now());
    }
  }

  stop() {
    if (this._gameState !== 'wait_for_start') {
      this._gameState = 'wait_for_start';
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
      this.clearObjects();
      this.renderer.render(this);
    }
  }

  restart() {
    this.stop();
    this.start();
  }

  resizeCanvas(width: number, height: number, cameraSet = false) {
    this._width = width;
    this._height = height;
    this._halfWidth = width / 2;
    this._halfHeight = height / 2;

    if (cameraSet) {
      this._camera.x = -this._halfWidth;
      this._camera.y = -this._halfHeight;  
    }
  }

  cameraMove(deltaX: number, deltaY: number) {
    this._camera.x -= deltaX;
    this._camera.y -= deltaY;

    if (this.gameState === 'paused') {
      this.renderer.render(this);
    }
  }

  protected abstract clearObjects(): void;
}
