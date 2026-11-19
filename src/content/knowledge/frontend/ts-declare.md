---
title: 声明文件与第三方类型
summary: '声明文件只描述类型,不产出运行时代码。declare 告诉编译器「这个名字在别处存在」,可以声明全局值、环境模块与全局扩展。包自带 types 字段时直接可用,没有就装 @types/xxx,再没有就自己写一份 .d.ts。types 与 typeRoots 控制自动引入哪些全局类型,skipLibCheck 只跳过声明文件内部的检查。'
category: frontend
node: frontend-ts-declare
order: 65
level: 进阶
tags: [TypeScript, 声明文件, '@types', tsconfig]
updated: 2026-11-19
mindmap: ts-declare.mindmap.json
terms: []
sources:
  - title: TypeScript · Declaration Files
    url: https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html
    note: 声明文件的用途、结构与编写方式。
  - title: TSConfig Reference · types / typeRoots / skipLibCheck
    url: https://www.typescriptlang.org/tsconfig
    note: 三个选项的精确语义与默认值。
  - title: TypeScript · Modules Reference
    url: https://www.typescriptlang.org/docs/handbook/modules/reference.html
    note: 模块解析、exports 中的 types 条件与 bundler 解析模式。
---

前几篇的类型都写在源码里,类型和实现待在一起。可一个项目里大半代码来自 `node_modules`,那些 `.js` 文件本身没有任何类型信息,`import` 进来就是隐式 `any`。这一篇讲类型信息怎么从外部补进来,以及 `.d.ts` 到底是什么。

## 声明文件里只有类型

声明文件是只有类型、没有实现的文件。`tsc` 不会为它产出 `.js`,打包工具也会把它排除在产物之外。

```ts
// dist/index.d.ts
export interface Options {
  timeout?: number
  retry?: number
}

export declare function request(url: string, opts?: Options): Promise<Response>
```

整份文件处在「环境上下文(ambient context)」里,声明不需要实现。写函数体会报 `An implementation cannot be declared in ambient contexts`,产物里也不会有这段代码,运行时调到它就是 `undefined`。下一节代码块的最后一段是反例,正常声明文件不会这么写。

`tsc --declaration` 能从 `.ts` 源码自动生成 `.d.ts`,库作者靠它发布类型。生成的文件里只有签名,注释会以 `/** */` 的形式保留下来,编辑器的悬浮提示就读这些注释。

## declare 的几种写法

`declare` 的意思是「照我说的信,这个值运行时存在,别来找我要实现」。

```ts
declare const __APP_VERSION__: string
declare let __DEV__: boolean
declare function track(event: string, payload?: unknown): void

declare class LegacyEmitter {
  on(name: string, fn: (v: unknown) => void): void
  emit(name: string, v?: unknown): void
}

// 在 .d.ts 里写实现会报错
export function request(url: string) {
  return fetch(url)
}
// 报错:An implementation cannot be declared in ambient contexts.
```

| 写法 | 用途 |
| --- | --- |
| `declare const` / `let` / `function` | 声明已存在的全局值 |
| `declare module 'x'` | 给没有类型的包写环境模块 |
| `declare global` | 在模块内部扩展全局作用域 |
| `declare namespace` | 描述挂在某个对象下的成员 |
| `declare class` / `enum` | 描述全局类与全局枚举的形状 |

`declare const __APP_VERSION__` 这种最常见:构建工具在打包时把 `__APP_VERSION__` 替换成字符串,源码里需要一份类型让它能通过检查。Vite 的 `import.meta.env` 也是同一套路,由 `vite/client` 提供声明。

## @types 与包的 types 字段

包提供类型有三条路径,优先级从高到低:

1. 包自己的 `package.json` 里写了 `types`(或 `typings`)字段,指向入口 `.d.ts`;
2. 包的 `exports` 里按条件给出 `types`,现代包用这一种;
3. 都没有时,装 `@types/包名`,来源是 DefinitelyTyped 仓库。

