---
title: async / await 与并发控制
summary: 'async 函数总是返回 Promise,执行到第一个 await 就让出主线程,try/catch 因此能接住异步错误。await 之后的代码进入微任务队列,循环里逐个 await 会把并发变成串行,请求多时要靠并发池限流。'
category: frontend
node: frontend-js-async-await
order: 38
level: 进阶
tags: [JavaScript, async, await, 并发控制]
updated: 2026-11-19
mindmap: js-async-await.mindmap.json
terms: []
sources:
  - title: MDN · async function
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function
    note: async 函数的返回值与 await 的暂停语义。
  - title: MDN · await
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/await
    note: await 接受 thenable 时的展开过程。
  - title: javascript.info · Async/await
    url: https://zh.javascript.info/async-await
    note: await 与 then 的等价写法、错误处理的对比。
---

上一篇的 `then` 链把回调嵌套压平了一层,但三个有依赖的请求串起来,结果还是要一层层往里传。`async/await` 用同步的形状写同一件事,语义没有任何变化:底层仍然是 Promise,仍然排在微任务队列里。

## async 函数返回什么

```js
async function f() {
  console.log('2');
  await null;         // 让出一次，后面的代码进微任务队列
  console.log('4');
  return 1;
}

console.log('1');
const p = f();
console.log('3');
p.then((v) => console.log('返回：', v)); // p 一定是 Promise

// 1 2 3 4
// 返回： 1
```

`return` 的值被包进 fulfilled 的 Promise,`throw` 的异常被包进 rejected 的 Promise。所以调用方拿到的一定是 Promise,不会同步抛出——这也是为什么 `async` 函数里的错误必须靠 `.catch` 或 `await` 接。

函数体不是「异步执行」,它开始跑的时候是同步的,只在遇到 `await` 时让出。`await null` 看着没等待任何东西,依然会让出一次:`null` 被包成 resolved 的 Promise,后续代码进入微任务队列,等同步代码跑完才继续。

## await 展开成 then

```text
async function f() {              function f() {
  const a = await g();     ≈        return g().then((a) => {
  console.log(a);                     console.log(a);
}                                   });
                                  }
```

差别只在错误处理:`await` 让拒绝变成抛出,`try/catch` 就派上用场了。

```js
async function loadUser(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('加载用户失败：', err.message);
    throw err; // 交给调用方决定怎么兜底
  }
}
```

`try` 覆盖的范围是关键:它只包住 `await` 表达式和紧随其后的同步代码。回调里抛的错接不住,这一点和第 7 章第一篇那个 `try` 包 `setTimeout` 的坑是同一个原因。

## 串行与并发

```js
const delay = (ms, value) => new Promise((r) => setTimeout(r, ms, value));

async function serial(ids) {
  const out = [];
  for (const id of ids) {
    out.push(await delay(100, id)); // 上一个完成才开始下一个
  }
  return out;
}

async function parallel(ids) {
  return Promise.all(ids.map((id) => delay(100, id))); // 先全部发出，再统一等
}

(async () => {
  console.time('serial');
  await serial([1, 2, 3]);
  console.timeEnd('serial');   // 约 300ms

  console.time('parallel');
  await parallel([1, 2, 3]);
  console.timeEnd('parallel'); // 约 100ms
})();
```

三个各 100ms 的任务,串行约 300ms,并发约 100ms。请求之间没有依赖时,先 `map` 出 Promise 数组再 `Promise.all`,是标准的写法。

有依赖的请求不能这么改写。第二步要拿第一步的 `userId`,就只能串行,省不掉的时间要想别的办法,比如把两段接口合并成一个。

## 并发池

一次性发出 100 个请求,浏览器同域只允许 6 个左右并行,其余排队;服务端也可能直接限流。控制同时在跑的数量,需要一个池子。

```js
async function runPool(tasks, limit = 4) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++; // 取号是同步的，不会取到重复下标
      results[index] = await tasks[index]();
    }
  }

  const size = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

const tasks = [1, 2, 3, 4, 5, 6].map((n) => () => delay(100, n));

console.time('pool');
runPool(tasks, 3).then((r) => {
  console.timeEnd('pool'); // 约 200ms，6 个任务 3 路并行
  console.log(r);          // [1, 2, 3, 4, 5, 6]
});
```

`cursor++` 在 `await` 之前执行,取值与自增之间没有让出,这是不会重复取号的原因。结果按下标写入,`results` 的顺序与 `tasks` 一致,和完成先后无关。

默认行为是快速失败:任何一个任务 reject,`Promise.all` 立刻 reject,但其余 worker 还在跑。要让池子跑完所有任务,把每个任务的等待改写成 `tasks[index]().then(ok, err)` 两个分支,各自返回一个带 `status` 的对象,池子就不会整体失败。

## 循环里的 await 不生效

```js
[1, 2, 3].forEach(async (n) => {
  await delay(10);
  console.log('处理', n);
});
console.log('循环结束');

// 循环结束
// 处理 1 / 处理 2 / 处理 3
```

`forEach` 不看回调的返回值,更不会等它返回的 Promise。三个回调几乎同时启动,`循环结束` 先打印,`forEach` 之后的代码拿不到任何结果。

需要的顺序执行用 `for...of`,它逐次 `await`;需要的并发用 `map` 加 `Promise.all`;需要按顺序但允许并发用上面的池子。这三条覆盖了绝大多数场景。

还有一个隐蔽的变体:在 `for` 循环里 `await` 一个本该并发的请求,代码能跑,只是慢。写完看一遍循环体,问一句「这一轮依赖上一轮的结果吗」。

## 别让 async 吞掉异常

`button.addEventListener('click', async () => { await submitForm(); })` 这行代码不会报错,也不会提示失败。事件系统不关心回调返回的 Promise,失败的表单提交就这样静默消失。改成 `submitForm().catch(err => showToast(err.message))`,把拒绝显式交给一个能处理的地方。

同一个问题出现在所有「不消费返回值」的位置:`setTimeout` 的回调、`forEach` 的回调、`new Promise` 的执行器。写了 `async` 就要有人接它的拒绝。

## 小结

- `async` 函数总是返回 Promise,函数体同步开始,遇到 `await` 才让出一次;
- `await x` 等价于 `x.then(后续)`,后续代码在微任务里执行,不会阻塞主线程;
- `try/catch` 能接住 `await` 的拒绝,接不住回调里抛出的异常;
- 无依赖的请求先 `map` 再 `Promise.all`,串行 `for...of` 会把总耗时累加;
- 并发池用固定数量的 worker 抢同一个下标游标,结果按下标写回保证顺序;
- `forEach` 里的 async 回调不会被等待,`addEventListener` 也不处理返回的拒绝。
