import { motion, useReducedMotion } from 'motion/react'
import { EASE_OUT_EXPO } from '../lib/motion'
import { ActionLink } from './ui/Actions'
import { Photo } from './ui/Photo'

export function Hero() {
  const reduce = useReducedMotion()

  // 首屏在可视区内,用入场动效而不是滚动触发
  const enter = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: reduce ? 0 : delay, ease: EASE_OUT_EXPO },
  })

  return (
    <section id="top" aria-labelledby="hero-title" className="relative">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-5 pt-16 pb-20 md:px-8 md:pt-20 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-12 lg:gap-10 lg:pt-14 lg:pb-28">
        <div className="lg:col-span-6">
          <motion.h1
            id="hero-title"
            {...enter(0.04)}
            className="text-[2.6rem] leading-[1.1] font-medium tracking-tight sm:text-[3.1rem] lg:text-[3.5rem]"
          >
            写得出东西，
            <br />
            才算学会。
          </motion.h1>

          <motion.p {...enter(0.12)} className="mt-6 max-w-[24em] text-[15px] leading-relaxed text-muted md:text-base">
            每节课都以一个能运行的小项目收尾，
            <br />
            学完手里有代码，简历上有东西可写。
          </motion.p>

          <motion.div {...enter(0.2)} className="mt-9 flex flex-wrap items-center gap-3">
            <ActionLink href="#preview">免费开始学习</ActionLink>
            <ActionLink href="#courses" variant="ghost">
              先看课程安排
            </ActionLink>
          </motion.div>

          <motion.p {...enter(0.28)} className="mt-6 text-[13px] text-muted">
            第一门课免费，不需要绑定银行卡。
          </motion.p>
        </div>

        <motion.div {...enter(0.16)} className="lg:col-span-5 lg:col-start-8">
          <div className="relative">
            <Photo
              file="hero.jpg"
              alt="亮着的笔记本屏幕，上面是一段正在编辑的代码"
              className="aspect-4/5 w-full"
              eager
              stream
            />

            {/* 真实课程片段,不是假界面:第 1 课的开头就是这样一段 */}
            <div className="mt-5 rounded-[18px] border border-line bg-surface p-5 lg:absolute lg:-left-20 lg:bottom-[-34px] lg:mt-0 lg:w-[21rem] lg:bg-surface/95 lg:backdrop-blur-md">
              <p className="text-[13px] text-muted">第 1 课</p>
              <p className="mt-1 text-sm font-medium">把每周投入的小时数加起来</p>
              <pre className="mt-3 overflow-x-auto font-mono text-[12.5px] leading-[1.8]">
                <code>
                  <span className="text-muted"># 先照抄一遍，再改个数字看看</span>
                  {'\n'}
                  week = [1.5, 2, 0.5, 3]{'\n\n'}
                  <span className="text-highlight">def</span> total(hours):{'\n'}
                  {'    '}
                  <span className="text-highlight">return</span> sum(hours){'\n\n'}
                  print(total(week)) <span className="text-muted"># 7.0</span>
                </code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
