---
title: 类型收窄、守卫与断言
summary: '联合类型的值在收窄之前只能访问各分支共有的成员。typeof、instanceof、in、真值判断和判别字段都会让编译器缩小范围,自定义守卫用 is 把判断封装成可复用的函数。as 只改编译器的看法、不做任何检查,satisfies 检查的同时保留更窄的推断。非空断言 ! 编译后消失,值该是 undefined 还是 undefined。'
category: frontend
node: frontend-ts-narrow
order: 63
level: 进阶
tags: [TypeScript, 类型收窄, 类型守卫, satisfies]
updated: 2026-11-19
mindmap: ts-narrow.mindmap.json
terms: []
sources:
  - title: TypeScript · Narrowing
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
    note: typeof、真值判断、in、instanceof 与自定义守卫的收窄规则。
  - title: TypeScript 4.9 · satisfies
    url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
    note: satisfies 运算符的设计动机与和 as 的区别。
  - title: TypeScript · Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
    note: 类型断言的语义,以及它不做运行时检查这一事实。
---

泛型让函数保住了调用方传入的类型,可一进入函数体,`string | number` 这种联合就只能用两边共有的方法。要真正处理分支,编译器得知道当前走的是哪一支——这就是收窄。

## 收窄的来源

`tsc` 会顺着控制流分析,在每个位置算出变量的可能类型。

```ts
function pad(value: string | number, len: number) {
  value.toFixed(2)
  // 报错:Property 'toFixed' does not exist on type 'string | number'

  if (typeof value === 'number') {
    return value.toFixed(2)          // 这里收窄成 number
  }
  return value.padStart(len, '0')    // 剩下 string
}

function size(v: string | string[] | null) {
  if (Array.isArray(v)) return v.length
  if (typeof v === 'string') return v.length
  return 0
}
```

能触发收窄的写法就那么几种,记住清单比记规则省事:

| 写法 | 收窄依据 | 注意 |
| --- | --- | --- |
| `typeof v === 'string'` | 原始类型判别 | `null` 走 `=== null`,不是 `typeof` |
| `v instanceof Date` | 原型链 | 跨 iframe 时构造函数不同,会失效 |
| `'a' in v` | 属性是否存在 | 只判断存在,不判断值的类型 |
| `if (v)` | 真值判断 | 会顺手排除 `0`、`''`、`false` |
| `v === null` / `v == null` | 直接比较 | `== null` 同时排除 `null` 与 `undefined` |
| `v.kind === 'circle'` | 字面量字段 | 判别联合的标准写法 |

`typeof` 对 `null` 返回 `'object'`,所以 `typeof v === 'object'` 不能排除 `null`,还得补一句 `v !== null`。`Array.isArray` 是收窄数组最可靠的方式,`typeof []` 只会给 `'object'`。

收窄对变量赋值敏感。`let` 变量在 `await` 或回调里可能被改过,编译器会放弃之前的判断,表现是「刚才还能用,现在报错了」。改用 `const` 或者把值先存进一个局部常量,能避开这类误判。

## 判别联合

多个对象形状混在一个类型里时,给它们加一个字面量字段当标签,收窄就变成查表:

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'rect'; w: number; h: number }
  | { kind: 'line'; len: number }

function assertNever(v: never): never {
  throw new Error(`unhandled: ${JSON.stringify(v)}`)
}

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle':
      return Math.PI * s.r ** 2
    case 'rect':
      return s.w * s.h
    case 'line':
      return 0
    default:
      return assertNever(s)
  }
}
```

`switch` 里每个 `case` 都把 `s` 收窄成对应分支,`s.r`、`s.w` 都是确定的类型。这比用 `instanceof` 判断类更稳,因为标签是数据的一部分,序列化之后依然在。

`assertNever` 的作用是把「漏了一个分支」变成编译错误。给 `Shape` 加第四种形态而忘了写 `case` 时,`default` 里的 `s` 不再是 `never`,`assertNever(s)` 立刻报错。

## 自定义守卫

同一个判断在十个地方重复写,不如封装成函数。函数要能收窄返回类型,得写成类型谓词:

```ts
type User = { id: number; name: string }

