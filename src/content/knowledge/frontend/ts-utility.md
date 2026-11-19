---
title: 映射类型与工具类型
summary: '映射类型用 keyof 拿键、in 遍历、T[K] 取值,从已有类型推导出新类型。修饰符能加也能减,-? 与 -readonly 去掉可选和只读,as 子句可以改键名。Partial、Pick、Omit 都是映射类型的封装,ReturnType、Awaited 靠条件类型加 infer 从函数里取信息。'
category: frontend
node: frontend-ts-utility
order: 64
level: 进阶
tags: [TypeScript, 映射类型, 条件类型, infer]
updated: 2026-11-19
mindmap: ts-utility.mindmap.json
terms: []
sources:
  - title: TypeScript · Mapped Types
    url: https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
    note: 映射类型语法、修饰符与键重映射 as 的说明。
  - title: TypeScript · Conditional Types
    url: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
    note: 条件类型、infer 推导与分发行为的规则。
  - title: TypeScript · Utility Types
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
    note: Partial、Pick、Omit、Record、ReturnType、Awaited 等内置类型的定义。
---

收窄解决的是「运行时确认值的形状」。另有一类需求完全在类型层面:从一份已经存在的类型里派生出另一份,比如把表单模型的所有字段变可选、把接口返回类型里的 `Promise` 拆开。手写第二份必然和第一份不同步,映射类型就是用来避免手写的。

## 从重复声明说起

一份实体类型,往往要跟着好几个变体:

```ts
interface User {
  id: number
  name: string
  email: string
}

interface PartialUser {
  id?: number
  name?: string
  email?: string
}

interface ReadonlyUser {
  readonly id: number
  readonly name: string
  readonly email: string
}
```

`User` 加一个字段,下面两个界面都要记得改。漏掉一处不会有任何报错,只会在某次更新数据时静默少传一个字段。

## 映射类型的基本形状

三段结构:`[K in keyof T]` 遍历键,`T[K]` 取对应的值类型,外面用 `?`、`readonly` 修饰。

```ts
type Optional<T> = { [K in keyof T]?: T[K] }
type Frozen<T> = { readonly [K in keyof T]: T[K] }
type Concrete<T> = { [K in keyof T]-?: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

type OptionalUser = Optional<User>
// { id?: number; name?: string; email?: string }

type FullUser = Concrete<OptionalUser>
// 三个字段都变回必填
```

`keyof T` 得到 `'id' | 'name' | 'email'`,`in` 逐个取出,像 `for...of` 遍历联合一样。这种 `[K in keyof T]` 的写法叫同态映射(homomorphic mapped type),它会自动保留原类型的 `readonly` 与 `?` 修饰,不需要你重复写。

修饰符前面加 `-` 就是移除,`-?` 去掉可选,`-readonly` 去掉只读,`+` 是默认行为可以省略。`Concrete<OptionalUser>` 把三个字段变回必填,这在「表单校验之后拿到完整数据」的场景里很常用。

## 键重映射

`as` 子句能在遍历时改写键名,TypeScript 4.1 起支持:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}

type UserGetters = Getters<User>
// { getId: () => number; getName: () => string; getEmail: () => string }

type OmitByValueType<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K]
}

type OnlyNumber = OmitByValueType<User, string>
// { id: number }
```

`K & string` 是必要的:`K` 的类型是 `keyof T`,里面可能混着 `number` 或 `symbol`,而模板字符串只接受能转成字符串的类型。`Capitalize` 是内置的字符串工具类型,同族的还有 `Uppercase`、`Lowercase`、`Uncapitalize`。

`as` 子句返回 `never` 的键会被丢掉,`OmitByValueType` 就是这样过滤掉的。这个技巧可以做出「只保留函数字段」「只保留可选字段」这类筛选。

## 内置工具类型

标准库自带的二十来个工具类型,九成是映射类型或条件类型的封装。

| 类型 | 作用 | 关键实现 |
| --- | --- | --- |
| `Partial<T>` | 全部变可选 | `{ [K in keyof T]?: T[K] }` |
| `Required<T>` | 全部变必填 | `-?` |
| `Readonly<T>` | 全部变只读 | `readonly` |
| `Pick<T, K>` | 只保留几个键 | `K extends keyof T` |
| `Omit<T, K>` | 去掉几个键 | `Pick<T, Exclude<keyof T, K>>` |
| `Record<K, T>` | 键到值的映射 | `{ [P in K]: T }` |
| `Exclude<T, U>` | 从联合里减掉 | `T extends U ? never : T` |
| `Extract<T, U>` | 从联合里挑出 | `T extends U ? T : never` |
| `NonNullable<T>` | 去掉 `null` 与 `undefined` | `T & {}` |
| `ReturnType<F>` | 函数返回类型 | `F extends (...a: any) => infer R ? R : any` |
| `Parameters<F>` | 参数组成的元组 | `F extends (...a: infer P) => any ? P : never` |
| `Awaited<T>` | 递归展开 Promise | 嵌套条件类型 |

`Pick` 与 `Omit` 是表单和 DTO 场景里用得最多的两个:

```ts
type UserPreview = Pick<User, 'id' | 'name'>
type UserDraft = Omit<User, 'id'> & { id?: number }

