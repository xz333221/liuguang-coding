import { reasons } from '../data/site'
import { Photo } from './ui/Photo'
import { Reveal } from './ui/Reveal'
import { SectionHeader } from './ui/SectionHeader'

// 基础几何只留一次;底色和边框由每个格子自己指定,避免同类 utility 互相覆盖
const cellBase = 'flex h-full flex-col rounded-[18px] border'
const cellPlain = `${cellBase} justify-center border-line bg-surface p-6 md:p-7`

/** 差异点用 bento 网格铺开:格子大小、底色、有没有图都不一样,免得一片同色卡片排排站。 */
export function Why() {
  const [output, review, timeless, privateProgress, chinese] = reasons

  return (
    <section id="why" aria-labelledby="why-title" className="border-t border-line/70 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeader
          titleId="why-title"
          title="我们只做这几件事"
          body="学习平台很容易越堆越重：排行榜、打卡、成就徽章。它们占用的课时我们舍不得花，所以先不做。"
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* 每节课都有产出:带真实照片的大格 */}
          <Reveal className="md:col-span-2 lg:col-span-4">
            <article className={`${cellBase} overflow-hidden border-line bg-surface`}>
              <Photo
                file="desk.jpg"
                alt="摊开在桌上的笔记本和笔记，屏幕上是编辑器"
                radiusClass="rounded-none"
                className="h-44 w-full shrink-0 md:h-56"
              />
              <div className="p-6 md:p-7">
                <h3 className="text-lg font-medium tracking-tight">{output.title}</h3>
                <p className="mt-2 max-w-[30em] text-sm leading-relaxed text-muted">{output.body}</p>
              </div>
            </article>
          </Reveal>

          {/* 进度只对自己可见:强调色浅浅铺一层,字在格子里居中 */}
          <Reveal delay={0.06} className="lg:col-span-2">
            <article className={`${cellBase} justify-center border-accent/35 bg-accent-soft p-6 md:p-7`}>
              <h3 className="text-lg font-medium tracking-tight">{privateProgress.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{privateProgress.body}</p>
            </article>
          </Reveal>

          {/* 有人看代码:照片铺底,底部用背景色渐变压住,保证文字对比度 */}
          <Reveal delay={0.1} className="lg:col-span-2">
            <article className="relative flex h-full min-h-[240px] flex-col justify-end overflow-hidden rounded-[18px] border border-line">
              <Photo
                file="people.jpg"
                alt="两个人对着笔记本电脑在讨论一段代码"
                radiusClass="rounded-none"
                className="absolute inset-0 h-full w-full"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-canvas via-canvas/65 to-transparent"
              />
              <div className="relative p-6 md:p-7">
                <h3 className="text-lg font-medium tracking-tight">{review.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
              </div>
            </article>
          </Reveal>

          {/* 只教五年后还成立的东西:点阵底纹 */}
          <Reveal delay={0.14} className="lg:col-span-2">
            <article className={`${cellPlain} min-h-[200px] lg-dots`}>
              <h3 className="text-lg font-medium tracking-tight">{timeless.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{timeless.body}</p>
            </article>
          </Reveal>

          {/* 全站中文讲解:留白格 */}
          <Reveal delay={0.18} className="lg:col-span-2">
            <article className={`${cellPlain} min-h-[200px]`}>
              <h3 className="text-lg font-medium tracking-tight">{chinese.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{chinese.body}</p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
