import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import LoadingSkeleton from './LoadingSkeleton'
import './styles.css'

const App = lazy(() => import('./PortfolioPlaceholder'))
const Preview3D = lazy(() => import('./Preview3D'))
const portfolioSections = ['#projetos', '#sobre', '#trajetoria', '#contato', '#ps2', '#3ds']
const showIntro = window.location.pathname === '/preview' || (window.location.pathname === '/' && !portfolioSections.includes(window.location.hash))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<LoadingSkeleton />}>
      {showIntro ? <Preview3D /> : <App />}
    </Suspense>
  </StrictMode>,
)
