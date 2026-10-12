import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ArticleContext, ChatMessage, ChatSettings } from '../../lib/chat'
import {
  buildMessages,
  isConfigured,
  loadSettings,
  saveSettings,
  streamChat,
} from '../../lib/chat'

const SUGGESTIONS = ['用一句话总结这篇', '给我一个最小可运行的例子', '这里最容易搞错的是什么']

function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false, gfm: true, breaks: true }) as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}

function loadMessages(key: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  const html = useMemo(
    () => (message.role === 'assistant' ? renderMarkdown(message.content) : ''),
    [message.content, message.role],
  )

  if (message.role === 'user') {
    return <p className="lg-chat-user">{message.content}</p>
  }

  if (!message.content && streaming) {
    return (
      <p className="lg-chat-typing" aria-label="正在回答">
        <span />
        <span />
        <span />
      </p>
    )
  }

  return <div className="lg-chat-md" dangerouslySetInnerHTML={{ __html: html }} />
}

/**
 * 知识库问答面板。
 * 常驻在右下角:关着的时候是一颗按钮,打开是从右侧滑出的窄栏(移动端整屏)。
 * 文章作为"附件"跟着问题一起发出去,片子上有个叉可以摘掉,和 zen-gitsync 的文件空间一个意思。
 */
export function ChatPanel({ article }: { article: ArticleContext | null }) {
  const logKey = article ? `lg-chat-log:${article.id}` : 'lg-chat-log:general'

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('lg-chat-open') === '1'
    } catch {
      return false
    }
  })
  const [view, setView] = useState<'chat' | 'settings'>('chat')
  const [settings, setSettings] = useState<ChatSettings>(loadSettings)
  const [draft, setDraft] = useState<ChatSettings>(loadSettings)
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(logKey))
  const [input, setInput] = useState('')
  const [attached, setAttached] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const configured = isConfigured(settings)

  // 打开/关闭状态记在本机,翻页回来还是开着
  useEffect(() => {
    try {
      localStorage.setItem('lg-chat-open', open ? '1' : '0')
    } catch {
      // 忽略
    }
  }, [open])

  // 别的组件(页头按钮、文章里的「问这篇」)用事件打开面板
  useEffect(() => {
    const openPanel = () => {
      setOpen(true)
      setView('chat')
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (view === 'settings') setView('chat')
      else setOpen(false)
    }
    document.addEventListener('lg-chat:open', openPanel)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('lg-chat:open', openPanel)
      document.removeEventListener('keydown', onKey)
    }
  }, [view])

  // 每篇对话存本地,最多留 40 条
  useEffect(() => {
    try {
      localStorage.setItem(logKey, JSON.stringify(messages.slice(-40)))
    } catch {
      // 忽略
    }
  }, [logKey, messages])

  // 回答时贴着底部
  useEffect(() => {
    const list = listRef.current
    if (list && open) list.scrollTop = list.scrollHeight
  }, [messages, open, streaming])

  async function send(question: string) {
    const text = question.trim()
    if (!text || streaming) return

    if (!configured) {
      setDraft(settings)
      setView('settings')
      setError('先填一下接口（或代理）和模型名。')
      return
    }

    setError('')
    setInput('')
    const history = messages
    setMessages([...history, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat({
        settings,
        messages: buildMessages(attached ? article : null, history, text),
        signal: controller.signal,
        onDelta: (chunk) => {
          setMessages((current) => {
            const copy = [...current]
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: last.content + chunk }
            }
            return copy
          })
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message) setError(message)
      setMessages((current) =>
        current.filter(
          (item, index) =>
            !(index === current.length - 1 && item.role === 'assistant' && item.content === ''),
        ),
      )
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const chipTitle = article?.title ?? '整站（没有选定文章）'

  return (
    <>
      <button
        type="button"
        className="lg-chat-fab"
        data-open={open}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="lg-chat-dock"
      >
        {open ? '收起问答' : '问一问'}
      </button>

      <aside
        id="lg-chat-dock"
        className="lg-chat-dock"
        data-open={open}
        aria-label="知识库问答"
        inert={!open}
      >
        <header className="lg-chat-head">
          <div className="min-w-0">
            <p className="lg-chat-title">问答</p>
            <p className="lg-chat-sub">{article ? '当前文章已带上' : '可以问知识库里的任何内容'}</p>
          </div>
          <div className="lg-chat-head-actions">
            {view === 'chat' ? (
              <>
                <button
                  type="button"
                  className="lg-chat-ghost"
                  onClick={() => {
                    setDraft(settings)
                    setView('settings')
                  }}
                >
                  设置
                </button>
                <button
                  type="button"
                  className="lg-chat-ghost"
                  onClick={() => {
                    setMessages([])
                    setError('')
                  }}
                  disabled={messages.length === 0}
                >
                  清空
                </button>
              </>
            ) : (
              <button type="button" className="lg-chat-ghost" onClick={() => setView('chat')}>
                返回
              </button>
            )}
            <button type="button" className="lg-chat-ghost" onClick={() => setOpen(false)}>
              关闭
            </button>
          </div>
        </header>

        {view === 'settings' ? (
          <form
            className="lg-chat-settings"
            onSubmit={(event) => {
              event.preventDefault()
              saveSettings(draft)
              setSettings(draft)
              setError('')
              setView('chat')
            }}
          >
            <label className="lg-chat-field">
              <span>代理地址（推荐）</span>
              <input
                value={draft.proxyUrl}
                onChange={(event) => setDraft({ ...draft, proxyUrl: event.target.value })}
                placeholder="https://你的域名/api/chat"
                autoComplete="off"
              />
              <small>填了它就直接走代理，浏览器里不需要放密钥；留空则直连下面的接口。</small>
            </label>

            <label className="lg-chat-field">
              <span>Base URL</span>
              <input
                value={draft.baseUrl}
                onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
              />
              <small>任何 OpenAI 兼容接口都行，注意带上 /v1。</small>
            </label>

            <label className="lg-chat-field">
              <span>API Key</span>
              <input
                type="password"
                value={draft.apiKey}
                onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
                placeholder="sk-..."
                autoComplete="off"
              />
              <small>只写在这台浏览器的 localStorage，不会随站点发布。公用电脑上别填。</small>
            </label>

            <label className="lg-chat-field">
              <span>模型</span>
              <input
                value={draft.model}
                onChange={(event) => setDraft({ ...draft, model: event.target.value })}
                placeholder="gpt-4o-mini / deepseek-chat / qwen-plus"
                autoComplete="off"
              />
            </label>

            <div className="lg-chat-settings-actions">
              <button type="submit" className="lg-chat-primary">
                保存
              </button>
              <button
                type="button"
                className="lg-chat-ghost"
                onClick={() => {
                  setDraft(settings)
                  setView('chat')
                }}
              >
                取消
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="lg-chat-list" ref={listRef}>
              {messages.length === 0 ? (
                <div className="lg-chat-empty">
                  <p className="lg-chat-empty-title">问这篇的任何问题</p>
                  <p className="lg-chat-empty-body">
                    {article
                      ? `《${article.title}》的正文会随问题一起发出去，问到细节也不用你去复制粘贴。`
                      : '打开任意一篇知识点，问答会自动带上那篇的正文。'}
                  </p>
                  <ul className="lg-chat-suggestions">
                    {SUGGESTIONS.map((item) => (
                      <li key={item}>
                        <button type="button" onClick={() => setInput(item)}>
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!configured ? (
                    <p className="lg-chat-warn">
                      还没配置模型接口。
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(settings)
                          setView('settings')
                        }}
                      >
                        去设置
                      </button>
                    </p>
                  ) : null}
                </div>
              ) : (
                messages.map((message, index) => (
                  <div className="lg-chat-row" key={`${index}-${message.role}`} data-role={message.role}>
                    <Bubble message={message} streaming={streaming} />
                  </div>
                ))
              )}
            </div>

            {error ? <p className="lg-chat-error">{error}</p> : null}

            <div className="lg-chat-composer">
              {article && attached ? (
                <span className="lg-chat-chip">
                  <span className="lg-chat-chip-name">{article.title}</span>
                  <button type="button" onClick={() => setAttached(false)} aria-label="不发送这篇文章">
                    ×
                  </button>
                </span>
              ) : null}
              {article && !attached ? (
                <button type="button" className="lg-chat-chip lg-chat-chip--off" onClick={() => setAttached(true)}>
                  已摘掉《{article.title}》，点这里装回去
                </button>
              ) : null}

              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    void send(input)
                  }
                }}
                rows={2}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                aria-label="输入问题"
              />

              <div className="lg-chat-composer-actions">
                <span className="lg-chat-hint">{chipTitle}</span>
                {streaming ? (
                  <button type="button" className="lg-chat-ghost" onClick={stop}>
                    停止
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lg-chat-primary"
                    onClick={() => void send(input)}
                    disabled={!input.trim()}
                  >
                    发送
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
