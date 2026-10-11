import { learningPath } from '../data/site'
import { Reveal } from './ui/Reveal'
import { SectionHeader } from './ui/SectionHeader'

export function LearningPath() {
  return (
    <section id="path" aria-labelledby="path-title" className="border-t border-line/70 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeader
          titleId="path-title"
          title="每周都要交出点东西"
          body="节奏跟着项目走：先看清你的起点，再安排这一周你要写什么。"
        />

        <ol className="mt-12 border-l border-line pl-6 md:pl-10">
          {learningPath.map((item, index) => (
            <Reveal as="li" key={item.step} delay={index * 0.06} className="pb-10 last:pb-0">
              <h3 className="text-lg font-medium tracking-tight">{item.step}</h3>
              <p className="mt-2 max-w-[32em] text-sm leading-relaxed text-muted">{item.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
