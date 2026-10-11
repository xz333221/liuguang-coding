import { voices } from '../data/site'
import { Reveal } from './ui/Reveal'

/** 学员反馈:两栏不等宽、错开竖轴,不做三张等宽卡片。文案是演示数据。 */
export function Voices() {
  const [lead, ...rest] = voices

  return (
    <section id="voices" aria-labelledby="voices-title" className="border-t border-line/70 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <Reveal>
          <h2 id="voices-title" className="text-[1.75rem] leading-[1.25] font-medium tracking-tight md:text-[2.1rem]">
            他们现在在写什么
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-7">
            <figure className="border-l-2 border-accent pl-6 md:pl-8">
              <blockquote className="text-[1.05rem] leading-[1.85] md:text-[1.18rem]">
                “{lead.quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm">
                {lead.name}
                <span className="text-muted"> / {lead.role}</span>
              </figcaption>
            </figure>
          </Reveal>

          <div className="grid gap-12 lg:col-span-4 lg:col-start-9 lg:pt-20">
            {rest.map((voice, index) => (
              <Reveal key={voice.name} delay={index * 0.06}>
                <figure>
                  <blockquote className="text-sm leading-[1.9] text-muted">“{voice.quote}”</blockquote>
                  <figcaption className="mt-4 text-[13px]">
                    {voice.name}
                    <span className="text-muted"> / {voice.role}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
