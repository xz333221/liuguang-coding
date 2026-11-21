---
title: 从零做一个静态站点
summary: '三个页面、一份样式、一段脚本，从空目录走到 dist。目录怎么划、多页入口怎么配、相对路径与 base 的关系，以及为什么上线前必须用 preview 而不是 dev 验证产物。'
category: frontend
node: frontend-practice-static-site
order: 111
level: 入门
tags: [静态站点, HTML, CSS, 构建, 部署]
updated: 2026-11-19
mindmap: practice-static-site.mindmap.json
terms: []
sources:
  - title: MDN · HTML
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML
    note: 文档结构、语义化元素与 `<head>` 中元信息的参考。
  - title: Vite 中文文档 · 静态资源处理
    url: https://cn.vite.dev/guide/assets.html
    note: public 目录与 import 资源的区别,以及产物中的文件名 hash。
  - title: Vite 中文文档 · 多页面应用
    url: https://cn.vite.dev/guide/build.html#multi-page-app
    note: rollupOptions.input 配置多个 HTML 入口的写法。
---

第 19 章最后一篇《跨端方案：React Native 与 Flutter Web》聊的是同一套代码还能装进哪些壳里，结论是跨端省的是人力，不是平台差异。回到浏览器，前面十九章攒下的 HTML、CSS、JavaScript、构建与测试，已经够拼出一个真站点。这一篇从空目录开始，做到 `dist` 里那堆文件能在别人的电脑上打开。

## 先定目录

小站点最容易乱在「文件放哪」:样式放在页面同级叫 `style.css`，做第二页时再复制一份，改一次颜色要改三个地方。

```text
my-site/
├─ public/             # 原样拷贝,不经过打包
│  └─ favicon.svg
├─ src/
│  ├─ styles.css
│  └─ main.js
├─ notes/
│  ├─ index.html
│  └─ build.html
├─ index.html
├─ vite.config.js
└─ package.json
```

三条约定：

- 页面就是 `.html` 文件，放在希望它出现的 URL 路径上。`notes/index.html` 对应 `/notes/`,`notes/build.html` 对应 `/notes/build.html`;
- 样式与脚本收进 `src/`，全站只有一份，每个页面 `<link>` 同一个文件；
- `public/` 里的东西按原路径拷进产物，适合 favicon、`robots.txt`、PDF 这类不需要处理的资源。

页面数量少于十个时，不要上静态站点生成器。模板、数据源、路由生成那一层，换来的是构建时间和一堆需要维护的配置，收益要等页面过百才出现。

## 首页与共享导航

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>林一的工作笔记</title>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">林一</a>
    <nav><a href="/">首页</a><a href="/notes/">笔记</a></nav>
  </header>

  <main>
    <h1>前端笔记</h1>
    <p>写了 CSS 布局、浏览器渲染与一点构建工具。</p>
    <ul class="cards">
      <li><a href="/notes/build.html"><h2>一次构建里发生了什么</h2><p>从入口到产物,拆开看每一步。</p></a></li>
    </ul>
  </main>

  <footer><p>© <span data-year>2026</span> 林一</p></footer>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

`<header>`、`<nav>`、`<main>`、`<footer>` 不带来任何视觉变化，它们给屏幕阅读器和搜索引擎一个结构，第 2 章讲过为什么值得写。`<span data-year>` 里的 2026 是占位值，脚本会把它换成当前年份，这样跨年不用改文件。

脚本用 `type="module"`，自动延迟到文档解析完成再执行，`querySelector` 不会拿到 `null`。第 1 章讲 `defer` 时提过这一点，模块脚本默认就是延迟的。

导航在每个页面出现一次，改链接就得改三个文件。页面再多一些才值得上模板或组件，三个页面手写更快，也更清楚。

## 一份样式管三个页面

```css
:root {
  --ink: #1f2937; --muted: #6b7280; --line: #e5e7eb;
  --accent: #2563eb; --measure: 68ch;
}

* { box-sizing: border-box; }

body { margin: 0; font: 16px/1.7 system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); }

.site-header {
  display: flex; gap: 24px; align-items: baseline;
  max-width: var(--measure); margin: 0 auto; padding: 20px 24px;
}

nav a { margin-right: 16px; color: var(--muted); text-decoration: none; }
nav a[aria-current='page'] { color: var(--accent); }

main { max-width: var(--measure); margin: 0 auto; padding: 40px 24px; }

.cards { display: grid; gap: 16px; padding: 0; list-style: none; }
.cards a { display: block; padding: 16px; border: 1px solid var(--line); border-radius: 8px; }

@media (min-width: 720px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
```

