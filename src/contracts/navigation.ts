// Screen graph contract. Wired in Phase 2 (src/App.tsx). Tracks emit events;
// they never navigate themselves.

import type { HotspotId } from './world'

export type Screen =
  | 'farmyard'
  | 'barn'
  | 'stall'
  | 'paddock'
  | 'nest'
  | 'feedshed'
  | 'pettingzoo'
  | 'training'
  | 'summary'
  | 'dashboard'

export type ScreenParams = {
  farmyard: undefined
  barn: undefined
  stall: { stallIndex: number }
  paddock: undefined
  nest: undefined
  feedshed: undefined
  pettingzoo: undefined
  training: undefined
  summary: undefined
  dashboard: undefined
}

export interface Navigation {
  current: Screen
  go<S extends Screen>(
    screen: S,
    ...params: ScreenParams[S] extends undefined ? [] : [ScreenParams[S]]
  ): void
  back(): void
}

/** Track C's Farmyard reports this; Phase 2 maps hotspot → screen. */
export type HotspotHandler = (id: HotspotId) => void
