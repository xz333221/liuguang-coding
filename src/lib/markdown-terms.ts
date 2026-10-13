// 正文里的名词自动标注。
//
// 为什么要走 markdown 插件而不是在页面里事后处理:标注结果直接进构建产物,
// 首屏就是带链接和悬浮解释的正文,不依赖客户端 JS,也不会在加载后抖一下。
//
// Astro 7 默认用 Sätteri 引擎,markdown.remarkPlugins 已经废弃(要额外装
// @astrojs/markdown-remark),所以这里写的是 Sätteri 的 hast 插件 —— 见 astro.config.mjs。
//
// 匹配规则刻意保守:
//   1. 只标注文章 frontmatter 里 terms 声明过的名词,不在正文里瞎猜;
//   2. 每个名词整篇只标第一次出现,不刷屏;
//   3. 逐文本节点处理并往上检查祖先,行内代码、代码块、链接、标题底下的一律不碰 ——
//      用祖先检查而不是"只看父节点",是因为 **加粗** 这类行内标记会把文本再包一层;
//   4. 拉丁字母开头的词要求词边界,免得 token 命中 tokens。

import type { Element, Nodes, Text } from 'hast'
import { linkEntries, type LinkEntry } from '../data/glossary'

/** 这些标签底下的一切都不标注 */
const SKIP_TAGS = new Set(['code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style'])

const ASCII_WORD = /[A-Za-z0-9_]/

interface PluginContext {
  readonly data: Record<string, unknown>
}

interface TextVisitorContext {
  data: Record<string, unknown>
  parent(node: Nodes): Nodes | undefined
  replaceNode(node: Nodes, next: Nodes | Nodes[]): void
}

export interface GlossaryTermsOptions {
  /** 站内地址前缀,和 astro.config.mjs 里的 base 保持一致 */
  base?: string
}

function isBoundary(text: string, index: number, name: string): boolean {
  if (ASCII_WORD.test(name[0]) && index > 0 && ASCII_WORD.test(text[index - 1])) return false
  const end = index + name.length
  if (ASCII_WORD.test(name[name.length - 1]) && end < text.length && ASCII_WORD.test(text[end])) {
    return false
  }
  return true
}

function findHit(text: string, entries: LinkEntry[], used: Set<string>) {
  let hit: { index: number; entry: LinkEntry } | null = null
  for (const entry of entries) {
    if (used.has(entry.id)) continue
    let from = 0
    while (from <= text.length) {
      const index = text.indexOf(entry.name, from)
      if (index === -1) break
      if (isBoundary(text, index, entry.name)) {
        // entries 已经按名字长的排前面,同一起点上先到的就是更长的那个
        if (!hit || index < hit.index) hit = { index, entry }
        break
      }
      from = index + 1
    }
  }
  return hit
}

function textNode(value: string): Text {
  return { type: 'text', value }
}

/** 名词链接 + 一张只靠 CSS 显示的悬浮解释卡 */
function termNode(label: string, entry: LinkEntry, base: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {
      className: ['lg-term'],
      href: `${base}glossary/#${entry.id}`,
    },
    children: [
      textNode(label),
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['lg-term-tip'], 'aria-hidden': 'true' },
        children: [textNode(entry.plain)],
      },
    ],
  }
}

/** 把一段纯文本切成 [文本, 链接, 文本, 链接, ...];一个都没命中就返回 null */
function linkify(value: string, entries: LinkEntry[], used: Set<string>, base: string): Nodes[] | null {
  const nodes: Nodes[] = []
  let rest = value
  let linked = false

  while (rest) {
    const hit = findHit(rest, entries, used)
    if (!hit) break
    if (hit.index > 0) nodes.push(textNode(rest.slice(0, hit.index)))
    const label = rest.slice(hit.index, hit.index + hit.entry.name.length)
    nodes.push(termNode(label, hit.entry, base))
    used.add(hit.entry.id)
    rest = rest.slice(hit.index + label.length)
    linked = true
  }

  if (!linked) return null
  if (rest) nodes.push(textNode(rest))
  return nodes
}

/** 往上找,确认这个文本节点不在代码块、链接、标题底下 */
function insideSkipped(ctx: TextVisitorContext, node: Nodes): boolean {
  let current = ctx.parent(node)
  while (current && current.type === 'element') {
    if (SKIP_TAGS.has(current.tagName)) return true
    current = ctx.parent(current)
  }
  return false
}

/**
 * 工厂函数形式:每次编译文档时调用一次,所以 used 集合天然是按文档隔离的。
 * 文章没声明 terms 就返回 null,这篇文档直接不进这条流水线。
 */
export function glossaryTermsPlugin(options: GlossaryTermsOptions = {}) {
  const base = options.base ?? '/'

  return (context: PluginContext) => {
    const astro = context.data.astro as { frontmatter?: { terms?: string[] } } | undefined
    const declared = astro?.frontmatter?.terms
    if (!declared?.length) return null

    const entries = linkEntries(declared)
    if (entries.length === 0) return null

    const used = new Set<string>()

    return {
      name: 'glossary-terms',
      text(node: Text, ctx: TextVisitorContext) {
        if (!node.value) return
        if (insideSkipped(ctx, node)) return
        const next = linkify(node.value, entries, used, base)
        if (next) ctx.replaceNode(node, next)
      },
    }
  }
}
