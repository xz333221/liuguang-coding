---
title: Promise：状态、链式与错误传播
summary: 'Promise 只有等待、成功、失败三种状态，落定后不再改变。每次 then 返回新 Promise，回调的返回值决定下一个的状态，抛错则让整条链跳到最近的 catch。没被接住的拒绝交给 unhandledrejection。'
category: frontend
node: frontend-js-promise
order: 37
level: 进阶
tags: [JavaScript, Promise, 异步, 错误处理]
updated: 2026-11-19
mindmap: js-promise.mindmap.json
terms: []
sources:
  - title: MDN · Promise
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise
    note: 三种状态、then 的返回值与四个组合器的方法签名。
  - title: javascript.info · Promise
    url: https://zh.javascript.info/promise-basics
    note: 链式调用与错误处理的讲解顺序。
  - title: ECMA-262 · Promise Objects
    url: https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise-objects
    note: 状态转换与 then 的执行语义定义。
---

上一篇讲清了 `then` 的回调为什么排在微任务队列里，没讲 `then` 为什么每次返回一个新 Promise，也没讲错误怎么从链头一路传到末尾的 `catch`。这两件事不搞清楚，链式调用就只能靠背。

## 三种状态

Promise 内部只有一个状态字段：`pending`（等待）、`fulfilled`（成功）、`rejected`（失败）。状态只能从 `pending` 转向另外两个之一，转过去就不再变。

```js
const p = new Promise((resolve) => {
  resolve(1);
  console.log('resolve 之后的同步代码照常执行');
  throw new Error('这次抛错被忽略');
});

p.then((v) => console.log('值：', v)); // 值： 1
```

`resolve(1)` 把状态改成 fulfilled，后面的 `throw` 想让状态变成 rejected，但已经晚了，转换被丢弃，只留下一条无人处理的异常记录。这个特性反过来用也有价值：请求已经返回成功，后续逻辑出错不应该改变结果。

两点容易忽略：

- 构造器里同步抛出的异常等价于 `reject`，不会像普通函数那样把错抛给调用方；
- `resolve` 传入另一个 Promise 或 thenable 时，当前 Promise 会等它落定并采用它的状态与值，这中间会多消耗几个微任务 tick。

## then 返回的是新 Promise

`Promise.resolve(1).then(v => v + 1)` 与它前面的 Promise 不是同一个对象，比较结果永远是 `false`。新 Promise 的状态由回调的返回值决定：

| 回调返回 | 下一个 Promise |
| --- | --- |
| 普通值 | fulfilled，值就是这个返回值 |
| Promise / thenable | 等它落定，采用它的状态与值 |
| 抛出的异常 | rejected，原因就是异常 |
| 什么也不返回 | fulfilled，值是 `undefined` |

所以链要往下传值，就得 `return`。忘了写 `return` 是这条链上最常见的 bug:

```js
Promise.resolve({ id: 7 })
  .then((user) => {
    user.name = 'ann'; // 只是改了一下，没有返回
  })
  .then((user) => console.log(user)); // undefined
```

## 错误沿链传播

`then(onFulfilled)` 只给了一个参数时，拒绝会原样往后传；回调里抛错，效果等同于返回一个 rejected Promise。两种情况都会跳过后面所有成功回调，直到遇到拒绝处理。

```js
Promise.resolve()
  .then(() => { throw new Error('读配置失败'); })
  .then(() => console.log('不会执行'))
  .catch((err) => {
    console.log('第一个 catch：', err.message);
    return 'default';          // 返回普通值，链恢复成 fulfilled
  })
  .then((v) => console.log('恢复后收到：', v));

// 第一个 catch： 读配置失败
// 恢复后收到： default
```

`catch(fn)` 就是 `then(undefined, fn)` 的语法糖，它同样返回新 Promise。这意味着 `catch` 不是终点，它能修复状态，也能重新抛错。`finally` 不接收值，也不改变状态，适合关 loading、清定时器。

