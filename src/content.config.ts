import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// 知识点正文:一份 markdown 就是一节。
// 三部分里的"思维导图"和"动手讲解"通过 mindmap / demo 两个字段指到对应资源:
//   mindmap → public/mindmaps/<name>.mindmap.json(用 flow-mindmap 导出后丢进去)
//   demo    → src/demos/<name>.astro(手写的动画或 HTML 讲解)
const knowledge = defineCollection({
  loader: glob({
    base: './src/content/knowledge',
    pattern: '**/*.md',
    // 默认 id 是相对路径(如 ai/temperature-and-sampling),这里只取文件名,
    // 让地址变成 /<分类>/<文件名>/。代价是文件名要在全站唯一。
    generateId: ({ entry }) => entry.replace(/\.md$/, '').split('/').pop() ?? entry,
  }),
  schema: z.object({
    title: z.string(),
    /** 一句话摘要,列表页和页面头部都用它 */
    summary: z.string(),
    /** 叶子分类 id,见 src/data/catalog.ts */
    category: z.string(),
    /** 同分类内的排序,小的在前 */
    order: z.number().default(100),
    level: z.enum(['入门', '进阶', '深入']).default('入门'),
    tags: z.array(z.string()).default([]),
    updated: z.coerce.date(),
    /** public/mindmaps/ 下的 json 文件名(不含目录) */
    mindmap: z.string().optional(),
    /** src/demos/ 下的 astro 组件名(不含扩展名) */
    demo: z.string().optional(),
    /**
     * 这篇文章要先交代清楚的名词,取 src/data/glossary/ 里的 id。
     * 页头会按这个列表渲染一节「先弄清这几个词」,正文里这些词第一次出现时也会
     * 自动标成带解释的链接。写错的 id 会让构建失败。
     */
    terms: z.array(z.string()).default([]),
    /** 正文里哪些说法来自哪里,页脚会列出来 */
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    /** true 则不出现在列表里,但页面仍可访问 */
    draft: z.boolean().default(false),
  }),
})

export const collections = { knowledge }
