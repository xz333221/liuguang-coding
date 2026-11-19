---
title: 加载性能：关键渲染路径与资源提示
summary: 'HTML 到首屏之间,只有 HTML、CSS 与少量脚本在关键路径上,其余都可以推迟。用 preconnect 提前建连、preload 提前拿关键资源、fetchpriority 把带宽让给 LCP 元素,再用 defer 与 media 把不该阻塞的挪开。'
category: frontend
node: frontend-performance-loading
order: 85
level: 进阶
tags: [性能, 关键渲染路径, preload, preconnect, fetchpriority]
updated: 2026-11-19
mindmap: performance-loading.mindmap.json
terms: []
sources:
  - title: web.dev · Critical rendering path
    url: https://web.dev/articles/critical-rendering-path
    note: HTML、CSS、JS 如何阻塞首屏渲染的过程拆解。
  - title: web.dev · Preload critical assets
    url: https://web.dev/articles/preload-critical-assets
    note: preload 的 as 取值、crossorigin 要求与常见误用。
  - title: web.dev · Establish network connections early
    url: https://web.dev/articles/preconnect-and-dns-prefetch
    note: preconnect 与 dns-prefetch 的适用场景和数量建议。
---

上一篇把 LCP 拆成四段,其中第二段「资源加载延迟」和第三段「加载时长」都可以在 HTML 里提前干预。这一篇看首屏那几百毫秒:浏览器必须先拿到什么才能画出第一帧,哪些请求可以更早发出去,哪些又能往后放。

## 关键渲染路径

从收到 HTML 第一个字节,到首屏出现内容,中间这条链路叫关键渲染路径(critical rendering path)。链上的每一步都可能卡住后面的所有工作:

```text
HTML 字节
  │ 解析
  ▼
DOM  ──┐
       ├─ 样式计算 → 布局 → 绘制 → 首屏
CSSOM ─┘
  ▲
  │ 外部 CSS 必须下载并解析完
```

两件事决定这段时间的长短:HTML 要多久下载完,以及 CSS 什么时候到齐。CSS 是渲染阻塞(render-blocking)资源,浏览器不会在 CSSOM 建好之前画任何东西,否则会出现一帧没有样式的白页。

脚本的规则不同。普通 `<script>` 会中断 HTML 解析,下载并执行完才继续,顺带也挡住了后面所有内容的发现;加了 `defer` 或 `async` 就不再阻塞解析:

| 写法 | 阻塞解析 | 执行时机 | 适用 |
| --- | --- | --- | --- |
| `<script>` | 是 | 立刻 | 极少,必须在首屏前跑的少量代码 |
| `<script defer>` | 否 | 解析完、`DOMContentLoaded` 前,按顺序 | 依赖 DOM 的业务脚本 |
| `<script async>` | 否 | 下载完立刻,顺序不定 | 统计、广告等独立脚本 |
| `<script type="module">` | 否 | 默认 defer 行为 | 现代构建产物的入口 |

还有一类资源不在脚本里,却同样挡住画面:网页字体。文字要等字体文件或用后备字体才画得出来,默认行为是等最多 3 秒。这段时间里首屏可能整块空白,LCP 也随之推后。处理方式在下一篇,关键路径上要记住的是:字体是渲染依赖,不是普通静态资源。

## 提前建立连接

一个跨域请求要付的固定成本是 DNS 查询、TCP 握手、TLS 协商。在冷启动的网络环境里,这三步加起来往往比传输本身还贵。

`preconnect` 让浏览器在解析到标签时就完成这三步,后面真正发请求时省掉握手:

