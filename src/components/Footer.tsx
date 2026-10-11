import { footer } from '../data/site'
import { Mark } from './ui/Mark'

export function Footer() {
  return (
    <footer className="border-t border-line/70 py-14">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-12 md:px-8">
        <div className="md:col-span-6">
          <div className="flex items-center gap-2.5">
            <Mark className="h-7 w-7" />
            <span className="text-[15px] font-medium tracking-tight">流光 coding</span>
          </div>
          <p className="mt-4 max-w-[20em] text-sm leading-relaxed text-muted">{footer.tagline}</p>
        </div>

        {footer.columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="md:col-span-3">
            <p className="text-[13px] text-muted">{column.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm transition-colors hover:text-highlight">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-[1200px] border-t border-line/70 px-5 pt-6 md:px-8">
        <p className="text-xs leading-relaxed text-muted">{footer.legal}</p>
      </div>
    </footer>
  )
}
