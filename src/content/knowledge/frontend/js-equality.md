---
title: 相等比较、深浅拷贝与不可变数据
summary: '=== 不做类型转换，NaN 不等于自身；Object.is 只在这两处与它不同。展开与 slice 是浅拷贝，structuredClone 支持循环引用，但克隆不了函数和 DOM 节点。'
category: frontend
node: frontend-js-equality
order: 34
level: 进阶
tags: [JavaScript, 相等, 深拷贝, structuredClone, 不可变]
updated: 2026-11-19
mindmap: js-equality.mindmap.json
terms: []
sources:
  - title: MDN · 相等比较与相同值
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness
    note: ===、==、Object.is 与 SameValueZero 三种口径的对比。
  - title: MDN · structuredClone
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Window/structuredClone
    note: 支持的克隆类型与抛 DataCloneError 的边界。
  - title: MDN · 展开语法
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Spread_syntax
    note: 只复制自身可枚举属性的说明。
---

数组方法里到处在比相等：`includes` 判存在、`find` 找元素、去重要比。比较的口径不止一种，拷贝的深浅也由同一套规则决定。

## 三种相等

```js
1 === 1          // true,严格相等,不做类型转换
1 == '1'         // true,宽松相等,先转类型
Object.is(1, 1)  // true,和 === 几乎一样

Object.is(NaN, NaN)  // true,=== 在这里是 false
Object.is(0, -0)     // false,=== 在这里是 true

const list = [NaN, 0]
list.includes(NaN)            // true,和 indexOf 的结果相反
list.includes(-0)             // true
new Set([NaN, NaN]).size      // 1
```

`===` 要求类型相同且值相同，两个例外：`NaN === NaN` 是 `false`,`+0 === -0` 是 `true`。`Object.is` 与 `===` 只在这两处不同。

第三种口径叫 SameValueZero，用在 `includes`、`Map`、`Set` 里：它认为 `NaN` 等于 `NaN`,`+0` 等于 `-0`。

三种口径的取舍：判值相等用 `===`；判 `NaN` 用 `Number.isNaN`；容器里查成员的行为由 SameValueZero 决定，不用自己记，知道 `includes` 认 `NaN` 就够。

## == 的转换规则

| 两边类型 | 行为 |
| --- | --- |
| 相同 | 按 `===` 比 |
| `null` 与 `undefined` | 相等，且只和彼此相等 |
| 数字与字符串 | 字符串转数字 |
| 布尔与任意 | 布尔先转数字 |
| 对象与原始值 | 对象走 `ToPrimitive` 转成原始值 |
| 其他组合 | `false` |

```js
const results = [
  null == undefined,   // true
  null == 0,           // false
  '' == 0,             // true
  '0' == false,        // true
  [] == false,         // true,[] 转成 '' 再转成 0
  [] == ![],           // true,右边 ![] 是 false
]
console.log(results)   // [true, false, true, true, true, true]

// 唯一值得保留的用法
const isEmpty = (value) => value == null
isEmpty(null)       // true
isEmpty(undefined)  // true
isEmpty(0)          // false,0 不会被误判
```

其中 `[] == ![]` 是常被拿来考人的例子：右边 `![]` 先算成 `false`，再按「布尔转数字」把两边变成 `0 == 0`。

`null == 0` 是 `false`，但 `null >= 0` 是 `true`——关系运算符走另一条路，把 `null` 转成 `0`。两条规则放在一起很别扭，所以实际代码里只用 `===`。

`value == null` 一个条件覆盖两种空值，比 `value === null || value === undefined` 短，也不会把 `0` 和 `''` 当成空。

## 浅拷贝

```js
const source = { a: 1, nested: { b: 2 } }
const copy = { ...source }

copy.a = 9         // 不影响 source
copy.nested.b = 9  // source.nested.b 也变成 9
```

展开运算符复制自身可枚举属性：原始值复制一份，对象类型复制引用。数组同理，`[...arr]`、`arr.slice()`、`Array.from(arr)` 都是浅拷贝。

`Object.assign({}, source)` 效果一样，但它会触发目标对象上的 setter，展开不会。现代代码优先用展开。

浅拷贝够用的场景很明确：对象只有一层，或者嵌套的部分本来就不打算改。

## 深拷贝

`structuredClone` 是浏览器和 Node 17+ 内置的深拷贝，循环引用能正确处理：

```js
const source = { a: 1, nested: { b: 2 } }
source.self = source

const clone = structuredClone(source)
clone.nested.b = 9
console.log(source.nested.b)        // 2,原对象没被改
console.log(clone.self === clone)   // true,循环引用被重建

// JSON 版本的深拷贝,问题更多
const o = { d: new Date(), n: NaN, u: undefined, f() {} }
JSON.parse(JSON.stringify(o))
// { d: '2026-11-19T...', n: null },u 与 f 不见了
```

`structuredClone` 是浏览器和 Node 17+ 内置的深拷贝，循环引用能正确处理，也保留 `Date`、`Map`、`Set`、`RegExp`、`ArrayBuffer` 这些内置类型。边界很清楚：

| 输入 | `structuredClone` 的结果 |
| --- | --- |
| 函数、`Symbol` | 抛 `DataCloneError` |
| DOM 节点 | 抛 `DataCloneError` |
| 循环引用 | 正常处理 |
| 类实例 | 变成普通对象，原型丢失 |
| getter | 求值后按普通属性复制 |

JSON 那一版把 `Date` 变成字符串，`NaN` 变成 `null`,`undefined` 和函数直接丢掉，循环引用抛 `TypeError`。字段少、类型简单的配置对象可以凑合，带日期或可能为 `undefined` 的数据不要用。

两种方式都做不到「保留类与原型」，需要这类拷贝时只能自己写递归，或者引入专门的库。

## 不可变更新

改嵌套状态时不碰原对象，逐层新建：

```js
const state = { user: { name: 'a', tags: ['x'] } }

const next = {
  ...state,
  user: {
    ...state.user,
    tags: [...state.user.tags, 'y'],
  },
}

const frozen = Object.freeze({ nested: { b: 1 } })
frozen.nested.b = 2   // 成功,frozen.nested 指向的对象没被冻结
```

改动路径上的每一层都新建，没动到的分支共享引用。这也是浅拷贝在状态管理里够用的原因：只有被改的那条路径需要复制。

只改一层就写一层展开，层层都改才需要递归或 `immer` 这类库。用结构共享的好处是上层可以靠引用比较判断「变没变」,`next.user !== state.user` 就是明确信号。

`Object.freeze` 只冻结第一层。给 `frozen` 自身加属性或换掉它的属性：非严格模式静默失败，严格模式抛 `TypeError`；但 `frozen.nested` 指向的对象不在冻结范围内，改它的属性照样生效。它能防住「整个对象被替换」，防不住嵌套修改，和浅拷贝的边界是同一个。

## 小结

- `===` 不做转换，`NaN` 不等于自身；`Object.is` 只在这两处与它不同；
- `includes`、`Map`、`Set` 用 SameValueZero,`NaN` 与 `NaN` 相等；
- `==` 的规则多，实际只保留 `value == null` 这一种用法；
- 展开、`slice`、`Object.assign` 都是浅拷贝，嵌套对象仍共享；
- `structuredClone` 支持循环引用，但克隆不了函数与 DOM 节点，类实例会丢原型；
- JSON 深拷贝会丢函数与 `undefined`，把 `Date` 变字符串、`NaN` 变 `null`;
- 不可变更新只复制改动路径上的层，其余共享引用。
