---
title: IntersectionObserver、ResizeObserver 与 History
summary: 'IntersectionObserver 用 rootMargin 与 threshold 描述「快进视野了」,ResizeObserver 在布局后给出内容盒尺寸,History 的 pushState 不触发 popstate。三者都替代了过去在 scroll、resize 事件里读布局的写法。'
category: frontend
node: frontend-dom-observer
order: 47
level: 进阶
tags: [DOM, IntersectionObserver, ResizeObserver, History]
updated: 2026-11-19
mindmap: dom-observer.mindmap.json
terms: []
sources:
  - title: MDN · IntersectionObserver
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver
    note: root、rootMargin、threshold 的语义与回调参数。
  - title: MDN · ResizeObserver
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
    note: 观察的盒子类型、回调时机与循环限制。
  - title: MDN · History API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/History_API
    note: pushState、replaceState 与 popstate 的触发条件。
---

上一篇的 `fetch` 解决的是「数据怎么来」。页面还有一类状态只跟视口有关:谁滚进了屏幕、容器变宽了没有、用户点了后退。这些过去靠 `scroll`、`resize`、`hashchange` 硬扛,现在大多数场景有更省的办法。

## 事件方案的代价

监听 `scroll` 的做法是:每次滚动都读 `getBoundingClientRect()`,再和视口高度比一比。问题是这个回调在滚动时每帧都可能执行,一读布局属性就强制浏览器先把待处理的样式算完,也就是所谓的强制同步布局。滚动越顺,这项开销越明显。

```js
// 不推荐:滚动里读布局,每帧一次
window.addEventListener('scroll', () => {
  for (const img of document.querySelectorAll('img[data-src]')) {
    const rect = img.getBoundingClientRect();
    if (rect.top < innerHeight) load(img);
  }
});
```

观察者把这些判断交给了浏览器内核:内核本来就知道每个元素在哪、有没有和视口相交,不需要 JS 每帧去问。

| 观察者 | 观察什么 | 典型用途 |
| --- | --- | --- |
| `IntersectionObserver` | 元素与某个容器的交叉状态 | 懒加载、无限滚动、曝光统计 |
| `ResizeObserver` | 元素自身尺寸变化 | 容器宽度驱动图表重绘 |
| `MutationObserver` | DOM 结构变化 | 第三方脚本监控、富文本同步 |
| `PerformanceObserver` | 性能条目 | 采集 LCP、长任务 |

## IntersectionObserver

构造函数接收回调和配置,配置有三项:`root` 是判定用的容器,`null` 表示视口;`rootMargin` 按 CSS margin 语法向外扩或向内缩;`threshold` 是交叉比例的阈值,可以是数组。

```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.src = entry.target.dataset.src;
    io.unobserve(entry.target);          // 加载完就不再观察
  }
}, {
  root: null,
  rootMargin: '200px 0px',               // 提前 200px 触发
  threshold: 0,
});

document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
```

`rootMargin` 是懒加载的关键。设成 `200px 0px`,元素距离视口还有 200px 时就算「相交」,图片在用户滚到之前已经开始下载:

```text
        ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈   判定区上边界(rootMargin 外扩 200px)
                  │
                  │  这段提前量用来预加载
                  │
   ───────────────┴───────────────   视口顶部
                  │
                  │  这里才真正可见
```

`threshold` 决定什么时候回调。默认 `0` 表示「刚碰到边界」和「完全离开」各回调一次;设成 `[0.5, 1]` 则表示交叉比例跨过 50% 与 100% 时才回调。注意它不是「每次变化都回调」,没跨过阈值就不触发。

两个容易误解的点:

- 被观察的元素在 `observe` 之后会立刻收到一次回调,哪怕它还在屏幕外。所以回调里必须判断 `isIntersecting`,不能默认「收到回调就是可见」。
- `root` 如果不是 `null`,必须是 `target` 的祖先元素。观察一个和 `root` 没有祖先关系的元素,永远只会得到 `isIntersecting: false`。

无限滚动的写法是在列表底部放一个哨兵元素,它一进入视野就加载下一页:

```js
const sentinel = document.querySelector('#load-more');
const io = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  await loadNextPage();
}, { rootMargin: '400px' });

io.observe(sentinel);
```

加载完成后不需要重新 `observe`,哨兵还在原位就会继续触发;全部加载完再 `io.disconnect()`。

## ResizeObserver

`resize` 事件只告诉你窗口变了,拿不到「某个元素变成了多宽」。`ResizeObserver` 观察的是元素本身:

