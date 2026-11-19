---
title: 值与类型：原始类型、对象与类型转换
summary: 'JavaScript 的值分两类:七个原始类型和对象。变量存原始值时复制一份,存对象时复制的是引用。typeof 对 null 和数组失灵,+ 遇到字符串就变成拼接。'
category: frontend
node: frontend-js-type
order: 28
level: 入门
tags: [JavaScript, 类型, 类型转换, typeof, 装箱]
updated: 2026-11-19
mindmap: js-type.mindmap.json
terms: []
sources:
  - title: MDN · JavaScript 数据类型和数据结构
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Data_structures
    note: 七个原始类型与对象类型的定义,原始值与包装对象的区别。
  - title: javascript.info · 数据类型
    url: https://zh.javascript.info/types
    note: typeof 的返回值与原始类型的判定方式。
  - title: MDN · 加法运算符
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Addition
    note: '`+` 在字符串与数字之间的行为,ToPrimitive 的调用顺序。'
---

样式架构那篇收在表现层的边界上:样式决定长什么样,点击之后发生什么还没有人管。从这一章开始换成 JavaScript,先解决最底层的一件事——一个值属于哪种类型,参与运算时又会被转成什么。

## 七个原始类型和一个对象

`typeof` 是最快的分类工具,但它给出的不是完整类型清单。

```js
typeof 'hi'            // 'string'
typeof 42              // 'number'
typeof 42n             // 'bigint'
typeof true            // 'boolean'
typeof undefined       // 'undefined'
typeof null            // 'object'
typeof Symbol('id')    // 'symbol'
typeof {}              // 'object'
typeof []              // 'object'
typeof function () {}  // 'function'
```

原始类型(primitive)只有七个:string、number、boolean、undefined、null、symbol、bigint。它们不是对象,挂不上属性,按值比较——两个 `'hi'` 就是同一个值。

其余全是对象:普通对象、数组、函数、Date、Map、正则。对象按引用比较,`{} === {}` 是 `false`,因为两边是两块不同的内存;`let b = a` 之后 `a === b` 为 `true`,因为两个名字指向同一个对象。

`typeof null` 返回 `'object'` 是 1995 年实现留下的 bug:当年用低位标记区分类型,`null` 的机器表示全是 0,正好和对象的标记撞上。改不动,改了会破坏已经上线的网页。判断 `null` 只能直接比:`value === null`。

| 表达式 | `typeof` 结果 | 说明 |
| --- | --- | --- |
| `null` | `'object'` | 历史 bug,不能用来判空 |
| `[]` | `'object'` | 数组也是对象 |
| `function () {}` | `'function'` | 可调用对象单独给了一个标记 |
| `new String('hi')` | `'object'` | 包装对象,和原始值不相等 |
| `Symbol()` | `'symbol'` | 原始类型,不能 `new` |
| 未声明的变量 | `'undefined'` | 唯一不抛错的探测方式 |

## 变量里存的是什么

原始值和对象在赋值时的行为完全不同。

```js
let x = 1
let y = x
y = 2
console.log(x) // 1,各存一份

let a = { n: 1 }
let b = a
b.n = 2
console.log(a.n) // 2,两个名字指向同一个对象
```

对象赋值复制的是引用,不是内容。想让改 `b` 不影响 `a`,必须新建一个对象;拷贝的深浅问题在相等比较那篇展开。

## 原始值为什么能调用方法

`'hi'.toUpperCase()` 看起来是在对象上取属性,但字符串是原始值。执行到这一句时,引擎临时造一个 `String` 包装对象,把 `'hi'` 放进去,取完方法就把临时对象丢掉。这个过程叫装箱(boxing)。

```js
const s = 'hi'
try {
  s.custom = 1        // 模块内默认严格模式,抛 TypeError
} catch (err) {
  console.log(err.message)  // Cannot create property 'custom' on string 'hi'
}
console.log(s.custom)       // undefined

new String('hi') === 'hi'   // false,包装对象和原始值不相等
typeof new String('hi')     // 'object'
```

赋值落在临时的包装对象上,下一个语句它已经不在了。非严格模式下静默失败,严格模式下抛 `TypeError`。

`Number`、`String`、`Boolean` 三个构造函数加 `new` 会返回包装对象,`typeof` 是 `'object'`。业务代码里不用 `new` 调这三个,`String(1)`、`Number('12')` 这种不加 `new` 的调用才是类型转换。

## 显式转换

