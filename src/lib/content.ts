import { getCollection, render } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import { findCategory, isLeaf, outlineRank, subtreeIds } from '../data/catalog'
import { withBase } from './paths'

export type Topic = CollectionEntry<'knowledge'>

// 地址拼接抽到 lib/paths.ts 了(那边不碰 astro:content,浏览器组件也能用),这里转出去,
// 老调用方不用改。
export { categoryPath, glossaryPath, termHref, topicHref, withBase } from './paths'

export function topicPath(topic: Topic): string {
  return withBase(`${topic.data.category}/${topic.id}/`)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** 文章挂在目录树的哪个节点上:声明了 node 就用它,否则就是它的分类 */
export function topicNode(topic: Topic): string {
  return topic.data.node ?? topic.data.category
}

/** 同一分类内的先后:有章节树的按大纲位置(章 → 节 → 小节),没有的按 order */
function compareTopics(a: Topic, b: Topic): number {
  const orderA = findCategory(a.data.category)?.id ?? a.data.category
  const orderB = findCategory(b.data.category)?.id ?? b.data.category
  if (orderA !== orderB) return orderA.localeCompare(orderB)

  const rankA = a.data.node ? outlineRank(a.data.node) : undefined
  const rankB = b.data.node ? outlineRank(b.data.node) : undefined
  if (rankA && rankB) {
    for (let i = 0; i < Math.max(rankA.length, rankB.length); i++) {
      // 缺的那一位补 0:父章节([3,2])排在它的小节([3,2,1])前面
      const diff = (rankA[i] ?? 0) - (rankB[i] ?? 0)
      if (diff !== 0) return diff
    }
  }
  if (a.data.order !== b.data.order) return a.data.order - b.data.order
  return a.data.title.localeCompare(b.data.title, 'zh-Hans-CN')
}

/** 全部已发布的知识点,按分类顺序 + 章节大纲(或 order)排好 */
export async function getTopics(): Promise<Topic[]> {
  const entries = await getCollection('knowledge', ({ data }) => !data.draft)
  for (const topic of entries) {
    // 写错的 node 会让这篇文章从目录里静默消失,所以在构建期就炸掉
    if (topic.data.node && !findCategory(topic.data.node)) {
      throw new Error(`「${topic.id}」的 node 指向了不存在的章节:${topic.data.node}(见 src/data/javaOutline.ts)`)
    }
  }
  return entries.sort(compareTopics)
}

/** 挂在某个目录节点下的文章,含它子孙章节里的 */
export function topicsUnder(nodeId: string, topics: Topic[]): Topic[] {
  const ids = new Set(subtreeIds(nodeId))
  return topics.filter((topic) => ids.has(topicNode(topic)))
}

export function countByCategory(topics: Topic[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const topic of topics) {
    const id = topicNode(topic)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

/** 分类页上要展示的知识点数量:父分类算它所有子分类的和(章节树同理) */
export function countFor(categoryId: string, counts: Record<string, number>): number {
  const category = findCategory(categoryId)
  const own = counts[categoryId] ?? 0
  if (!category || isLeaf(category)) return own
  return own + (category.children ?? []).reduce((sum, child) => sum + countFor(child.id, counts), 0)
}

export interface TopicNeighbours {
  prev?: Topic
  next?: Topic
}

export function neighboursOf(current: Topic, topics: Topic[]): TopicNeighbours {
  const siblings = topics.filter((topic) => topic.data.category === current.data.category)
  const index = siblings.findIndex((topic) => topic.id === current.id)
  return { prev: siblings[index - 1], next: siblings[index + 1] }
}

export { render }
