// 知识库的分类树:顺序、状态、说明都写在这里,页面不各自硬编码。
//
// status:
//   active  有内容,正常进入
//    soon   置灰可见,点进去是"还在整理"的空状态
//    hidden 完全不出现在导航与首页(预留给以后不想公开的方向)
//
// 知识点通过 frontmatter 的 category 指向叶子分类的 id(如 python / ai / frontend),
// 父分类(如 lang)只用来分组和做落地页。

export type CategoryStatus = 'active' | 'soon' | 'hidden'

export interface Category {
  id: string
  name: string
  /** 一句话说明,首页卡片与分类页都会用 */
  intro: string
  status: CategoryStatus
  /** 置灰时给的提示语 */
  note?: string
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
        intro: '类型系统、JVM 内存、集合与并发。',
        status: 'soon',
        note: '紧随 Python 之后开始整理',
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

/** 父级分类(如 lang),用来做面包屑 */
export function parentOf(id: string, list: Category[] = catalog): Category | undefined {
  return list.find((item) => item.children?.some((child) => child.id === id))
}
