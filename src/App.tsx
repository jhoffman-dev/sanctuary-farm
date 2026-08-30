// PHASE 2 — the real screen graph.
//   farmyard ⇄ barn ⇄ stall,  nest / paddock / feedshed / farmhouse → summary
import { GameProvider, useGame } from './game/gameState'
import { FarmyardScreen } from './game/screens/FarmyardScreen'
import { BarnScreen } from './game/screens/BarnScreen'
import { StallScreen } from './game/screens/StallScreen'
import { PaddockScreen } from './game/screens/PaddockScreen'
import { NestScreen } from './game/screens/NestScreen'
import { FeedShedScreen } from './game/screens/FeedShedScreen'
import { SummaryScreen } from './game/screens/SummaryScreen'
import { DashboardScreen } from './game/screens/DashboardScreen'

function Screens() {
  const { view } = useGame()
  switch (view.screen) {
    case 'farmyard':
      return <FarmyardScreen />
    case 'barn':
      return <BarnScreen />
    case 'stall':
      return <StallScreen stallIndex={view.stallIndex} />
    case 'paddock':
      return <PaddockScreen />
    case 'nest':
      return <NestScreen />
    case 'feedshed':
      return <FeedShedScreen />
    case 'summary':
      return <SummaryScreen />
    case 'dashboard':
      return <DashboardScreen />
    default:
      return <FarmyardScreen />
  }
}

export function App() {
  return (
    <GameProvider>
      <div className="min-h-dvh bg-[#f3efe4] text-stone-800">
        <Screens />
      </div>
    </GameProvider>
  )
}
