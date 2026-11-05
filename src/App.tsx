import { useEffect, useRef, useState } from 'react'
import styles from './Portfolio.module.css'

type Theme = 'light' | 'dark'
type Language = 'pt' | 'en'

const copy = {
  pt: {
    skip: 'Pular para o conteúdo', portfolio: 'portfólio', nav: ['Trabalhos', 'Formação', 'Experiência', 'Sobre', 'Contato'], navLabel: 'Navegação principal',
    topline: ['Caderno de trabalho · interfaces', 'Anotações em processo'], heroNote: 'Interfaces como ponto de encontro entre lógica e linguagem visual.', enter: 'Entrar no arquivo', status: 'Portfólio em construção', linkedin: 'Perfil profissional', cv: 'Currículo', cvSoon: 'PDF em breve',
    workEyebrow: 'Arquivo de projetos', workTitle: <>Ideias em<br />forma de interface</>, workNote: 'Uma seleção de projetos, experimentos e coisas que estou construindo.', open: 'Abrir ficha', projectSheet: 'Ficha de projeto', close: 'Fechar ficha', note: 'Anotação', projectLater: 'Os detalhes deste projeto serão adicionados aqui.', visit: 'Visitar o site', facts: ['Contexto', 'Minha participação', 'Decisões técnicas', 'Resultado'], soon: 'Em breve',
    study: 'Caderno de estudos', education: <>Formação<br />acadêmica</>, ongoing: 'Em andamento', degree: 'Bacharelado em Engenharia da Computação', institution: 'Centro Universitário Fundação Santo André', studyPeriod: 'jan. de 2023 – dez. de 2027', workPages: 'Páginas de trabalho', experience: <>Experiência<br />profissional</>, company: 'Empresa',
    about: 'Sobre', aboutTitle: <>Rigor no código.<br /><em>Intenção na forma.</em></>, about1: 'Sou estudante de Engenharia da Computação e exploro desenvolvimento front-end, design de interfaces e interatividade.', about2: 'Me interessa aproximar lógica e linguagem visual para criar experiências digitais claras, úteis e acessíveis.', focus: 'Áreas de interesse', contact: 'Contato', contactTitle: <>Uma boa conversa<br />também é um começo</>, findMe: 'Me encontre no LinkedIn', made: 'Feito com atenção ao detalhe.', top: 'Voltar ao topo', topLabel: 'Voltar ao início',
  },
  en: {
    skip: 'Skip to content', portfolio: 'portfolio', nav: ['Work', 'Education', 'Experience', 'About', 'Contact'], navLabel: 'Main navigation',
    topline: ['Working notebook · interfaces', 'Notes in progress'], heroNote: 'Interfaces as a meeting point between logic and visual language.', enter: 'Explore the work', status: 'Portfolio in progress', linkedin: 'Professional profile', cv: 'Résumé', cvSoon: 'PDF coming soon',
    workEyebrow: 'Project archive', workTitle: <>Ideas in<br />interface form</>, workNote: 'A selection of projects, experiments, and things I am building.', open: 'Open project', projectSheet: 'Project notes', close: 'Close project notes', note: 'Notes', projectLater: 'Details for this project will be added here.', visit: 'Visit the website', facts: ['Context', 'My contribution', 'Technical decisions', 'Outcome'], soon: 'Coming soon',
    study: 'Study notes', education: <>Academic<br />background</>, ongoing: 'In progress', degree: 'Bachelor of Engineering (B.E.), Computer Engineering', institution: 'Centro Universitário Fundação Santo André', studyPeriod: 'Jan 2023 – Dec 2027', workPages: 'Work history', experience: <>Professional<br />experience</>, company: 'Company',
    about: 'About', aboutTitle: <>Rigor in code.<br /><em>Intention in form.</em></>, about1: 'I am a Computer Engineering student exploring front-end development, interface design, and interactivity.', about2: 'I am interested in bringing logic and visual language together to create clear, useful, and accessible digital experiences.', focus: 'Areas of interest', contact: 'Contact', contactTitle: <>A good conversation<br />is a good beginning</>, findMe: 'Find me on LinkedIn', made: 'Made with attention to detail.', top: 'Back to top', topLabel: 'Back to top',
  },
} as const

