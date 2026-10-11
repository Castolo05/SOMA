import { Link } from 'react-router-dom'

export default function LegalPage({
  title,
  description,
  sections,
}) {
  return (
    <div className="min-h-screen bg-[#f5eee9] px-4 py-10 text-gray-800 dark:bg-[var(--theme-canvas)] dark:text-gray-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#c8b3b0] bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-slate-50 dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)] dark:text-gray-200"
          >
            ← Volver a SOMA
          </Link>
        </div>

        <article className="rounded-[28px] border border-[#c8b3b0] bg-[#fffaf8] p-6 shadow-[0_18px_60px_rgba(90,75,75,0.08)] dark:border-[var(--theme-border)] dark:bg-[var(--theme-surface)] md:p-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-sage-600 dark:text-sage-400">
            Información legal
          </p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
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
