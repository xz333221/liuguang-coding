// 术语表的唯一入口。页面、正文自动标注插件都从这里取数据。
//
// 这个模块必须保持"纯数据 + 纯函数":它会被 astro.config.mjs 在 Node 侧直接 import
// (给 markdown 插件用),那里没有 import.meta.env,也不该碰浏览器 API。
// 需要拼站内地址时用 src/lib/content.ts 里的 termHref(),不要写在这里。

import { algorithmTerms } from './algorithm'
import { aiTerms } from './ai'
import { commonTerms } from './common'
import { javaTerms } from './java'
import { pythonTerms } from './python'
import type { Term, TermGroup, TermGroupMeta } from './types'

export type { Term, TermGroup, TermGroupMeta, TermSource } from './types'

export const groups: TermGroupMeta[] = [
  {
    id: 'common',
    name: '通用',
    intro: '不管写哪种语言都会碰到的底层概念:对象、名字、引用、协议。',
  },
  {
    id: 'python',
    name: 'Python',
    intro: '数据模型与迭代这两条线上的名词。',
  },
  {
    id: 'java',
    name: 'Java',
    intro: '相等性这条线上的名词:身份、内容、常量池与哈希。',
  },
  {
    id: 'ai',
    name: 'AI',
    intro: '大模型从输入到输出这条链上的名词:token、logit、采样、注意力。',
  },
  {
    id: 'algorithm',
    name: '算法',
    intro: '复杂度这条线上的名词:上界、下界、增长率与规模。',
  },
]

/** 全部名词,按分组顺序排 */
export const terms: Term[] = [
  ...commonTerms,
  ...pythonTerms,
  ...javaTerms,
  ...aiTerms,
  ...algorithmTerms,
]

const byId = new Map(terms.map((term) => [term.id, term]))

export function findTerm(id: string): Term | undefined {
  return byId.get(id)
}

export function termsOfGroup(group: TermGroup): Term[] {
  return terms.filter((term) => term.group === group)
}

export function groupMeta(id: TermGroup): TermGroupMeta | undefined {
  return groups.find((group) => group.id === id)
}

/** 解析相关名词,过滤掉还没写的 */
export function relatedTerms(term: Term): Term[] {
  return (term.related ?? []).map((id) => byId.get(id)).filter((item): item is Term => Boolean(item))
}

/**
 * 把文章 frontmatter 里的 terms 列表解析成名词对象。
 * 写错的 id 直接抛错,让构建失败 —— 术语表写漏一个词,比页面静默少一节好。
 */
export function resolveTerms(ids: string[]): Term[] {
  return ids.map((id) => {
    const term = byId.get(id)
    if (!term) throw new Error(`术语表里没有 id 为 "${id}" 的名词,请检查 src/data/glossary/`)
    return term
  })
}

export interface LinkEntry {
  /** 正文里要匹配的字面串 */
  name: string
  /** 命中的名词 id */
  id: string
  /** 悬浮卡上显示的说人话解释 */
  plain: string
}

/**
 * 给正文自动标注用的匹配表:名字长的排前面,避免"迭代器"被"迭代"抢先切掉。
 * linkable 为 false 的名词(太通用的那种)不参与匹配。
 */
export function linkEntries(ids: string[]): LinkEntry[] {
  const entries: LinkEntry[] = []
  for (const term of resolveTerms(ids)) {
    if (term.linkable === false) continue
    for (const name of [term.term, ...(term.aliases ?? [])]) {
      entries.push({ name, id: term.id, plain: term.plain })
    }
  }
  return entries.sort((a, b) => b.name.length - a.name.length)
}
