import { getCollection, render } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import { findCategory, isLeaf } from '../data/catalog'

export type Topic = CollectionEntry<'knowledge'>

/** 带 /liuguang-coding/ 前缀的站内地址;传进来可以是 'python/x/' 或 '/python/x/' */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

export function topicPath(topic: Topic): string {
  return withBase(`${topic.data.category}/${topic.id}/`)
}

export function categoryPath(id: string): string {
  return withBase(`${id}/`)
}

/** 术语表页地址 */
export function glossaryPath(): string {
  return withBase('glossary/')
}

/** 术语表里某个名词的锚点 */
export function termHref(id: string): string {
  return `${glossaryPath()}#${id}`
}

/** 知识点地址,传 'python/variables-are-not-boxes' 这种形式 */
export function topicHref(path: string): string {
  return withBase(`${path}/`)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** 全部已发布的知识点,按分类顺序 + order 排好 */
export async function getTopics(): Promise<Topic[]> {
  const entries = await getCollection('knowledge', ({ data }) => !data.draft)
  return entries.sort((a, b) => {
    const orderA = findCategory(a.data.category)?.id ?? a.data.category
    const orderB = findCategory(b.data.category)?.id ?? b.data.category
    if (orderA !== orderB) return orderA.localeCompare(orderB)
    if (a.data.order !== b.data.order) return a.data.order - b.data.order
    return a.data.title.localeCompare(b.data.title, 'zh-Hans-CN')
  })
}

export async function topicsOf(categoryId: string): Promise<Topic[]> {
  const topics = await getTopics()
  return topics.filter((topic) => topic.data.category === categoryId)
}

export function countByCategory(topics: Topic[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const topic of topics) {
    const id = topic.data.category
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

/** 分类页上要展示的知识点数量:父分类算它所有子分类的和 */
export function countFor(categoryId: string, counts: Record<string, number>): number {
  const category = findCategory(categoryId)
  if (!category) return counts[categoryId] ?? 0
  if (isLeaf(category)) return counts[categoryId] ?? 0
  return (category.children ?? []).reduce((sum, child) => sum + countFor(child.id, counts), 0)
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
