import { satteri } from '@astrojs/markdown-satteri'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
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
  integrations: [
    react(),
    vue(),
    // 构建时自动生成 sitemap(首页 / 分类页 / 文章页 / glossary / about)。
    // /game 是纯前端演示的闯关游戏,没有可索引的正文,排除掉。
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/game'),
    }),
  ],
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
    server: {
      // 开发时 astro dev 跑在 4321,接口在 8787:同源代理过去,
      // 登录、闯关进度、模型配置这些 /api 请求才发得出去(生产是同域,不需要)
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
  },
})
