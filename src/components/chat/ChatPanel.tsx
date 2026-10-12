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
  usesProxy,
} from '../../lib/chat'
import type { SavedModel } from '../../lib/chat-models'
import { fetchServerModels, loadModels, removeModel } from '../../lib/chat-models'

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
  const [models, setModels] = useState<SavedModel[]>(() => loadModels())
  const [serverModels, setServerModels] = useState<SavedModel[]>([])
  const [modelsVersion, setModelsVersion] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages(logKey))
  const [input, setInput] = useState('')
  const [attached, setAttached] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const configured = isConfigured(settings)
  const allModels = useMemo(() => [...serverModels, ...models], [serverModels, models])
  const selectedModel = useMemo(
    () => allModels.find((item) => item.id === settings.modelId) ?? null,
    [allModels, settings.modelId],
  )
  const modelLabel = selectedModel
    ? selectedModel.displayName || selectedModel.modelName
    : usesProxy(settings)
      ? '服务端模型'
      : ''

  // 模型配置弹窗(Vue 岛)保存后同步过来:它只管派发事件,这边重新读一遍本机存储
  useEffect(() => {
    const sync = () => {
      setModels(loadModels())
      setModelsVersion((value) => value + 1)
      const next = loadSettings()
      setSettings(next)
      setDraft(next)
      setError('')
      setView('chat')
    }
    document.addEventListener('lg-chat:models-changed', sync)
    return () => document.removeEventListener('lg-chat:models-changed', sync)
  }, [])

  // 服务端存的模型(部署在同源服务上时才有):密钥在服务端,浏览器只拿到名字
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    void fetchServerModels(controller.signal).then((list) => {
      if (alive) setServerModels(list)
    })
    return () => {
      alive = false
      controller.abort()
    }
  }, [modelsVersion])

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
      setError('先添加一个模型（或填一个代理地址）。')
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
            <p className="lg-chat-sub">
              {article ? '当前文章已带上' : '可以问知识库里的任何内容'}
              {' · '}
              {modelLabel || '未配置模型'}
            </p>
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
            <div className="lg-chat-field">
              <span>用哪个模型</span>
              {allModels.length > 0 ? (
                <select
                  className="lg-chat-select"
                  value={draft.modelId}
                  onChange={(event) => setDraft({ ...draft, modelId: event.target.value })}
                >
                  <option value="">（不指定，由服务端决定）</option>
                  {serverModels.length > 0 ? (
                    <optgroup label="服务端（密钥不在浏览器）">
                      {serverModels.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayName || item.modelName}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {models.length > 0 ? (
                    <optgroup label="本机（浏览器直连用）">
                      {models.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayName || item.modelName}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              ) : (
                <p className="lg-chat-note">还没有配置模型，点下面的「添加模型」。</p>
              )}
              {selectedModel ? (
                <small>
                  {selectedModel.modelName}
                  {selectedModel.endpoint ? ` · ${selectedModel.endpoint}` : ''}
                  {selectedModel.server ? ' · 来自服务端' : ''}
                </small>
              ) : null}
            </div>

            <div className="lg-chat-settings-actions">
              <button
                type="button"
                className="lg-chat-primary"
                onClick={() => document.dispatchEvent(new CustomEvent('lg-chat:config'))}
              >
                添加模型
              </button>
              {selectedModel ? (
                <>
                  <button
                    type="button"
                    className="lg-chat-ghost"
                    onClick={() =>
                      document.dispatchEvent(new CustomEvent('lg-chat:config', { detail: { model: selectedModel } }))
                    }
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="lg-chat-ghost"
                    onClick={() => {
                      const next = removeModel(selectedModel.id)
                      setModels(next)
                      const fresh = loadSettings()
                      setDraft(fresh)
                      setSettings(fresh)
                    }}
                  >
                    删除
                  </button>
                </>
              ) : null}
            </div>

            <label className="lg-chat-field">
              <span>代理地址（可选，推荐）</span>
              <input
                value={draft.proxyUrl}
                onChange={(event) => setDraft({ ...draft, proxyUrl: event.target.value })}
                placeholder="https://你的域名/api/chat"
                autoComplete="off"
              />
              <small>填了它就直接走代理，浏览器里不用放密钥；留空则用上面那条模型配置直连。</small>
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
