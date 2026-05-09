export type vec2 = [number, number];
export type vec3 = [number, number, number];
export type vec4 = [number, number, number, number];

export interface IVec2 {
  x: number;
  y: number;
}

export function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function circleSquare(radius: number) {
  return Math.PI * radius * radius;
}

export const PI_MUL_2 = 2 * Math.PI;
export const PI_DIV_2 = Math.PI / 2;
export const PI_DIV_4 = Math.PI / 4;
