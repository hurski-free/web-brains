import type { vec2 } from "../../game/math";
import type { ImmutableFrameView } from "../../game/types/IFrameView";
import type { IGameSession } from "../../game/types/IGameSession";
import type { IRender } from "../../game/types/IRender";
import type { IWorld } from "../../game/types/IWorld";
import type { IEaterWorldData } from "./EaterWorld";
import type { Limb } from "./organism/Limb";
import { Organism } from "./organism/Organism";

const FOOD_COLOR_EDIBLE: [number, number, number] = [90, 230, 110];
const FOOD_COLOR_INEDIBLE: [number, number, number] = [220, 70, 90];

export class EaterRender implements IRender<IEaterWorldData, unknown> {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(world: IWorld<IEaterWorldData>, frameView: ImmutableFrameView, _session: IGameSession<unknown>): void {
    const ctx = this.ctx;
    const organism = world.worldObject.organism;

    ctx.clearRect(0, 0, frameView.width, frameView.height);

    ctx.save();
    ctx.translate(-frameView.camera[0], -frameView.camera[1]);

    const food = world.worldObject.foodPool.getTypedArray(0);
    const foodFlags = world.worldObject.foodPool.getTypedArray<Int32Array>(1);
    const foodCount = world.worldObject.foodPool.activeCount;

    for (let i = 0; i < foodCount; i++) {
      const x = food[i * 8];
      const y = food[i * 8 + 1];
      const radius = food[i * 8 + 2];
      const color = foodFlags[i] === 1 ? FOOD_COLOR_EDIBLE : FOOD_COLOR_INEDIBLE;

      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    this.renderOrganism(ctx, organism);
    this.renderVisionBounds(ctx, organism);
    this.renderSmellBounds(ctx, organism);

    ctx.restore();
    this.renderVisionDebugOverlay(ctx, organism);
    this.renderSmellDebugOverlay(ctx, organism);
    this.renderHungerBar(ctx, frameView.width, organism);
    this.renderHealthBar(ctx, frameView.width, organism, 242);
  }

