import './portfolio-placeholder.css'

export default function PortfolioPlaceholder() {
  let dark = false
  try { dark = localStorage.getItem('portfolio-theme') === 'dark' } catch { /* Usa o tema claro. */ }

  const playStation = window.location.hash === '#ps2'
  const threeDS = window.location.hash === '#3ds'

  return <main className="portfolio-placeholder" data-theme={dark ? 'dark' : 'light'} data-experience={playStation ? 'ps2' : threeDS ? '3ds' : 'gameboy'}>
    <a className="placeholder-home" href="/">← VOLTAR AO INÍCIO</a>
    <h1>Luciano<br />Andrade<br />Filho</h1>
  </main>
}