type Keys = Exclude<keyof User, 'email'>   // 'id' | 'name'
```

`Exclude` 与 `Omit` 的区别常在面试里被问到:`Exclude` 作用于联合,`Omit` 作用于对象的键。`Omit<User, 'id'>` 内部就是先 `Exclude<keyof User, 'id'>` 得到键的联合,再 `Pick` 出来。

`Awaited` 会一路拆到非 Promise 为止,`Awaited<Promise<Promise<number>>>` 是 `number`。取 `async` 函数的返回类型时用它而不是 `ReturnType`,因为 `ReturnType` 得到的是 `Promise<T>`。

## 条件类型与 infer

条件类型的写法像三元表达式,判断的是「能否赋值」:

```ts
type IsString<T> = T extends string ? true : false
type ElementOf<T> = T extends (infer U)[] ? U : never
type Unwrap<T> = T extends Promise<infer U> ? U : T
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never

type A = IsString<'hi'>                        // true
type B = IsString<42>                          // false
type C = IsString<string | number>             // boolean
type E = ElementOf<string[]>                   // string
type P = Unwrap<Promise<{ id: number }>>       // { id: number }
type F = FirstArg<(id: number) => void>        // number
```

`infer` 在 `extends` 的右侧占一个位置,表示「这里的类型待定」。它可以出现多次,也可以放在函数签名里,`ReturnType`、`Parameters`、`ElementOf` 都是这一个语法的不同用法。

`IsString<string | number>` 得到 `boolean` 而不是 `false`,因为两个分支的结果都被并了进去。这种「把联合拆开算再合并」的行为叫分发,下一节单独说。

## 分发行为

条件类型遇到裸类型参数(没有被数组、元组、对象包住的 `T`)时,会对联合的每个成员分别计算,再把结果并起来。

```ts
type ToArray<T> = T extends unknown ? T[] : never
type X = ToArray<string | number>   // string[] | number[]

type ToArray2<T> = [T] extends [unknown] ? T[] : never
type Y = ToArray2<string | number>  // (string | number)[]
```

很多人以为 `X` 是 `(string | number)[]`,实际是两个数组的联合。想让整个联合一起计算,把两边都包进元组,分发就关掉了。

`Exclude` 和 `Extract` 正是靠分发工作的:`Exclude<'a' | 'b', 'a'>` 逐个成员判断,`'a'` 被映射成 `never`,而 `never` 在联合里会被吸收掉,剩下 `'b'`。

分发还有个副作用:`never` 是空联合,`ToArray<never>` 得到 `never` 而不是 `never[]`。写工具类型时用 `[T] extends [never]` 单独判一次,能避开这类边界问题。

## 小结

- 映射类型是 `[K in keyof T]` 加 `T[K]`,同态映射会自动保留 `?` 与 `readonly`;
- `-?` 与 `-readonly` 用来移除修饰,`as` 子句能改键名、返回 `never` 能过滤键;
- `Partial`、`Pick`、`Omit`、`Record` 都是映射类型的封装,`ReturnType`、`Parameters`、`Awaited` 靠 `infer`;
- `Omit` 作用于键,`Exclude` 作用于联合,两者经常套在一起用;
- 条件类型在裸类型参数上分发,用 `[T] extends [U]` 包一层可以关掉。
