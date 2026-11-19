---
title: PWA：Service Worker 与离线缓存
summary: 'Service Worker 是页面之外的网络代理,脚本地址决定作用域,只支持 HTTPS 与 localhost。install 预缓存、activate 清旧缓存、fetch 拦截请求,skipWaiting 会让新旧资源混用。'
category: frontend
node: frontend-cross-pwa
order: 107
level: 进阶
tags: [PWA, Service Worker, 离线缓存, CacheStorage]
updated: 2026-11-19
mindmap: cross-pwa.mindmap.json
terms: []
sources:
  - title: MDN · Service Worker API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API
    note: 注册、生命周期事件与作用域规则的规范描述。
  - title: web.dev · Service workers
    url: https://web.dev/learn/pwa/service-workers
    note: 缓存策略、离线回退与更新流程的实践说明。
  - title: MDN · Web App Manifest
    url: https://developer.mozilla.org/zh-CN/docs/Web/Manifest
    note: display、icons、start_url 等字段的含义与可安装条件。
---

上一篇把左右方向的硬编码换成了 `margin-inline-start` 这类逻辑属性,界面在 RTL 环境下终于不再错位。语言本地化解决的是「看得懂」,这一篇解决「打不开」:地铁里断网,页面不该只剩一只恐龙。

## Service Worker 是页面之外的一层代理

