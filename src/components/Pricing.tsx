import { Check } from '@phosphor-icons/react'
import { plans } from '../data/site'
import { ActionLink } from './ui/Actions'
import { Reveal } from './ui/Reveal'
import { SectionHeader } from './ui/SectionHeader'

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="border-t border-line/70 py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        <SectionHeader
          eyebrow="价格"
          titleId="pricing-title"
          title="两个方案，没有隐藏条款"
          body="免费版一直免费。会员随时取消，已经付过的部分按天退回。"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          {plans.map((plan, index) => (
            <Reveal
              key={plan.name}
              delay={index * 0.08}
              className={plan.emphasis ? 'lg:col-span-7' : 'lg:col-span-5'}
            >
              <article
                className={`flex h-full flex-col rounded-[18px] border p-7 md:p-9 ${
                  plan.emphasis ? 'border-accent/35 bg-accent-soft' : 'border-line bg-surface'
                }`}
              >
                <p className="text-sm text-muted">{plan.name}</p>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="font-mono text-[2.1rem] leading-none font-medium">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{plan.note}</p>

                <ul className="mt-7 grid gap-3 text-sm">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check size={16} className="mt-1 shrink-0 text-highlight" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <ActionLink
                    href="#preview"
                    variant={plan.emphasis ? 'primary' : 'ghost'}
                    className="w-full sm:w-auto"
                  >
                    {plan.cta}
                  </ActionLink>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
