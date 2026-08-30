// PHASE 2 — the real screen graph.
//   farmyard ⇄ barn ⇄ stall,  nest / paddock / feedshed / farmhouse → summary
import { GameProvider, useGame } from './game/gameState'
import { FarmyardScreen } from './game/screens/FarmyardScreen'
import { BarnScreen } from './game/screens/BarnScreen'
import { StallScreen } from './game/screens/StallScreen'
import { PaddockScreen } from './game/screens/PaddockScreen'
import { NestScreen } from './game/screens/NestScreen'
import { FeedShedScreen } from './game/screens/FeedShedScreen'
import { PettingZooScreen } from './game/screens/PettingZooScreen'
import { TrainingScreen } from './game/screens/TrainingScreen'
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
    case 'pettingzoo':
      return <PettingZooScreen />
    case 'training':
      return <TrainingScreen />
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
      <div className="min-h-dvh bg-[#fbf4e6] text-stone-800 [background-image:radial-gradient(circle_at_50%_-10%,#fff8ec,transparent_55%)]">
        <Screens />
      </div>
    </GameProvider>
  )
}
