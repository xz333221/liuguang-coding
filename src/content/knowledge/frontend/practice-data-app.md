---
title: 做一个带数据的应用：路由、请求与状态
summary: '列表、详情、提交三件事凑齐，就走完了一个应用的主干。用原生 JS 加 fetch 写路由、请求封装、加载与错误态、内存缓存与失效，并说清什么时候该换成框架路由和 TanStack Query。'
category: frontend
node: frontend-practice-data-app
order: 112
level: 进阶
tags: [路由, fetch, 状态管理, 缓存, 错误处理]
updated: 2026-11-19
mindmap: practice-data-app.mindmap.json
terms: []
sources:
  - title: MDN · History API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/History_API
    note: pushState、popstate 与无刷新改地址的行为说明。
  - title: MDN · 使用 Fetch
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch
    note: Response.ok 的含义,以及 fetch 只在网络层失败时 reject。
  - title: TanStack Query · Important Defaults
    url: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
    note: 去重、重试、过期重取的默认值,作为手写缓存的对照。
---

上一篇的站点内容写死在 HTML 里，改一篇笔记要重新构建。真实项目至少要有列表、详情和提交，数据在服务端，页面得跟着变。这一篇用原生 JS 加 `fetch` 把这条链路搭起来，顺便标出哪些地方手写会开始亏本。

## 先把两类状态分开

同一个页面里的状态有两种来源，混在一起写是后面所有 bug 的起点。

| | 服务端状态 | 界面状态 |
| --- | --- | --- |
| 例子 | 订单列表、用户资料 | 弹窗开关、当前筛选条件、输入框内容 |
| 谁拥有 | 服务端，本地只是副本 | 浏览器，只此一份 |
| 会不会过期 | 会，别人改了它就不对 | 不会，刷新即重置 |
| 同步方式 | 重取、失效、乐观更新 | 直接赋值 |

订单列表放进 `useState` 之后再用 `useEffect` 去「同步」，就是在手工模拟一份缓存，而缓存该有的过期、去重、失效一个都没有。第 13 章那几篇讲的就是把这类状态交给专门的层。

## 路由：拦截点击，监听后退

单页应用(SPA,Single Page Application)只有一张 HTML，路径切换靠自己接管。

```js
const app = document.querySelector('#app')

const routes = [
  { re: /^\/$/, view: renderHome },
  { re: /^\/orders$/, view: renderOrders },
  { re: /^\/orders\/(\d+)$/, view: renderDetail, keys: ['id'] },
]

async function resolve(path) {
  const hit = routes.find((r) => r.re.test(path))
  if (!hit) return renderNotFound()

  const params = {}
  const m = hit.re.exec(path)
  hit.keys?.forEach((k, i) => { params[k] = m[i + 1] })

  app.setAttribute('aria-busy', 'true')
  await hit.view(params)
  app.removeAttribute('aria-busy')
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]')
  if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
  e.preventDefault()
  history.pushState({}, '', a.getAttribute('href'))
  resolve(location.pathname)
})

addEventListener('popstate', () => resolve(location.pathname))
resolve(location.pathname)
```

三件事必须做对，否则用户会觉得「这网站坏了」:

- 带修饰键的点击要放行，让 Ctrl 点开新标签页正常工作；
- `popstate` 要监听，浏览器的后退按钮改的是地址栏，不会触发点击；
- `pushState` 只改地址不刷新，页面内容得自己重新渲染；按 F5 时服务器会收到 `/orders/42`，静态托管上没有这个文件就是 404，得靠部署层的 history fallback 兜底，第 20 章讲部署那篇会展开。

## 请求收口到一个函数

`fetch` 有个反直觉的地方：404 和 500 都算「请求成功」,Promise 照样 resolve，只有断网、DNS 失败、被中止才 reject。

```js
const BASE = '/api'

export class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'; this.status = status; this.body = body
  }
}

export async function request(path, { signal, timeout = 8000, ...init } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), timeout)
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true })

  try {
    const res = await fetch(BASE + path, {
      ...init,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...init.headers },
    })
    if (!res.ok) throw new HttpError(res.status, await res.text())
    return res.status === 204 ? null : res.json()
  } finally {
    clearTimeout(timer)
  }
}
```

一个函数里塞了四件事：拼 base、判 `res.ok`、超时、把外部 `signal` 接进来。业务代码只写 `await request('/orders')`。超时用 `AbortController` 而不是 `Promise.race`，因为 race 只让调用方提前返回，请求还在跑，连接和内存都留着；`204` 没有响应体，得单独判一次再 `res.json()`。

## 三种界面状态

