---
title: 变量、作用域与提升
summary: '名字在哪些行可见由作用域决定:var 只有函数作用域,let 和 const 还有块级。声明都会提升,var 提升成 undefined,let 落在 TDZ 里,声明之前访问抛 ReferenceError。'
category: frontend
node: frontend-js-scope
order: 29
level: 入门
tags: [JavaScript, 作用域, 提升, TDZ, 闭包]
updated: 2026-11-19
mindmap: js-scope.mindmap.json
terms: []
sources:
  - title: MDN · var
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/var
    note: var 的函数作用域与提升行为的规范描述。
  - title: MDN · let
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/let
    note: 块级作用域、TDZ 与重复声明的限制。
  - title: javascript.info · 变量作用域,闭包
    url: https://zh.javascript.info/closure
    note: 作用域链、词法环境与每次迭代新建绑定的讲解。
---

上一篇分清了一个值是原始值还是对象,但值要先被名字接住才能用。名字在哪些行可见、什么时候可以读、能不能重名,由声明方式和作用域一起决定。

## 三种作用域

```text
全局作用域
└── 函数作用域 (function run 内部)
    └── 块级作用域 (if / for / while / 单独的花括号)
```

`var` 声明的变量属于最近的函数作用域,或者全局;`let`、`const` 属于最近的块。函数声明在函数体内整体提升,块内的函数声明在严格模式下只在块内可见。

```js
function run() {
  if (true) {
    var a = 1
    let b = 2
  }
  console.log(a) // 1,var 漏到了整个函数
  console.log(b) // ReferenceError: b is not defined
}
```

`var` 写在 `if` 里等于写在函数开头。这是它被诟病的主要原因:循环里的计数器、条件分支里的临时变量全都共享在同一个函数作用域里,重名时互相覆盖。

## var、let、const 的四处差别

| 对比项 | `var` | `let` | `const` |
| --- | --- | --- | --- |
| 作用域 | 函数 | 块 | 块 |
| 提升后的状态 | 初始化为 `undefined` | 未初始化,处于 TDZ | 未初始化,处于 TDZ |
| 重复声明 | 允许,静默覆盖 | `SyntaxError` | `SyntaxError` |
| 初始化 | 可省略 | 可省略 | 必须赋值 |
| 重新赋值 | 可以 | 可以 | 不可以 |

`const` 约束的是绑定,不是内容。`const user = { name: 'a' }` 之后可以改 `user.name`,不能 `user = {}`,后者抛 `TypeError: Assignment to constant variable.`。

想冻结内容得用 `Object.freeze`,而它是浅冻结,嵌套对象照样能改。这一点在相等比较那篇展开。

## 提升

声明的名字被抬到作用域顶部,赋值留在原地。

```js
console.log(a)  // undefined
var a = 1

console.log(f()) // 'ok',函数声明整体提升
function f() { return 'ok' }

console.log(g)  // undefined
var g = function () {}
g()             // TypeError: g is not a function
```

`var a = 1` 拆成两步:`var a` 抬到顶部并初始化为 `undefined`,`a = 1` 留在原位置。所以在赋值前访问不报错,拿到 `undefined`。

函数声明连函数体一起提升,可以在定义之前调用;函数表达式只提升变量名,赋值之前调用会得到 `TypeError`。

这条规则让工具函数可以写在文件末尾,也制造过不少「这个变量哪来的」的疑问。

## TDZ

`let` 和 `const` 的声明同样被抬到作用域顶部,但不初始化。从进入作用域到执行到声明之间,这段区域叫暂时性死区(temporal dead zone,TDZ),访问就抛错。

```js
try {
  console.log(x)   // 走 catch,try 块在这里中断
} catch (err) {
  console.log(err.name, err.message)
  // ReferenceError Cannot access 'x' before initialization
}
let x = 1

try {
  typeof later
} catch (err) {
  console.log('typeof 也抛错:', err.name)   // typeof 也抛错: ReferenceError
}
let later = 1

function g(a = b, b = 2) {}
try {
  g()
} catch (err) {
  console.log(err.message)   // Cannot access 'b' before initialization
}
```

`Cannot access ... before initialization` 是 TDZ 的标志,和变量根本不存在时的 `x is not defined` 不同。两种都是 `ReferenceError`,原因不一样,看报错原文就能分辨。`typeof notDeclared` 对不存在的名字返回 `'undefined'`,对 TDZ 里的名字照样抛错。

默认参数那条是同一规则的另一面:参数从左到右初始化。`function g(a = b, b = 2)` 里 `b` 还没就绪,调用即抛错;写成 `function f(a = 1, b = a * 2)` 就没有问题。

## 循环里的绑定

`for` 里的 `let` 有个特殊行为:每次迭代都创建一个新的绑定,并把上一轮的值复制进去。

```js
const fns = []
for (let i = 0; i < 3; i++) {
  fns.push(() => i)
}
console.log(fns.map((fn) => fn())) // [0, 1, 2]

const fns2 = []
for (var j = 0; j < 3; j++) {
  fns2.push(() => j)
}
console.log(fns2.map((fn) => fn())) // [3, 3, 3]
```

`var` 那样写时三个函数共享同一个 `j`,循环结束时它是 `3`。老代码里的解法是套一层立即执行函数,把计数存成参数;现在直接用 `let`。注意闭包捕获的是绑定,不是当时的值——外层变量后来被改,闭包读到的也是新值,这一点在函数那篇细说。

## 作用域链

访问一个名字时,引擎先在当前作用域找,找不到往外一层,一直找到全局。都没有才抛 `ReferenceError`。

```js
const level = 'global'

function outer() {
  const level = 'outer'

  function inner() {
    console.log(level) // 'outer',就近命中
  }

  inner()
}

outer()
```

作用域在写代码时就定好了,这叫词法作用域,和调用位置无关。函数在哪里被调用不改变它能看见什么,只看它定义在哪里。这条结论是后面理解闭包和 `this` 的分水岭:作用域由定义位置决定,`this` 由调用方式决定。

## 小结

- `var` 属于函数作用域,`let` 和 `const` 属于块级作用域;
- `var` 提升后是 `undefined`,函数声明整体提升,函数表达式不提升函数体;
- `let` 和 `const` 也提升但不初始化,声明之前访问落进 TDZ,抛 `ReferenceError`;
- `const` 锁的是绑定,对象内容仍可修改,深度冻结要另做;
- `for` 配 `let` 每次迭代新建绑定,闭包才能各自记住当轮的计数;
- 作用域链按定义位置确定,与调用位置无关。
