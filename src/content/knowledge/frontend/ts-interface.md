---
title: 接口、类型别名与结构类型
summary: '接口和类型别名都能描述对象形状，差别在接口可以声明合并、类型别名可以表达联合与条件类型。TypeScript 是结构类型系统，赋值只看形状不看名字，类不写 implements 也能被赋给接口。对象字面量直接赋值会触发多余属性检查，中转一个变量就绕过了。键不固定的对象用索引签名描述。'
category: frontend
node: frontend-ts-interface
order: 61
level: 入门
tags: [TypeScript, interface, 结构类型, 索引签名]
updated: 2026-11-19
mindmap: ts-interface.mindmap.json
terms: []
sources:
  - title: TypeScript · Object Types
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
    note: 可选属性、readonly、索引签名与接口扩展的写法。
  - title: TypeScript · Type Compatibility
    url: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
    note: 结构类型系统的判定规则与多余属性检查的触发条件。
  - title: TypeScript · Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces
    note: 接口与类型别名能力差异的官方对照。
---

上一篇用联合类型把参数限制在几个取值上，但值一旦是个对象，「有哪些字段、哪些可选」就写不出来。这一篇解决形状描述的问题：两种语法，以及 TypeScript 判定兼容性时依据的那套规则。

## 两种写法

同一个形状有两种表达方式，日常可以互换。

```ts
interface User {
  readonly id: number
  name: string
  email?: string
  greet(): string
}

type UserAlias = {
  readonly id: number
  name: string
  email?: string
  greet: () => string
}

interface Timestamps {
  createdAt: Date
  updatedAt: Date
}

interface Post extends Timestamps {
  title: string
  body: string
}
```

`?` 表示可选，读出来是 `string | undefined`。`readonly` 防止重新赋值，`user.id = 2` 报 `Cannot assign to 'id' because it is a read-only property`。注意它是浅层的，只读数组的元素照样能改，深层只读要自己写映射类型。

方法有两种写法。`greet(): string` 与 `greet: () => string` 在大多数场景等价，差别在参数检查：`strictFunctionTypes` 只对后者生效。给回调类型加约束时用属性写法，能拿到更严格的逆变检查。

接口可以扩展多个父接口，`extends` 后面用逗号分隔。类型别名则用交叉类型组合：`type Post = Timestamps & { title: string }`。

## 结构类型：只看形状

TypeScript 的类型兼容性按成员逐个比较，不管名字。这就是常说的鸭子类型——走起来像鸭子、叫起来像鸭子，那就当鸭子使。

```ts
interface Point {
  x: number
  y: number
}

function length(p: Point) {
  return Math.hypot(p.x, p.y)
}

const p3 = { x: 3, y: 4, z: 5 }
length(p3)   // 通过,多出来的 z 不影响

class Vec {
  constructor(public x: number, public y: number) {}
}
length(new Vec(3, 4))   // 通过,Vec 没有 implements Point
```

类不需要显式实现接口，只要公共成员对得上就能传进去。反过来，接口写多了一个成员就通不过：`{ x: 3 }` 缺 `y`。

结构类型有两处例外会退化成名义类型：两个类各自声明了同名但来源不同的 `private` 成员时互不兼容；带 `#` 私有字段的类更彻底，只在类内部可访问。

## 多余属性检查

按结构判断，多出来的字段理应放行。但对象字面量直接赋值时，`tsc` 会额外查一遍：

```ts
interface Config {
  host: string
  port: number
}

const c: Config = { host: 'localhost', port: 3000, debug: true }
// 报错:Object literal may only specify known properties,
// and 'debug' does not exist in type 'Config'

const extra = { host: 'localhost', port: 3000, debug: true }
const c2: Config = extra   // 通过,中转一次就绕过了检查
```

这条检查叫多余属性检查(excess property check)，目的很实际：手写对象字面量时拼错字段名，不会静默通过。`port: 3000` 写成 `prot: 3000` 就能被抓住。

它只在特定位置触发——对象字面量直接赋给一个有明确类型的变量、参数或返回值。中转一次变量就绕过了，这也是为什么「配置对象抽成常量再传进去」不报错，而内联写就报错。

想保留检查又确实需要多字段，在类型里显式声明，或者加索引签名。用 `as Config` 也能压掉报错，但那是放弃检查，不是解决问题。

## 索引签名

键事先不确定的对象，用索引签名描述：

```ts
interface Dict {
  [key: string]: number
}

const scores: Dict = { math: 90, english: 85 }
const v = scores['physics']   // number,虽然这个键不存在

const bad: Dict = { math: 90, name: 'ada' }
// 报错:Type 'string' is not assignable to type 'number'

interface Mixed {
  [key: string]: number | string
  [index: number]: number
}
```

索引签名会约束所有同名类型的成员。`Dict` 里任何 `string` 键的值都必须是 `number`，混进一个字符串就报错。

访问不存在的键返回 `number` 而不是 `undefined`，这是常见的事故来源。打开 `noUncheckedIndexedAccess` 后，`scores['physics']` 的类型变成 `number | undefined`，代价是所有索引访问都要判空。

数字索引与字符串索引同时存在时，数字索引的值类型必须是字符串索引值类型的子类型，所以 `Mixed` 里 `number` 要包含在 `number | string` 里。

`Record<K, T>` 是索引签名的语法糖，`Record<string, number>` 与 `Dict` 等价。键还能收窄成字面量联合，`Record<'a' | 'b', number>` 要求两个键都在。

## 接口与类型别名的分工

| 能力 | `interface` | `type` |
| --- | --- | --- |
| 描述对象形状 | 是 | 是 |
| 声明合并(同名再写一次) | 合并成员 | 报 `Duplicate identifier` |
| 联合、交叉、条件、映射类型 | 不能 | 可以 |
| 元组、原始类型别名 | 不能 | 可以 |
| `extends` 多个 | 可以 | 用 `&` 组合 |
| `implements` | 可以 | 对象类型可以 |
| 报错信息 | 显示接口名 | 常展开成结构 |

声明合并是接口独有的一条，也是它不可替代的地方：

```ts
interface Window {
  __APP_VERSION__: string
}

interface Window {
  __THEME__: 'light' | 'dark'
}

// 两处声明合并成一个 Window,两个字段都要求存在
```

全局对象扩展、第三方库的类型增强都靠这个机制。反过来，库里导出的类型不要用接口重新声明，合并不是覆盖，很可能得到一个更宽的意外结果。

选哪个的经验：描述对象形状、要给外部扩展，用 `interface`；需要联合、映射、条件类型，或者只是给某个复杂类型起个短名字，用 `type`。同一份代码里保持一种风格比选哪个更重要。

## 小结

- `interface` 与 `type` 都能描述对象，差别在声明合并、联合与映射类型的表达能力；
- TypeScript 按形状判断兼容，类不写 `implements` 也能赋给接口；
- 对象字面量直接赋值触发多余属性检查，中转变量可以绕过，但它挡住的正是拼写错误；
- 索引签名约束所有键的值类型，访问不存在的键不返回 `undefined`，除非开 `noUncheckedIndexedAccess`;
- 全局扩展与第三方类型增强只能靠接口的声明合并，类型别名重复声明直接报错。
