---
title: 为什么加类型：从 JavaScript 到 TypeScript
summary: '构建阶段能做的事到环境变量就做完了,类型错误却依然只能在运行时暴露。tsc 只做静态检查,注解、interface、type 在产物里全部消失。strict 是一组开关的集合,strictNullChecks 与 noImplicitAny 是其中影响最大的两个。迁移用 allowJs 配合 checkJs 逐步推进,any 只当过渡。'
category: frontend
node: frontend-ts-why
order: 59
level: 入门
tags: [TypeScript, 类型检查, tsc, strict]
updated: 2026-11-19
mindmap: ts-why.mindmap.json
terms: []
sources:
  - title: TypeScript · The Basics
    url: https://www.typescriptlang.org/docs/handbook/2/basics.html
    note: 类型注解、编译流程与类型擦除的入门说明。
  - title: TSConfig Reference
    url: https://www.typescriptlang.org/tsconfig
    note: strict 及其子选项、allowJs、checkJs、noEmit 的准确定义。
  - title: TypeScript · Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
    note: 常见类型的标注方式与推断规则。
---

第 10 章最后一篇把 dev、test、prod 的变量拆进各自的配置文件,构建脚本按模式注入不同的值,前端工程化里「怎么把代码变成产物」这件事基本有了答案。可接口把 `userName` 改成 `username`,构建照样通过,页面打开才白屏:类型错误从来没有被构建拦住过。

## 报错来得太晚

JavaScript 对值的类型不做任何承诺,函数拿到什么就用什么。

```js
function total(price, count) {
  return price * count
}

total(19.9, 2)          // 39.8
total('19.9', 2)        // 39.8,靠隐式转换碰巧对
total('19.9 元', 2)     // NaN,不抛错
```

`NaN` 不会中断执行,它会一路参与运算、一路向后传递,直到某处 `toFixed` 或者渲染时才炸。这时候的调用栈指向的是渲染函数,离真正的源头隔了七八层。线上环境更难查:用户看到的是一块空白,控制台只有一行 `Cannot read properties of undefined`。

字段改名、少传参数、把字符串当数字用、忘了处理 `null`,这些错误都属于同一类:值在运行时才到达,而代码没有对它的形状做任何约定。

## 类型在构建时检查

TypeScript 是在 JavaScript 上加了一层静态类型,由 `tsc`(TypeScript Compiler)在代码执行之前检查。

```ts
function total(price: number, count: number): number {
  return price * count
}

total('19.9', 2)
// 报错:Argument of type 'string' is not assignable to parameter of type 'number'
```

编辑器里当场标红,`npm run build` 也会失败。错误从「用户点开页面」提前到「保存文件」。

检查完的类型不会被送到浏览器。`tsc` 的产物是普通 `.js`:

```bash
npx tsc --noEmit     # 只检查,不产出任何文件
npx tsc              # 按 tsconfig 产出 .js
```

```js
// 上一段 TS 编译后的结果
function total(price, count) {
    return price * count;
}
```

参数类型、返回值类型、`interface`、`type` 全部消失。运行时拿不到类型信息,所以两件事做不到:用 `typeof T` 判断泛型是什么,以及靠类型做运行时校验。接口返回的数据仍然要用 zod 之类的 schema 逐字段验证一遍,静态类型管不了网络边界。

少数语法会留下代码:`enum`、`namespace`、构造函数参数属性(`constructor(private x: number)`)。const enum 除外,它会被内联成字面量。所以「类型零运行时开销」这句话对注解成立,对整个语法集不成立。

## strict 是一组开关

`tsc --init` 生成的配置里默认有 `"strict": true`。它不是一项检查,是一组开关的集合:

