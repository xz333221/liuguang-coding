---
title: 函数、参数与闭包
summary: '函数是划定作用域的东西。参数有默认值、剩余参数与 arguments 三套写法，新代码用前两个。闭包捕获的是绑定不是值，所以外层变量变了，闭包读到的也是新值。'
category: frontend
node: frontend-js-function
order: 30
level: 入门
tags: [JavaScript, 函数, 闭包, 参数, 高阶函数]
updated: 2026-11-19
mindmap: js-function.mindmap.json
terms: []
sources:
  - title: MDN · 闭包
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Closures
    note: 闭包的定义、词法环境与常见用法。
  - title: MDN · 函数
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Functions
    note: 函数声明、表达式、默认参数与剩余参数。
  - title: javascript.info · 函数进阶
    url: https://zh.javascript.info/advanced-functions
    note: 闭包、递归与函数对象的属性。
---

作用域那篇说明了名字的可见范围由函数和块划定，函数就是那条边界本身。这篇看函数怎么收参数，返回之后还记住什么。

## 三种写法

```js
function add(a, b) { return a + b }              // 声明,整体提升
const add2 = function (a, b) { return a + b }    // 表达式,赋值前不可用
const add3 = (a, b) => a + b                     // 箭头,不绑定 this

const make = (id) => ({ id })   // 返回对象要包一层括号
const bad = (id) => { id }      // 返回 undefined,花括号被当成函数体
```

三者在提升上的差别已经在上一篇讲过，另有三处不同：

| 对比 | 声明 | 表达式 | 箭头 |
| --- | --- | --- | --- |
| 提升 | 连函数体一起 | 只提变量名 | 只提变量名 |
| 自己的 `this` | 有 | 有 | 没有，用外层的 |
| 自己的 `arguments` | 有 | 有 | 没有，用外层的 |
| 能用 `new` 调用 | 能 | 能 | 不能，没有 `prototype` |

`bad` 不报错，只是返回 `undefined`，调用方拿到之后在下一处取属性才炸，排查起来会绕远路。

## 参数

默认参数在调用时求值，可以引用前面的参数；剩余参数是真正的数组。

```js
function log(level, ...args) {
  console.log(`[${level}]`, args.length, args)
}

log('info', 'a', 'b')  // [info] 2 [ 'a', 'b' ]
log('info')            // [info] 0 []

function sum() {
  return Array.from(arguments).reduce((acc, n) => acc + n, 0)
}
sum(1, 2, 3)  // 6

function pick(a, b = 1, ...rest) {}
pick.length   // 1,只数第一个默认参数之前的
```

`arguments` 是类数组对象：有 `length` 和下标，没有 `map`、`filter`。箭头函数里没有自己的 `arguments`，用的是外层函数的。新代码一律用剩余参数。

非严格模式下，`arguments` 和形参是联动的：改 `arguments[0]` 会同步改到第一个形参，反过来也一样。严格模式解除这个联动。这段行为属于历史包袱，不要在业务代码里依赖。

函数的 `length` 是「第一个默认参数或剩余参数之前」的形参个数，`pick` 只数到 `a`。

## 闭包捕获的是绑定

函数返回之后，它用到的外层变量不会消失。

```js
function makeCounter() {
  let count = 0
  return {
    inc() { count += 1; return count },
    read() { return count },
  }
}

const c = makeCounter()
c.inc()   // 1
c.inc()   // 2
c.read()  // 2

// 捕获的是绑定,不是值
let name = 'a'
const getName = () => name
name = 'b'
getName() // 'b'

// 想固定当时的值,再包一层参数,让每次调用创建新绑定
const fix = ((value) => () => value)(name)
name = 'c'
fix() // 'b'
```

`count` 是 `makeCounter` 里的局部变量，函数返回后本该销毁，但返回的两个方法都还引用它，于是它留了下来。这就是闭包：函数加上它定义时所在的作用域。

`getName()` 拿到 `'b'` 而不是 `'a'`，因为闭包捕获的是绑定，不是当时的值。这个区别解释了很多「为什么拿到的不是当时那个值」:定时器、事件回调、循环里注册的函数，读的都是执行那一刻的变量。

## 三种常见用途

私有状态是第一种，上面的计数器就是。另外两种是缓存与只执行一次：

```js
function memo(fn) {
  const cache = new Map()
  return (key) => {
    if (!cache.has(key)) cache.set(key, fn(key))
    return cache.get(key)
  }
}

function once(fn) {
  let called = false
  let result
  return (...args) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
```

`memo` 用 `has` 而不是判断 `get` 的结果，因为函数的返回值可能就是 `undefined`，那样每次都会重算。

三种用途的共同点：状态放在外层函数里，只有返回的那个函数能碰。

## 闭包把什么留在内存里

闭包会让被引用的变量活到闭包被回收为止。写一个 `attach(rows)` 返回 `() => rows.length`，整个 `rows` 就被这个回调攥住了，只要回调还在，数据就回收不掉。

V8 会做逃逸分析，只保留真正被用到的变量，但那是实现层的优化，不是语言保证。判断标准很简单：回调活得比数据久，数据就回收不了。不需要时把外层引用置空，或者一开始就别把大对象闭进回调。

最常见的泄漏是定时器与事件监听：组件销毁时没清，回调连同它引用的 DOM 和数据结构一起留在内存里。

## 回调里最容易错的一处

```js
const handlers = []
let count = 0

for (let i = 0; i < 3; i++) {
  handlers.push(() => count + i)
}

count = 10
handlers.map((f) => f())  // [10, 11, 12]
```

`i` 每轮新建，所以三个闭包各拿到 0、1、2;`count` 是同一个绑定，后来改成 10，三个闭包读到的都是 10。新人常以为输出是 `[0, 1, 2]`，因为把「捕获绑定」当成了「捕获值」。

## 高阶函数

接收函数或返回函数的函数就是高阶函数。数组那篇要讲的 `map`、`filter`、`reduce` 都是，这里看一个自己写的：

```js
function withRetry(fn, times) {
  return (...args) => {
    let lastError
    for (let i = 0; i < times; i++) {
      try {
        return fn(...args)
      } catch (err) {
        lastError = err
      }
    }
    throw lastError
  }
}
```

`withRetry` 不关心 `fn` 做什么，只负责重试；`fn` 也不关心自己被调了几次。把「重试」和「业务」拆开，比在业务函数里写循环清楚。错误处理的细节在最后一篇展开。

## 小结

- 函数声明整体提升，表达式只提升变量名，箭头函数不绑定 `this` 且不能用 `new`;
- 默认参数在调用时求值，剩余参数是数组，`arguments` 是类数组且新代码不该再用；
- 闭包捕获的是绑定，外层变量变化后闭包读到新值；
- 私有状态、缓存、只执行一次，三种用法都靠外层函数的局部变量；
- 闭包会让被引用的变量延迟回收，长生命周期的回调不要闭进大对象；
- 高阶函数把通用流程与业务逻辑拆开，重试、缓存、日志都能这样包。
