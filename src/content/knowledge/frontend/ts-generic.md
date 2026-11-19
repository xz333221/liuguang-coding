---
title: 泛型与约束
summary: '泛型把类型当成参数传进函数、接口和类,让一段实现服务多种输入并保持输入与输出的类型关系。约束 extends 限制参数范围,配合 keyof 保证键一定存在,返回类型用 T[K] 精确到那一个字段。默认类型参数给省略的余地,有默认值的必须排在后面。类型参数运行时不存在,要按类型分支只能额外传构造器。'
category: frontend
node: frontend-ts-generic
order: 62
level: 进阶
tags: [TypeScript, 泛型, keyof, 类型参数]
updated: 2026-11-19
mindmap: ts-generic.mindmap.json
terms: []
sources:
  - title: TypeScript · Generics
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
    note: 类型参数、约束、默认值与泛型类的官方说明。
  - title: TypeScript · Keyof Type Operator
    url: https://www.typescriptlang.org/docs/handbook/2/keyof-types.html
    note: keyof 的语义与和泛型约束的组合用法。
  - title: TypeScript · Indexed Access Types
    url: https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
    note: T[K] 索引访问类型的规则。
---

接口把对象的形状描述完了,可它描述的是一份具体的形状。同一个「取第一个元素」的函数,既要能处理 `number[]` 又要能处理 `string[]`,复制两份显然不对,参数写成 `any` 又会把返回值的类型一起丢掉。泛型就是来解决这个的。

## 类型也是参数

把类型写成参数放在函数名后面,调用时由实参推出来:

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

const a = first([1, 2, 3])     // number | undefined
const b = first(['x', 'y'])    // string | undefined
const c = first<number>([])    // 显式指定,空数组也能推
```

`T` 在函数体里是一个未知类型,不能假设它有 `length`、不能拿它做加法,只能做不依赖具体类型的操作:存进数组、返回、传给同样是 `T` 的位置。这种「什么都不知道」换来的是一致性——传进去什么,出来的就是什么。

返回值里的 `T` 是最关键的一环。如果返回 `any`,调用方就丢失了类型,后面的链式调用全部失效。这就是泛型和 `any` 的根本区别:`any` 是丢掉信息,泛型是保留关系。

## 约束:extends

未知的 `T` 不能取属性。想取就得先声明它至少有哪些成员:

```ts
function nameOf<T>(x: T) {
  return x.name
  // 报错:Property 'name' does not exist on type 'T'
}

function nameOf2<T extends { name: string }>(x: T) {
  return x.name   // 通过,返回 string
}

function getField<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { id: 1, name: 'ada', active: true }
const id = getField(user, 'id')     // number
```

`extends` 在泛型里不是继承,是「必须满足这个形状」,和值的可赋值性用同一套规则。约束放宽一点,调用方就能传更多东西;约束是 `{ name: string }` 时,任何带 `name: string` 的对象都能进,多余的字段不影响。

## keyof 与索引访问

`keyof T` 得到 `T` 所有键组成的联合,把键和返回值绑在一起是它最常见的用途:

```ts
function pluck<T, K extends keyof T>(obj: T, keys: K[]): T[K][] {
  return keys.map((k) => obj[k])
}

pluck(user, ['id'])      // number[]
pluck(user, ['name'])    // string[]
pluck(user, ['age'])
// 报错:Argument of type '"age"' is not assignable
// to parameter of type ...(键的联合,不含 age)
```

`K extends keyof T` 把键限制在 `T` 的实际字段上,`T[K]` 是索引访问类型,取出这个键对应的值类型。两者合起来,拼错字段名、取错返回值类型都能在编译期发现。这是 `lodash.get` 和表单库 `name` 路径类型的底层机制。

几个组合放在一起看:

| 写法 | 含义 |
| --- | --- |
| `T` | 任意类型,函数体里只能当作不透明值传递 |
| `T extends { id: number }` | 至少具备这个形状,可以安全访问 `id` |
| `keyof T` | 所有键组成的联合,类型是 `string \| number \| symbol` 的子集 |
| `K extends keyof T` | 键必须真的存在于 `T` 上 |
| `T[K]` | 这个键对应的值的类型 |
| `<T = unknown>` | 类型参数带默认值,推断不出时用它 |

## 默认类型参数

类型参数可以带默认值,调用方推断不出或者不想写时用它:

```ts
interface ApiResponse<T = unknown> {
  code: number
  data: T
}

type Ping = ApiResponse                       // data: unknown
type UserResp = ApiResponse<{ id: number }>   // data: { id: number }

function bad<T = string, U>(a: T, b: U) {}
// 报错:Required type parameters may not follow optional type parameters.
```

顺序有硬性规定:有默认值的不能排在没默认值的前面,改成 `<T, U = string>` 就行。这条和函数参数的默认值顺序一致。

默认值只在推断不出时生效,能推出来时以推断为准。所以接口响应的 `data` 有明确初始值时,即使不写类型参数,`T` 也会按实际值推。

## 泛型用在接口与类上

接口带类型参数,描述的是「装着某种东西的容器」:

```ts
interface Box<T> {
  value: T
}

function unwrap<T>(box: Box<T>): T {
  return box.value
}

const n = unwrap({ value: 1 })      // number
const t = unwrap({ value: true })   // boolean

class Stack<T> {
  private items: T[] = []

  push(item: T): void {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }
}

const s = new Stack<number>()
s.push(1)
s.push('a')   // 报错:Argument of type 'string' is not assignable to parameter of type 'number'
```

`new Stack<number>()` 之后整个实例的方法签名都绑定了 `number`,`items` 也是 `number[]`,塞字符串当场报错。不写类型参数时 TS 会尝试从构造参数推,推不出就是 `unknown`。

推断失败不报错,这是泛型里最隐蔽的一类问题。`new Stack()` 得到 `Stack<unknown>`,`push(1)` 通过,读出来却是 `unknown`,错误被推到使用处才暴露。看到 `unknown` 混进业务类型,先检查是不是漏了类型参数。

## 泛型不参与运行

`function f<T>(x: T)` 里没有 `T` 这个值,`T === string` 这种写法不存在。需要按类型分支时,只能额外传一个构造器、一个 schema,或者一个守卫函数:

```ts
function create<T>(ctor: new () => T): T {
  return new ctor()
}

class User {}
const u = create(User)   // User
```

`new () => T` 是构造签名,把「运行时才知道的类」当参数传进来,泛型才真正落地成一个对象。`zod` 的 `z.infer<typeof Schema>` 是另一条路:用运行时 schema 推出静态类型,两边不会脱节。

还有一个纯语法问题:`.tsx` 文件里箭头函数写泛型要加逗号,`const f = <T,>(x: T) => x`。不加的话 `<T>` 会被当成 JSX 标签的起始。

## 小结

- 泛型把类型当参数,核心价值是保留输入与输出之间的类型关系,而不是少写几个类型;
- 未约束的 `T` 只能当不透明值传递,取属性必须先 `extends` 出形状;
- `K extends keyof T` 加 `T[K]`,是「键必须存在且返回值精确」的标准组合;
- 默认类型参数必须排在必填参数之后,推断得出时以推断为准;
- 类型参数在运行时不存在,需要按类型分支时传构造器、schema 或守卫函数。
