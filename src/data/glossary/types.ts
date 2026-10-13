// 术语表的数据形状。
//
// 每个名词都写两段解释,这是刻意的:
//   plain  先讲人话 —— 一句话说清"它大概是什么",允许用类比,读者卡住时看这段
//   formal 再说准确 —— 定义式的说法,与一手文档一致,读者要查准的时候看这段
// 两段都不能省:只写通俗会失真,只写专业就是本文要解决的问题本身。

export type TermGroup = 'common' | 'python' | 'java' | 'ai' | 'algorithm'

export interface TermSource {
  title: string
  url: string
}

export interface Term {
  /** 锚点 id,也是文章 frontmatter 里 terms 字段引用的 key,全站唯一 */
  id: string
  /** 中文名 */
  term: string
  /** 英文名或常见写法,展示在词名旁边 */
  en?: string
  /**
   * 正文里可能出现的其他写法,自动标注时会和 term 一起匹配。
   * 只写"读者可能不认识、且不会误伤"的形式,短的通用词别往里塞。
   */
  aliases?: string[]
  group: TermGroup
  /**
   * 是否参与正文自动标注,默认 true。
   * "类型""值"这类过于通用的词设成 false:链接到处都是,读起来更烦。
   */
  linkable?: boolean
  /** 说人话 */
  plain: string
  /** 准确地说 */
  formal: string
  /** 常见误解,没有就不写 */
  misread?: string
  /** 相关名词 id,页面底部会互相跳 */
  related?: string[]
  /** 想深入看哪篇知识点,写成 <分类>/<文件名>,例如 python/variables-are-not-boxes */
  see?: string
  /** 定义出处,只用仓库里已经在用的一手链接 */
  source?: TermSource
}

export interface TermGroupMeta {
  id: TermGroup
  name: string
  intro: string
}