const experienceCopy = {
  pt: {
    supergeeks: { role: 'Instrutor', relation: 'Estágio', period: 'jan. de 2024 – dez. de 2025 · 2 anos', location: 'São Caetano do Sul, São Paulo, Brasil · No local', description: ['Como instrutor de tecnologia na SuperGeeks, ensino programação de jogos e desenvolvimento web para crianças e adolescentes. Minha abordagem combina prática e criatividade. Além de código, desenvolvo habilidades de raciocínio lógico, resolução de problemas e trabalho em equipe.', 'Minha principal missão é desmistificar a tecnologia, traduzindo conceitos complexos em conteúdos claros, acessíveis e envolventes. Para isso, conduzo os alunos por projetos práticos em um ecossistema diverso de ferramentas, incluindo engines como Unity 6 (C#), Unreal Engine 4 (Blueprints), Godot 4 (GDScript) e a plataforma Roblox (Lua), além de tecnologias web como HTML5, CSS3, JavaScript, React e Electron.'] },
    fap: { role: 'Desenvolvedor de software júnior', relation: 'Autônomo', location: 'São Caetano do Sul, São Paulo, Brasil · Híbrido', description: [] },
  },
  en: {
    supergeeks: { role: 'Instructor', relation: 'Internship', period: 'Jan 2024 – Dec 2025 · 2 years', location: 'São Caetano do Sul, São Paulo, Brazil · On-site', description: ['As a technology instructor at SuperGeeks, I teach game programming and web development to children and teenagers. My approach combines hands-on practice and creativity. I focus on code but also develop skills in logical reasoning, problem-solving, and teamwork.', 'My primary mission is to demystify technology by translating complex concepts into clear, accessible, and engaging content. To do this, I guide students through hands-on projects within a diverse ecosystem of tools, which includes engines like Unity 6 (C#), Unreal Engine 4 (Blueprints), Godot 4 (GDScript), and the popular Roblox platform (Lua), as well as web development technologies such as HTML5, CSS3, JavaScript, React, and Electron.'] },
    fap: { role: 'Junior Software Developer', relation: 'Independent contractor', location: 'São Caetano do Sul, São Paulo, Brazil · Hybrid', description: [] },
  },
}

const projects = [
  { id: 'norte', name: 'Norte', image: '/images/norte-logo.png' },
  { id: 'nexo', name: 'Nexo', image: null },
  { id: 'braille', name: 'Linha de Braille', image: null },
  { id: 'cantina', name: 'Cantina NutriAmor', image: '/images/nutriamor-logo.png', note: 'Site de autoria própria.', url: 'https://www.cantinanutriamor.com.br/' },
]

const employers = [
  { id: 'supergeeks', name: 'SuperGeeks' },
  { id: 'fap', name: 'FAP Online' },
]

function EmployerMark({ id }: { id: string }) {
  return <span className={`${styles.employerMarkFrame} ${id === 'supergeeks' ? styles.supergeeksFrame : ''}`} aria-hidden="true">
    <img
      className={`${styles.employerMark} ${id === 'supergeeks' ? styles.supergeeksMark : styles.fapMark}`}
      src={id === 'supergeeks' ? '/images/super.jpg' : '/images/fap.jpeg'}
      alt=""
      loading="lazy"
      decoding="async"
    />
  </span>
}

