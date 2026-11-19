---
title: this 的四种绑定
summary: 'this 由调用方式决定,与定义位置无关。默认、隐式、显式、new 四种绑定按优先级生效,new 最高。箭头函数没有自己的 this,由定义处外层决定,call、apply、bind 都改不了。'
category: frontend
node: frontend-js-this
order: 32
level: 进阶
tags: [JavaScript, this, 绑定, bind, 箭头函数]
updated: 2026-11-19
mindmap: js-this.mindmap.json
terms: []
sources:
  - title: MDN · this
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this
    note: 四种绑定规则与严格模式下的差异。
  - title: MDN · Function.prototype.bind
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
    note: bind 返回新函数、预置参数与不可再改的绑定。
  - title: javascript.info · 对象方法,"this"
    url: https://zh.javascript.info/object-methods
    note: 隐式绑定丢失的典型场景。
---

原型链决定了方法从哪来,`this` 决定方法执行时看谁。两者合起来回答同一个问题:这个方法是谁在调。

## 四种绑定

```js
function who() {
  return this
}

// 默认绑定:没有点号、没有 call/apply/bind、没有 new
who()                        // 非严格模式是 globalThis,严格模式是 undefined

// 隐式绑定:调用时前面有点
const obj = { name: 'a', who }
obj.who()                    // obj

// 显式绑定
who.call({ name: 'b' })      // { name: 'b' }
who.apply({ name: 'c' })     // 同上,区别只在传参形式
const bound = who.bind({ name: 'd' })
bound()                      // { name: 'd' }

// new 绑定
function Person() { this.tag = 'p' }
new Person().tag             // 'p',this 是新建的对象
```

`call` 和 `apply` 只差传参:`fn.call(obj, 1, 2)` 逐个传,`fn.apply(obj, [1, 2])` 传数组。`bind` 不调用函数,返回一个绑好 `this` 的新函数。

## 优先级

| 优先级 | 调用形式 | `this` |
| --- | --- | --- |
| 1(最高) | `new fn()` | 新创建的对象 |
| 2 | `fn.bind(obj)()` | `obj`,再用 `call` 也改不了 |
| 3 | `obj.fn()` | `obj` |
| 4(最低) | `fn()` | 严格模式 `undefined`,否则 `globalThis` |

`bind` 过的函数仍然可以被 `new`:这时绑定被忽略,`this` 是新建的对象。构造函数不会被 `bind` 锁死,这一点在写工厂函数时有用。

显式传 `null` 或 `undefined` 时,非严格模式会把 `this` 换成 `globalThis`,严格模式保持原样。`f.call(null)` 在前者里 `this` 是整个全局对象,在后者里就是 `null`。两种模式都不报错,差别只在方法内部读到什么。

## 方法被摘出来之后

```js
const counter = {
  count: 0,
  inc() { this.count += 1; return this.count },
}

const inc = counter.inc
try {
  inc()   // TypeError: Cannot read properties of undefined (reading 'count')
} catch (err) {
  console.log(err.message)
}
console.log(counter.count)  // 0,方法体根本没跑完
```

`inc()` 是默认绑定,点号没了,`this` 也是。模块与 `class` 内部默认严格模式,`this` 是 `undefined`,所以取 `this.count` 直接抛错。

非严格模式的脚本里更隐蔽:`this` 是 `globalThis`,不报错,而是把 `globalThis.count` 写成了 `NaN`,`counter.count` 一直是 0。静默写错对象比抛错更难查,要等到别处读 `counter.count` 才发现不对。

定时器与回调里最常见:

```js
class Timer {
  constructor() { this.seconds = 0 }
  tick() { this.seconds += 1; return this.seconds }

  start() { setTimeout(this.tick, 0) }   // 原写法:交出去的是裸函数

  // 改法一:箭头继承 start 的 this
  // start() { setTimeout(() => this.tick(), 0) }
  // 改法二:显式绑定
  // start() { setTimeout(this.tick.bind(this), 0) }
  // 改法三:构造时绑一次
  // constructor() { this.seconds = 0; this.tick = this.tick.bind(this) }
}

const t = new Timer()
t.start()
setTimeout(() => console.log(t.seconds), 10)  // 0
```

回调执行时按默认绑定,`this` 不是 `Timer` 实例:浏览器里是 `window`,Node 里是 `Timeout` 对象。`t.seconds` 一直是 0,而且不报错,比直接抛错更难查。

改法三最彻底:实例上的 `tick` 从此是个绑定过的函数,不管之后怎么传。

React 的 class 组件里 `this.handleClick = this.handleClick.bind(this)` 就是这个原因。

## 箭头函数不绑定 this

箭头函数没有自己的 `this`,用的是定义时外层作用域的 `this`。`call`、`apply`、`bind` 都改不了。

```js
const obj = {
  name: 'a',
  regular() { return this.name },
  arrow: () => this === obj,   // 这里的 this 不是 obj
}

obj.regular()  // 'a'
obj.arrow()    // false
```

对象字面量不构成作用域,`arrow` 里的 `this` 来自定义它的那一层:CommonJS 模块顶层是 `module.exports`,ESM 顶层是 `undefined`,浏览器的普通脚本里是 `window`,三种都不是 `obj`。

结论很直接:对象里的方法不要写箭头函数。反过来,需要把外层 `this` 带进回调时,箭头正是对的工具,`start()` 的第一种改法就是这个用法。

## bind 与偏函数

`bind` 除了锁 `this`,还能预置参数:

```js
function request(base, path) {
  return `${base}${path}`
}

const api = request.bind(null, 'https://example.com')
api('/users')  // 'https://example.com/users'
```

第一个参数传 `null` 表示不关心 `this`。被绑定的函数 `length` 会减去预置的参数个数,`api.length` 是 1。

预置参数是每调用一次就固定一个,不能再改;想留可覆盖的默认值,用默认参数更合适。

## 判定顺序

```text
1. 是箭头函数?  → 看定义处外层的 this,后面全部跳过
2. 有 new?      → 新建的对象
3. 有 bind?     → 绑定的对象
4. 调用时有点号? → 点号左边的对象
5. 都没有        → 严格模式 undefined,否则 globalThis
```

实际读代码时反过来更快:先找调用表达式最后一步,是 `fn()` 还是 `obj.fn()`,是 `call` 还是 `new`。把调用方式认出来,`this` 就定了,和函数体里写了什么无关。

## 小结

- 默认、隐式、显式、`new` 四种绑定,优先级从低到高;
- `obj.fn()` 的 `this` 是 `obj`,把 `fn` 摘出来单独调用就退回默认绑定;
- `bind` 返回新函数,绑定不可再改,`call` 和 `apply` 只影响当次调用;
- 箭头函数没有自己的 `this`,由定义位置决定,`bind` 无效;
- 严格模式下默认绑定的 `this` 是 `undefined`,非严格模式是 `globalThis`;
- 判定时先排除箭头函数,再看调用表达式的最后一步。
