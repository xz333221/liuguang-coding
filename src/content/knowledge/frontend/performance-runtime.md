---
title: 运行时性能：长任务、虚拟列表与渲染开销
summary: '加载完只是开始，交互卡不卡取决于主线程有没有空。把超过 50ms 的任务切开让路、把长列表换成只渲染可见窗口、把一帧里的读写分成两段，是撑住 INP 的三件主要工作。'
category: frontend
node: frontend-performance-runtime
order: 88
level: 深入
tags: [性能, 长任务, 虚拟列表, INP, 渲染]
updated: 2026-11-19
mindmap: performance-runtime.mindmap.json
terms: []
sources:
  - title: web.dev · Optimize long tasks
    url: https://web.dev/articles/optimize-long-tasks
    note: 50ms 长任务的判定,以及用 yield 拆分任务的写法。
  - title: web.dev · Optimize INP
    url: https://web.dev/articles/optimize-inp
    note: 输入延迟、处理时间、呈现延迟三段的优化方向。
  - title: web.dev · Virtualize large lists with the content-visibility CSS property
    url: https://web.dev/articles/content-visibility
    note: 屏幕外内容的跳过渲染与长列表的替代方案。
---

上一篇把 JS 按需切开，首屏字节少了，但点开列表滚动两下还是卡。这时问题不在网络，在主线程：它被一段段超过 50ms 的任务占满，用户的点击只能排队。这一篇只看运行时。

## 50ms 这条线

主线程同一时刻只能做一件事。一段任务超过 50ms，浏览器就没法在两次任务之间及时处理输入，用户感觉到的就是「点了没反应」。

这三段时间加起来才是 INP:

```text
用户点击
  │
  ├─ 输入延迟    主线程在忙别的,事件在队列里等
  ├─ 处理时间    事件回调执行多久
  └─ 呈现延迟    改完样式到下一帧画出来
```

优化也按这三段下刀：减少输入延迟要拆长任务，减少处理时间要瘦身回调，减少呈现延迟要少改几何、少做同步布局。三者里输入延迟最常见，因为它由别人造成——你可能只写了一个点击回调，卡顿却来自同时在跑的解析或渲染。

## 把任务切开

一个渲染 5000 行的循环，一口气跑完就是几百毫秒的长任务。改成每批若干条，批与批之间主动让出主线程：

```js
async function renderInChunks(rows, chunkSize = 200) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    slice.forEach(renderRow);
    // 让浏览器有机会处理输入与渲染
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
```

`setTimeout(…, 0)` 会把后续代码排到下一个任务，浏览器在任务之间可以插入输入处理与渲染。代价是每次让路至少消耗约 4ms 的调度开销(嵌套层级深时会被钳到 4ms)，所以批量不能太小。

较新的 Chromium 提供 `scheduler.yield()`，语义就是「让出主线程，但尽快回来」，它比 `setTimeout` 更快恢复，还能保留优先级：

```js
async function renderInChunks(rows, chunkSize = 200) {
  const yieldToMain = () => {
    if (globalThis.scheduler?.yield) return scheduler.yield();
    return new Promise((r) => setTimeout(r, 0));
  };

  for (let i = 0; i < rows.length; i += chunkSize) {
    rows.slice(i, i + chunkSize).forEach(renderRow);
    await yieldToMain();
  }
}
```

写兼容分支是必要的，`scheduler` 不是所有浏览器都有。不要用 `requestIdleCallback` 做这类「用户等着看结果」的活：它只在真正空闲时执行，页面忙的时候可能一直拖到 `timeout` 才跑。

| 让路方式 | 恢复速度 | 适用 |
| --- | --- | --- |
| `scheduler.yield()` | 快，保留任务优先级 | 支持的浏览器优先用 |
| `setTimeout(fn, 0)` | 至少约 4ms 调度延迟 | 通用兜底 |
| `MessageChannel` | 快，不受 4ms 钳制 | 需要细粒度切分时 |
| `requestIdleCallback` | 只等真正空闲，可能很晚 | 非紧急的后台任务 |

