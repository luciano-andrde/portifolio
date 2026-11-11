import { useEffect, useRef, useState } from 'react'
import './styles.css'
import './preview.css'

type Theme = 'light' | 'dark'
type Phase = 'boot' | 'menu' | 'transition' | 'portfolio'
const sections = ['projetos', 'sobre', 'trajetoria', 'contato'] as const
type Section = typeof sections[number]
const labels: Record<Section, string> = { projetos: 'Projetos', sobre: 'Sobre', trajetoria: 'Trajetória', contato: 'Contato' }

function readStorage(storage: Storage, key: string) { try { return storage.getItem(key) } catch { return null } }
function writeStorage(storage: Storage, key: string, value: string) { try { storage.setItem(key, value) } catch { /* A navegação continua sem armazenamento. */ } }
function hashSection(): Section | null {
  const hash = window.location.hash.slice(1)
  return sections.find((section) => section === hash) ?? null
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => readStorage(localStorage, 'portfolio-theme') === 'dark' ? 'dark' : 'light')
  const [phase, setPhase] = useState<Phase>(() => hashSection() || readStorage(sessionStorage, 'portfolio-intro') ? 'portfolio' : 'boot')
  const [selected, setSelected] = useState(0)
  const [sound, setSound] = useState(false)
  const [scanlines, setScanlines] = useState(false)
  const [help, setHelp] = useState(false)
  const [project, setProject] = useState<number | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    writeStorage(localStorage, 'portfolio-theme', theme)
    document.documentElement.style.colorScheme = theme
  }, [theme])
  useEffect(() => {
    if (phase !== 'boot') return
    const timer = window.setTimeout(() => setPhase('menu'), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 2200)
    return () => window.clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    if (phase !== 'portfolio') return
    const target = hashSection()
    if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView())
  }, [phase])

  function beep(frequency = 440) {
    if (!sound) return
    try {
      const context = audioRef.current ?? new AudioContext()
      audioRef.current = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'square'; oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.025, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(); oscillator.stop(context.currentTime + 0.08)
    } catch { /* Áudio é um detalhe opcional. */ }
  }
  function toggleTheme() { setTheme((current) => current === 'light' ? 'dark' : 'light') }
  function enter(section: Section = sections[selected], animate = true) {
    if (phase === 'transition') return
    if (consoleRef.current) consoleRef.current.style.transform = ''
    beep(660)
    writeStorage(sessionStorage, 'portfolio-intro', 'seen')
    history.replaceState(null, '', `#${section}`)
    const screen = screenRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!animate || !screen || reduced) { setPhase('portfolio'); return }
    const rect = screen.getBoundingClientRect()
    const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height)
    const x = window.innerWidth / 2 - (rect.left + rect.width / 2)
    const y = window.innerHeight / 2 - (rect.top + rect.height / 2)
    setPhase('transition')
    screen.animate([{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${x}px, ${y}px) scale(${scale})` }], { duration: 1000, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards' }).finished.then(() => setPhase('portfolio')).catch(() => setPhase('portfolio'))
  }
  function move(direction: number) { beep(); setSelected((current) => (current + direction + sections.length) % sections.length) }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === '?' && !event.repeat) { setHelp((current) => !current); return }
      if (event.key === 'Escape' && help) { setHelp(false); return }
      if (help || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return
      if (event.key === 'Shift') { event.preventDefault(); toggleTheme(); return }
      if (phase === 'portfolio') return
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      if (event.key === 'Enter' || event.key.toLowerCase() === 'x') { event.preventDefault(); enter() }
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); move(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  function press(action: () => void) { navigator.vibrate?.(10); action() }

  return <main className="app" data-theme={theme}>
    {phase !== 'portfolio' && <div className={`intro photo-intro ${phase === 'transition' ? 'is-transitioning' : ''}`}>
      <button className="skip-intro" onClick={() => enter('projetos', false)}>Pular intro ↗</button>
      <div className="photo-stage" onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || phase === 'transition') return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - .5
        const y = (event.clientY - rect.top) / rect.height - .5
        if (consoleRef.current) consoleRef.current.style.transform = `rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`
      }} onPointerLeave={() => { if (consoleRef.current) consoleRef.current.style.transform = '' }}>
        <div ref={consoleRef} className="photo-console">
          <img className="console-image" src="/images/console-com-tela.png" alt="" />
          <div ref={screenRef} className={`screen photo-screen ${scanlines ? 'has-scanlines' : ''}`}>
            {phase === 'boot' ? <div className="boot"><span>LUCIANO<span className="boot-dot">.</span></span><small>© 2026 PORTFOLIO LAB</small></div> : <div className="screen-content"><div className="screen-status"><span>PORTFOLIO SYSTEM</span><span>▰ ▰ ▰</span></div><div className="pixel-scene" aria-hidden="true"><span className="buildings">▂▅▃▆▂</span><span className="pixel-person"><i /><b /><i /></span><span className="buildings">▃▆▂▅▃</span></div><div className="screen-name">LUCIANO ANDRADE FILHO</div><div className="screen-ribbon">PORTFÓLIO</div><div className="screen-menu" aria-label="Escolha uma seção" aria-live="polite">{sections.map((section, index) => <button key={section} className={selected === index ? 'selected' : ''} onClick={() => { setSelected(index); enter(section) }}><span aria-hidden="true">{selected === index ? '▶' : '　'}</span> {labels[section].toUpperCase()}</button>)}</div><div className="start-prompt">PRESSIONE START</div></div>}
          </div>
          <div className="console-controls">
            <button className="hit hit-up" aria-label="Selecionar item anterior" onClick={() => press(() => move(-1))} />
            <button className="hit hit-down" aria-label="Selecionar próximo item" onClick={() => press(() => move(1))} />
            <button className="hit hit-left" aria-label="Selecionar item anterior" onClick={() => press(() => move(-1))} />
            <button className="hit hit-right" aria-label="Selecionar próximo item" onClick={() => press(() => move(1))} />
            <button className="hit hit-b" aria-label="Botão B: item anterior" onClick={() => press(() => move(-1))} />
            <button className="hit hit-a" aria-label="Botão A: confirmar seleção" onClick={() => press(() => enter())} />
            <button className="hit hit-select" aria-label="SELECT: alternar tema" onClick={() => press(toggleTheme)} />
            <button className="hit hit-start" aria-label="START: confirmar seleção" onClick={() => press(() => enter())} />
          </div>
          <img className="pressed-image" src="/images/console-com-tela.png" alt="" aria-hidden="true" />
        </div>
      </div>
      <button className="controls-hint" onClick={() => setHelp(true)}>SETAS + ENTER &nbsp; · &nbsp; CONTROLES [?]</button>
    </div>}
    <div className={`portfolio ${scanlines ? 'has-scanlines' : ''}`} hidden={phase !== 'portfolio'}>
      <header className="portfolio-header"><a className="wordmark" href="#projetos">L<span>.</span>A<span>_</span></a><nav aria-label="Navegação principal">{sections.map((section) => <a key={section} href={`#${section}`}>{labels[section]}</a>)}</nav><div className="header-actions"><span className="battery" aria-label="Bateria decorativa">▰▰▰</span><button onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Desligar som' : 'Ligar som'}>{sound ? 'SOM ON' : 'SOM OFF'}</button><button onClick={() => setScanlines(!scanlines)} aria-pressed={scanlines}>SCAN</button><button onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}>◐</button><button onClick={() => window.location.assign('/')}>⏏ SAIR</button></div></header>
      <section id="projetos" className="section projects"><div className="section-kicker"><span>01 / SELECT YOUR LEVEL</span><span>▼ ROLE PARA EXPLORAR</span></div><div className="section-heading"><div><p className="eyebrow">PLAYER 01 PRESENTS</p><h2>Trabalho<br /><em>em jogo.</em></h2></div><p>Ideias saem do papel, ganham código e viram experiências. Escolha um cartucho para conhecer cada fase.</p></div><div className="project-list">{[1, 2, 3].map((number) => <article className="project-row" key={number}><span className="project-number">0{number} / 03</span><button className="cartridge" aria-expanded={project === number} onClick={() => setProject(project === number ? null : number)}><span className="cart-notch" /><span className="cart-label"><small>PORTFOLIO GAME PAK</small><strong>[TODO]<br />PROJETO {number}</strong><span>▶ PRESS TO PLAY</span></span></button><div className="project-description"><span>FASE 0{number} / [TODO: STACK]</span><h3>[TODO: nome do projeto]</h3><p>[TODO: uma descrição curta do projeto e do problema que ele resolve.]</p><button className="underlined" onClick={() => setProject(project === number ? null : number)}>{project === number ? 'FECHAR DETALHES −' : 'VER DETALHES +'}</button>{project === number && <div className="project-detail"><p><strong>O DESAFIO</strong><br />[TODO: problema e decisões tomadas.]</p><p><strong>STACK</strong><br />[TODO: tecnologias utilizadas.]</p><p>[TODO: links do projeto e repositório.]</p></div>}</div></article>)}</div></section>
      <section id="sobre" className="section about"><div className="section-kicker"><span>02 / PLAYER PROFILE</span><span>STATUS: DISPONÍVEL</span></div><div className="about-grid"><div><p className="eyebrow">UM POUCO SOBRE MIM</p><h2>Prazer,<br /><em>Luciano.</em></h2><p className="large-copy">Gosto de transformar ideias em coisas que funcionam — e de entender como elas funcionam por dentro.</p><p>[TODO: conte um pouco mais sobre você, sua área de atuação e o que gosta de construir.]</p></div><div className="status-card"><div className="status-title">PLAYER STATUS <span>✳</span></div><div className="status-avatar" aria-hidden="true"><span className="pixel-person large"><i /><b /><i /></span></div><div className="status-line"><span>NOME</span><strong>LUCIANO ANDRADE</strong></div><div className="status-line"><span>CLASSE</span><strong>DESENVOLVEDOR</strong></div><div className="status-line"><span>INVENTÁRIO</span><strong>[TODO: STACK]</strong></div><div className="status-foot">EXP. <span>▰▰▰▰▰▱▱▱</span> EM CONSTRUÇÃO</div></div></div></section>
      <section id="trajetoria" className="section journey"><div className="section-kicker"><span>03 / SAVE FILES</span><span>PROGRESSO SALVO</span></div><div className="journey-grid"><div><p className="eyebrow">ATÉ AQUI</p><h2>O caminho<br /><em>também conta.</em></h2></div><div className="save-list">{[1, 2, 3].map((item) => <div className="save" key={item}><span>0{item}</span><div><small>[TODO: DATA] &nbsp; / &nbsp; [HASH]</small><h3>[TODO: marco da trajetória]</h3><p>[TODO: uma linha sobre este momento.]</p></div><span>↗</span></div>)}</div></div></section>
      <section id="contato" className="section contact"><div className="section-kicker"><span>04 / LINK CABLE</span><span>CONEXÃO ABERTA ●</span></div><div className="contact-content"><p className="eyebrow">TEM UMA IDEIA?</p><h2>Vamos fazer<br /><em>acontecer.</em></h2><p>Uma boa conversa pode ser o começo da próxima fase.</p><div className="contact-links"><span>[TODO: E-MAIL]</span><span>[TODO: GITHUB]</span><span>[TODO: LINKEDIN]</span></div></div></section><footer><span>LUCIANO ANDRADE FILHO © 2026</span><a href="https://sketchfab.com/3d-models/nintendo-game-boy-original-1989-ad2f6be906e948f793fe722bbae5d29c">Modelo 3D “Nintendo Game Boy (Original 1989)” por Lokeig, licença CC BY-NC 4.0; texturas adaptadas.</a><button onClick={() => setHelp(true)}>CONTROLES [?]</button></footer>
    </div>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}><button className="close-help" onClick={() => setHelp(false)} aria-label="Fechar ajuda">×</button><p className="eyebrow">MANUAL DO JOGADOR</p><h2 id="help-title">Controles</h2><p><strong>SETAS</strong> Escolher seção</p><p><strong>ENTER / X</strong> Confirmar</p><p><strong>Z</strong> Voltar no menu</p><p><strong>SHIFT</strong> Alternar tema</p><p><strong>?</strong> Abrir ou fechar ajuda</p></div></div>}
  </main>
}
