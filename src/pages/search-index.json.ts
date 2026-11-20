import type { APIRoute } from 'astro'
import { pathOf } from '../data/catalog'
import { getTopics, topicNode, topicPath } from '../lib/content'

// 站内搜索的索引:构建期生成一份静态 JSON,浏览器打开搜索面板时才拉。
//
// 只留搜得到、用得上的字段:
//   u 路径 · t 标题 · c 分类 · p 章节名 · s 摘要 · k 标签 · h 小节标题 · b 正文纯文本
// 正文档位占大头(约 1.2 MB),但只在第一次打开搜索时请求一次,之后走浏览器缓存。

/** 把 markdown 压成可搜索的纯文本:去代码块、去 HTML/SVG、去链接语法与标记符。 */
function plainText(md: string): string {
  let s = md
  s = s.replace(/```[\s\S]*?```/g, ' ')          // 代码块:代码主要由标题与正文命中,避免撑大索引
  s = s.replace(/<figure[\s\S]*?<\/figure>/g, ' ') // 内联 SVG 图解
  s = s.replace(/<[^>]+>/g, ' ')                  // 其余 HTML 标签
  s = s.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')      // 图片
  s = s.replace(/\[([^\]]*)]\([^)]*\)/g, '$1')    // 链接只留文字
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, ' ')       // 标题井号
  s = s.replace(/[>*_`|~]/g, ' ')
  s = s.replace(/^\s*[-+]\s+/gm, ' ')             // 列表符号
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** 抽 ## / ### 小节的标题,搜索时权重比正文高。 */
function headings(md: string): string[] {
  const withoutCode = md.replace(/```[\s\S]*?```/g, ' ')
  const found = withoutCode.match(/^#{2,3}\s+(.+)$/gm) ?? []
  return found.map((line) => line.replace(/^#{2,3}\s+/, '').trim()).filter(Boolean)
}

/** 代码块里出现过的标识符(类名、方法名、注解)。
 *
 *  正文纯文本里剔掉了代码,于是「CompletableFuture」这种只在示例里出现的名字会搜不到。
 *  这里只留标识符、去重后限量,既补上召回,又不至于把整段代码塞进索引。
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'new', 'return', 'public', 'private', 'protected', 'static', 'final',
  'class', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short',
  'var', 'let', 'const', 'import', 'export', 'function', 'if', 'else', 'while', 'switch',
  'true', 'false', 'null', 'undefined', 'this', 'super', 'package', 'extends', 'implements',
  'throws', 'throw', 'catch', 'try', 'finally', 'interface', 'enum', 'record', 'abstract',
  'string', 'number', 'object', 'async', 'await', 'yield', 'from', 'type', 'default',
])

const NOISE_WORDS = new Set(['mermaid', 'flowchart', 'graph', 'java', 'json', 'yaml', 'yml', 'bash', 'shell', 'sql', 'xml', 'html', 'css', 'text', 'properties'])

function codeIdentifiers(md: string, limit = 48): string[] {
  // 流程图不是代码,里面的节点名不该进标识符。
  const source = md.replace(/```mermaid[\s\S]*?```/g, ' ')
  const blocks = source.match(/```[\s\S]*?```/g) ?? []
  const seen = new Set<string>()
  for (const block of blocks) {
    // 去掉开头的 ```java 这类语言标记
    const body = block.replace(/^```[a-z]*\s*/i, '')
    for (const match of body.matchAll(/[A-Za-z_][A-Za-z0-9_]{2,30}/g)) {
      const word = match[0]
      const lower = word.toLowerCase()
      if (STOP_WORDS.has(lower) || NOISE_WORDS.has(lower)) continue
      seen.add(word)
      if (seen.size >= limit * 2) break
    }
    if (seen.size >= limit * 2) break
  }
  return [...seen].slice(0, limit)
}

export const GET: APIRoute = async () => {
  const topics = await getTopics()

  const docs = topics.map((topic) => {
    const trail = pathOf(topicNode(topic))
    return {
      u: topicPath(topic),
      t: topic.data.title,
      c: topic.data.category,
      p: trail.at(-1)?.name ?? '',
      s: topic.data.summary ?? '',
      k: topic.data.tags ?? [],
      h: headings(topic.body ?? ''),
      b: plainText(topic.body ?? ''),
      x: codeIdentifiers(topic.body ?? ''),
    }
  })

  return new Response(JSON.stringify(docs), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 内容跟着构建走,同一份产物不会有第二种索引。
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
