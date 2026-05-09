import { getBytesPerArrayType } from "./object.service";
import type { TPossibleTypes } from "./object.types";

interface IBufferConstructor<T extends TPossibleTypes> {
  /**
   * Can be used for find buffer in pool
   */
  name: string;

  /**
   * Number of elements in buffer
   */
  countElements: number;

  valuesPerElement: number;
  typedConstructor: new (buffer: ArrayBufferLike) => T;
}

interface IBufferData {
  name: string;
  index: number;
  buffer: ArrayBufferLike;
  valuesPerElement: number;
}

/**
 * Buffered SoA pool for objects:
 * 
 * example:
 * @bufferCoord  [x, y, z, x, y, z, x, y, z, ...] -> access by index: index * 3 (r), index * 3 + 1 (g), index * 3 + 2 (b)
 *
 * @bufferColor [r, g, b, r, g, b, r, g, b, ...] -> access by index: index * 3 (r), index * 3 + 1 (g), index * 3 + 2 (b)
 * 
 * invariants hold if callers respect indexing and state protocol; otherwise behavior is undefined by design
 */
export class BufferSoAPool {
  private _capacity: number;

  private buffers: IBufferData[] = [];
  private buffersMap = new Map<string, IBufferData>();
  private _countBuffers: number = 0;
  
  private typedArrays: TPossibleTypes[] = [];
  private strides: number[] = [];

  /**
   * @see TObjectState
   */
  private _states: Uint8Array;

  private _activeCount: number = 0;

  private _isDisposed: boolean = false;

