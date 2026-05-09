/**
 * states:
 * 
 * 0 - free - object is not in the game
 * 
 * 1 - new - object is new in the game, will processed in next tick
 * 
 * 2 - exist - object is in the game, processed
 * 
 * 3 - deleted - object is deleted from the game, will be removed in next tick
 */
export type TObjectState = 0 | 1 | 2 | 3;

export type TPossibleTypes = Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | Float32Array | Float64Array;