  private renderOrganism(ctx: CanvasRenderingContext2D, organism: Organism): void {
    const body = organism.body;
    const bodyCenter = this.getPolygonCenter(body.polygon);

    ctx.save();
    ctx.translate(organism.position[0], organism.position[1]);
    ctx.rotate(organism.angle);
    ctx.translate(-bodyCenter[0], -bodyCenter[1]);

    ctx.fillStyle = `rgb(${body.color[0]}, ${body.color[1]}, ${body.color[2]})`;
    ctx.beginPath();
    ctx.moveTo(body.polygon[0][0], body.polygon[0][1]);
    for (let i = 1; i < body.polygon.length; i++) {
      ctx.lineTo(body.polygon[i][0], body.polygon[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    for (const limb of organism.limbs) {
      this.renderLimb(ctx, limb);
    }

    ctx.restore();
  }

  private renderLimb(ctx: CanvasRenderingContext2D, limb: Limb): void {
    ctx.save();
    ctx.translate(limb.parentLimbAttachmentPoint[0], limb.parentLimbAttachmentPoint[1]);
    ctx.rotate(limb.currentAngle);

    ctx.fillStyle = `rgb(${limb.color[0]}, ${limb.color[1]}, ${limb.color[2]})`;
    this.fillCenteredRect(ctx, limb.width, limb.length, "base");

    for (const childLimb of limb.childrenLimbs) {
      this.renderLimb(ctx, childLimb);
    }

    ctx.restore();
  }

  private renderVisionBounds(ctx: CanvasRenderingContext2D, organism: Organism): void {
    const visionSize = Organism.SENSOR_VISION_SIZE_PX;
    const halfVision = visionSize / 2;

    ctx.save();
    ctx.translate(organism.position[0], organism.position[1]);
    ctx.rotate(organism.angle);
    ctx.strokeStyle = "rgba(80, 180, 255, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-halfVision, -halfVision, visionSize, visionSize);
    ctx.restore();
  }

  private renderSmellBounds(ctx: CanvasRenderingContext2D, organism: Organism): void {
    const smellRadius = Organism.SENSOR_SMELL_RADIUS;

    ctx.save();
    ctx.translate(organism.position[0], organism.position[1]);
    ctx.strokeStyle = "rgba(120, 255, 120, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, smellRadius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  private renderVisionDebugOverlay(ctx: CanvasRenderingContext2D, organism: Organism): void {
    const gridSize = Organism.SENSOR_VISION_GRID;
    const cellSize = 12;
    const padding = 8;
    const panelSize = gridSize * cellSize + padding * 2;
    const panelX = 12;
    const panelY = 12;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(panelX, panelY, panelSize, panelSize);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const idx = y * gridSize + x;
        const rawValue = Math.max(-1, Math.min(1, organism.getVisionCellIntensity(idx) / 2));
        const positive = Math.max(0, rawValue);
        const negative = Math.max(0, -rawValue);
        const red = Math.floor(30 + negative * 220 + positive * 30);
        const green = Math.floor(30 + positive * 220 + negative * 40);
        const blue = Math.floor(25 + positive * 70 + negative * 70);

        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(
          panelX + padding + x * cellSize,
          panelY + padding + y * cellSize,
          cellSize - 1,
          cellSize - 1,
        );
      }
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "12px sans-serif";
    ctx.fillText("Vision 128x128", panelX, panelY + panelSize + 14);
    ctx.fillText("+ edible / - inedible", panelX, panelY + panelSize + 28);
    ctx.restore();
  }

  private renderSmellDebugOverlay(ctx: CanvasRenderingContext2D, organism: Organism): void {
    const panelX = 12;
    const panelY = 12 + Organism.SENSOR_VISION_GRID * 12 + 8 * 2 + 24;
    const lineHeight = 16;

    const left = organism.getSmellSensorValue(Organism.SENSOR_SMELL_LEFT);
    const right = organism.getSmellSensorValue(Organism.SENSOR_SMELL_RIGHT);
    const front = organism.getSmellSensorValue(Organism.SENSOR_SMELL_FRONT);
    const back = organism.getSmellSensorValue(Organism.SENSOR_SMELL_BACK);
    const intensity = organism.getSmellSensorValue(Organism.SENSOR_SMELL_INTENSITY);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(panelX, panelY, 140, 88);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "12px sans-serif";
    ctx.fillText("Smell r=500", panelX + 8, panelY + 14);
    ctx.fillText(`L ${left.toFixed(3)} R ${right.toFixed(3)}`, panelX + 8, panelY + 14 + lineHeight);
    ctx.fillText(`F ${front.toFixed(3)} B ${back.toFixed(3)}`, panelX + 8, panelY + 14 + lineHeight * 2);
    ctx.fillText(`I ${intensity.toFixed(3)}`, panelX + 8, panelY + 14 + lineHeight * 3);
    ctx.restore();
  }

  private renderHungerBar(ctx: CanvasRenderingContext2D, frameWidth: number, organism: Organism): void {
    const hunger = organism.getHunger();
    const barWidth = 220;
    const barHeight = 14;
    const x = frameWidth / 2 - 242;
    const y = 10;
    const fillWidth = Math.max(0, Math.min(1, hunger)) * barWidth;

    const red = Math.floor(70 + hunger * 185);
    const green = Math.floor(210 - hunger * 170);
    const blue = 70;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
    ctx.fillStyle = "rgba(35, 35, 35, 0.9)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    ctx.fillRect(x, y, fillWidth, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Hunger ${(hunger * 100).toFixed(0)}%`, x + 6, y + barHeight + 14);
    ctx.restore();
  }

  private renderHealthBar(ctx: CanvasRenderingContext2D, frameWidth: number, organism: Organism, xOffset: number): void {
    const health = organism.getHealth();
    const barWidth = 220;
    const barHeight = 14;
    const x = frameWidth / 2 - xOffset + 264;
    const y = 10;
    const fillWidth = Math.max(0, Math.min(1, health)) * barWidth;

    const red = Math.floor(240 - health * 120);
    const green = Math.floor(70 + health * 170);
    const blue = 80;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
    ctx.fillStyle = "rgba(35, 35, 35, 0.9)";
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    ctx.fillRect(x, y, fillWidth, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Health ${(health * 100).toFixed(0)}%`, x + 6, y + barHeight + 14);
    ctx.restore();
  }

  private getPolygonCenter(polygon: vec2[]): vec2 {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const [x, y] of polygon) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  /**
   * @param anchor - "center" for squares/panels, "base" for limbs (joint at bottom edge center)
   */
  private fillCenteredRect(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    anchor: "center" | "base",
  ): void {
    const halfW = width / 2;

    if (anchor === "center") {
      ctx.fillRect(-halfW, -height / 2, width, height);
      return;
    }

    ctx.fillRect(-halfW, 0, width, height);
  }
}