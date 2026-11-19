---
title: 竞态、防抖与并发控制
summary: '同一个接口连发三次, 返回顺序不保证, 后到的旧响应会盖掉新结果, 这叫竞态。两种解法: 用请求序号在回调里丢弃过期结果, 或用 AbortController 直接掐掉在途请求。输入框还要先防抖减少请求数, 批量任务则用并发池限流, 而不是一次发出几百个。'
category: frontend
node: frontend-data-race
order: 76
level: 进阶
tags: [竞态, 防抖, 节流, 并发控制]
updated: 2026-11-19
mindmap: data-race.mindmap.json
terms: []
sources:
  - title: MDN · AbortController
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController
    note: 用 signal 取消在途请求的写法。
  - title: web.dev · Debounce your input handlers
    url: https://web.dev/articles/debounce-your-input-handlers
    note: 输入事件防抖的动机与实现。
  - title: GitHub · p-limit
    url: https://github.com/sindresorhus/p-limit
    note: 并发池的接口形状与语义参照。
---

上一篇的缓存解决了「同一个请求发太多次」, 但没解决「发了多个, 回来的顺序不对」。搜索框里输入「react」, 用户删到「rea」再补成「react」, 中间可能有四个请求在飞, 谁先回来完全看网络。

## 后发先至

```js
async function search(q) {
  const res = await fetch(`/api/search?q=${q}`);
  const data = await res.json();
  renderList(data); // 谁后到谁生效
}

search('r');      // 后端慢, 400ms 才回
search('re');     // 300ms 回
search('rea');    // 100ms 回
```

理想结果是 `rea` 的列表。实际很可能先渲染 `rea`, 再被 `re` 覆盖, 最后被 `r` 覆盖, 用户看到的是一个和输入框对不上的列表。

请求本身的先后顺序是这样, 但网络没有顺序保证。同域的 HTTP/1.1 连接数有限, 排队的请求可能被后来的请求插队; HTTP/2 多路复用下更是各走各的。服务端处理时间也各不相同, 快查询先回是常态。

这个现象叫竞态 (race condition), 表现是「界面数据偶尔错乱」, 刷新一下又好了, 很难复现。

## 序号法

最省事的办法是给每次请求编号, 回来时对一下是不是最新的:

```js
let latest = 0;

async function search(q) {
  const id = ++latest;
  const res = await fetch(`/api/search?q=${q}`);
  const data = await res.json();

  if (id !== latest) return; // 过期了, 结果丢掉
  renderList(data);
}
```

注意判断要放在 `await` 之后、写状态之前。放在请求发出前没有意义, 那时它一定是最新的。

序号法不省带宽, 三个请求照样都发出去、都读完。它的好处是简单, 不依赖 `AbortController`, 也不会因为取消产生 `AbortError`。

在组件里, 这个 `latest` 既不能写进函数体 (`let latest = 0` 每次渲染都会重置成 0), 也不能是模块级变量 (多个组件会互相踩)。React 用 `useRef(0)` 跨渲染保留, Vue 用 `ref` 或者干脆放到 `setup` 外层。

## 取消在途请求

第 7 章讲 `AbortController` 那篇拆过 signal 的细节, 这里只看它在竞态里的用法: 新请求发出前, 把上一个取消。

```js
let controller;

async function search(q) {
  controller?.abort();            // 上一轮直接作废
  controller = new AbortController();

  try {
    const res = await fetch(`/api/search?q=${q}`, { signal: controller.signal });
    renderList(await res.json());
  } catch (err) {
    if (err.name === 'AbortError') return; // 主动取消, 静默
    showError(err);
  }
}
```

两个细节容易错。一是 `abort()` 之后 `fetch` 的拒绝是异步的, `catch` 会照常进来, 不判 `AbortError` 就会弹一次「网络错误」。二是取消只对还没结束的请求有效, 已经回来的请求照样会走到 `renderList`, 所以严格来说还是要配一个序号兜底。

| 方案 | 省带宽 | 复杂度 | 适用 |
| --- | --- | --- | --- |
| 请求序号 | 否 | 低 | 大多数列表、详情页 |
| `AbortController` | 是 | 中 | 输入联想、路由切换、大响应 |
| 两者合用 | 是 | 中 | 响应体大且顺序敏感的搜索 |

