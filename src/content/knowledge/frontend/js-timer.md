---
title: 定时器、微任务与渲染时机
summary: 'setTimeout 只保证至少等这么久，嵌套超过 5 层后浏览器把最小延迟抬到 4ms。渲染发生在一轮微任务清空之后，requestAnimationFrame 正好卡在这个点上，所以动画用 rAF 而不是定时器。'
category: frontend
node: frontend-js-timer
order: 39
level: 进阶
tags: [JavaScript, setTimeout, requestAnimationFrame, 渲染]
updated: 2026-11-19
mindmap: js-timer.mindmap.json
terms: []
sources:
  - title: MDN · setTimeout()
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/setTimeout
    note: 延迟参数、4ms 嵌套下限与 this 绑定的说明。
  - title: HTML 规范 · Timers
    url: https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers
    note: 定时器初始化步骤与嵌套层级的规范化规则。
  - title: MDN · requestAnimationFrame
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame
    note: 回调时机、时间戳参数与后台暂停的行为。
---

上一篇的 `await` 让代码看起来是同步的，实际上每次让出都排进微任务队列。定时器排的是宏任务，两者落在不同队列，中间还隔着一次渲染机会。这个差别决定了什么时候该用 `setTimeout`，什么时候必须用 `requestAnimationFrame`。

## setTimeout 的语义

`setTimeout(fn, delay)` 的意思是「至少 delay 毫秒后，把 fn 放进宏任务队列」。它不承诺执行时刻，只承诺不早于。

`setTimeout` 返回一个数字 id,`clearTimeout` 用它撤回还没执行的回调。已执行的回调再 `clearTimeout` 不报错，什么也不做。

延迟参数有几个隐含约定：

- 传负数按 0 处理；
- 传 0 时浏览器实际按 1ms 左右排队，`setTimeout(fn, 0)` 和 `setTimeout(fn)` 效果相同；
- 嵌套层级超过 5 层后，小于 4ms 的延迟被强制改成 4ms。

```js
// 浏览器环境，观察嵌套后的实际间隔
let depth = 0;
function tick() {
  depth += 1;
  const start = performance.now();
  setTimeout(() => {
    console.log(depth, Math.round(performance.now() - start), 'ms');
    if (depth < 8) tick();
  }, 0);
}
tick();
```

前五次大约 1ms，之后稳定在 4ms 附近。这条规则来自 HTML 规范，为的是压住「递归 `setTimeout` 把主线程塞满」的写法；Node 的 `timers` 模块没有这一条，只有 1ms 下限，同一段代码在两端跑出的时间不同。

## 定时器为什么总是晚到

```js
const start = Date.now();
setTimeout(() => {
  console.log('实际等待：', Date.now() - start, 'ms');
}, 50);

while (Date.now() - start < 200) {} // 占住主线程
```

输出约 200ms。回调没法插进同步循环里，只能在循环结束、栈清空之后才轮到。

生产环境里更常见的版本是长任务：一次同步处理大数组、一次大 JSON 解析、一次复杂布局读取。每一个都让定时器往后推。Performance 面板里 50ms 以上的任务会被标红，需要拆成多段时用 `setTimeout` 或 `requestIdleCallback` 分片。

还有一层浏览器节流：标签页切到后台后，定时器最小间隔被拉长到 1 秒；长时间隐藏的页面会被进一步降到每分钟一次。依赖定时器做心跳的代码要接受这个事实，或者改用 `visibilitychange` 事件补一次同步。

## 渲染挤在哪一步

```text
取宏任务 → 执行到栈空 → 清空微任务队列
                              ↓
                  浏览器判断是否到帧（约 16.7ms 一次）
                              ↓
          requestAnimationFrame 回调（此时改样式最划算）
                              ↓
                  样式计算 → 布局 → 绘制 → 合成
```

要点是渲染在微任务清空之后。也就是说，一个宏任务里改了 DOM，只要没让出，浏览器不会在中间插一次渲染；等到微任务清空，才统一算一次。

`requestAnimationFrame`（rAF）的回调排在样式计算之前，是「这一帧最后一次改样式的机会」。回调参数是当前帧的时间戳，与 `performance.now()` 同一时间基准。

```js
let startTime;
function step(now) {
  if (startTime === undefined) startTime = now;
  const progress = Math.min((now - startTime) / 1000, 1);
  box.style.transform = `translateX(${progress * 200}px)`;
  if (progress < 1) requestAnimationFrame(step);
}
requestAnimationFrame(step);
```

用 `transform` 而不是 `left`:位移在合成阶段处理，不触发布局，也不触发重绘。

## rAF 与 setTimeout 的差别

`setTimeout(fn, 16)` 与显示器刷新不同步。定时器到点时可能刚好错过一帧，于是这一帧没有新画面，下一帧连跳两格，看起来就是抖动。rAF 由浏览器在每帧开始时调用，天然对齐刷新率，页面隐藏时还会暂停，回来时不会补跑几十次。

| 调度方式 | 队列 | 触发时机 | 典型用途 |
| --- | --- | --- | --- |
| `setTimeout` | 宏任务 | 至少 N 毫秒后，且主线程空闲 | 延迟执行、轮询、分片 |
| `setInterval` | 宏任务 | 每隔 N 毫秒排一次队 | 低频状态刷新 |
| `requestAnimationFrame` | 渲染前 | 下一帧开始，样式计算之前 | 动画、逐帧读取布局 |
| `requestIdleCallback` | 空闲 | 一帧剩余时间足够时 | 低优先级计算 |
| `queueMicrotask` | 微任务 | 当前宏任务结束前 | 状态同步后的收尾 |

`requestIdleCallback` 的兼容性不如前几个，Safari 直到较近的版本才支持，关键路径上不要只依赖它。

## setInterval 的节奏会漂移

```js
let count = 0;
const id = setInterval(() => {
  count += 1;
  const t = Date.now();
  while (Date.now() - t < 120) {} // 模拟 120ms 的工作
  console.log('第', count, '次');
}, 100);
setTimeout(() => clearInterval(id), 600);
```

间隔设 100ms，回调自己花了 120ms，实际节奏变成「执行完立刻下一次」，间隔被吃光。要等上一次结束再计时，用递归 `setTimeout`:

```js
function poll() {
  fetchStatus().finally(() => {
    timer = setTimeout(poll, 1000); // 上一次结束后才开始计时
  });
}
let timer = setTimeout(poll, 1000);
```

轮询、自动保存、心跳这类任务用递归 `setTimeout`；只有确实需要固定频率、且回调很短时才用 `setInterval`。

## 停止条件要写在回调里

`setInterval` 最容易出的问题是忘了清：组件卸载了、页面切走了，定时器还在跑，回调里访问已经销毁的 DOM 或状态，控制台刷出一片错。

固定做法是保存 id，在 `beforeunload`、框架的卸载钩子、`pagehide` 里清掉。用 `setTimeout` 递归时，把「是否继续」判断放在递归调用之前，而不是指望外部调用方记得清。

## 小结

- `setTimeout` 只保证「不早于」，主线程忙就顺延，0 延迟实际约 1ms;
- 浏览器对嵌套超过 5 层的定时器强制 4ms 下限，Node 没有这条规则；
- 渲染发生在微任务清空之后、下一帧开始时，一帧内多次改 DOM 只算一次；
- `requestAnimationFrame` 对齐刷新率、后台暂停，动画优先用它，位移用 `transform`;
- `setInterval` 的间隔会被回调耗时挤掉，需要等上一次结束就用递归 `setTimeout`;
- 定时器 id 要保存，页面切走或组件卸载时必须清理。