它跑在自己的线程里,不碰 DOM,只处理网络。页面发出的每个同源请求都可以先经过它,由它决定走缓存还是走网络。

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log(reg.scope);          // https://example.com/
    console.log(reg.active?.state);  // 'activated'
  });
}
```

作用域由脚本地址推导。脚本放在根目录,scope 就是 `/`,能接管全站;放在 `/assets/js/sw.js`,默认 scope 只有 `/assets/js/`,首页的请求根本不经过它。

| 脚本位置 | 默认 scope | 能控制的页面 |
| --- | --- | --- |
| `/sw.js` | `/` | 全站 |
| `/app/sw.js` | `/app/` | `/app/` 及其子路径 |
| `/assets/js/sw.js` | `/assets/js/` | 只有这个目录 |

想让深处的脚本拿到更大作用域,必须由服务端在响应头里给 `Service-Worker-Allowed: /`,否则注册直接抛 `SecurityError`。注册还有一条硬限制:页面必须是 HTTPS,或者 `localhost`、`127.0.0.1` 这类被信任的来源。HTTP 下 `navigator.serviceWorker` 这个属性本身就不存在,内网自签证书部署时最容易卡在这一步。

## install、activate、fetch 三阶段

第一次注册依次走完这三个事件,之后每次启动只是唤醒 worker,不再重装。

```js
const CACHE = 'app-v3';
const PRECACHE = ['/', '/index.html', '/assets/app.css', '/assets/app.js', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
```

`event.waitUntil` 不是可选项。回调同步返回之后,浏览器认为事件处理完毕,可能立刻终止 worker,异步的 `cache.addAll` 会被掐断;传进去的 Promise 让浏览器延长生命周期,直到它 settle。

`install` 最容易踩的坑是 `addAll` 的原子性:清单里任何一个地址返回 404,整个 install 失败,新版本装不上,旧版本继续控制页面。用户刷新十次看到的还是老界面,控制台只有一条 `ServiceWorker registration failed`。预缓存清单要在发布前用脚本核一遍。

## skipWaiting 与 clients.claim 的代价

默认行为很保守:新 worker 装好后停在 waiting 状态,直到这个作用域下的页面全部关闭,才在下次打开时接管。

嫌这个流程慢,往往会顺手加上 `self.skipWaiting()` 与 `self.clients.claim()`。代价是同一时刻页面跑着旧版 JS,缓存里已经是新文件:旧页面点一个按钮,动态 `import()` 一个已被删掉的 chunk,报 `ChunkLoadError`;新 worker 在 activate 里清掉旧缓存,老页面的图片全部 404。这类问题只在「发布那一刻正好有人开着页面」时出现,日志里很难复现。

更稳的做法是把选择权交给用户:发现 waiting 的 worker 就弹提示,用户点了「刷新」再 `reg.waiting?.postMessage('SKIP_WAITING')`。刷新动作必须去重,`controllerchange` 触发后才 reload:

```js
// sw.js:等待页面发来的指令
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// 页面侧:发现有个装好但没激活的 worker,弹提示
navigator.serviceWorker.register('/sw.js').then((reg) => {
  if (reg.waiting) showUpdateBar(reg);
  reg.addEventListener('updatefound', () => {
    const next = reg.installing;
    next?.addEventListener('statechange', () => {
      if (next.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(reg);
    });
  });
});

// 只刷新一次,否则 controllerchange 会把页面刷成死循环
let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  location.reload();
});
```

## 三种缓存策略

`CacheStorage` 只有 `match`、`put`、`add`、`delete`、`keys` 几个方法,策略全靠自己组合。

| 策略 | 读取顺序 | 适合 | 代价 |
| --- | --- | --- | --- |
| cache-first | 先查缓存,没有再请求并写入 | 带内容哈希的 JS、CSS、字体 | 更新只能靠换缓存名 |
| network-first | 先请求,失败落回缓存 | HTML、频繁变动的接口 | 弱网下白等一次超时 |
| stale-while-revalidate | 立刻返回缓存,同时后台请求并覆盖 | 头像、列表 JSON | 用户看到的是上一次的数据 |
| network-only | 只走网络 | 支付、风控接口 | 断网即失败,这是期望行为 |

stale-while-revalidate 最实用,也最容易写错:

```js
async function staleWhileRevalidate(request) {
  const cache = await caches.open('data-v1');
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached ?? network;
}
```

两个细节:`res.clone()` 必须调用,`Response` 的 body 是一次性流,被 `put` 读走之后页面就拿不到内容;`res.ok` 判断不能省,否则 404 和 500 会被当成正常结果缓存下来,之后每次刷新都是错误页。

## 缓存版本与离线回退页

缓存名就是版本号,发布时改一个字符。改了名,install 会新建空缓存,activate 把不在白名单里的旧缓存全删掉。忘了改名是另一种常见的坑:HTML 已更新,引用的 JS 文件名也变了,但 `caches.match` 命中的仍是上一版资源,现象是「发版了但样式还是旧的」,强制刷新才有用。

`fetch` 里还要区分导航请求与资源请求,导航失败时返回离线页,比浏览器自带的错误页体面得多:

```js
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
```

`/offline.html` 本身必须在预缓存清单里,否则断网时连它都取不到,回退逻辑等于没有。它也不该依赖外部 CSS 与字体,内联样式最稳。

## manifest 与可安装条件

```json
{
  "name": "流光笔记",
  "short_name": "笔记",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`display` 用 `standalone` 时没有地址栏,视觉上接近原生;`start_url` 决定点开图标进哪个页面,带上来源参数便于统计安装带来的流量;`icons` 至少给 192 与 512 两个尺寸,标 `maskable` 的那张要留出约 20% 的安全边距,否则 Android 的圆形图标会切掉主体。页面里用 `<link rel="manifest">` 引用它,再补一个 `<meta name="theme-color">`。

Chrome 的安装条件大致是:manifest 里 `name` 或 `short_name` 至少有一个、有 192 与 512 的图标、`start_url` 可访问、`display` 为 `standalone` 或 `minimal-ui`,外加一个带 `fetch` 处理器的 Service Worker。少一条,地址栏就不出现安装图标,也不提示缺了什么。iOS 上是另一套规则:不支持 `beforeinstallprompt`,只能让用户手动「分享 → 添加到主屏幕」。

## 调试时的几个现象

- 改完代码刷新没变化:Service Worker 还在用旧缓存。DevTools 的 Application → Service Workers 勾 `Update on reload`,或临时勾 `Bypass for network`。
- `sw.js` 自己也被缓存:注册时传 `{ updateViaCache: 'none' }`,并给它配 `Cache-Control: no-cache`。
- 注册成功却没有 controller:首次安装后当前页面要刷新一次才被接管,这是正常行为。
- 更新检查不是实时的:浏览器在导航时或每 24 小时左右检查一次脚本是否变化。

## 小结

- Service Worker 是独立线程的网络代理,脚本地址决定默认作用域,只支持 HTTPS 与 localhost;
- `install` 失败会让新版本装不上,预缓存清单必须先校验路径;
- `event.waitUntil` 才能延长生命周期,否则异步操作会被中途终止;
- `skipWaiting` 加 `clients.claim` 换来即时更新,代价是新旧资源混用导致白屏或 chunk 加载失败;
- 缓存名当版本号用,`activate` 里按白名单清理旧缓存;
- 静态资源用 cache-first,HTML 与接口用 network-first 或 stale-while-revalidate;
- 可安装性要求 manifest 与 Service Worker 同时达标,各浏览器判定规则还不一致。