链尾没有 `catch`，拒绝就成了未处理状态。Node 里监听 `process.on('unhandledRejection')`，浏览器里监听 `window` 的 `unhandledrejection` 事件，事件对象上有 `promise` 与 `reason`。判定时机在微任务队列排空之后，也就是说，用 `setTimeout` 补一个 `catch` 已经来不及，告警照样会发一次。

## 四个组合器

| 方法 | 落定条件 | 结果 | 适合的场景 |
| --- | --- | --- | --- |
| `Promise.all` | 全部成功，或第一个失败 | 值数组 / 首个错误 | 缺一个就不能继续 |
| `Promise.allSettled` | 全部落定 | `{ status, value 或 reason }` 数组 | 批量任务，要全部结果 |
| `Promise.race` | 第一个落定（成功或失败） | 那个值或错误 | 超时竞速 |
| `Promise.any` | 第一个成功；全部失败才失败 | 值 / `AggregateError` | 多镜像源取最快可用的 |

```js
const delay = (ms, value, fail = false) =>
  new Promise((resolve, reject) =>
    setTimeout(() => (fail ? reject(new Error(value)) : resolve(value)), ms)
  );

(async () => {
  const ok = await Promise.all([delay(30, 'a'), delay(10, 'b')]);
  console.log(ok); // [ 'a', 'b' ]，顺序按传入顺序，与完成先后无关

  const settled = await Promise.allSettled([delay(30, 'a'), delay(10, 'boom', true)]);
  console.log(settled);
  // [ { status: 'fulfilled', value: 'a' },
  //   { status: 'rejected', reason: Error: boom } ]
})();
```

`all` 的快速失败只是「不再等」，并不取消其他请求：失败瞬间其余的照样在跑，结果被丢弃。这一点在第 7 章讲请求取消那篇用 `AbortController` 给出了真正能取消的写法。

三个边界要记：

- `all([])` 与 `allSettled([])` 立刻 fulfilled，结果是空数组；
- `any([])` 立刻以 `AggregateError` 拒绝，`errors` 是空数组；
- `race([])` 永远 pending，不 resolve 也不 reject,`await` 会卡死。

## 手写超时

```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${ms}ms 超时`)), ms);
  });
  return Promise.race([promise, timeout]);
}

const slow = new Promise((resolve) => setTimeout(() => resolve('迟到的结果'), 300));
withTimeout(slow, 100).catch((e) => console.log(e.message));
// 100ms 超时
```

超时后原请求还在跑，它的结果被 `race` 丢掉。要连请求一起停，得把 `signal` 传进 `fetch`，或者在 `timeout` 落定时手动 `abort`。

## 不要嵌套 then

```js
// 错：外层 then 立刻 fulfilled(undefined)，内层的错误也传不出去
loadUser().then((user) => {
  loadOrders(user.id).then((orders) => render(user, orders));
});

// 对：把内层返回出去，链才连得上
loadUser()
  .then((user) => loadOrders(user.id).then((orders) => render(user, orders)))
  .catch((err) => console.error('加载失败', err));
```

嵌套之后，外层的错误处理只覆盖第一层，第二层的失败变成未处理拒绝。判断标准很简单：回调里出现了 `.then`，先想想能不能改成 `return`。

## 小结

- 状态只有三种，落定后不可逆，`resolve` 之后的 `throw` 与 `reject` 都无效；
- 每次 `then` 返回新 Promise，回调的返回值或异常决定它的状态，不返回就是 `undefined`;
- 拒绝会跳过后续成功回调直到遇到 `catch`,`catch` 返回普通值即可恢复链；
- 未被处理的拒绝由 `unhandledrejection` 兜底，补 `catch` 必须在同一个微任务检查点之前；
- `all` 快速失败但不取消、`allSettled` 等全部落定、`race` 取首个落定、`any` 取首个成功；
- 链式调用里避免嵌套 `then`，用 `return` 把内层接进同一条链。
