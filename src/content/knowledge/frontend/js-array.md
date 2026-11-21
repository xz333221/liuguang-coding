---
title: 数组与对象的常用方法
summary: 'map、filter、reduce 是遍历与转换的三件套，都不改原数组。push、splice、sort 会改，需要不变版本时用 slice 或 toSorted。sort 默认按字符串比较，数字排序必须传比较函数。'
category: frontend
node: frontend-js-array
order: 33
level: 入门
tags: [JavaScript, 数组, 对象, 数组方法, 不可变]
updated: 2026-11-19
mindmap: js-array.mindmap.json
terms: []
sources:
  - title: MDN · Array
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array
    note: 各方法的签名、返回值与是否修改原数组。
  - title: MDN · Object.entries
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
    note: 与 fromEntries 配对使用的说明。
  - title: javascript.info · 数组方法
    url: https://zh.javascript.info/array-methods
    note: map、filter、reduce 与原地方法的对比。
---

`this` 那篇讲的是方法执行时看谁，接下来看日常被方法处理最多的两类数据。这篇按用途把数组和对象的方法排一遍，顺手标出哪些会改原数据。

## 遍历与转换

```js
const users = [
  { name: 'a', age: 20, active: true },
  { name: 'b', age: 17, active: false },
  { name: 'c', age: 31, active: true },
]

users.map((u) => u.name)                  // ['a', 'b', 'c']
users.filter((u) => u.active)              // 两个对象
users.reduce((sum, u) => sum + u.age, 0)   // 68

// 用对象做累加器,记得返回 acc
users.reduce((acc, u) => {
  const key = u.active ? 'on' : 'off'
  ;(acc[key] ||= []).push(u.name)
  return acc
}, {})
// { on: ['a', 'c'], off: ['b'] }
```

三个方法的回调签名都是 `(value, index, array)`，区别在返回值：`map` 长度不变、`filter` 可能变短、`reduce` 收成一个值。三者都不改原数组。

用对象做累加器时漏了 `return acc`，下一轮拿到的就是 `undefined`。`||=` 是 ES2021 的逻辑赋值，等价于 `acc[key] || (acc[key] = [])`；行首的分号不能省，上一行以字符串结尾、下一行以 `(` 开头，不加会被解析成 `'off'(...)` 这样的函数调用。

`reduce` 的第二个参数是初始值，省略时拿第一个元素当初始值、从第二个开始遍历，空数组省略初始值直接抛错：

```js
const empty = []

try {
  empty.reduce((a, b) => a + b)
} catch (err) {
  console.log(err.message)   // Reduce of empty array with no initial value
}

console.log(empty.reduce((a, b) => a + b, 0))   // 0
```

## 查找与判断

| 方法 | 返回 | 找不到时 |
| --- | --- | --- |
| `find` | 第一个匹配的元素 | `undefined` |
| `findIndex` | 下标 | `-1` |
| `findLast` | 从后往前第一个匹配 | `undefined` |
| `some` | 有没有一个匹配 | `false` |
| `every` | 是不是全都匹配 | 空数组返回 `true` |
| `includes` | 是否包含某个值 | `false` |
| `indexOf` | 下标 | `-1` |

`some` 与 `every` 会短路，找到结论就停，适合放进条件里。`every` 对空数组返回 `true` 是数学约定，但常常出人意料：「所有元素都满足」在没元素时为真，所以不能拿它判断「数组有内容且都合法」。

`includes` 用 SameValueZero 比较，`[NaN].includes(NaN)` 是 `true`，而 `[NaN].indexOf(NaN)` 是 `-1`。按对象身份找用 `find`，按原始值找用 `includes`。

## 会改原数组的方法

```js
const list = [3, 1, 2]

list.push(4)       // 改,返回新长度 4
list.pop()         // 改,返回被删的元素
list.splice(1, 2)  // 改,返回被删的片段
list.sort()        // 改,原地排序
list.reverse()     // 改

const arr = ['a', 'b', 'c', 'd']
arr.slice(1, 3)    // ['b', 'c'],取 [1, 3),不改原数组

// ES2023 的不变版本,Node 20 与主流浏览器可用
const sorted = list.toSorted((a, b) => a - b)
const replaced = list.with(0, 99)     // 等价于复制后改第 0 项
```

`map`、`filter`、`slice`、`concat`、`flat` 返回新数组，原数组不动。在 React 里直接 `list.sort()` 是常见 bug:它改的是 state 里的同一个数组，引用没变，组件判定为没更新。

`splice` 和 `slice` 只差一个字母，行为相反：`splice(1, 2)` 从下标 1 开始删 2 个并改原数组，`slice(1, 3)` 取 `[1, 3)` 的片段、不改原数组。

## sort 的默认行为

```js
const nums = [1, 10, 2]
console.log([...nums].sort())                // [1, 10, 2]
console.log([...nums].sort((a, b) => a - b)) // [1, 2, 10]
```

默认把所有元素转成字符串按 UTF-16 码元比较，`'10'` 排在 `'2'` 前面。数字排序必须给比较函数，这是最常见的排序 bug。

比较函数返回负数表示 `a` 排前面，正数表示 `b` 排前面，0 表示相等。降序写 `(a, b) => b - a`。字符串按字典序排用 `a.localeCompare(b)`，能处理中文与大小写。

ES2019 之后 `sort` 是稳定排序，相等的元素保持原有顺序。这意味着可以先按次要字段排、再按主要字段排，得到多级排序。

## 对象的方法

```js
const conf = { host: 'localhost', port: 3000 }

Object.keys(conf)     // ['host', 'port']
Object.values(conf)   // ['localhost', 3000]
Object.entries(conf)  // [['host', 'localhost'], ['port', 3000]]

Object.fromEntries(
  Object.entries(conf).map(([k, v]) => [k, String(v)])
)
// { host: 'localhost', port: '3000' }

for (const name of ['a', 'b', 'c']) {
  if (name === 'b') continue
  console.log(name)   // a、c
}
```

`entries` 加 `map` 加 `fromEntries` 是「批量改属性值」的标准写法，比 `for...in` 里逐个赋值安全，不会碰到原型上的属性。

`Object.keys` 只返回自身的可枚举字符串键，不含 `symbol`。要 `symbol` 用 `Object.getOwnPropertySymbols`。属性顺序是：整数键按数值升序，其余按插入顺序。

遍历对象时 `for...in` 会连原型上可枚举的属性一起遍历；数组遍历用上面那段 `for...of`，它读迭代器，拿到的是值不是键。

`for...of` 里可以用 `break`、`continue`、`await`,`forEach` 都不行——`forEach` 的回调里 `return` 只是跳过这一项，不是中断循环。需要提前退出就用 `for...of` 或 `some`。

## 小结

- `map`、`filter`、`reduce` 不改原数组，`reduce` 空数组不传初始值会抛 `TypeError`;
- `find` 找不到返回 `undefined`,`findIndex` 返回 `-1`, `every` 对空数组返回 `true`;
- `includes` 能判断 `NaN`,`indexOf` 不能；
- `push`、`splice`、`sort`、`reverse` 改原数组，`slice`、`concat`、`toSorted` 不改；
- `sort` 默认按字符串比较，数字排序必须传比较函数；
- `entries` 配 `map` 和 `fromEntries` 是批量改对象属性的标准写法，遍历数组用 `for...of`。
