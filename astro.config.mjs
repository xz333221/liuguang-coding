import react from '@astrojs/react'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://coding.flowdash.cn',
  integrations: [react(), vue()],
  markdown: {
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