| 选项 | 作用 | 关掉之后的后果 |
| --- | --- | --- |
| `strictNullChecks` | `null` 与 `undefined` 不能赋给其他类型 | `undefined` 可以随便塞进 `string` |
| `noImplicitAny` | 推断不出类型时报错 | 参数悄悄变成 `any`,检查全部失效 |
| `strictFunctionTypes` | 函数参数位置逆变检查 | 回调参数可以随意放宽 |
| `strictBindCallApply` | `call`、`apply`、`bind` 的参数检查 | 传错参数一声不响 |
| `strictPropertyInitialization` | 类字段必须在构造函数里初始化 | 字段是 `undefined` 直到运行时才发现 |
| `noImplicitThis` | `this` 隐式 `any` 时报错 | 在 `this` 上乱取属性 |
| `useUnknownInCatchVariables` | `catch` 的变量类型是 `unknown` | 当成 `any` 直接用 |
| `alwaysStrict` | 输出文件带 `"use strict"` | 静默失败代替抛错 |

`strictNullChecks` 影响最大。打开之后 `string` 不包含 `null`,函数返回值可能缺失时必须写成 `string | undefined`,调用方被迫处理。这一项也是 `strictPropertyInitialization` 生效的前提。

`strict` 覆盖的选项会随版本增加。TypeScript 5.6 把 `strictBuiltinIteratorReturn` 加了进去,升级小版本后多出一批报错是常事,先看变更日志再动配置。

## 从 JS 项目迁过来

老项目不可能一夜改成 `.ts`,TypeScript 允许 JS 与 TS 共存。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "checkJs": false,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- `allowJs` 让 `.js` 也被纳入编译流程,不会因为引用关系报「找不到模块」。
- `checkJs` 打开后 `.js` 文件同样接受检查,第一次开通常几百条报错。更稳的做法是逐个文件在顶部加 `// @ts-check`。
- `noEmit` 交给构建工具产出,`tsc` 只当检查器用。Vite 里的类型检查就是这么跑的。
- `skipLibCheck` 跳过 `node_modules` 里 `.d.ts` 的互相检查,能省掉大量与业务无关的报错。

`// @ts-check` 配合 JSDoc,可以不改后缀就拿到大部分检查:

```js
// @ts-check

/**
 * @param {number} price
 * @param {number} count
 * @returns {number}
 */
function total(price, count) {
  return price * count
}

total('19.9', 2)   // 报错,和 .ts 里一样
```

实际迁移顺序是:先开 `allowJs` 把项目纳入,新文件一律写 `.ts`,旧文件改一个后缀修一处报错,`any` 只作过渡并留下 `// TODO` 注释。等 `noImplicitAny` 全绿,再谈更细的规则。

## 类型的成本

类型不是白拿的,三处成本要有预期:

- 编译时间。中型项目 `tsc --noEmit` 是秒级,大型仓库能到几十秒。编辑器里的 `tsserver` 是增量的,日常感知不到,CI 里要接受这段耗时。
- 报错可读性。条件类型和泛型嵌套深了,一条报错能打印半屏。团队里得有人能读懂,否则新人只会往上面糊 `as any`。
- 版本耦合。`@types/react` 与 `react` 的大版本对不上时,会出现「属性不存在」这类莫名其妙的错误,装依赖时要一起升级。

`any` 是最容易走歪的地方。它不只是「不检查」,还会沿着赋值和返回值扩散:一个函数参数标成 `any`,函数体里所有属性访问都不再校验,返回值也变成 `any`,一路传染到调用方。想表达「还不知道是什么」时用 `unknown`,用之前必须先收窄。

## 小结

- JavaScript 的类型错误在运行时才暴露,`NaN` 与 `undefined` 会静默向后传播;
- `tsc` 只做静态检查,注解、`interface`、`type` 在产物里被擦除,`enum` 与 `namespace` 例外;
- `strict` 是一组开关,`strictNullChecks` 与 `noImplicitAny` 决定了检查的实际强度;
- 迁移用 `allowJs` 纳入、`checkJs` 或 `// @ts-check` 逐个开启,新文件直接写 `.ts`;
- `any` 会传染,要表达未知用 `unknown`,并在使用前收窄。
