import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const App = lazy(() => import('./App'))
const Preview3D = lazy(() => import('./Preview3D'))
const portfolioSections = ['#projetos', '#sobre', '#trajetoria', '#contato']
const showIntro = window.location.pathname === '/preview' || (window.location.pathname === '/' && !portfolioSections.includes(window.location.hash))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="preview-loading" role="status">Carregando…</div>}>
      {showIntro ? <Preview3D /> : <App />}
    </Suspense>
  </StrictMode>,
)
