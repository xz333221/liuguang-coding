---
title: 基础类型、字面量与联合类型
summary: '值能写成的类型分成原始类型、数组与元组、对象、字面量几类。let 声明会被放宽成宽类型,const 保留字面量,as const 把对象或数组冻结成只读的字面量结构。联合用 | 取并集、交叉用 & 取交集,联合上只能访问共有成员。any 关掉检查并传染,unknown 必须先收窄,never 表示不可能出现的值。'
category: frontend
node: frontend-ts-basic
order: 60
level: 入门
tags: [TypeScript, 类型推断, 字面量类型, 联合类型]
updated: 2026-11-19
mindmap: ts-basic.mindmap.json
terms: []
sources:
  - title: TypeScript · Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
    note: 原始类型、数组、对象、联合与字面量类型的官方写法。
  - title: TypeScript · Narrowing
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
    note: 联合类型在使用前如何被收窄。
  - title: TSConfig Reference · strictNullChecks
    url: https://www.typescriptlang.org/tsconfig#strictNullChecks
    note: null 与 undefined 在严格模式下的类型行为。
---

上一篇把类型检查的位置讲清楚了:错误在保存文件时出现,产物里不留痕迹。接下来要看的是这套检查的语言本身——一个值可以被声明成哪几种类型,类型之间又怎么组合。

## 注解与推断

大部分时候不用手写类型,`tsc` 会从初始值推出来。推断的宽窄取决于声明方式。

```ts
let n = 1              // number
const m = 1            // 1,字面量类型
let s = 'hi'           // string
const c = 'hi'         // 'hi'
const obj = { a: 1 }   // { a: number },属性被放宽
const list = []        // any[],push 之后才定

function greet(name: string, times = 1): string {
  return `hi ${name}`.repeat(times)
}
```

`let` 的变量之后还能改,所以推断成宽类型;`const` 绑定不能重赋,所以推断成窄的字面量。对象属性不受这个规则保护——`obj.a` 仍然可以改成别的数字,所以 `a` 是 `number` 而不是 `1`。

空数组是个例外,推断结果是 `any[]`,直到第一次 `push` 才定下来。编译器控制流分析能跟上赋值顺序,但跨函数传递时已经变成了 `any[]`,该手写注解就手写。

## 原始类型、数组与元组

七个原始类型都有对应的类型名,大小写要分清:`string` 是小写的类型,`String` 是大写的包装对象接口,两者不等价,后者几乎等于 `any`。

```ts
let title: string = 'hello'
let count: number = 42
let big: bigint = 42n
let ok: boolean = true
let missing: undefined = undefined
let key: symbol = Symbol('id')

const ids: number[] = [1, 2, 3]
const pair: [string, number] = ['age', 30]
const args: [string, ...number[]] = ['sum', 1, 2, 3]
const maybe: [string, number?] = ['name']

pair[2]        // 报错:Tuple type '[string, number]' of length '2' has no element at index '2'
pair[0] = 1    // 报错:Type 'number' is not assignable to type 'string'
```

`null` 与 `undefined` 各自是一个类型,`strictNullChecks` 打开后它们不属于 `string`。想允许为空必须显式写进联合:`string | null`。

数组有两种写法,`T[]` 与 `Array<T>` 等价。长度和每个位置的类型都固定时用元组,元组还支持可选元素 `number?` 和剩余元素 `...number[]`。

`as const` 是拿字面量最省事的办法。它把对象和数组整体变成只读,并且不再放宽:

```ts
const ROUTES = ['home', 'about', 'detail'] as const
// readonly ['home', 'about', 'detail']

type Route = (typeof ROUTES)[number]   // 'home' | 'about' | 'detail'

const CONFIG = { retry: 3, mode: 'strict' } as const
// { readonly retry: 3; readonly mode: 'strict' }
```

`(typeof ROUTES)[number]` 是索引访问类型:先取 `ROUTES` 的类型,再用 `number` 取出所有元素类型组成的联合。路由表、配置枚举基本都这么写,改数组就等于改类型。

## 字面量类型与联合

字面量类型就是「只能是这个值」。它常和联合一起用,把参数从「任意字符串」收紧成几个选项。