请求只有两个结果，界面却有四种样子，漏掉任何一种都会在线上显形。

| 状态 | 数据 | 界面 | 什么时候出现 |
| --- | --- | --- | --- |
| loading | 无 | 三行骨架屏 | 首次进入或切换筛选 |
| empty | `[]` | 「还没有订单」加一个新建按钮 | 请求成功但没数据 |
| error | 无 | 错误文案加「重试」按钮 | 网络失败或非 2xx |
| success | 有 | 列表或详情 | 正常返回 |

```js
let latest = 0

async function renderOrders() {
  const id = ++latest
  app.innerHTML = skeletonRows(3)
  try {
    const orders = await request('/orders?page=1')
    if (id !== latest || location.pathname !== '/orders') return   // 过期或已切走
    app.innerHTML = orders.length ? ordersHtml(orders) : emptyHtml()
  } catch (err) {
    if (id !== latest || err.name === 'AbortError' || location.pathname !== '/orders') return
    app.innerHTML = errorHtml(err)            // 文案 + 重试按钮,data-action="retry"
  }
}
```

`latest` 是竞态保护。用户在列表里连点两个订单，先发的请求可能后回，后渲染的内容就把正确的覆盖了。第 13 章讲竞态那篇把这个问题叫请求竞态，修法只有两种：取消旧请求，或者丢弃旧结果。这里用后者，简单且够用。错误文案要能指导下一步，「加载失败」四个字没有信息量，`HTTP 500` 加「重试」至少告诉用户不是他操作错了。

## 缓存与失效

同一个列表页来回切，每次都重新请求，既慢又浪费。加一层内存缓存，二十行就够。

```js
const cache = new Map()   // key -> { at, data }

export async function cached(key, fn, ttl = 30_000) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.data
  const data = await fn()
  cache.set(key, { at: Date.now(), data })
  return data
}

export function invalidate(prefix = '') {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
```

键必须包含所有影响结果的参数。`cached('/orders', ...)` 配上 `?page=2` 就会串页，写成 `cached('/orders?page=' + page, ...)` 才对。TTL 定多少看数据多久变一次：用户资料可以 5 分钟，订单状态 30 秒，库存这种秒级变化的干脆不要缓存，统一写 30 秒通常意味着没想过。

`invalidate` 用前缀匹配，是因为 `['/orders']` 要能带走 `/orders?page=1`、`/orders/42` 这些派生键。这跟 TanStack Query 的 `invalidateQueries({ queryKey: ['orders'] })` 是同一套思路，只是它做得更细。

## 该换成库的信号

手写到上面大约 120 行，还没处理在途去重、重试、分页、乐观更新、窗口聚焦刷新。

| 能力 | 手写 | TanStack Query |
| --- | --- | --- |
| 同键去重 | 自己存 Promise 再删 | 默认开启 |
| 失败重试 | 自己写循环与退避 | 默认 3 次，指数退避 |
| 分页与无限滚动 | 自己拼游标 | `useInfiniteQuery` |
| 失效与乐观更新 | Map 里删键，手动回填 | `invalidateQueries`、`onMutate` |

判断标准不是代码行数，是需求列表。只有「取一次、显示、偶尔刷新」，手写更透明；一旦出现「同屏两处要同一份数据」「提交后三处要跟着变」「上拉加载」，就是在重写一个查询库。页面超过五个、需要嵌套路由与参数校验时，框架路由的收益也远大于一个两百行的 `resolve`。

## 坑

- 拼 HTML 时把接口返回的字段直接塞进 `innerHTML`，用户昵称里写一段 `<img onerror>` 就能执行脚本，第 17 章讲 XSS 时给过同样的例子。渲染文本用 `textContent`，非拼不可时先转义；
- 请求没有 `signal`，切走页面后回调还在跑，对着已卸载的节点赋值，控制台一片 `Cannot set properties of null`;
- 把 `page` 存在局部变量里却不放进 URL，刷新后回到第一页，用户分享的链接也不是他看到的那页；
- 表单提交没禁按钮，双击发出两个 POST，服务端多一条订单。提交期间 `button.disabled = true`。

## 小结

- 服务端状态与界面状态分开管，前者需要过期与失效，后者不需要；
- 路由要接管点击、监听 `popstate`，并放行带修饰键的点击；
- `fetch` 只有网络层失败才 reject,`res.ok` 必须自己判，超时与取消都用 `AbortController`;
- loading、empty、error、success 四种界面一个都不能少，竞态用序号或取消挡住；
- 缓存键带全参数，提交后用前缀失效；需求一多就换成查询库，别把库重写一遍。
