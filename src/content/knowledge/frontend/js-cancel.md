---
title: AbortController 与请求取消
summary: 'Promise 不能取消,AbortController 把取消做成一枚可监听的一次性信号。abort 之后 aborted 为真、reason 记录原因,fetch 与自写任务都能接上它。取消不是失败,AbortError 不该上报。'
category: frontend
node: frontend-js-cancel
order: 40
level: 进阶
tags: [JavaScript, AbortController, fetch, 取消]
updated: 2026-11-19
mindmap: js-cancel.mindmap.json
terms: []
sources:
  - title: MDN · AbortController
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController
    note: signal、abort(reason) 与一次性信号的行为。
  - title: MDN · AbortSignal
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal
    note: aborted、reason 以及 timeout() 与 any() 静态方法。
  - title: javascript.info · Fetch:中止（AbortController）
    url: https://zh.javascript.info/fetch-abort
    note: fetch 与 signal 配合时抛出的错误类型。
---

上一篇留下的问题是怎么让排队中的工作停下来,`clearTimeout` 能撤回还没执行的定时器回调。网络请求没有这样的开关:请求发出后,Promise 要么成功要么失败,没有第三方能把它改成「取消」。`AbortController` 补上了这块,把取消变成一个可以监听的信号。

## 为什么需要取消

三个场景几乎每个项目都会遇到:

- 搜索联想:输入 `js` 后立刻删成 `j`,`js` 的响应后到,把列表覆盖成过期结果;
- 路由切换:页面已经离开,请求还在跑,回来时 `setState` 报「组件已卸载」;
- 超时:接口 30 秒不返回,用户只看到转圈,需要主动放弃。

第一种叫竞态（race condition）,光靠「只渲染最后一次请求」的判断能绕过显示问题,请求本身还在占带宽。真正停下来,得靠取消信号。

## AbortController 的形状

```js
const controller = new AbortController();
const { signal } = controller;

console.log(signal.aborted); // false

signal.addEventListener('abort', () => {
  console.log('已取消，原因：', signal.reason.message);
});

controller.abort(new Error('用户离开页面'));
console.log(signal.aborted);        // true
console.log(signal.reason.message); // 用户离开页面
```

三个属性值得记住:

- `signal.aborted` 是布尔值,`abort` 之后永远为 `true`;
- `signal.reason` 是取消原因,不传参数时是 `name` 为 `AbortError` 的 `DOMException`;
- 信号是一次性的,取消过的 controller 不能复用,下一轮请求要新建一个。

`signal.onabort = fn` 与 `addEventListener('abort', fn)` 等价,后者能注册多个监听,也能配 `{ once: true }`。

## fetch 的取消

```js
async function search(keyword, { timeout = 3000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('请求超时')), timeout);

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') return null; // 主动取消，不算失败
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
```

`fetch` 接受 `signal`,取消时 Promise 以 `signal.reason` 拒绝。默认的 reason 是 `DOMException`,`name` 为 `AbortError`;像上面这样传了自定义 Error,`catch` 里拿到的就是这个 Error,`err.name` 判不出来,得改成判断 `signal.aborted` 或自定义字段。两种写法不要混。

`res.json()`、`res.text()` 读响应体的阶段同样受 signal 控制,取消会让读取过程抛错。所以「请求已返回、数据还没读完」也是可以中断的。

## 超时与信号组合

手动 `setTimeout` 加 `abort` 是通用写法,现代运行时提供了更直接的两个静态方法:

```js
async function load() {
  // 3 秒超时，到点自动取消
  const a = await fetch('/api/slow', { signal: AbortSignal.timeout(3000) });

  // 用户取消与超时取其一，任意一个触发就整体取消
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
  const b = await fetch('/api/slow', { signal });

  return [a.status, b.status];
}
```

`AbortSignal.timeout(ms)` 触发时,reason 的 `name` 是 `TimeoutError`,与手动取消的 `AbortError` 区分开,便于埋点。`AbortSignal.any([...])` 把多个信号合成一个,任意一个取消就整体取消,浏览器需要较新版本,Node 20 之后才有。老运行时仍用手写的 `race` 版本。

## 给自己的函数加取消能力

不是所有异步操作都像 `fetch` 那样自带 signal 支持。手写时有三件事不能漏:进入前检查、取消时清理资源、结束时移除监听。

```js
function delay(ms, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason); // 信号可能在建 Promise 之前就已取消
      return;
    }

    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve('到时间了');
    }, ms);

    function onAbort() {
      clearTimeout(id);
      reject(signal.reason);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const c = new AbortController();
setTimeout(() => c.abort(new Error('不等了')), 50);
delay(1000, { signal: c.signal }).catch((e) => console.log(e.message)); // 不等了
```

先查 `signal.aborted` 是关键。调用方很可能在 `await` 之前就取消了,此时信号不会再触发 `abort` 事件,只查监听会永远挂着。

## 常见坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 取消一个请求,其他请求也失败了 | 多个请求共用一个 controller | 每个请求独立建 controller,需要联动才共享 |
| 用户每次输入都产生一条错误日志 | `AbortError` 被当成真实失败上报 | 先判断 `signal.aborted`,取消走静默分支 |
| 取消后仍有状态更新 | 只停了请求,没停后续逻辑 | 在 `catch` 里 `if (signal.aborted) return` |
| 用 `Promise.race` 做超时,慢请求仍在跑 | `race` 只忽略结果,不取消任务 | 把 signal 传进 `fetch` 或底层 API |
| 第二个请求报 `signal is already aborted` | 复用了取消过的 controller | 每次请求新建 controller |

第三方库的取消方式各不相同:`XMLHttpRequest` 用 `xhr.abort()`,axios 0.22 之后接受 `signal` 参数,一些老版本用 `CancelToken`。统一到 `signal` 上,业务代码就不必记住每家的写法。

## 小结

- Promise 本身不能取消,`AbortController` 提供了一个外部可以广播的取消信号;
- `signal` 一次性,`aborted` 与 `reason` 记录状态和原因,取消后要新建 controller;
- `fetch` 的请求与响应体读取都受 signal 控制,取消时以 `signal.reason` 拒绝;
- `AbortSignal.timeout` 省掉手写定时器,`AbortSignal.any` 合并多个取消来源;
- 自写异步任务要检查 `aborted`、清理定时器或监听、在取消时拒绝;
- 取消不是失败,`AbortError` 不该进错误上报,也不该触发界面报错。
