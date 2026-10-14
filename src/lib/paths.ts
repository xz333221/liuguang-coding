// 站内地址的拼接。
//
// 单独拆一个文件,是因为 lib/content.ts 顶部就 import 了 astro:content(构建期专用),
// 浏览器侧的组件(比如闯关游戏的 React island)碰不得它。
// 页面要的"取知识点"那类函数仍然走 lib/content.ts,这里只放纯地址拼接。

/** 带 BASE_URL 前缀的站内地址;传进来可以是 'python/x/' 或 '/python/x/' */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

/** 术语表页地址 */
export function glossaryPath(): string {
  return withBase('glossary/')
}

/** 术语表里某个名词的锚点 */
export function termHref(id: string): string {
  return `${glossaryPath()}#${id}`
}

/** 知识点地址,传 'python/variable-is-a-name' 这种形式 */
export function topicHref(path: string): string {
  return withBase(`${path}/`)
}

/** 分类页地址 */
export function categoryPath(id: string): string {
  return withBase(`${id}/`)
}