```ts
type Status = 'idle' | 'loading' | 'success' | 'error'

function setStatus(next: Status) {
  console.log(next)
}

setStatus('loading')
setStatus('failed')
// 报错:Argument of type '"failed"' is not assignable to parameter of type 'Status'
```

数字和布尔同样有字面量类型,`true | false` 就是 `boolean`。字面量类型不接受隐式拓宽——`let s: Status = 'idle'` 之后 `s = 'done'` 会报错,这正是想要的效果。

联合类型上只能访问所有成员共有的属性。交叉类型 `&` 则是「同时满足」:

```ts
type Circle = { kind: 'circle'; r: number }
type Box = { kind: 'box'; w: number }

function read(v: Circle | Box) {
  v.kind      // 'circle' | 'box',共有
  v.r         // 报错:Property 'r' does not exist on type 'Box | Circle'
}

type Named = { name: string }
type Aged = { age: number }
const p: Named & Aged = { name: 'ada', age: 36 }
```

对象交叉会合并成员;同名字段类型不同时取交集,`string & number` 得到 `never`,因为不存在同时是字符串又是数字的值。原始类型之间几乎没有交集,所以交叉主要用在对象上。

## any、unknown、never 与 void

四个特殊类型经常被混用,分工完全不同。

| 类型 | 能赋什么给它 | 能用它做什么 | 危险点 |
| --- | --- | --- | --- |
| `any` | 任意值 | 任意操作,不做检查 | 沿赋值与返回值扩散,吞掉整条链路的检查 |
| `unknown` | 任意值 | 只能赋给 `any` 或 `unknown` | 使用前必须收窄,写起来略啰嗦 |
| `never` | 只有 `never` | 任何操作都合法,但代码执行不到 | 滥用会把正常分支也判成不可达 |
| `void` | `undefined` | 通常只作为函数返回类型 | 不等于「可以返回任意值」 |

`unknown` 是 `any` 的安全版本:接受一切输入,但不允许直接使用。

```ts
function parse(input: unknown) {
  input.trim()
  // 报错:'input' is of type 'unknown'

  if (typeof input === 'string') {
    return input.trim()   // 收窄之后才是 string
  }
  return ''
}

function assertNever(v: never): never {
  throw new Error(`unexpected value: ${String(v)}`)
}

type Shape = { kind: 'circle' } | { kind: 'square' }

function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return 3.14
    case 'square': return 1
    default: return assertNever(s)
  }
}
```

`never` 是空集,没有任何值属于它。两个真实用途:永远不返回的函数(内部 `throw` 或死循环),以及上面这个穷尽检查。给 `Shape` 加第三种 `kind` 而忘了补分支,`default` 里的 `s` 就不再是 `never`,编译报错。这个模式把「忘了处理新情况」变成了编译错误。

`void` 只描述「这个函数不返回有用的东西」,不等于「可以返回任意值」。把 `() => void` 当成任意返回值会出错:它表示调用方不该使用返回值,函数体里 `return 1` 也会被拒。

## 三条边界

- 注解与断言不能混着用。`const x: number = '1'` 报错,`const x = '1' as number` 不报错但运行时仍是字符串,后者是硬把类型系统按住。
- `object`、`{}`、`Object` 三个不是一回事。`object` 表示非原始值,`{}` 表示除 `null` 与 `undefined` 之外的任何值,`Object` 几乎等于 `any`,不要用。
- 联合类型做可辨识的前提是有一个字面量字段。没有标签字段的联合,收窄只能靠 `typeof`、`in` 这类结构判断,分支一多就乱。

## 小结

- `let` 声明放宽成宽类型,`const` 保留字面量,对象属性不受保护,空数组推断成 `any[]`;
- `as const` 把数组和对象冻结成只读字面量,配合 `(typeof x)[number]` 导出联合;
- 字面量联合把参数收紧成有限选项,是状态机与配置项的首选;
- 联合上只能访问共有成员,访问分支成员要先收窄;
- `any` 关检查并传染,`unknown` 必须先收窄,`never` 用于不可能值与穷尽检查。
