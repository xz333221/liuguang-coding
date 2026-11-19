---
title: 调用栈、任务队列与事件循环
summary: 'JavaScript 只有一个调用栈,同步代码跑完才从队列里取下一个任务。任务分宏任务与微任务,每个宏任务结束后微任务队列必须清空,之后才可能出现渲染机会。Promise 回调与 setTimeout 的执行差别就来自这里。'
category: frontend
node: frontend-js-eventloop
order: 36
level: 深入
tags: [JavaScript, 事件循环, 微任务, 调用栈]
updated: 2026-11-19
mindmap: js-eventloop.mindmap.json
terms: [runtime]
sources:
  - title: MDN · 事件循环
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop
    note: 运行至完成、任务队列与微任务队列的基本模型。
  - title: HTML 规范 · Event loops
    url: https://html.spec.whatwg.org/multipage/webappapis.html#event-loops
    note: 任务队列、微任务检查点与渲染机会的规范定义。
  - title: javascript.info · 事件循环:微任务和宏任务
    url: https://zh.javascript.info/event-loop
    note: 执行顺序的例子与微任务饥饿的说明。
---

第 6 章最后一篇《错误处理与调试》里,`try/catch` 能接住同步调用栈上的异常:函数抛出,`catch` 就在栈上。把同一段代码塞进 `setTimeout` 回调,`catch` 就接不住了。抛出时栈已经换了一层,外层那个 `try` 早就执行完毕。要弄清这件事,得先知道回调在什么时候才轮到执行。

## 调用栈:一次只跑一个函数

主线程只有一条调用栈（call stack）。函数被调用时压入一帧,返回时弹出。栈空,意味着当下没有同步代码在跑,这是事件循环取下一个任务的先决条件。三层函数嵌套里抛出异常,`a`、`b`、`c` 都还在栈上,外层的 `try` 也在,所以 `catch` 接得住。

换成异步版本就不一样了:

```js
try {
  setTimeout(() => {
    throw new Error('boom');
  }, 0);
} catch (err) {
  console.log('永远不打印');
}
console.log('try 块结束');
```

回调执行时,`try` 块结束很久了,栈上只剩回调自己。这类错误交给全局处理:浏览器触发 `window` 的 `error` 事件,Node 走 `uncaughtException`。

## 任务与微任务

排队等待执行的东西分成两类。区别不在优先级高低,而在「什么时候被检查」。

| 队列 | 里面的东西 | 谁来产生 |
| --- | --- | --- |
| 宏任务（task） | script 整体、`setTimeout`、`setInterval`、I/O 完成、UI 事件、`MessageChannel`、导航 | 浏览器与宿主环境 |
| 微任务（microtask） | `Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`、`await` 之后的代码 | 语言与 DOM 观察器 |

一个容易记错的点:微任务不是每次「插队」到宏任务前面,而是每个宏任务跑完后,整条微任务队列被清空一次,期间新产生的微任务也一起跑掉。

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');

// 1 5 3 4 2
```

`1`、`5` 属于当前这段同步代码,本身就是一个宏任务。`2` 排到定时器队列尾部,`3`、`4` 进微任务队列。同步代码结束后先清微任务,再取下一个宏任务。

## 一次循环的完整顺序

```text
┌─ 取一个宏任务，执行到栈空
│      ↓
├─ 清空微任务队列（过程中新排入的微任务也一并执行）
│      ↓
├─ 浏览器判断这一轮要不要渲染
│     要 → requestAnimationFrame 回调 → 样式计算 → 布局 → 绘制 → 合成
│      ↓
└─ 回到开头，取下一个宏任务
```

宏任务遵循「运行至完成」（run-to-completion）:一旦开始就不会被别的任务打断,只能被自己内部的同步代码拖住。

微任务里再排微任务,仍在同一轮清空:

```js
Promise.resolve()
  .then(() => {
    console.log('A');
    Promise.resolve().then(() => console.log('B'));
  })
  .then(() => console.log('C'));

// A B C
```

`A` 执行时排入 `B`;`C` 要等第一个 `then` 的回调返回之后才入队,所以 `B` 在前。

渲染不是每个宏任务后都发生。屏幕刷新率 60Hz 时约每 16.7ms 一帧,浏览器按帧决定是否渲染。一帧里可能已经跑完好几个宏任务,样式只计算一次。

## 微任务会把渲染饿死

```js
function spin() {
  Promise.resolve().then(spin);
}
spin();
```

这段代码让页面彻底失去响应。每轮清空微任务时都会产生新的微任务,队列永远清不空,微任务检查点迟迟不结束,浏览器拿不到渲染机会,点击和输入也轮不到处理。控制台里看不到报错,页面只是卡住。

同样的后果还有两种来源:同步的 `while (true)`,以及几十万条数据的同步排序。前者是微任务饥饿（microtask starvation）,后者是单个宏任务过长。Performance 面板里,超过 50ms 的任务会被标红,先看主线程那条轨道上最长的一段。

## 定时器为什么不准

`setTimeout(fn, 100)` 的语义是「至少 100ms 后把 `fn` 放进队列」,不是「100ms 后执行」。前面排着任务就得等。

```js
const start = Date.now();
setTimeout(() => {
  console.log('实际等待：', Date.now() - start, 'ms');
}, 50);

// 主线程被占住 200ms
while (Date.now() - start < 200) {}
```

输出大约 200ms。回调早就够时间了,只是主线程没有空。

延迟还有下限:传 0 时浏览器实际按 1ms 左右处理;嵌套层级超过 5 层后,规范要求最小 4ms。这两条是为省电和避免定时器风暴定的,第 7 章讲定时器那篇会展开。

## Node 里的队列不完全一样

Node 用 libuv 实现循环,分 timers、pending callbacks、poll、check、close 几个阶段,每个阶段有自己的回调队列。两处差异值得记住:

- `process.nextTick` 队列优先于 Promise 微任务,每处理完一个回调就先清空它;
- `setImmediate` 在 check 阶段执行,主模块里它和 `setTimeout(fn, 0)` 的先后顺序不确定。

```js
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));

// nextTick
// promise
```

这段顺序是稳定的。涉及 `setTimeout` 与 `setImmediate` 的对比时,不要依赖固定顺序,在 I/O 回调里比较才有确定结论。

## 小结

- 单线程只有一条调用栈,栈空才取下一个任务,宏任务执行期间不会被打断;
- 任务分宏任务与微任务,`setTimeout`、I/O、UI 事件是宏任务,Promise 回调与 `queueMicrotask` 是微任务;
- 每个宏任务结束后清空整条微任务队列,清空完才可能出现渲染机会;
- 微任务不断产生新微任务时队列清不空,页面卡死且不报错,看 Performance 里的长任务;
- `setTimeout` 只保证「至少等待」,主线程忙就顺延,浏览器还有 1ms 与嵌套 4ms 的下限。
