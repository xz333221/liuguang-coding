---
title: 代码分割、懒加载与预取
summary: '首屏只需要入口和当前路由那一小部分代码。用 import() 切出按需块,按路由而不是按文件分,再用 modulepreload 提前拿当前页依赖、prefetch 在空闲时备好下一页,别让预取变成新的带宽竞争。'
category: frontend
node: frontend-performance-split
order: 87
level: 进阶
tags: [性能, 代码分割, 懒加载, 预取, modulepreload]
updated: 2026-11-19
mindmap: performance-split.mindmap.json
terms: []
sources:
  - title: web.dev · Reduce JavaScript payloads with code splitting
    url: https://web.dev/articles/reduce-javascript-payloads-with-code-splitting
    note: 动态导入如何产生分割点,以及按路由切分的思路。
  - title: MDN · modulepreload
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Attributes/rel/modulepreload
    note: modulepreload 的预加载与预解析语义。
  - title: web.dev · Prefetching and prerendering
    url: https://web.dev/articles/prefetching-and-prerendering
    note: prefetch 的优先级与空闲时机,预取的适用边界。
---

图片和字体压完,包里剩下的主要是 JS。一个后台系统打进一个 3MB 的 bundle,首屏却只用到一个登录页,这是很常见的起点。这一篇讲怎么把包切开、切在哪、什么时候把下一块悄悄拿过来。

## 一个包的问题

单 bundle 的代价有三层:

- 下载:首屏必须等全部代码到手才能执行入口;
- 解析与编译:字节变成可执行代码要花时间,和体积大致成正比;
- 执行:用不到的模块也在初始化,顶层副作用照样跑。

分割之后,后面两层收益往往比下载更明显。一个只被 `import` 但没有被调用的模块,如果不产生副作用,现代打包器能摇掉;但一旦在入口被引用并执行,就只能靠分割挪走。

## import() 造出分割点

静态 `import` 必须在模块开始执行前解析完,打包器只能把它并进当前块。动态 `import()` 返回 Promise,天然是一个切分点:

```js
// 静态导入:并进入口块
import { formatDate } from './date.js';

// 动态导入:单独成块,调用时才加载
button.addEventListener('click', async () => {
  const { exportExcel } = await import('./export-excel.js');
  exportExcel(rows);
});
```

打包器看到 `import()` 就生成一个独立 chunk,运行时按需插入 `<script>` 或用 `import()` 原生加载。路径可以拼,但完全动态的路径(变量拼出来的字符串)会让打包器无法静态分析,通常只能整包保留。

Webpack 里可以用魔法注释指定 chunk 名与预取策略:

```js
const mod = await import(
  /* webpackChunkName: "export-excel" */
  /* webpackPrefetch: true */
  './export-excel.js'
);
```

Vite 与 Rollup 不用注释控制命名,靠 `build.rollupOptions.output.chunkFileNames` 统一规则。注释写错不报错,只是不生效,chunk 名退回默认。

## 切在路由上

最稳的一条边界是路由。用户从 `/list` 跳到 `/detail`,本来就要等待,这段时间加载新页面的代码不会额外增加可感知的延迟:

```tsx
import { lazy, Suspense } from 'react';

const Detail = lazy(() => import('./pages/Detail'));

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Detail />
    </Suspense>
  );
}
```

`lazy` 只接受返回 Promise 的工厂函数,`Suspense` 提供加载中的占位。Vue 对应的是 `defineAsyncComponent(() => import('./Detail.vue'))`。

把分割点放在路由上,还有一个附带好处:首屏的 chunk 数量可控,HTTP/2 下也不至于一次并发几十个请求。

## 组件级分割的边界

再往下切到组件,收益就不一定了。判断标准是三条同时成立:

- 体积够大(通常几十 KB 以上);
- 不在首屏,或者要用户操作才出现;
- 加载时的空白有地方放占位,不会造成布局跳动。

典型的是富文本编辑器、图表库、地图 SDK、导出模块。这些动辄几百 KB,首屏用不到,切开很值。

反例是把每个小组件都包一层 `lazy`。每个 chunk 有自己的请求开销和模块边界,拆得太碎,请求数上升、缓存命中变差,总耗时反而更长。

## modulepreload 与 prefetch

分割之后,首屏的依赖链会变长:入口要等 chunk A,chunk A 又要等 chunk B。`modulepreload` 用来把这条链提前:

```html
<link rel="modulepreload" href="/assets/vendor.js">
<link rel="modulepreload" href="/assets/entry.js">
```

它比 `preload as="script"` 多做一步:不仅下载,还会解析并编译模块,把依赖图准备好。用在当前页面一定会用到的模块上,别用在「可能会用」的模块上。

`prefetch` 是另一个语义:优先级最低,浏览器空闲时才下载,结果放进 HTTP 缓存,留给下一次导航:

```html
<link rel="prefetch" href="/assets/detail-page.js" as="script">
```

也可以在运行时按需触发:

```js
function prefetchOnIdle(url) {
  const run = () => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 2000);
  }
}
```

`requestIdleCallback` 在 Safari 上支持较晚,`setTimeout` 兜底即可。`timeout` 保证即使一直不空闲,也会在超时后执行。

| 提示 | 优先级 | 下载时机 | 用途 |
| --- | --- | --- | --- |
| `preload` | 高 | 立即 | 当前页必需的单个资源 |
| `modulepreload` | 高 | 立即,并解析编译 | 当前页的模块依赖图 |
| `prefetch` | 最低 | 空闲时 | 下一次导航可能用到的资源 |

三者的区别不在「下载」,而在「什么时候」和「给谁用」。当前页用 `modulepreload`,下一页用 `prefetch`,写反了只会抢带宽。

给「用户大概率会去的下一页」做预取,比如列表页预取详情页。给所有链接都预取,等于把首屏带宽分给了还没人看的页面。

## 预取的代价

三个坑:

- 弱网或计量网络下预取是在抢带宽。可以用 `navigator.connection.saveData` 与 `effectiveType` 判断后跳过;
- 预取的东西用户没去,流量白花,缓存还可能被挤掉;
- 对带鉴权或会写日志的接口做预取,可能产生意料之外的请求。

```js
const conn = navigator.connection;
const skip = conn?.saveData || /2g/.test(conn?.effectiveType ?? '');
if (!skip) prefetchOnIdle('/assets/detail-page.js');
```

`navigator.connection` 不是标准,Firefox 与 Safari 上可能拿不到,所以判断要写成可选链,拿不到就按「可以预取」处理。

## 小结

- 单 bundle 的代价在下载、解析、执行三层,后两层常被低估;
- `import()` 是分割点,`import()` 的路径要能被静态分析,否则切不开;
- 路由是最稳的切分边界,组件级只在「大、非首屏、有占位」三条都满足时才切;
- `modulepreload` 给当前页必用的模块,会顺带解析编译;
- `prefetch` 优先级低、空闲时下载,只给高概率的下一页;
- 预取要看 `saveData` 与网络类型,别在弱网里抢首屏带宽。
