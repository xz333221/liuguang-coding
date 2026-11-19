---
title: 渲染模式：CSR / SSR / SSG / islands
summary: '生成位置决定首屏、SEO 与服务器成本:CSR 全交给浏览器,SSR 每次请求现渲染再 hydration,SSG 构建时出静态 HTML,islands 只给交互块注水。选型看首屏要不要被搜索引擎抓到,以及多少组件真需要 JS。'
category: frontend
node: frontend-framework-render-mode
order: 73
level: 深入
tags: [SSR, SSG, hydration, islands, 渲染模式]
updated: 2026-11-19
mindmap: framework-render-mode.mindmap.json
terms: []
sources:
  - title: React 官方文档 · 服务端渲染
    url: https://zh-hans.react.dev/reference/react-dom/server
    note: renderToString 与流式渲染接口,以及客户端 hydration 的配合方式。
  - title: Vue 官方文档 · 服务端渲染(SSR)
    url: https://cn.vuejs.org/guide/scaling-up/ssr.html
    note: SSR 的收益与代价,hydration 不一致的成因。
  - title: Astro 文档 · 岛屿
    url: https://docs.astro.build/zh-cn/concepts/islands/
    note: islands 架构与 client:load / idle / visible / only 指令。
---

前面几篇都默认代码在浏览器里执行。这个假设可以被打破:页面也可以在服务器上先生成 HTML,浏览器只负责接管。换的是生成位置,不换组件写法。

## 四种模式的分界

差别的本质是「HTML 由谁在什么时刻生成」。

| 模式 | HTML 生成时机 | 首屏内容 | 需要 JS | 服务器成本 | 典型场景 |
| --- | --- | --- | --- | --- | --- |
| CSR | 浏览器执行 JS 后 | 空容器 | 全部 | 纯静态托管 | 后台系统、强交互应用 |
| SSR | 每次请求 | 完整 | 全部 + hydration | 每请求一次渲染 | 个性化页面 + SEO |
| SSG | 构建时 | 完整 | 全部 + hydration | 构建一次 | 博客、文档、官网 |
| islands | 构建或请求时 | 完整 | 只有交互块 | 同 SSG / SSR | 内容为主、少量交互 |

CSR 的最小形态就是那个空 `div`:

```html
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

从请求 HTML 到用户看到内容,中间要经过下载 JS、解析、执行、发数据请求、渲染。这段时间页面是白的,只能靠骨架屏或 loading 缓解。

## SSR 与 hydration

服务端把组件跑一遍,输出字符串。

```js
// 服务端
import { renderToString } from 'react-dom/server'
const html = `<div id="root">${renderToString(<App />)}</div>`
res.send(page(html))

// 客户端
import { hydrateRoot } from 'react-dom/client'
hydrateRoot(document.getElementById('root'), <App />)
```

`hydrate` 和 `createRoot` 的区别是:它不创建 DOM,而是复用服务端已经输出的节点,只补上事件监听、状态和后续更新。这个过程叫 hydration(注水)。

Vue 对应的是 `createSSRApp` 加 `hydrate` 或 `createApp().mount()`——同一个 `mount` 在 SSR 场景下会自动走 hydration 分支。Nuxt 把这一套包好了。

复用的前提是两端首次渲染结果一致。不一致时框架只能猜:React 18 打印

```text
Hydration failed because the initial UI does not match what was rendered on the server.
```

然后放弃复用,把这一小块(有时是整棵)在客户端重新渲染一遍。用户会看到内容闪一下,首屏性能也退化成 CSR。Vue 报的是 `Hydration node mismatch`,会尽量按客户端的结构打补丁,偶尔留下错位的 DOM。

## hydration mismatch 的六种来源

按出现频率排。

- **时间**:`new Date()`、`Date.now()` 两端执行时刻不同。改成由服务端传入,或首屏显示占位。
- **随机**:`Math.random()` 用来做 id、文案、动画种子。
- **环境判断**:`typeof window !== 'undefined'` 走不同分支,`localStorage` 里读主题。
- **浏览器会纠正的 HTML**:`<p><div>…</div></p>`、`<table>` 里缺 `<tbody>`。服务端输出的字符串是合法的文本,浏览器解析时按自己的规则调整了结构,树就对不上了。
- **用户相关数据**:服务端不知道已登录,渲染出登录按钮;客户端读到 cookie 后渲染头像。
- **第三方组件**:某些 UI 库在挂载时才插入额外节点。

统一的修法是「把只能客户端知道的东西推迟到挂载之后」:

```jsx
function Clock() {
  const [now, setNow] = useState(null)
  useEffect(() => setNow(new Date()), [])   // 首次两端都是 null,结构一致
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{now ? now.toLocaleTimeString() : '--:--:--'}</span>
}
```

先渲染一个和服务端一致的占位,挂载后再换成真实值。这个模式有时叫 two-pass rendering,代价是这块内容晚一帧出现。

## SSG:把渲染挪到构建时

内容不常变,就没必要每次请求都算一遍。`astro build` 会把每个路由渲染成 `.html` 文件,部署到 CDN,首字节几乎只受网络影响。

SSG 的边界是「内容什么时候变」。博客、文档、营销页合适;价格、库存、登录后首页不合适。需要「构建后还能更新」时,有两条路:增量静态再生成(ISR,在请求时后台重建页面)和按需重新构建(内容变更时触发 CI)。前者依赖平台支持,后者最直白。

一个容易忽略的点:SSG 页面上的时间戳、版本号在构建时就固定了。写成 `new Date()` 会显示构建当天,不是访问当天。这类信息要么在客户端挂载后补,要么接受它是「构建时间」。

## islands:只给交互部分注水

传统 SSR 要把整个应用 hydrate 一遍,页面才能响应点击。对一篇 90% 是文字的文档站,这是浪费。

islands(岛屿架构)把页面拆成静态海洋加若干交互岛屿,只有岛屿需要 JS。

```astro
---
import Counter from '../components/Counter.jsx'
import Chart from '../components/Chart.jsx'
---

