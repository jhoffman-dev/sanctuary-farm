import { MAX_DPR } from './quality-settings'

/** The camera and sky every view of the farm shares: the game's scene and the world editor's. */
export const SKY = '#bfe3f5'
export const FOV = 35
/** The world editor's pixel ratio: the budget's cap, as the game's high tier draws. */
export const DPR_RANGE: [number, number] = [1, MAX_DPR]
