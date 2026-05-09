import type { TPossibleTypes } from "./object.types";

/**
 * Magic hack
 */
export function getBytesPerArrayType(constructor: new (buffer: ArrayBufferLike) => TPossibleTypes) {
  return (constructor as unknown as TPossibleTypes).BYTES_PER_ELEMENT;
}