function isUser(v: unknown): v is User {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'number' && typeof o.name === 'string'
}

const data: unknown[] = [1, { id: 2, name: 'bob' }, null]
const users = data.filter(isUser)   // User[]

const second = data[1]
if (isUser(second)) {
  second.name   // 通过,收窄成 User
}
```

类型谓词 `v is User` 让编译器在接受返回值的同时更新 `v` 的类型。它对数组方法同样有效,`filter(isUser)` 的返回类型是 `User[]` 而不是 `unknown[]`。

TypeScript 5.5 起,`return typeof v === 'string'` 这种单行判断会被自动推断出谓词,不写 `v is string` 也能收窄。判断条件涉及多个字段、需要先做类型断言时推不出来,这时必须手写谓词。

要注意谓词是「你向编译器保证」,函数体写错它不拦。`function isNum(v: unknown): v is number { return true }` 完全合法,运行时照样炸。这也是守卫函数必须配单元测试的原因。

判断失败时抛错而不是返回布尔,用断言函数:

```ts
function assertString(v: unknown): asserts v is string {
  if (typeof v !== 'string') {
    throw new TypeError(`expected string, got ${typeof v}`)
  }
}

function run(input: unknown) {
  assertString(input)
  input.trim()   // 调用之后已经收窄
}
```

`asserts v is string` 要求函数返回 `void` 且必须显式标注。它的语义是「不满足就抛错」,所以只能用在确实会中断流程的位置。

## as 与 satisfies

两个都写在表达式后面,作用相反。

```ts
type Config = { port: number; host: string }

const raw: unknown = JSON.parse('{"port":"3000","host":"localhost"}')
const c1 = raw as Config
c1.port.toFixed()   // 编译通过,运行时 c1.port 是字符串,直接 TypeError

const c2 = { port: 3000, host: 'localhost' } satisfies Config
c2.port             // number

const c3 = { port: '3000', host: 'localhost' } satisfies Config
// 报错:Type 'string' is not assignable to type 'number'
```

`as` 只是让编译器换个角度看同一个值,不做检查也不改变运行时。它唯一的限制是「两边类型要有足够重叠」,从 `unknown` 转到任何类型都算重叠,所以这里畅通无阻。

`satisfies` 反过来:先检查,再保留真实类型。它和 `as const` 组合时最有用——直接用注解会把字面量拓宽,只用 `as const` 又丢掉了「必须符合某个形状」的检查:

```ts
type Route = { path: string; title: string }

const routes = {
  home: { path: '/', title: '首页' },
  about: { path: '/about', title: '关于' },
} as const satisfies Record<string, Route>

routes.home.path   // '/',而不是 string
```

`as const` 保住字面量,`satisfies` 保证每个条目的形状正确,缺字段或拼错都会报错。

## 非空断言的风险

`!` 加在表达式后面,意思是「我确定它不是 `null` 或 `undefined`」,典型写法是 `document.getElementById('app')!`。编译后这个符号直接消失,产物就是原表达式。

值真的是 `null` 时,报错发生在运行时的下一行,而且是 `Cannot set properties of null`,和断言本身看不出关系。它在 `strictNullChecks` 下唯一的作用就是关掉这项检查。

三个更安全的替代:

- 判空后再用:`const el = document.getElementById('app'); if (!el) return`。
- 可选链加默认值:`el?.innerHTML ?? ''`。
- 断言函数集中处理:`assertElement(el)` 一次写好,后面省心。

团队里通常约定 `!` 只出现在测试文件,业务代码里出现就在 review 时拦下。

## 小结

- 收窄沿控制流进行,`typeof`、`instanceof`、`in`、真值判断、判别字段是全部入口;
- 判别联合用一个字面量字段当前提,配 `never` 做穷尽检查,漏分支即编译错误;
- 自定义守卫靠 `v is T` 谓词,谓词是你对编译器的承诺,写错它不拦;
- `as` 只换视角不做检查,`satisfies` 检查且保留窄类型,`as const satisfies` 是最常见的组合;
- 非空断言 `!` 编译后消失,值缺了照样崩,业务代码里用判空替代。