三个转换函数是明确的,规则却比直觉松。

```js
Number('')         // 0
Number('  12  ')   // 12,两端空白忽略
Number('12px')     // NaN
Number(null)       // 0
Number(undefined)  // NaN
Number(true)       // 1
Number([])         // 0,空数组先转成 ''
Number([5])        // 5
Number([1, 2])     // NaN

String(null)       // 'null'
String([1, 2])     // '1,2'
String({})         // '[object Object]'

Boolean('0')       // true
Boolean([])        // true

// 和 parseInt 的分工:一个要求整串合法,一个从左往右读到非数字就停
parseInt('12px', 10)  // 12
parseInt('abc', 10)   // NaN
```

`Number` 要求整串都是合法数字,`parseInt` 读到第一个非数字就停。读样式值、读输入框里的数字用 `parseInt` 或 `parseFloat`,做参数校验用 `Number` 加 `Number.isFinite`。`parseInt` 的第二个参数总是显式写上,避免别人读代码时还要猜进制。

假值(falsy)一共八个:`false`、`0`、`-0`、`0n`、`''`、`null`、`undefined`、`NaN`。其余都是真值,包括 `'0'`、`' '`、`[]`、`{}`、`function () {}`。判断「有没有值」时,如果 `0` 和 `''` 是合法输入,就不能写 `if (v)`。

## 隐式转换与 + 号

`+` 是唯一一个既能做加法又能做拼接的运算符。它先把两边转成原始值,只要有一边是字符串就拼接,否则两边转数字再相加。

```js
console.log(1 + '2')        // '12'
console.log(1 + 2 + '3')    // '33',左结合,先算 1 + 2
console.log('3' + 1 + 2)    // '312',一开始就是字符串
console.log([] + [])        // ''
console.log([] + {})        // '[object Object]'
console.log(1 + null)       // 1
console.log(1 + undefined)  // NaN
```

其他算术运算符只做数字运算,遇到字符串先转数字:`'6' - 1` 是 `5`,`'6' / '2'` 是 `3`。这就是从接口拿到字符串数字时,减法算得对、加法却变成拼接的原因。

`{}` 出现在语句开头会被当成代码块。把 `{} + []` 作为一条独立语句写在脚本顶层时,花括号是空块,真正参与运算的只有 `+[]`,结果是 `0`;而在控制台或任何表达式位置,它按对象字面量解析,得到 `'[object Object]'`。这不是转换规则的问题,是解析规则的问题,包一层括号就能固定语义:`({}) + []`。

一元 `+` 是转数字最短的写法:`+''` 是 `0`,`+'12'` 是 `12`,`+[]` 是 `0`,`+{}` 是 `NaN`。可读性不如 `Number()`,基本只出现在惯用法里。

symbol 是个例外:`'' + Symbol()` 直接抛 `TypeError`,因为 symbol 不允许隐式转成字符串。

## 判断类型

| 需求 | 写法 | 注意 |
| --- | --- | --- |
| 原始类型 | `typeof v` | `null` 返回 `'object'` |
| 数组 | `Array.isArray(v)` | 跨 iframe 也准 |
| 是不是 `NaN` | `Number.isNaN(v)` | 全局 `isNaN` 会先做 `Number()` |
| 精确类型 | `Object.prototype.toString.call(v)` | 返回 `[object Array]` 这类标签 |

```js
Number.isNaN('abc')  // false,不做转换
isNaN('abc')         // true,先转成 NaN 再判断

Object.prototype.toString.call([])    // '[object Array]'
Object.prototype.toString.call(null)  // '[object Null]'
```

`instanceof` 查的是原型链,对原始值一律返回 `false`——`'hi' instanceof String` 是 `false`。跨 iframe 时两边的内置构造函数不是同一个,它同样失灵。判断内置类型优先用 `Array.isArray` 和 `Object.prototype.toString`。

## 小结

- 原始类型有七个,其余都是对象;原始值按值比较,对象按引用比较;
- `typeof null` 返回 `'object'` 是历史 bug,判空直接写 `=== null`;
- 在原始值上取属性会临时装箱,赋值留不下来;
- `Number('')` 是 `0`、`Number('12px')` 是 `NaN`,读数字用 `parseInt` 或 `parseFloat`;
- `+` 遇到字符串就拼接,其他算术运算符先转数字,`{} + []` 的结果受解析规则影响;
- 判数组用 `Array.isArray`,判 `NaN` 用 `Number.isNaN`。
