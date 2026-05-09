type TPossibleTypes = number[] | Uint8Array<SharedArrayBuffer> | Float32Array<SharedArrayBuffer>;
type PossibleTypes = 'number' | 'uint8' | 'float32';

interface ILinkData<T extends TPossibleTypes> {
  /**
   * Data used only CPU, not for rendering
   */
  cpuData: Readonly<T>;
  /**
   * Data used for both CPU and GPU
   */
  cpuGpuData: Readonly<T>;
  /**
   * States of objects
   */
  states: Readonly<Uint8Array>;
}

export class ObjectPool<T extends TPossibleTypes> {
  private cpuData: T;
  private cpuInstanceCount: number;

  private cpuGpuData: T;
  private cpuGpuInstanceCount: number;

  private states: Uint8Array;

  private _capacity: number;
  private _activeCount: number;

  private _refData: Readonly<ILinkData<T>>;

  constructor(capacity: number, type: PossibleTypes, cpuInstanceCount: number, cpuGpuInstanceCount: number);
  constructor(capacity: number, dataOrType: T | PossibleTypes, cpuInstanceCount: number, cpuGpuInstanceCount: number) {
    this._capacity = capacity;
    this._activeCount = 0;

    this.cpuInstanceCount = cpuInstanceCount;
    this.cpuGpuInstanceCount = cpuGpuInstanceCount;

    if (typeof dataOrType === 'string') {
      switch (dataOrType) {
        case 'number':
          this.data = new Array<number>(capacity).fill(0) as T;
          break;
        case 'uint8':
          this.data = new Uint8Array(capacity) as T;
          break;
        case 'float32':
          this.data = new Float32Array(capacity) as T;
          break;
        default:
          throw new Error(`Invalid type: ${dataOrType}`);
      }
    } else {
      this.data = dataOrType;
    }

    this.states = new Uint8Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this.states[i] = 0;
    }

    this._refData = {
      data: this.data,
      states: this.states,
    };
  }

  get activeCount(): number {
    return this._activeCount;
  }

  get refData() {
    return this._refData;
  }

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

    this.states[i] = 1;

    return this.data[i * this.dataInstanceCount];
  }

  /**
   * Swap and pop algorithm to avoid defragmentation
   */
  swapAndPop() {
    let i = 0;

    while (i < this._activeCount) {
      if (this.states[i] === 3) {
        const lastObjectIndex = this._activeCount - 1;

        if (i !== lastObjectIndex) {
          const currentDataOffset = i * this.dataInstanceCount;
          const lastDataOffset = lastObjectIndex * this.dataInstanceCount;

          // Hybrid SoA layout keeps per-object slice contiguous.
          // Swap the whole slice to keep object data consistent.
          for (let j = 0; j < this.dataInstanceCount; j++) {
            const currentValue = this.data[currentDataOffset + j];
            this.data[currentDataOffset + j] = this.data[lastDataOffset + j];
            this.data[lastDataOffset + j] = currentValue;
          }

          this.states[i] = this.states[lastObjectIndex];
        }

        this.states[lastObjectIndex] = 0;
        this._activeCount--;
      } else {
        i++;
      }
    }
  }

  /**
   * Make all objects free
   */
  clear() {
    for (let i = 0; i < this._activeCount; i++) {
      this.states[i] = 0;
    }
    this._activeCount = 0;
  }

  free() {
    (this.data as unknown) = null;
    (this.states as unknown) = null;
    this._refData = {
      data: null as unknown as T,
      states: null as unknown as Uint8Array,
    };
    (this._refData as unknown) = null;
    this._capacity = 0;
    this._activeCount = 0;
  }
}