## 虚拟列表

列表的另一个问题是节点数量。一万行 DOM，即使每行很轻，样式计算与布局也会慢到不可用。

虚拟列表(virtual list)的思路是只渲染视口内那几十行，其余用空白撑出滚动高度：

```js
const ITEM_HEIGHT = 48;
const OVERSCAN = 4;

function computeWindow(scrollTop, viewportHeight, total) {
  const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visible = Math.ceil(viewportHeight / ITEM_HEIGHT) + OVERSCAN * 2;
  return { start, end: Math.min(total, start + visible) };
}

function onScroll() {
  const { start, end } = computeWindow(list.scrollTop, list.clientHeight, total);
  if (start === lastStart && end === lastEnd) return; // 窗口没变就不重渲染
  lastStart = start;
  lastEnd = end;
  paint(start, end);
}
```

三个参数决定体验：

- 行高必须固定，或者能提前算出来。行高不定时得用测量加偏移表，复杂度和 bug 都会上一个台阶；
- `overscan` 是视口上下各多渲染几行，避免快速滚动时出现空白。给 3-6 行通常够，给太多就失去了虚拟化的意义；
- 撑高容器用 `padding-top` 或一个占位块，别把总高度写成 `height`，否则最后几行滚不到。

滚动回调本身也要收敛。`scroll` 每帧可能触发多次，用 rAF 合并，再把回调注册成 `passive`:

```js
let ticking = false;
list.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    onScroll();
  });
}, { passive: true });
```

`passive: true` 告诉浏览器「这个回调不会 `preventDefault`」，滚动就不必等回调执行完才开始，触屏上的差别很明显。

## 渲染开销从哪来

节点数降下来之后，剩下的开销主要在样式与布局。第 9 章讲过读写分离，列表场景里最容易踩的是「边改边读」:

```js
// 反例:每次写样式后读一次高度,读会强制同步布局
rows.forEach((row) => {
  row.style.padding = '8px';
  const h = row.offsetHeight; // 每次都要重算布局
  row.dataset.height = h;
});
```

改法是两轮循环，先读完再统一写：

```js
const heights = rows.map((row) => row.offsetHeight);
rows.forEach((row, i) => {
  row.style.padding = '8px';
  row.dataset.height = heights[i];
});
```

另一种减少渲染的方式是 `content-visibility: auto`。它让屏幕外的子树跳过布局与绘制，浏览器在需要时再补算：

```css
.feed-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 480px;
}
```

`contain-intrinsic-size` 给一个估算尺寸，否则滚动条会随着内容测算不断跳动。它适合高度大致固定的信息流，不适合高度差异极大的内容。

## 回调本身

事件处理里最贵的三件事：同步计算、同步布局、同步网络。

- 搜索框每输入一个字符就请求一次，应该防抖到 200-300ms，并丢弃过期响应，避免竞态(第 13 章讲请求层时展开过);
- 滚动里计算位置，应该合并到 rAF;
- 点击后立刻读 `getBoundingClientRect()` 再改样式，应该先读后写，或者把读的结果缓存起来。

动画尽量交给 CSS。`transform` 与 `opacity` 的动画在合成层上不需要主线程，即使主线程在跑长任务，动画也不掉帧；用 JS 每帧改 `left` 则完全依赖主线程，一次长任务就卡一下。

## 小结

- 超过 50ms 的主线程任务会推迟输入处理，直接拉高 INP;
- 大循环按批切开，批间用 `scheduler.yield()` 或 `setTimeout` 让路；
- 虚拟列表只渲染可见窗口，行高固定、`overscan` 3-6 行、容器用 padding 撑高；
- 滚动回调用 rAF 合并并加 `passive: true`;
- 一帧内先读后写，避免强制同步布局；`content-visibility` 可让屏外内容跳过渲染；
- 动画优先用 `transform` 与 `opacity`，别让主线程忙时拖累它。
