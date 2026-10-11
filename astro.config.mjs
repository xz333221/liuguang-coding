import react from '@astrojs/react'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// GitHub Pages 部署在 /liuguang-coding/ 子路径,由 BASE_PATH 注入;本地开发和预览用 /
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  site: 'https://xz333221.github.io',
  base,
  integrations: [react(), vue()],
  markdown: {
    // 双主题代码高亮:token 颜色挂在 CSS 变量上,由 html[data-theme] 决定用哪一套
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
