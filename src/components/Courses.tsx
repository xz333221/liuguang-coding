import { courses, featuredCourse } from '../data/site'
import { Photo } from './ui/Photo'
import { Reveal } from './ui/Reveal'
import { SectionHeader } from './ui/SectionHeader'

/** 主推课用大图卡片,其余四门走紧凑行,两栏宽窄不同,不做三张等宽卡片。 */
export function Courses() {
  return (
    <section id="courses" aria-labelledby="courses-title" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeader
          eyebrow="课程"
          titleId="courses-title"
          title="按交付物组织，不是按章节"
          body="每门课都先写清楚最后你会做出什么。做不到的，我们不放进来。"
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-7">
            <article className="group overflow-hidden rounded-[18px] border border-line bg-surface">
              <Photo
                file={featuredCourse.photo}
                alt={featuredCourse.photoAlt}
                className="aspect-16/10 w-full"
                imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 font-mono text-xs text-muted">
                  <span>{featuredCourse.weeks}</span>
                  <span aria-hidden="true" className="h-px w-4 bg-line-strong" />
                  <span>{featuredCourse.level}</span>
                </div>
                <h3 className="mt-4 text-xl font-medium tracking-tight md:text-2xl">{featuredCourse.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{featuredCourse.intro}</p>
                <p className="mt-6 border-t border-line pt-5 text-sm">
                  <span className="text-muted">结课交付：</span>{featuredCourse.deliverable}
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-5">
            <h3 className="text-sm text-muted">其余课程</h3>
            <ul className="mt-2 divide-y divide-line">
              {courses.map((course) => (
                <li
                  key={course.name}
                  className="-mx-3 grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1.5 rounded-[18px] px-3 py-5 transition-colors hover:bg-surface"
                >
                  <p className="text-[15px] font-medium">{course.name}</p>
                  <p className="font-mono text-xs text-muted">{course.weeks}</p>
                  <p className="col-span-2 text-[13px] leading-relaxed text-muted">
                    {course.level} · 结课交付：{course.deliverable}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
