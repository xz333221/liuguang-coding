import { CircleNotch } from '@phosphor-icons/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { previewRequest } from '../data/site'
import { ActionButton } from './ui/Actions'
import { Reveal } from './ui/Reveal'

type Status = 'idle' | 'invalid' | 'sending' | 'done'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** 收尾区:右侧是唯一一个真实可交互的表单,顺便把空/错误/加载/成功四种状态都做全。 */
export function PreviewRequest() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const invalid = status === 'invalid'
  const sending = status === 'sending'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    if (!EMAIL.test(email.trim())) {
      setStatus('invalid')
      return
    }

    setStatus('sending')
    // 演示站点没有后端:这里只走一遍请求状态。接上接口后换成真实请求。
    await new Promise((resolve) => setTimeout(resolve, 900))
    setStatus('done')
  }

  return (
    <section id="preview" aria-labelledby="preview-title" className="border-t border-line/70 py-20 md:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:px-8 lg:grid-cols-12 lg:items-start lg:gap-8">
        <Reveal className="lg:col-span-6">
          <h2
            id="preview-title"
            className="text-[1.75rem] leading-[1.25] font-medium tracking-tight md:text-[2.1rem]"
          >
            {previewRequest.headline}
          </h2>
          <p className="mt-4 max-w-[26em] text-[15px] leading-relaxed text-muted">{previewRequest.body}</p>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-5 lg:col-start-8">
          {status === 'done' ? (
            <p
              role="status"
              className="rounded-[18px] border border-accent/35 bg-accent-soft p-6 text-sm leading-relaxed"
            >
              {previewRequest.success}
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[18px] border border-line bg-surface p-6 md:p-7"
            >
              <label htmlFor="preview-email" className="block text-sm font-medium">
                {previewRequest.label}
              </label>
              <p id="preview-email-hint" className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                {previewRequest.hint}
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  id="preview-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  disabled={previewRequest.soldOut}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (invalid) setStatus('idle')
                  }}
                  placeholder={previewRequest.placeholder}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? 'preview-email-error' : 'preview-email-hint'}
                  className={`w-full rounded-full border bg-canvas px-5 py-3 text-sm text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60 ${
                    invalid ? 'border-highlight' : 'border-line'
                  }`}
                />
                <ActionButton
                  type="submit"
                  disabled={sending || previewRequest.soldOut}
                  className="shrink-0"
                >
                  {sending ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" />
                      发送中
                    </>
                  ) : (
                    previewRequest.submit
                  )}
                </ActionButton>
              </div>

              {invalid ? (
                <p id="preview-email-error" className="mt-3 text-[13px] leading-relaxed text-highlight">
                  这个邮箱地址看起来不对，检查一下再提交。
                </p>
              ) : null}
            </form>
          )}
        </Reveal>
      </div>
    </section>
  )
}
