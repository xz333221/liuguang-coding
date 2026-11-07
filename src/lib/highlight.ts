import { codeToHtml } from 'shiki'

/**
 * 代码高亮统一入口:正文、CodeTabs、各个 demo 用的是同一套双主题。
 * 主题只写进 span 的 CSS 变量(--shiki-light / --shiki-dark),
 * 真正的颜色由 html[data-theme] 下的样式决定,所以切换主题不用重渲染。
 */
export const highlight = (code: string, lang: string) =>
  codeToHtml(code.trim(), {
    lang,
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
    defaultColor: false,
  })