`--measure: 68ch` 把正文行宽锁在 68 个字符，`ch` 是数字 0 的宽度，跟着字号变。行宽超过 80 个字符，眼睛换行时容易串行。`minmax(0, 1fr)` 里的 `0` 不能省，默认最小宽度是 `auto`，一格长 URL 就能把整列顶宽，页面出现横向滚动条，第 4 章 grid 那篇讲过这个坑。

## 高亮当前页

```js
const here = location.pathname.replace(/\/$/, '/index.html')

for (const link of document.querySelectorAll('.site-header nav a')) {
  const target = new URL(link.href).pathname
  if (target === here || (target !== '/' && here.startsWith(target))) {
    link.setAttribute('aria-current', 'page')
  }
}

for (const el of document.querySelectorAll('[data-year]')) {
  el.textContent = String(new Date().getFullYear())
}
```

用 `aria-current="page"` 而不是自己加一个 `.active` 类，样式照样能选 `nav a[aria-current='page']`，同时把「这是当前页」这个信息交给了辅助技术，第 18 章讲可访问性时反复用到这个属性。

`here.startsWith(target)` 是为了让 `/notes/build.html` 也能高亮「笔记」这一项，不加判断的话根路径 `/` 会匹配所有页面。`new URL(link.href).pathname` 会做一次规范化，编码后的中文路径也能对上。

## 从源码到 dist

```bash
npm create vite@latest my-site -- --template vanilla
cd my-site
npm install
npm run dev       # 开发: http://localhost:5173
npm run build     # 生产构建,产物写在 dist/
npm run preview   # 按 dist 起静态服务器
```

多页站点还要告诉 Rollup 有哪几个 HTML 入口，默认只认根目录的 `index.html`:

```js
// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const page = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page('./index.html'),
        notes: page('./notes/index.html'),
        build: page('./notes/build.html'),
      },
    },
  },
})
```

漏配 `notes` 不会报错，`dist/notes/` 直接不存在，部署后是 404，而本地 `dev` 完全看不出来。`vite.config.js` 是 ESM 模块，里面没有 `__dirname`，直接写会得到 `ReferenceError: __dirname is not defined`，要用 `fileURLToPath(new URL(...))` 换出绝对路径。

产物结构是 `dist/index.html`、`dist/notes/index.html`、`dist/notes/build.html`，加上一个 `dist/assets/` 目录，里面是 `index-a1b2c3d4.js` 与同名 `.css`。文件名里的 hash 只在内容变化时变，这是第 15 章缓存策略的物理基础：HTML 每次都要校验，带 hash 的 js 与 css 可以缓存一年。

`preview` 与 `dev` 不是一回事。dev 按请求转译源码，preview 拿 `dist` 起一个普通静态服务器，只有后者能验证路径、`base` 和产物完整性。上线前跑一次，比上线后对着白屏猜要快。

## 几个必踩的坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 双击 HTML 打开后脚本不执行 | `file://` 下模块的来源为 `null` | 起本地服务器，见第 1 章 |
| 本地正常，部署后整站白屏 | 资源用了 `/assets/...` 绝对路径 | 配 `base`，或全部改成相对路径 |
| 只有首页能开，子页 404 | 多页入口没配 | `rollupOptions.input` 列出每个 HTML |
| Linux 上提示文件不存在 | 路径大小写与磁盘不一致 | 引用统一用小写 |
| 改了 CSS 页面没变 | 浏览器缓存了旧文件 | 硬刷新，或确认文件名带 hash |

第一条在开发期最普遍。把 `index.html` 拖进浏览器，地址栏是 `file:///D:/...`，控制台报 CORS，而问题跟跨域无关，只是模块不允许从 `file://` 加载。第二条直接看 Network 里 CSS 请求的完整 URL，少了 `/my-site` 这一段就是 `base` 没配，第 20 章讲部署那篇会把过程走一遍。

## 小结

- 页面放 `.html`，样式与脚本收进 `src/`，静态资源进 `public/`，三条约定能撑到几十个页面；
- 行宽用 `ch` 控制，grid 的 `minmax(0, 1fr)` 防止长内容撑破列；
- 当前页用 `aria-current="page"` 标记，样式和行为都从这里取；
- 多页站点必须在 `rollupOptions.input` 里列出每个 HTML，漏了只会 404 不报错；
- 上线前用 `preview` 验证 `dist`，开发服务器验证不了路径与 `base`。
