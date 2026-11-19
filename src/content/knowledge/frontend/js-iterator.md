---
title: 迭代器、生成器与异步迭代
summary: '迭代协议把逐个取值抽象成 next 返回 value 与 done,for...of 建在它上面。生成器用 yield 暂停函数,next(value) 把值送回暂停点。异步生成器配 for await...of,分页拉取就能写成线性代码。'
category: frontend
node: frontend-js-iterator
order: 41
level: 进阶
tags: [JavaScript, 迭代器, 生成器, 异步迭代]
updated: 2026-11-19
mindmap: js-iterator.mindmap.json
terms: [protocol]
sources:
  - title: MDN · 迭代器和生成器
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Iterators_and_generators
    note: 可迭代协议、迭代器协议与生成器的基本用法。
  - title: MDN · for await...of
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/for-await...of
    note: 异步迭代的语法与同时接受同步可迭代对象的行为。
  - title: javascript.info · 生成器
    url: https://zh.javascript.info/generators
    note: yield 双向通信与 next(value) 的讲解。
---

前面几篇处理的是「一个异步结果什么时候到」。分页列表、流式响应、一批陆续产生的事件不是单个结果,而是一串值,需要另一套约定来描述「下一个值还没准备好」:迭代协议。它比 Promise 更早进入语言,也支撑着 `for...of`、展开运算符与解构。

## 迭代协议的两个角色

可迭代对象（iterable）有一个 `Symbol.iterator` 方法,调用后返回迭代器。迭代器（iterator）有一个 `next()` 方法,每次返回 `{ value, done }`。

```js
const arr = ['a', 'b'];
const it = arr[Symbol.iterator]();

console.log(it.next()); // { value: 'a', done: false }
console.log(it.next()); // { value: 'b', done: false }
console.log(it.next()); // { value: undefined, done: true }
```

`done` 一旦为 `true`,再调 `next()` 也只会继续返回 `{ value: undefined, done: true }`。

`for...of` 就是自动调 `next()` 的语法糖:

```text
for (const v of obj)
  → obj[Symbol.iterator]()          拿到迭代器
  → it.next()                       { value, done: false } → 执行循环体
  → 再调 next()                     直到 done: true
  → 循环体里 break                 调 it.return()，可以在这里释放资源
```

数组、字符串、`Map`、`Set`、`arguments`、`NodeList` 都是可迭代的,普通对象不是。`for (const k of {a: 1})` 会抛出 `TypeError: obj is not iterable`,要遍历对象的键值用 `Object.entries()` 或 `Object.values()`。

## 手写一个可迭代对象

```js
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return current <= last
          ? { value: current++, done: false }
          : { value: undefined, done: true };
      },
    };
  },
};

console.log([...range]);            // [1, 2, 3, 4, 5]
console.log(Array.from(range));     // [1, 2, 3, 4, 5]
console.log(Math.max(...range));    // 5
```

每次 `for...of` 或展开都会重新调用 `Symbol.iterator`,得到一个新迭代器,所以 `range` 可以反复遍历。如果让 `[Symbol.iterator]()` 直接 `return this`,第二次遍历就是空的——迭代器有状态,用完就废。

## 生成器

`function*` 声明的函数调用时不执行函数体,返回一个生成器对象。每次 `next()` 跑到下一个 `yield` 停下,把 `yield` 后面的值交出去。

```js
function* idMaker() {
  let id = 0;
  while (true) {
    const command = yield id++;
    if (command === 'stop') return '已结束';
  }
}

const g = idMaker();
console.log(g.next());         // { value: 0, done: false }
console.log(g.next('继续'));    // { value: 1, done: false }
console.log(g.next('stop'));   // { value: '已结束', done: true }
```

`next(value)` 的值会成为上一次暂停处那个 `yield` 表达式的返回值,这是双向通信。第一次 `next()` 传的参数被丢弃:函数刚启动,还没有暂停的 `yield` 可以接收它。

生成器对象自带 `Symbol.iterator` 且返回自身,所以可以直接 `for...of`:

```js
function* take(iterable, n) {
  let count = 0;
  for (const item of iterable) {
    if (count >= n) return;
    count += 1;
    yield item;
  }
}

function* all() {
  yield 1;
  yield* [2, 3];
  yield 4;
}

console.log([...take('abcdef', 3)]); // ['a', 'b', 'c']
console.log([...all()]);             // [1, 2, 3, 4]
```

`yield*` 把迭代委托给另一个可迭代对象,等价于在里面逐个 `yield` 一遍。

生成器的价值在于惰性。`while (true)` 加 `yield` 可以表示无限序列,消费方要多少取多少,不用先分配一个大数组。数据处理管线、ID 生成、树的深度优先遍历都适合这个模型。

## 异步迭代

异步生成器把 `yield` 换成「等一个 Promise 再交出去」,消费者用 `for await...of`:

```js
async function* fetchPages(base, total) {
  for (let page = 1; page <= total; page += 1) {
    const res = await fetch(`${base}?page=${page}`);
    if (!res.ok) throw new Error(`第 ${page} 页失败：${res.status}`);
    yield await res.json();
  }
}

for await (const list of fetchPages('/api/users', 3)) {
  console.log('本页', list.length, '条');
}
```

时序是:消费方处理完一页,才回到生成器要下一页,下一个请求才发出。这个特性叫背压（backpressure）,请求速率自动跟着处理速度走,不需要额外的队列。

协议挂在 `Symbol.asyncIterator` 上,`next()` 返回 `Promise<{ value, done }>`。`for await...of` 也接受普通同步可迭代对象,数组里放 Promise 时它不会替你展开——那要用 `Promise.all`。

## 坑

迭代器用完即废。`const it = arr[Symbol.iterator]()` 之后拿 `it` 传给两个函数,第二个函数从中间接着读,结果少一半。要传「可重复遍历的东西」,传数组或可迭代对象,别传迭代器。

`for...of` 提前退出会调用 `return()`。生成器里如果有 `finally`,`break`、`throw`、`return` 离开循环时都会执行:

```js
function* reader() {
  try {
    yield '打开连接';
    yield '读取数据';
  } finally {
    console.log('关闭连接');
  }
}

for (const step of reader()) {
  console.log(step);
  break; // 触发 return()，finally 里的清理立即执行
}
// 打开连接
// 关闭连接
```

这个机制适合管资源:游标、文件句柄、订阅。反过来说,清理逻辑写在 `yield` 之后而没有 `finally`,中途 `break` 就不会执行。

异步迭代器上不能用 `for...of`。`for (const x of asyncGen())` 抛 `TypeError`,因为对象上只有 `Symbol.asyncIterator`,没有 `Symbol.iterator`。反过来 `for await...of` 能同时吃两种,写混时先看报错再决定改哪边。

## 小结

- 可迭代协议要求 `Symbol.iterator`,迭代器协议要求 `next()` 返回 `{ value, done }`;
- `for...of`、展开、解构都走这套协议,普通对象不可迭代,用 `Object.entries()` 转换;
- `function*` 返回生成器,`yield` 暂停并交出值,`next(value)` 把值送回暂停点;
- 生成器对象可迭代且只消费一次,需要重复遍历时每次重新调用生成器函数;
- `for...of` 提前退出会调 `return()`,生成器里的 `finally` 因此能执行清理;
- `async function*` 提供 `Symbol.asyncIterator`,`for await...of` 按消费速度逐个拉取,天然限速。
