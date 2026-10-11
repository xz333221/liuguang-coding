import type { StackIcon } from '../data/site'
import { stack } from '../data/site'
import { Reveal } from './ui/Reveal'

function StackLogo({ icon }: { icon: StackIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={icon.title}
      className="h-8 w-8 shrink-0 fill-muted opacity-75 transition-opacity duration-300 hover:opacity-100 md:h-9 md:w-9"
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  )
}

const mask = 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)'

/** 整页唯一一处横向跑马灯:技术栈是"很多东西、不需要逐个看"的典型内容。 */
export function TechStack() {
  return (
    <section aria-labelledby="stack-title" className="border-y border-line/70 py-14 md:py-16">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <Reveal>
          <h2 id="stack-title" className="text-xl font-medium tracking-tight md:text-2xl">
            课程里会真正用到的技术
          </h2>
          <p className="mt-3 max-w-[32em] text-sm leading-relaxed text-muted">
            不是点开就散的玩具示例，下面这些都会出现在你的结课项目里。
          </p>
        </Reveal>
      </div>

      <div className="lg-marquee relative mt-10 overflow-hidden" style={{ maskImage: mask, WebkitMaskImage: mask }}>
        <div className="lg-marquee-track flex w-max items-center gap-12 pr-12">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex items-center gap-12">
              {stack.map((icon) => (
                <li key={icon.title}>
                  <StackLogo icon={icon} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
