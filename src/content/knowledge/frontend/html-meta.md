---
title: meta、viewport 与资源加载顺序
summary: 'meta charset 必须靠前以避免乱码,viewport 的 width=device-width 与 initial-scale=1 决定移动端布局宽度,description 与 Open Graph 影响搜索与分享。script 的 defer / async / module 与 link 的 preload / preconnect 改变资源加载时机与阻断行为。'
category: frontend
node: frontend-html-meta
order: 9
level: 入门
tags: [HTML, meta, viewport, 资源加载, defer]
updated: 2026-11-19
mindmap: html-meta.mindmap.json
terms: []
sources:
  - title: MDN · HTML 元素参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
    note: meta、link 与 script 元素的属性说明。
  - title: web.dev · Learn HTML
    url: https://web.dev/learn/html
    note: 文档元信息与资源声明的讲解。
  - title: web.dev · Learn Performance
    url: https://web.dev/learn/performance
    note: 关键渲染路径、资源提示与加载阻断的实践。
---

语义化决定文档内容对人和辅助技术的含义,而文档外层的声明与资源加载决定浏览器怎样解析、何时取回资源。这一篇回到 `head`,讲 meta、viewport 与资源加载顺序。

## charset 必须早

`<meta charset="utf-8">` 声明文档的字符编码。解析器读到这条声明才会切换解码方式,因此它必须出现在 `head` 的前 1024 个字节内,放在 `title` 与其他内容之前。

HTTP 响应头的 `Content-Type` 也带 charset,且优先级更高;`meta` 是文件被本地打开或响应头缺失时的补充声明。

```html
<head>
  <meta charset="utf-8">
  <title>编码示例</title>
</head>
```

预期:中文正常显示;把同样的文件按 GBK 保存却声明 `utf-8`,浏览器会显示乱码。

## viewport

移动浏览器在没有 viewport 声明时,会先按约 980px 的布局视口渲染,再整体缩小到屏幕宽度,文字因此很小。

`width=device-width` 让布局视口等于设备宽度,`initial-scale=1` 让初始缩放为 1。

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

预期:手机打开页面时,布局宽度与屏幕宽度一致,文字保持设定大小,不会整体缩小。

不要加 `user-scalable=no` 或 `maximum-scale=1`:它们禁止用户放大,降低可访问性。响应式布局还需要 CSS 媒体查询配合,第 3 章会展开。

## description 与 Open Graph

`meta name="description"` 给出一句话摘要,搜索引擎可能在结果页展示它。它不直接提高排名,但影响点击率。

社交平台读取 Open Graph 协议的 meta,属性名用 `property`:常用字段有 `og:title`、`og:description`、`og:image` 与 `og:url`。

```html
<meta name="description" content="面向初学者的 HTML 教程,从文档结构讲到语义化。">
<meta property="og:title" content="HTML 入门">
<meta property="og:description" content="从文档结构讲到语义化。">
<meta property="og:image" content="https://example.com/cover.png">
```

预期:搜索结果与分享卡片使用这些文字和图片;页面本身的可见内容不受影响。

## script:defer、async 与 module

默认的 `script` 会阻断 HTML 解析:浏览器停下解析,下载并执行脚本,然后继续。脚本放在 `head` 且体积较大时,首屏会明显延迟。

两种加载策略:

- `defer`:并行下载,HTML 解析完成后按文档顺序执行,在 `DOMContentLoaded` 之前;
- `async`:并行下载,下载完立即执行,顺序不确定,适合统计、广告这类独立脚本。

`type="module"` 的脚本默认具有 `defer` 行为,并运行在严格模式与独立作用域中,可以用 `import` 引入其他模块。内联的普通 `script` 会忽略 `defer` 与 `async`。

```html
<script src="/js/analytics.js" async></script>
<script src="/js/app.js" defer></script>
<script type="module" src="/js/main.js"></script>
```

预期:`app.js` 在 DOM 解析完成后执行,能访问完整 DOM;`analytics.js` 可能在 `app.js` 之前或之后执行;`main.js` 按模块加载,默认延后执行。

## link:stylesheet、preload 与 preconnect

`link rel="stylesheet"` 引入样式表。CSS 会阻断渲染:浏览器需要 CSSOM 才能完成首次渲染。关键样式放在 `head`;打印样式可以用 `media="print"` 避免阻断。

`preload` 让浏览器以较高优先级提前下载当前页面很快会用到的资源,必须写 `as` 声明类型,且资源必须确实被使用,否则控制台会给出警告。

`preconnect` 提前完成 DNS、TCP 与 TLS 握手,适合跨域的关键资源域名;`dns-prefetch` 只做 DNS 解析,可作为兼容方案。

```html
<link rel="stylesheet" href="/css/main.css">
<link rel="preconnect" href="https://fonts.example.com" crossorigin>
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

预期:样式表阻断首次渲染;字体在使用前已开始下载,减少文字闪烁;与字体域的连接在请求前建立。

## 资源加载顺序与阻断

把上面的规则合起来,解析顺序大致如下:

```text
HTML 解析
  ├─ 遇到 <link rel="stylesheet"> → 下载 CSS,阻断渲染
  ├─ 遇到普通 <script> → 下载并执行,阻断解析
  ├─ 遇到 <script defer> → 并行下载,解析完成后按序执行
  └─ 遇到 <script async> → 并行下载,下载完立即执行
```

实践中的默认组合:

- 关键 CSS 放 `head`,首屏不用的样式拆出去或加 `media`;
- 业务脚本用 `defer`,独立第三方脚本用 `async`;
- 首屏图片不加 `loading="lazy"`,其余图片加;
- 跨域关键域名用 `preconnect`,首屏必需的字体或图片可以 `preload`,但不要滥用。

HTML 只声明结构与资源,这些资源怎样改变外观由 CSS 决定。第 3 章从选择器、组合器与伪类开始,先解决「改谁」的问题。

## 小结

- `meta charset` 放在 `head` 前 1024 字节内,避免编码判断错误导致乱码;
- viewport 用 `width=device-width` 与 `initial-scale=1`,不要禁止缩放;
- `description` 影响搜索摘要,Open Graph 用 `property` 定义分享信息;
- 普通 `script` 阻断解析,`defer` 保序延后,`async` 下载完立即执行,`module` 默认 `defer`;
- `stylesheet` 阻断渲染,`preload` 提前下载当前页必需资源,`preconnect` 提前建连;
- 资源策略按首屏需要选择,`preload` 与 `preconnect` 不作为默认配置。