## 防抖与节流

竞态解决的是「回来的顺序」, 防抖解决的是「发的太多」。输入框每敲一个字符发一次请求, 十个字符就是十次。

```js
function debounce(fn, wait = 300) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

const onInput = debounce((value) => search(value), 300);
input.addEventListener('input', (e) => onInput(e.target.value));
```

300 毫秒是常用值: 低于 200 用户会觉得卡, 高于 500 会觉得慢。中文输入法还要注意 `compositionstart` / `compositionend`, 拼音阶段触发的 `input` 事件不该发请求, 否则「zhongguo」会打出去七个请求。

节流是另一个东西: 固定时间内最多执行一次, 不管触发多少次。

| | 防抖 debounce | 节流 throttle |
| --- | --- | --- |
| 行为 | 停止触发 wait 毫秒后才执行 | 每 wait 毫秒最多执行一次 |
| 典型场景 | 搜索联想、表单校验、窗口 resize 后重算 | 滚动加载、拖拽、`mousemove` |
| 关键参数 | 最后一次 | 第一次与最后一次 |

防抖不等于解决竞态。300 毫秒内如果用户输入了两次, 仍然会发出两个请求, 后发的可能先回。两个工具要一起用: 防抖降次数, 序号或取消保顺序。

## 并发池

一次性发出 200 个请求, 浏览器同域只开 6 个左右的连接, 其余排队; 服务端还可能直接 429。手动限流用一个池子:

```js
function pLimit(concurrency) {
  let active = 0;
  const queue = [];

  const next = () => {
    active--;
    if (queue.length) queue.shift()();
  };

  return (fn) => new Promise((resolve, reject) => {
    queue.push(() => {
      active++;
      fn().then(resolve, reject).finally(next);
    });
    if (active < concurrency) queue.shift()();
  });
}

const limit = pLimit(4);
const results = await Promise.all(ids.map((id) => limit(() => fetchItem(id))));
```

`Promise.all` 保证 `results` 的顺序与 `ids` 一致, 和完成先后无关, 因为下标由 `map` 决定。真正并发在跑的始终不超过 4 个。

池子默认是快速失败: 任何一个任务 reject, `Promise.all` 立刻抛出, 但已经在跑的任务不会停。批量导入这类「允许部分失败」的场景, 要把每个任务包成永不 reject 的形式:

```js
const settled = await Promise.allSettled(ids.map((id) => limit(() => fetchItem(id))));
const failed = settled.filter((r) => r.status === 'rejected');
```

`allSettled` 等全部结束, 拿到每个的成功或失败。它和池子配合时, 失败不会中断后面排队的任务。

## 坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 列表偶尔显示上一个关键词的结果 | 没有丢弃过期响应 | 序号判断放在写状态之前 |
| 每次输入都弹「请求失败」 | `AbortError` 被当真实错误 | `catch` 里先判 `name` |
| 拼音输入触发一堆请求 | 没处理输入法合成事件 | 监听 `compositionend` 再搜 |
| 防抖后仍然乱序 | 防抖只减次数, 不保顺序 | 配序号或取消 |
| 200 个请求全发出去被限流 | 没有并发上限 | 用池子限到 4 到 6 |
| 池子里一个失败, 后面全没跑 | `Promise.all` 快速失败 | 换 `allSettled` 或包一层 |

还有一处容易忽略: `useEffect` 里的清理函数要同时负责「取消请求」和「标记失效」。只做其中一个, 在 React 18 的严格模式下开发环境会看到两次请求, 第二次覆盖第一次的 loading 状态, 界面闪一下。

## 小结

- 网络不保证返回顺序, 后发先至会让旧数据覆盖新数据, 这是竞态;
- 序号法在写状态前比对 id, 丢掉过期结果, 简单但不省带宽;
- `AbortController` 真正中止在途请求, 取消产生的 `AbortError` 不该报错;
- 防抖减少请求数量, 不解决顺序, 两者要一起用;
- 并发池用固定数量的 worker 抢任务, `Promise.all` 保证结果顺序;
- 允许部分失败时换 `Promise.allSettled`, 别让一个 reject 掐掉整批。