```js
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { inlineSize } = entry.contentBoxSize[0];
    chart.resize(inlineSize);            // 按容器宽度重绘
  }
});

ro.observe(document.querySelector('.chart-box'));
```

`entry.contentRect` 给的是 `width`、`height`、`top`、`left`;`contentBoxSize` 与 `borderBoxSize` 是数组(为了支持多列布局,横排书写模式下取 `[0]`)。要用哪种盒子,可以在 `observe` 的第二个参数里指定 `{ box: 'border-box' }`,默认是 `content-box`。

回调时机在布局之后、绘制之前。也就是说在回调里读到的尺寸是这一帧最终生效的值,不会读到一半的中间态。但也正因为如此,如果在回调里改了被观察元素的尺寸,浏览器会在下一帧再次触发回调,形成循环。循环次数超限时,控制台会出现:

```text
ResizeObserver loop completed with undelivered notifications.
```

改成在回调里只改「不影响自身尺寸」的属性,或者把改动挪到 `requestAnimationFrame` 之外的下一个任务里,循环就会断掉:

```js
const ro = new ResizeObserver(([entry]) => {
  const w = entry.contentRect.width;
  // 只改子元素的宽度,不改被观察元素自己的盒模型
  entry.target.firstElementChild.style.width = `${w - 32}px`;
});
```

几条边界:`transform` 不改变布局尺寸,所以缩放动画不会触发回调;`display: none` 的元素尺寸为 0,重新显示会再触发一次;它观察不了 `window` 和 `document`,窗口尺寸变化仍然要监听 `resize` 或用 `matchMedia`。

## History API

`pushState` 能在不刷新页面的前提下改地址栏,这是前端路由的基础。它的三个参数是状态对象、标题、新地址:

```js
history.pushState({ page: 2 }, '', '/list?page=2');
console.log(location.pathname);  // /list
console.log(history.state);      // { page: 2 }
```

标题参数目前被所有主流浏览器忽略,传空字符串即可。地址必须同源,否则抛 `SecurityError`。

关键行为是:**`pushState` 不会触发 `popstate`**。它只是压入一条历史记录并改地址,没有任何事件。如果你的渲染逻辑挂在 `popstate` 上,`pushState` 之后页面不会更新,必须手动调一次渲染函数:

```js
function render() {
  const page = new URLSearchParams(location.search).get('page') ?? '1';
  console.log('渲染第', page, '页');
}

document.querySelector('#next').addEventListener('click', () => {
  history.pushState({ page: 2 }, '', '/list?page=2');
  render();                            // pushState 不触发 popstate,自己调
});

window.addEventListener('popstate', (event) => {
  console.log(event.state);            // 前进/后退时拿到当初存的对象
  render();
});
```

`popstate` 只在历史记录被「遍历」时触发,来源是用户点前进后退按钮、调用 `history.back()` / `go()`。首次打开页面不触发,所以初始化时必须自己按 `location` 渲染一次,否则首屏空白。

`replaceState` 用法一样,区别是替换当前记录而不是新增。搜索框边输边改地址时用它,不然每敲一个字就多一条历史,用户得按十几次后退才能离开。

滚动位置由浏览器自己恢复。返回上一页时浏览器会尝试滚回离开时的位置,这个行为可能和你的列表渲染冲突(渲染前页面高度不够,滚不到位)。把 `history.scrollRestoration` 设为 `'manual'`(默认是 `'auto'`)可以关掉浏览器接管。

关掉之后就得自己记:离开前把 `scrollY` 存进 `sessionStorage`,回到页面时在数据渲染完成后再 `scrollTo`。顺序错了照样滚不到位,因为此时容器高度还是 0。

还有一个常被忽略的点:用 `pushState` 做出来的 `/list?page=2` 是一个真实地址,用户按 F5 时浏览器会向服务端请求它。服务端不做 fallback 到 `index.html` 的配置,刷新就是 404。

## 小结

- 滚动相关的判断优先交给观察者,避免在 `scroll` 里读布局属性造成强制同步布局;
- `IntersectionObserver` 的 `rootMargin` 决定提前量,`threshold` 决定回调时机,`observe` 后立刻有一次回调,必须判断 `isIntersecting`;
- `ResizeObserver` 在布局后、绘制前回调,`transform` 不触发,回调里改自身尺寸会导致循环;
- `pushState` 不触发 `popstate`,也不发起请求,同源限制不满足时抛 `SecurityError`;
- `popstate` 只在前进后退时触发,首次加载不触发,初始化要手动渲染一次;
- `history.scrollRestoration = 'manual'` 接管滚动恢复,但要在数据渲染完成后再滚。