<h1>静态标题</h1>
<p>大段正文,零 JS。</p>

<Counter client:visible />
<Chart client:idle />
```

四个指令的差别:

| 指令 | 何时加载 JS | 适合 |
| --- | --- | --- |
| `client:load` | 立即 | 首屏必须可交互的控件 |
| `client:idle` | 主线程空闲 | 次要交互,如折叠面板 |
| `client:visible` | 进入视口 | 页面下方的图表、评论框 |
| `client:only` | 只在客户端渲染,跳过 SSR | 依赖 `window`、无法服务端渲染的组件 |

`client:only` 是个逃生口:它放弃了这块的 SSR 收益,首屏会有一瞬间的空缺,但省掉了所有 mismatch 问题。

islands 的代价在跨岛共享。两个岛屿之间不是同一棵组件树,Context 传不过去,得靠 nanostores 这类轻量方案在浏览器里同步,或者把它们合并成一个岛屿。交互密集的页面(比如在线编辑器)不适合 islands,整页框架更顺手。

## 怎么选

先回答两个问题,基本就能定。

1. 首屏内容需要被搜索引擎或社交预览抓到吗?不需要,CSR 就够,运维也最省。
2. 需要的内容是「每次请求都不同」还是「构建时就能定」?后者用 SSG。

剩下的是折中:

- 内容站加少量交互:SSG 加 islands(Astro 的默认形态);
- 个性化首页加 SEO:SSR(Next.js、Nuxt),用流式渲染把首屏先吐出来;
- 后台系统:CSR,登录后本来就不需要 SEO,首屏用骨架屏盖住;
- 电商详情:SSG 加按需再生成,库存与价格在客户端补。

## 三个 SSR 特有的坑

**服务端没有 window**。模块顶层写 `localStorage.getItem('theme')`,SSR 时直接抛:

```text
ReferenceError: localStorage is not defined
```

浏览器 API 一律挪进 `onMounted` 或 `useEffect`,或者用 `import.meta.env.SSR` 加判断。

**服务端不执行 useEffect / onMounted**。SSR 只跑渲染,副作用在客户端才执行。所以数据预取要放在框架提供的位置(服务端数据加载函数、server component),在 effect 里再请求一遍等于多一次往返,还把首屏内容推迟到水合之后。

**缓存把用户数据发错人**。SSR 输出的 HTML 被 CDN 缓存后,A 用户的「你好,张三」会发给 B 用户。带用户信息的响应必须 `Cache-Control: private, no-store`,只有公共内容才允许 CDN 缓存。

## 小结

- CSR 的首屏要等 JS 执行完,SSR 与 SSG 都把 HTML 提前生成;
- hydration 复用服务端 DOM,两端首次渲染不一致时会退回客户端重渲染;
- mismatch 主要来自时间、随机数、浏览器 API、非法 HTML 嵌套与用户相关数据;
- SSG 适合内容稳定的页面,ISR 与按需构建补上更新能力;
- islands 只 hydrate 交互块,代价是跨岛状态共享变复杂;
- SSR 里没有 `window`,不执行挂载钩子,带用户信息的响应不能进公共缓存。
