import './loading-skeleton.css'

export default function LoadingSkeleton({ variant = 'carousel' }: { variant?: 'carousel' | 'ps2' }) {
  return <div className={`loading-skeleton loading-skeleton--${variant}`} role="status" aria-label="Carregando experiência">
    <div className="loading-skeleton-shapes" aria-hidden="true">
      <span className="loading-skeleton-card loading-skeleton-side"><i /></span>
      <span className="loading-skeleton-card loading-skeleton-main"><i /></span>
      <span className="loading-skeleton-card loading-skeleton-side"><i /></span>
      <span className="loading-skeleton-console" />
    </div>
    <span className="loading-skeleton-sr">Carregando experiência</span>
  </div>
}
