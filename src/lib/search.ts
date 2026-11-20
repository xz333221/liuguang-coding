// 站内搜索的打分与摘录。索引由 /search-index.json 提供,这里只管「怎么排」。
//
// 权重思路:
//   标题命中 > 小节标题 > 标签 > 章节名 > 摘要 > 正文
//   多个关键词之间是「与」:每个词都得在某处出现,分数相加。
// 中文不做分词:整串包含判断已经够用,而且用户多半输的就是词组(「线程池」「垃圾回收」)。

export interface SearchDoc {
  /** 路径 */
  u: string
  /** 标题 */
  t: string
  /** 分类 id */
  c: string
  /** 章节名 */
  p: string
  /** 摘要 */
  s: string
  /** 标签 */
  k: string[]
  /** 小节标题 */
  h: string[]
  /** 正文纯文本 */
  b: string
  /** 代码块里出现过的标识符(类名、方法名、注解) */
  x: string[]
}

export interface SearchHit extends SearchDoc {
  score: number
  /** 命中位置前后的一段正文,用于列表里显示上下文 */
  snippet: string
}

const MAX_TOKENS = 6
const SNIPPET_BEFORE = 24
const SNIPPET_AFTER = 56

/** 按空白与中英文标点切词,最多 6 个,避免长句把结果筛空。 */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,，、;；:：!！?？()（）[\]「」"']+/)
    .filter((token) => token.length > 0)
    .slice(0, MAX_TOKENS)
}

function snippetOf(doc: SearchDoc, token: string): string {
  const text = doc.b || doc.s
  if (!text) return doc.s
  const at = text.toLowerCase().indexOf(token)
  if (at < 0) return text.slice(0, SNIPPET_BEFORE + SNIPPET_AFTER) + (text.length > SNIPPET_BEFORE + SNIPPET_AFTER ? '…' : '')
  const start = Math.max(0, at - SNIPPET_BEFORE)
  const end = Math.min(text.length, at + token.length + SNIPPET_AFTER)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export function searchIndex(docs: SearchDoc[], query: string, limit = 20): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  const hits: SearchHit[] = []

  for (const doc of docs) {
    const title = doc.t.toLowerCase()
    const heads = doc.h.join(' ').toLowerCase()
    const tags = doc.k.join(' ').toLowerCase()
    const path = doc.p.toLowerCase()
    const summary = doc.s.toLowerCase()
    const body = doc.b.toLowerCase()
    const idents = doc.x.join(' ').toLowerCase()

    let score = 0
    let matchedAll = true

    for (const token of tokens) {
      let hit = 0
      if (title.includes(token)) hit += title.startsWith(token) ? 14 : 9
      if (heads.includes(token)) hit += 5
      if (tags.includes(token)) hit += 4
      if (path.includes(token)) hit += 3
      if (summary.includes(token)) hit += 3
      if (body.includes(token)) hit += 1
      if (idents.includes(token)) hit += 2

      if (hit === 0) {
        matchedAll = false
        break
      }
      score += hit
    }

    if (!matchedAll) continue

    hits.push({ ...doc, score, snippet: snippetOf(doc, tokens[0]) })
  }

  hits.sort((a, b) => b.score - a.score || a.t.length - b.t.length)
  return hits.slice(0, limit)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 把命中词包成 <mark>,顺带转义 HTML。 */
export function highlight(text: string, query: string): string {
  const tokens = tokenize(query)
  if (tokens.length === 0) return escapeHtml(text)

  // 一次替换完成:先把所有词拼成一个正则,长词在前。
  // 逐词替换会出两个问题:后一个词可能命中前一次插入的 <mark> 标签;
  // 「线程」也会把已经标好的「线程池」再拆开。
  const pattern = new RegExp(
    [...tokens].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|'),
    'gi',
  )

  let out = ''
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    out += escapeHtml(text.slice(last, at))
    out += `<mark>${escapeHtml(match[0])}</mark>`
    last = at + match[0].length
  }
  return out + escapeHtml(text.slice(last))
}
