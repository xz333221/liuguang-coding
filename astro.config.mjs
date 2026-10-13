import { satteri } from '@astrojs/markdown-satteri'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { glossaryTermsPlugin } from './src/lib/markdown-terms'

// 站内地址前缀:前端从 import.meta.env.BASE_URL 读,markdown 插件跑在 Node 侧读不到,
// 所以在这里定义一次、两边共用。目前站点部署在域名根路径。
const base = '/'

export default defineConfig({
  site: 'https://coding.flowdash.cn',
  base,
  integrations: [react(), vue()],
  markdown: {
    // 正文里的名词自动标注:文章 frontmatter 的 terms 指向 src/data/glossary/
    processor: satteri({ hastPlugins: [glossaryTermsPlugin({ base })] }),
    // 双主题代码高亮:token 颜色只走 CSS 变量,由 html[data-theme] 决定用哪一套
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
