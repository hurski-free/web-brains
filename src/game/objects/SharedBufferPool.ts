type TPossibleTypes = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;

interface IBufferConstructor<T extends TPossibleTypes> {
  /**
   * Can be used for find buffer in pool
   */
  name: string;

  /**
   * Number of elements in buffer
   */
  countElements: number;

  /**
   * Size of each element in bytes
   */
  bytesPerElement: number;
  typedConstructor: new (buffer: SharedArrayBuffer) => T;
}

interface ISharedBuffer {
  name: string;
  index: number;
  buffer: SharedArrayBuffer;
  countElements: number;
  bytesPerElement: number;
}

export class SharedBufferPool {
  private static buffers: ISharedBuffer[] = [];
  private static buffersMap = new Map<string, ISharedBuffer>();
  
  private static typedArrays: TPossibleTypes[] = [];
  private static typedArraysMap = new Map<string, TPossibleTypes>();

  private static _countBuffers: number;

  static createBuffer<T extends TPossibleTypes>(buf: IBufferConstructor<T>) {
    const buffer = new SharedArrayBuffer(buf.countElements * buf.bytesPerElement);
    const typedBuffer = new buf.typedConstructor(buffer);

    const bufferStruct: ISharedBuffer = {
      name: buf.name,
      index: this._countBuffers,
      buffer,
      countElements: buf.countElements,
      bytesPerElement: buf.bytesPerElement,
    };

    this.buffers.push(bufferStruct);
    this.buffersMap.set(buf.name, bufferStruct);

    this.typedArrays.push(typedBuffer);
    this.typedArraysMap.set(buf.name, typedBuffer);

    this._countBuffers++;
  }

  /**
   * Throw an error if buffer not found
   */
  static getBuffer(index: number): Readonly<ISharedBuffer>;
  static getBuffer(name: string): Readonly<ISharedBuffer>;
  static getBuffer(id: string | number) {
    if (!(typeof id === 'string' || typeof id === 'number')) {
      throw new Error('Invalid identificator, must be a string or a number');
    }

    let buffer: ISharedBuffer | undefined;

    if (typeof id === 'string') {
      buffer = this.buffersMap.get(id);
    } else {
      buffer = this.buffers[id];
    }

    if (!buffer) {
      throw new Error(`Buffer [${id}] not found`);
    }

    return buffer;
  }

  /**
   * Throw an error if typed array not found
   */
  static getTypedArray<T extends TPossibleTypes>(index: number): T;
  static getTypedArray<T extends TPossibleTypes>(name: string): T;
  static getTypedArray(id: string | number) {
    if (!(typeof id === 'string' || typeof id === 'number')) {
      throw new Error('Invalid identificator, must be a string or a number');
    }

    let typedArray: TPossibleTypes | undefined;

    if (typeof id === 'string') {
      typedArray = this.typedArraysMap.get(id);
    } else {
      typedArray = this.typedArrays[id];
    }

    if (!typedArray) {
      throw new Error(`Typed array [${id}] not found`);
    }

    return typedArray;
  }

  /**
   * Return 0 if buffer not found, 1 if cleared
   */
  static deleteBuffer(index: number): 0 | 1;
  static deleteBuffer(name: string): 0 | 1;
  static deleteBuffer(id: string | number) {
    if (!(typeof id === 'string' || typeof id === 'number')) {
      throw new Error('Invalid identificator, must be a string or a number');
    }

    let cleared: 0 | 1 = 0;

    if (typeof id === 'string') {
      const buffer = this.buffersMap.get(id);

      if (buffer) {
        this.buffersMap.delete(id);
        (this.buffers as unknown[])[buffer.index] = null;
        cleared = 1;
      }
    } else {
      const buffer = this.buffers[id];

      if (buffer) {
        this.buffersMap.delete(buffer.name);
        (this.buffers as unknown[])[buffer.index] = null;
        cleared = 1;
      }
    }

    return cleared;
  }
}

SharedBufferPool.createBuffer({
  name: 'uint8',
  countElements: 100,
  bytesPerElement: 1,
  typedConstructor: Uint8Array,
})