function ProjectArtwork({ id, name, language, image }: { id: string; name: string; language: Language; image: string | null }) {
  return (
    <div className={styles.projectArtwork} data-art={id} aria-label={`${language === 'pt' ? 'Ilustração abstrata de' : 'Abstract illustration of'} ${name}`} role="img">
      <span className={styles.artIndex} aria-hidden="true">LA / {id}</span>
      {image
        ? <div className={styles.projectImageFrame} data-image={id}><img src={image} alt="" className={styles.projectImage} loading="lazy" decoding="async" /></div>
        : <svg className={styles.projectGraphic} viewBox="0 0 640 410" fill="none" aria-hidden="true">
        {id === 'norte' && <>
          <circle className={styles.artRing} cx="320" cy="205" r="137" />
          <path className={styles.artFill} d="m320 89 32 84 84 32-84 32-32 84-32-84-84-32 84-32 32-84Z" />
          <circle className={styles.artCore} cx="320" cy="205" r="12" />
          <path className={styles.artLine} d="M320 47v36m0 244v36M162 205h36m244 0h36" />
        </>}
        {id === 'nexo' && <>
          <circle className={styles.artRing} cx="267" cy="205" r="92" />
          <circle className={styles.artFill} cx="373" cy="205" r="92" />
          <path className={styles.artLine} d="M267 113c48 0 106 41 106 92s-58 92-106 92m106-184c-48 0-106 41-106 92s58 92 106 92" />
        </>}
        {id === 'braille' && Array.from({ length: 18 }, (_, index) => {
          const cell = Math.floor(index / 6)
          const dot = index % 6
          return <circle className={styles.artDot} key={index} cx={188 + cell * 132 + (dot % 2) * 34} cy={142 + Math.floor(dot / 2) * 64} r="11" />
        })}
        {id === 'cantina' && <>
          <circle className={styles.artRing} cx="320" cy="205" r="126" />
          <circle className={styles.artLine} cx="320" cy="205" r="91" />
          <path className={styles.artFill} d="M320 260c-4-37 20-70 71-82-3 43-25 72-71 82Zm-8-9c2-32-19-55-55-63 0 34 19 56 55 63Z" />
          <path className={styles.artLine} d="M313 258c19-25 38-44 67-63m-67 63-42-50" />
        </>}
        </svg>}
      <span className={styles.artCaption} aria-hidden="true">{language === 'pt' ? 'Estudo visual' : 'Visual study'} · {name}</span>
    </div>
  )
}

function ThemeControl({ theme, onToggle, language }: { theme: Theme; onToggle: () => void; language: Language }) {
  const label = language === 'pt' ? (theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro') : (theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme')
  return (
    <button
      className={styles.themeToggle}
      type="button"
      onClick={onToggle}
      aria-pressed={theme === 'dark'}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {theme === 'light'
          ? <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2m0 15v2M4.5 12h-2m19 0h-2m-13.8-5.3L4.3 5.3m15.4 13.4-1.4-1.4m0-10.6 1.4-1.4M4.3 18.7l1.4-1.4" /></>
          : <path d="M19.2 15.5A8 8 0 0 1 8.5 4.8 8.1 8.1 0 1 0 19.2 15.5Z" />}
      </svg>
    </button>
  )
}