  constructor(capacity: number) {
    this._capacity = capacity;
    this._states = new Uint8Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this._states[i] = 0;
    }
  }

  get countBuffers() {
    return this._countBuffers;
  }

  get activeCount() {
    return this._activeCount;
  }

  get isDisposed() {
    return this._isDisposed;
  }

  get states() {
    return this._states;
  }

  createArrayBuffer<T extends TPossibleTypes>(buf: IBufferConstructor<T>) {
    const buffer = new ArrayBuffer(buf.countElements * buf.valuesPerElement * getBytesPerArrayType(buf.typedConstructor));
    const typedBuffer = new buf.typedConstructor(buffer);

    this.pushBuffer(buffer, typedBuffer, buf);
  }

  createSharedBuffer<T extends TPossibleTypes>(buf: IBufferConstructor<T>) {
    const buffer = new SharedArrayBuffer(buf.countElements * buf.valuesPerElement * getBytesPerArrayType(buf.typedConstructor));
    const typedBuffer = new buf.typedConstructor(buffer);

    this.pushBuffer(buffer, typedBuffer, buf);
  }

  private pushBuffer<T extends TPossibleTypes>(buffer: ArrayBufferLike, typedBuffer: T, buf: IBufferConstructor<T>) {
    const bufferStruct: IBufferData = {
      name: buf.name,
      index: this._countBuffers,
      buffer,
      valuesPerElement: buf.valuesPerElement,
    };

    this.buffers.push(bufferStruct);
    this.buffersMap.set(buf.name, bufferStruct);

    this.typedArrays.push(typedBuffer);
    this.strides.push(buf.valuesPerElement);

    this._countBuffers++;
  }

  /**
   * Throw an error if buffer not found
   */
  getBuffer(index: number): Readonly<IBufferData>;
  getBuffer(name: string): Readonly<IBufferData>;
  getBuffer(id: string | number) {
    if (!(typeof id === 'string' || typeof id === 'number')) {
      throw new Error('[GET_BUFFER] Invalid identificator, must be a string or a number');
    }

    let buffer: IBufferData | undefined;

    if (typeof id === 'string') {
      buffer = this.buffersMap.get(id);
    } else {
      buffer = this.buffers[id];
    }

    if (!buffer) {
      throw new Error(`[GET_BUFFER] Buffer [${id}] not found`);
    }

    return buffer;
  }

  /**
   * Throw an error if typed array not found
   * @returns typed array view on buffer
   */
  getTypedArray<T extends TPossibleTypes>(index: number): T;
  getTypedArray<T extends TPossibleTypes>(name: string): T;
  getTypedArray(id: string | number) {
    if (!(typeof id === 'string' || typeof id === 'number')) {
      throw new Error('[GET_TYPED_ARRAY] Invalid identificator, must be a string or a number');
    }

    let typedArray: TPossibleTypes | undefined;

    if (typeof id === 'string') {
      const buffer = this.buffersMap.get(id);

      if (buffer) {
        typedArray = this.typedArrays[buffer.index];
      }
    } else {
      typedArray = this.typedArrays[id];
    }

    if (!typedArray) {
      throw new Error(`[GET_TYPED_ARRAY] Typed array [${id}] not found`);
    }

    return typedArray;
  }

  // /**
  //  * Use it very carefully, because it will cause defragmentation.
  //  * @returns -1 if buffer not found, index if cleared
  //  */
  // deleteBuffer(index: number): number;
  // deleteBuffer(name: string): number;
  // deleteBuffer(id: string | number) {
  //   if (!(typeof id === 'string' || typeof id === 'number')) {
  //     throw new Error('[DELETE_BUFFER] Invalid identificator, must be a string or a number');
  //   }

  //   let bufferIndex: number = -1;

  //   if (typeof id === 'string') {
  //     const buffer = this.buffersMap.get(id);

  //     if (buffer) {
  //       this.buffersMap.delete(id);
  //       (this.buffers as unknown[])[buffer.index] = null;
  //       bufferIndex = buffer.index;
  //     }
  //   } else {
  //     const buffer = this.buffers[id];

  //     if (buffer) {
  //       this.buffersMap.delete(buffer.name);
  //       (this.buffers as unknown[])[buffer.index] = null;
  //       bufferIndex = buffer.index;
  //     }
  //   }

  //   return bufferIndex;
  // }

  /**
   * Move state to new and return object instance index
   * @returns object instance index
   */
  getNewObject() {
    if (this._activeCount >= this._capacity) {
      throw new Error('Object pool is full');
    }

    const i = this._activeCount;
    this._activeCount++;

    this._states[i] = 1;

    return i;
  }

  /**
   * Swap and pop algorithm to avoid defragmentation.
   * Removes slots with state 3 (deleted): swaps each such slot with the last active index
   * in every SoA buffer using that buffer's valuesPerElement stride, then mirrors state.
   */
  swapAndPop() {
    let i = 0;
    let activeCount = this._activeCount;
  
    while (i < activeCount) {
      if (this._states[i] === 3) {
        const lastIdx = activeCount - 1;
  
        if (i !== lastIdx) {
          for (let j = 0; j < this.countBuffers; j++) {
            const view = this.typedArrays[j];
            const stride = this.strides[j];

            const currentOffset = i * stride;
            const lastOffset = lastIdx * stride;

            // copy block of data
            const dataToMove = view.subarray(lastOffset, lastOffset + stride);
            view.set(dataToMove, currentOffset);
          }
  
          this._states[i] = this._states[lastIdx];
        }
  
        this._states[lastIdx] = 0;
        activeCount--;
      } else {
        i++;
      }
    }

    this._activeCount = activeCount;
  }

  clearObjects() {
    for (let i = 0; i < this._activeCount; i++) {
      this._states[i] = 0;
    }

    this._activeCount = 0;
  }

  /**
   * Remove refs on buffers to allow GC to collect them
   * 
   * After this method object can't be used anymore
   */
  freeMemory() {
    if (this._isDisposed) {
      return;
    }

    for (let i = 0; i < this._countBuffers; i++) {
      (this.buffers as unknown[])[i] = null;
      (this.typedArrays as unknown[])[i] = null;
    }

    (this.buffersMap as unknown) = null;
    (this.buffers as unknown) = null;
    (this.typedArrays as unknown) = null;
    (this.strides as unknown) = null;
    (this._states as unknown) = null;

    this._countBuffers = 0;
    this._activeCount = 0;

    this._isDisposed = true;
  }
}
