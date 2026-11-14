// 知识库的分类树:顺序、状态、说明都写在这里,页面不各自硬编码。
//
// status:
//   active  有内容,正常进入
//    soon   置灰可见,点进去是"还在整理"的空状态
//    hidden 完全不出现在导航与首页(预留给以后不想公开的方向)
//
// 知识点通过 frontmatter 的 category 指向叶子分类的 id(如 python / ai / algorithm),
// 父分类(如 lang)只用来分组和做落地页。
//
// 章节树(numbered):java 的 children 是一棵 17 章的大纲(见 javaOutline.ts),文章再用
// frontmatter 的 `node` 指到具体章节点。这类节点有两个特别之处:
//   · 编号由树位置推导(outlineNumber),不写进数据;
//   · 「筹备中」由子树里的文章数推导,不是看 status —— 所以大纲节点一律 active,
//     补上文章后徽标自动消失。方向级的 soon(前端/后端那些)仍照旧声明。

import { javaChapters } from './javaOutline'

export type CategoryStatus = 'active' | 'soon' | 'hidden'

export interface Category {
  id: string
  name: string
  /** 一句话说明,首页卡片与分类页都会用;章节树的叶子节点可以省略 */
  intro?: string
  status: CategoryStatus
  /** 置灰时给的提示语 */
  note?: string
  /** true = 我的 children 从 1 开始编号(章 → 节 → 小节),子孙继承这个编号 */
  numbered?: boolean
  children?: Category[]
}

export const catalog: Category[] = [
  {
    id: 'lang',
    name: '编程语言',
    intro: '按语言整理语法、内存模型与工程习惯。先把 Python 和 Java 做扎实。',
    status: 'active',
    children: [
      {
        id: 'python',
        name: 'Python',
        intro: '从名字与对象开始,到数据模型、并发与工程化。',
        status: 'active',
      },
      {
        id: 'java',
        name: 'Java',
        intro: '按 17 章走完:环境与语法 → 面向对象 → 异常、泛型、集合 → 函数式、反射、IO、并发、JVM → Maven、Spring、MyBatis → 设计模式、DDD 与算法。',
        status: 'active',
        numbered: true,
        children: javaChapters,
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI',
    intro: '大模型怎么生成文字、怎么调参、怎么把模型接进真实系统。',
    status: 'active',
  },
  {
    id: 'algorithm',
    name: '算法',
    intro: '先学会衡量一段代码有多慢,再看经典结构与方法怎么把规模问题做小。',
    status: 'active',
  },
  {
    id: 'frontend',
    name: '前端',
    intro: '浏览器渲染、JavaScript 运行时、工程化与性能。',
    status: 'soon',
  },
  {
    id: 'backend',
    name: '后端',
    intro: '接口设计、数据库、缓存、一致性与服务治理。',
    status: 'soon',
  },
  {
    id: 'ops',
    name: '运维',
    intro: 'Linux、网络、容器、可观测性与发布流程。',
    status: 'soon',
  },
  {
    id: 'ui',
    name: 'UI 设计',
    intro: '视觉层级、排版、色彩与组件规范。',
    status: 'soon',
  },
  {
    id: 'product',
    name: '产品设计',
    intro: '需求判断、流程设计、指标与迭代节奏。',
    status: 'soon',
  },
]

/** 扁平化后的分类(不含 hidden),父在前、子紧跟其后 */
export function visibleCategories(list: Category[] = catalog): Category[] {
  return list
    .filter((item) => item.status !== 'hidden')
    .flatMap((item) => [item, ...visibleCategories(item.children ?? [])])
}

export function findCategory(id: string, list: Category[] = catalog): Category | undefined {
  return visibleCategories(list).find((item) => item.id === id)
}

/** 只有叶子分类能挂知识点 */
export function isLeaf(category: Category): boolean {
  return !category.children || category.children.length === 0
}

export function leafCategories(list: Category[] = catalog): Category[] {
  return visibleCategories(list).filter(isLeaf)
}

/** 从根到该节点的祖先链(不含自己,跳过 hidden),用来做面包屑 */
export function pathOf(id: string, list: Category[] = catalog): Category[] {
  const walk = (nodes: Category[], trail: Category[]): Category[] | null => {
    for (const node of nodes) {
      if (node.status === 'hidden') continue
      if (node.id === id) return trail
      const hit = walk(node.children ?? [], [...trail, node])
      if (hit) return hit
    }
    return null
  }
  return walk(list, []) ?? []
}

/** 该节点及其全部后代的 id(含自己)—— 章节落地页按这个把子孙章节的文章一起收上来 */
export function subtreeIds(id: string, list: Category[] = catalog): string[] {
  const node = findCategory(id, list)
  return node ? visibleCategories([node]).map((item) => item.id) : []
}

/**
 * 节点在编号大纲里的位置(如 [3,2,1]);不在任何 numbered 子树里则 undefined。
 * 编号只数可见节点 —— hidden 的兄弟不该占号。
 */
export function outlineRank(id: string, list: Category[] = catalog): number[] | undefined {
  const walk = (nodes: Category[], prefix: number[] | null): number[] | undefined => {
    let index = 0
    for (const node of nodes) {
      if (node.status === 'hidden') continue
      index += 1
      const mine = prefix ? [...prefix, index] : null
      if (node.id === id) return mine ?? undefined
      // numbered 的节点让 children 从 1 重新开始;否则把自己的编号往下传
      const hit = walk(node.children ?? [], node.numbered ? [] : mine)
      if (hit) return hit
    }
    return undefined
  }
  return walk(list, null)
}

/** 展示用编号('3.2.1');不在编号大纲里返回 '' */
export function outlineNumber(id: string, list: Category[] = catalog): string {
  return (outlineRank(id, list) ?? []).join('.')
}
