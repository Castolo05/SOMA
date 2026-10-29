import { Link } from 'react-router-dom'
import Wordmark from '../components/Wordmark'

export default function LegalPage({
  title,
  description,
  sections,
}) {
  return (
    <div className="min-h-screen bg-[var(--theme-canvas)] px-4 py-10 text-gray-800 dark:bg-[var(--theme-canvas)] dark:text-gray-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/login" aria-label="Ir a SOMA" className="rounded-md">
            <Wordmark className="h-[16px] text-[var(--theme-wordmark)]" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-full border border-[var(--theme-border)] bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[var(--theme-inset)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)] dark:text-gray-200"
          >
            Volver a SOMA
          </Link>
        </div>

        <article className="rounded-[22px] border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-[0_1px_2px_var(--theme-shadow)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)] md:p-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">{description}</p>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{section.heading}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                  {section.text.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
