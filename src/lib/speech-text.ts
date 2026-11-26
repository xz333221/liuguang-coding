// 朗读文本提取:把正文块转成适合 TTS 的纯文本,供 ReadAloud.vue 使用。
//
// 为什么不能直接用 el.textContent:正文术语被 markdown 插件渲染成
//   <a class="lg-term">术语<span class="lg-term-tip" aria-hidden="true">解释文字</span></a>,
// textContent 会把悬浮解释也拼进朗读文本,和术语、上下文连成一串;
// 行内 <code>、<sup> 脚注序号同样没有边界。
//
// 这里按元素类型给朗读补停顿,让 TTS 在术语、代码、加粗处自然断句:
//   术语/加粗/行内代码前后补顿号或逗号;<sup> 脚注序号、提示气泡、图表容器整段跳过。
// 刻意只用 tagName / getAttribute / className / childNodes 这几个接口,
// 不用 el.matches —— 这样 Node 里拿普通对象模拟 DOM 就能单测,不用拉 jsdom。

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'IMG', 'SVG', 'CANVAS'])
// 整体算「一个词」的行内元素,前后补顿号当停顿;太长的不补,免得满屏顿号
const PAUSE_TAGS = new Set(['STRONG', 'EM', 'MARK', 'A', 'ABBR'])
const PAUSE_LIMIT = 30

const TEXT_NODE = 3
const ELEMENT_NODE = 1

function tagOf(node: Element): string {
  return node.tagName.toUpperCase()
}

function classOf(node: Element): string {
  // SVG 的 className 是 SVGAnimatedString 对象,不是字符串;SVG 本来就在跳过名单里
  const raw: unknown = node.className
  return typeof raw === 'string' ? raw : ''
}

function shouldSkip(node: Element): boolean {
  if (SKIP_TAGS.has(tagOf(node))) return true
  if (node.getAttribute('aria-hidden') === 'true') return true
  if (node.hasAttribute('data-no-speech')) return true
  const cls = classOf(node)
  return cls.includes('mermaid-block') || cls.includes('mindmap-block')
}

/** 收尾:压空白、合并连续顿逗、去掉贴着句读和首尾的停顿符 */
function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[、，]{2,}/g, '，')
    .replace(/\s+([、，])/g, '$1')
    .replace(/[、，]\s+/g, '，')
    .replace(/[、，]([。！？；…])/g, '$1')
    .replace(/([。！？；…])[、，]/g, '$1')
    .replace(/^[、，\s]+/, '')
    .replace(/[、，\s]+$/, '')
}

function walkChildren(node: Element): string {
  let out = ''
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT_NODE) out += child.nodeValue ?? ''
    else if (child.nodeType === ELEMENT_NODE) out += walk(child as Element)
  }
  return out
}

function walk(node: Element): string {
  if (shouldSkip(node)) return ''
  const tag = tagOf(node)
  if (tag === 'BR') return '， '
  // <sup> 只用来标脚注序号,读出来只会打断句子
  if (tag === 'SUP') return ''
  if (tag === 'CODE') {
    const inner = tidy(node.textContent ?? '')
    return inner ? `，${inner}，` : ''
  }
  if (PAUSE_TAGS.has(tag)) {
    const inner = tidy(walkChildren(node))
    if (inner && inner.length <= PAUSE_LIMIT) return `、${inner}、`
    return inner
  }
  return walkChildren(node)
}

/** 正文块 → 朗读文本。跳过提示气泡与图表,术语/代码/加粗前后补停顿 */
export function speechTextOf(root: Element): string {
  return tidy(walkChildren(root))
}
