import { useEffect, useState } from 'react'
import styles from './Portfolio.module.css'

type Theme = 'light' | 'dark'

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('portfolio-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch { /* O tema continua funcional sem armazenamento local. */ }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#11110f' : '#eae9e4')
    try { localStorage.setItem('portfolio-theme', theme) } catch { /* O tema continua funcional nesta visita. */ }
  }, [theme])

  return (
    <main className={styles.canvas} data-theme={theme}>
      <button
        className={styles.themeToggle}
        type="button"
        onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        aria-label={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}
        title={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}
      >
        <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
      </button>
      <h1 className={styles.name}>Luciano<br />Andrade<span>.</span></h1>
    </main>
  )
}