function formatCurrentRolePeriod(language: Language) {
  const startYear = 2026
  const startMonth = 3
  const now = new Date()
  const elapsedMonths = Math.max(1, (now.getFullYear() - startYear) * 12 + now.getMonth() - startMonth + 1)
  const years = Math.floor(elapsedMonths / 12)
  const months = elapsedMonths % 12
  const tenure = language === 'pt'
    ? [years ? `${years} ${years === 1 ? 'ano' : 'anos'}` : '', months ? `${months} ${months === 1 ? 'mês' : 'meses'}` : ''].filter(Boolean).join(' e ')
    : [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', months ? `${months} ${months === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(', ')
  const start = new Intl.DateTimeFormat(language === 'pt' ? 'pt-BR' : 'en', { month: 'short', year: 'numeric' }).format(new Date(startYear, startMonth, 1))

  return language === 'pt' ? `${start} – o momento · ${tenure}` : `${start} – Present · ${tenure}`
}

export default function App() {
  const [activeProject, setActiveProject] = useState<(typeof projects)[number] | null>(null)
  const projectDialog = useRef<HTMLDialogElement>(null)
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('portfolio-language') === 'en' ? 'en' : 'pt' } catch { return 'pt' }
  })
  const t = copy[language]
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('portfolio-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* O tema continua funcional sem armazenamento local. */ }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#11110f' : '#f8f5ec')
    try { localStorage.setItem('portfolio-theme', theme) } catch { /* O tema continua funcional nesta visita. */ }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en'
    document.title = language === 'pt' ? 'Luciano Andrade — Portfólio' : 'Luciano Andrade — Portfolio'
    document.querySelector('meta[name="description"]')?.setAttribute('content', language === 'pt' ? 'Portfólio pessoal de Luciano Andrade.' : 'Personal portfolio of Luciano Andrade.')
    try { localStorage.setItem('portfolio-language', language) } catch { /* A escolha continua ativa nesta visita. */ }
  }, [language])

  useEffect(() => {
    const dialog = projectDialog.current
    if (!dialog) return
    if (activeProject && !dialog.open) dialog.showModal()
    if (!activeProject && dialog.open) dialog.close()
  }, [activeProject])

  const toggleTheme = () => setTheme((current) => current === 'light' ? 'dark' : 'light')
  const toggleLanguage = () => setLanguage((current) => current === 'pt' ? 'en' : 'pt')

  if (theme === 'dark') {
    return (
      <main className={styles.darkCanvas}>
        <ThemeControl theme={theme} onToggle={toggleTheme} language={language} />
        <h1 className={styles.darkName}><span>Luciano</span><span>Andrade<i>.</i></span></h1>
      </main>
    )
  }

  return (
    <div className={styles.lightPage}>
      <a className={styles.skipLink} href="#conteudo">{t.skip}</a>
      <header className={styles.header}>
        <a className={styles.wordmark} href="#inicio">Luciano Andrade<span> / {t.portfolio}</span></a>
        <nav className={styles.navigation} aria-label={t.navLabel}>
          {t.nav.map((label, index) => <a key={label} href={['#trabalhos', '#formacao', '#experiencia', '#sobre', '#contato'][index]}>{label}</a>)}
        </nav>
        <button className={styles.languageToggle} type="button" onClick={toggleLanguage} aria-label={language === 'pt' ? 'Switch language to English' : 'Mudar idioma para português'} aria-pressed={language === 'en'}>{language === 'pt' ? 'PT' : 'EN'}</button>
        <ThemeControl theme={theme} onToggle={toggleTheme} language={language} />
      </header>

      <main id="conteudo">
        <section className={styles.hero} id="inicio" aria-labelledby="hero-title">
          <div className={styles.heroTopline}><span>{t.topline[0]}</span><span>{t.topline[1]}</span></div>
          <div className={styles.heroMain}>
            <h1 className={styles.name} id="hero-title"><span>Luciano</span><span>Andrade<i>.</i></span></h1>
            <div className={styles.heroNote}>
              <p>{t.heroNote}</p>
              <a className={styles.primaryLink} href="#trabalhos">{t.enter} <span aria-hidden="true">↘</span></a>
            </div>
          </div>
          <div className={styles.heroBottom}>
            <span className={styles.heroSignal}><i aria-hidden="true" /> {t.status}</span>
            <div className={styles.heroLinks} aria-label={language === 'pt' ? 'Links profissionais' : 'Professional links'}>
              <a href="https://www.linkedin.com/in/luciano-andrade-filho/" target="_blank" rel="noopener noreferrer">
                <svg className={styles.heroLinkIcon} viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><circle cx="8" cy="8.2" r=".8" /><path d="M8 11.2v5.4m3.5 0v-5.4m0 2.2c0-2.5 4.8-2.6 4.8.2v3.2" /></svg>
                <span>LinkedIn</span><small>{t.linkedin}</small><i aria-hidden="true">↗</i>
              </a>
              <span className={styles.cvPlaceholder}>
                <svg className={styles.heroLinkIcon} viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h7l4.2 4.2v12.8H6.5zM13.5 3.8v4.1h4.1m-8 4h5m-5 3h5m-5 3c1.2-.8 2.2-.8 3 0" /></svg>
                <span>{t.cv}</span><small>{t.cvSoon}</small>
              </span>
            </div>
          </div>
          <span className={styles.heroGlyph} aria-hidden="true">↘</span>
        </section>

        <section className={styles.workSection} id="trabalhos" aria-labelledby="work-title">
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>{t.workEyebrow}</p>
            <h2 id="work-title">{t.workTitle}<span>↘</span></h2>
            <p className={styles.sectionNote}>{t.workNote}</p>
          </div>
          <div className={styles.projectGrid}>
            {projects.map((project) => <article className={styles.projectCard} data-project={project.id} key={project.id}>
              <button className={styles.projectTrigger} type="button" onClick={() => setActiveProject(project)} aria-haspopup="dialog" aria-controls="project-dialog">
                <ProjectArtwork id={project.id} name={project.name} language={language} image={project.image} />
                <span className={styles.projectInfo}>
                  <span className={styles.projectTitle}>{project.name}</span>
                  <span className={styles.openNote}>{t.open} ↗</span>
                </span>
              </button>
            </article>)}
          </div>
        </section>

        <dialog
          className={styles.projectDialog}
          id="project-dialog"
          ref={projectDialog}
          aria-labelledby="dialog-title"
          onClose={() => setActiveProject(null)}
          onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}
        >
          {activeProject && <div className={styles.dialogPage}>
            <div className={styles.dialogHeader}>
              <span className={styles.sectionEyebrow}>{t.projectSheet}</span>
              <button className={styles.dialogClose} type="button" onClick={() => projectDialog.current?.close()} aria-label={t.close}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.2 7.4 9.6 9.2m.1-9.1-9.4 9.3" /></svg>
              </button>
            </div>
            <div className={styles.dialogBody}>
              <ProjectArtwork id={activeProject.id} name={activeProject.name} language={language} image={activeProject.image} />
              <div className={styles.dialogCopy}>
                <span className={styles.dialogMarginNote}>{t.note}</span>
                <h2 id="dialog-title">{activeProject.name}</h2>
                <p>{activeProject.id === 'cantina' ? language === 'pt' ? activeProject.note : 'A website created by me.' : activeProject.note ?? t.projectLater}</p>
                {activeProject.url && <a className={styles.projectLink} href={activeProject.url} target="_blank" rel="noopener noreferrer">{t.visit} <span aria-hidden="true">↗</span></a>}
                <dl className={styles.projectFacts}>
                  {t.facts.map((fact) => <div key={fact}><dt>{fact}</dt><dd>{t.soon}</dd></div>)}
                </dl>
              </div>
            </div>
          </div>}
        </dialog>

        <section className={styles.pathSection} id="formacao" aria-labelledby="education-title">
          <div className={styles.pathHeading}>
            <p className={styles.sectionEyebrow}>{t.study}</p>
            <h2 id="education-title">{t.education}<span>↘</span></h2>
          </div>
          <div className={styles.pathGrid}>
            <article className={styles.pathPage}>
              <span className={styles.universityMark} aria-hidden="true">FSA</span>
              <div className={styles.studyDetails}>
                <h3>{t.institution}</h3>
                <p>{t.degree}</p>
                <span>{t.studyPeriod}</span>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.experienceSection} id="experiencia" aria-labelledby="experience-title">
          <div className={styles.pathHeading}>
            <p className={styles.sectionEyebrow}>{t.workPages}</p>
            <h2 id="experience-title">{t.experience}<span>↘</span></h2>
          </div>
          <div className={styles.experienceList}>
            {employers.map((employer) => {
              const details = experienceCopy[language][employer.id as 'supergeeks' | 'fap']
              return <article className={styles.experiencePage} key={employer.id}>
              <EmployerMark id={employer.id} />
              <div className={styles.experienceDetails}>
                <span className={styles.pathEntryLabel}>{t.company}</span>
                <h3>{details.role}</h3>
                <p className={styles.experienceMeta}>{employer.name} · {details.relation}</p>
                <p className={styles.experienceMeta}>{'period' in details ? details.period : formatCurrentRolePeriod(language)}</p>
                <p className={styles.experienceMeta}>{details.location}</p>
                {details.description.map((paragraph) => <p className={styles.experienceDescription} key={paragraph}>{paragraph}</p>)}
              </div>
              <span className={styles.experiencePencil} aria-hidden="true">✎</span>
            </article>
            })}
          </div>
        </section>

        <section className={styles.aboutSection} id="sobre" aria-labelledby="about-title">
          <p className={styles.sectionEyebrow}>{t.about}</p>
          <h2 id="about-title">{t.aboutTitle}</h2>
          <div className={styles.aboutBody}>
            <p>{t.about1}</p>
            <p>{t.about2}</p>
          </div>
          <div className={styles.focusLine} aria-label={t.focus}><span>Front-end</span><span>{language === 'pt' ? 'Design de interfaces' : 'Interface design'}</span><span>{language === 'pt' ? 'Engenharia de software' : 'Software engineering'}</span></div>
        </section>

        <footer className={styles.footer} id="contato">
          <div className={styles.footerLead}>
            <p className={styles.sectionEyebrow}>{t.contact}</p>
            <h2>{t.contactTitle}<span>.</span></h2>
            <a href="https://www.linkedin.com/in/luciano-andrade-filho/" target="_blank" rel="noopener noreferrer">{t.findMe} <span aria-hidden="true">↗</span></a>
          </div>
          <div className={styles.footerBottom}>
            <a href="#inicio">Luciano Andrade</a>
            <span>{t.made}</span>
            <a href="#inicio" aria-label={t.topLabel}>{t.top} ↑</a>
          </div>
        </footer>
      </main>
    </div>
  )
}