```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

跨域连接必须带 `crossorigin`,否则浏览器会为 CORS 与非 CORS 各建一条连接,预连接白做。

`dns-prefetch` 只做 DNS 查询,支持面更广、开销更小,适合「可能会连、但不一定」的域名:

```html
<link rel="dns-prefetch" href="https://analytics.example.com">
```

两者可以叠加,老浏览器忽略 `preconnect` 时还有 `dns-prefetch` 兜底。数量要克制,每个 `preconnect` 都占一条连接和一份内存,控制在 4 个以内,只给真正在首屏用到的源。

## 关键资源用 preload

`preload` 是「这个资源我马上要用,请以较高优先级去拿」。它解决的是「资源藏得太深,浏览器发现得太晚」:

```html
<!-- 字体:CSS 里才引用,发现得晚,且必须 crossorigin -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- 首屏大图:在 JS 里才设置 src,提前拉 -->
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
```

两条硬规则:

- `as` 必须写对(`script`、`style`、`font`、`image`、`fetch`、`document`),写错会按错误的优先级和目的地加载,拿到也用不上;
- `font` 类型的 preload 必须带 `crossorigin`,即使同源。字体请求走 CORS 匿名模式,少了这个属性浏览器会下载两份,控制台提示 `The resource was preloaded using link preload but not used within a few seconds`。

最后这条提示的意思是「预加载了但没人用」。出现它,要么 `as` 写错,要么资源根本没被引用,要么 `crossorigin` 不匹配。它不会报错,只会白白多一次请求。

## 把带宽让给 LCP 元素

`fetchpriority` 是给单个请求标优先级的提示,取值 `high`、`low`、`auto`:

```html
<!-- 首屏主图,别让它排在几十个脚本后面 -->
<img src="/hero.avif" alt="" fetchpriority="high" width="1200" height="600">

<!-- 折叠线以下的图,别跟首屏抢带宽 -->
<img src="/promo.avif" alt="" loading="lazy" fetchpriority="low">
```

首屏大图常常因为默认优先级低而排在异步脚本后面,`fetchpriority="high"` 把它提上来。反过来,折叠线以下的图片给 `low`,带宽自然让给首屏。

不要给所有图都加 `high`。所有请求都是高优先级,等于没有优先级,还会把真正关键的请求挤下去。

## 非关键 CSS 的处理

首屏用不到的样式,可以改成异步加载。经典写法是先用一个不阻塞的 `media` 拿下来,加载完再切成 `all`:

```html
<link rel="stylesheet" href="/print.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/print.css"></noscript>
```

`media="print"` 在打印介质下才生效,浏览器因此不会为它阻塞渲染,但仍会下载。`onload` 把 `media` 改成 `all` 后样式生效。`<noscript>` 是给禁用 JS 的环境兜底。

这条路只适合首屏确实用不到的样式,比如页脚、弹窗、富文本编辑器。把首屏样式也这么处理,会先闪一帧无样式内容,CLS 和观感都会更差。

## 别把 preload 当加速按钮

几个常见反例:

- 给每个 `<img>` 都配一条 `preload`:请求翻倍,还挤占了 HTML 与 CSS 的带宽;
- `preload` 一个 `as="script"` 但页面里用的是 `type="module"`:模块与普通脚本是两套加载逻辑,命中不了;
- 预加载了首屏用不到的大图:它抢在 CSS 前面,首屏反而更慢。

判断标准很简单:这个资源是否在首屏渲染的必经之路上,且浏览器发现它的时间明显晚于理想时间。两条都成立才值得写一条 `preload`。

## 小结

- 首屏只被 HTML 与 CSS 阻塞,脚本用 `defer` 或 `async` 移出关键路径;
- `preconnect` 提前完成 DNS、TCP、TLS,跨域要带 `crossorigin`,数量控制在 4 个以内;
- `preload` 必须写对 `as`,字体还要带 `crossorigin`,否则会重复下载;
- `fetchpriority="high"` 留给 LCP 元素,折叠线以下给 `low`,全给 `high` 等于没给;
- 非关键 CSS 可用 `media` 加 `onload` 异步化,但要接受一次样式切换;
- 每条资源提示都要能说清「它在首屏必经路上,而且发现得晚」。