```json
{
  "name": "some-lib",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

`types` 条件必须排在最前面。`exports` 的解析是按顺序命中的,`import` 与 `require` 排在 `types` 前面时,TypeScript 会拿到 `.mjs` 然后去找同名的 `.d.mts`,找不到就退回任意类型。

装类型包时版本要对齐:`@types/react` 的次版本跟随 `react`,大版本不一致会报出一堆「属性不存在」。类型包只在开发时需要,统一放 `devDependencies`。

## 三个 tsconfig 选项

`node_modules/@types` 下的包默认会被全部加载进全局作用域,这一点经常让人意外:装了个 `@types/node`,`setTimeout` 的返回值突然从 `number` 变成了 `NodeJS.Timeout`。控制它的就是下面几项。

```json
{
  "compilerOptions": {
    "types": ["node", "vite/client"],
    "typeRoots": ["./node_modules/@types", "./types"],
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  }
}
```

- `types` 是一个白名单。写了它,只有列表里的包会被自动引入全局类型;不写则加载 `@types` 下的全部。前端项目写 `"types": []` 可以彻底关掉自动引入,避免 Node 类型污染浏览器环境。
- `typeRoots` 改的是查找目录,默认只有 `./node_modules/@types`。加上 `./types` 后,自己写的全局声明也能被当成类型包加载。
- `skipLibCheck` 跳过所有 `.d.ts` 内部的检查。它不影响你自己 `.ts` 代码的检查,也不影响声明被使用时的类型判定,只是不再检查声明文件自身是否自洽。

`skipLibCheck` 常被误解成「关掉类型检查」。实际收益很具体:两个库对同一个全局接口做了不兼容的声明合并时,报错会指向 `node_modules` 里的 `.d.ts`,开这一项能把噪音压掉。代价是库里的声明写错了你也发现不了,所以它默认 `false`,项目里通常手动打开。

`moduleResolution: "bundler"` 让 TS 按打包工具的规则解析:`exports` 条件、不带扩展名的相对路径、`package.json` 的 `imports` 都能识别。配 Vite 或 webpack 时用它,配纯 Node 用 `node16` / `nodenext`。

## 给无类型的包写声明

装不到 `@types` 的包,自己补一份。放在 `src/types/` 下,确保被 `include` 覆盖到。

```ts
// src/types/legacy-sdk.d.ts
declare module 'legacy-sdk' {
  export interface InitOptions {
    appId: string
    debug?: boolean
  }

  export function init(opts: InitOptions): void
  export function track(event: string, data?: Record<string, unknown>): void

  const sdk: { init: typeof init; track: typeof track }
  export default sdk
}

// 只要它能 import、不要任何检查时,一行通配就够
declare module 'another-legacy-lib'
```

第二行的通配声明会让整个模块的类型变成 `any`,能编译但没有任何保护。可以接受它作临时方案,但要在 issue 里记一笔。

扩展全局对象需要 `declare global`,而且文件必须先是模块:

```ts
// src/types/global.d.ts
export {}

declare global {
  interface Window {
    __APP_VERSION__: string
    dataLayer: unknown[]
  }
}
```

`export {}` 的作用是把文件变成模块。少了它,文件是全局脚本,`declare global` 会报 `Augmentations for the global scope can only be directly nested in external modules or ambient module declarations`。这条报错几乎每个人都会遇到一次。

## 三个容易踩的坑

- 声明文件没有生效,先看 `include` 有没有覆盖到。`include: ["src"]` 而文件放在根目录 `types/` 下,它就不会被加载,表现为「明明写了声明还是报找不到模块」。
- 同名模块声明会合并而不是覆盖。给 `express` 补声明时不要重复声明整个 `Request` 接口,只在原接口上加字段,否则会和 `@types/express` 的定义冲突。
- 三斜线指令 `/// <reference types="node" />` 是历史写法,现在用 `types` 配置或直接 `import`。它必须放在文件最顶部,前面有注释以外的任何内容都会失效。

## 小结

- `.d.ts` 只有类型没有实现,`tsc --declaration` 能从源码生成;
- `declare` 声明「运行时存在」,`declare module` 给无类型包补签名,`declare global` 扩展全局且文件必须是模块;
- 类型来源优先看包自己的 `types` 字段与 `exports.types`,再装 `@types/*`,版本要跟着主包走;
- `types` 是全局类型的白名单,`typeRoots` 改查找目录,两者只影响自动引入;
- `skipLibCheck` 只跳过声明文件内部的检查,业务代码照样受检。
