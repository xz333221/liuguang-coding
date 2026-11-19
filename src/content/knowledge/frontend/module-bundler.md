---
title: 构建工具：Vite、Rollup 与 esbuild
summary: '浏览器只认能解析的 ESM 地址,裸模块名、TypeScript 与 JSX 都要先转换。Vite 开发期用 esbuild 预构建依赖、按请求转译单文件,生产构建交给 Rollup 做 tree-shaking 与分包;两套链路的目标不同,dev 快与 build 慢并不矛盾。'
category: frontend
node: frontend-module-bundler
order: 56
level: 进阶
tags: [Vite, Rollup, esbuild, 构建]
updated: 2026-11-19
mindmap: module-bundler.mindmap.json
terms: []
sources:
  - title: Vite 中文文档 · 依赖预构建
    url: https://cn.vite.dev/guide/dep-pre-bundling
    note: 开发期用 esbuild 预构建依赖的原因与 optimizeDeps 配置。
  - title: Vite 中文文档 · 构建生产版本
    url: https://cn.vite.dev/guide/build.html
    note: 生产构建使用 Rollup、build.target 与产物结构。
  - title: esbuild · Documentation
    url: https://esbuild.github.io/
    note: esbuild 的转换、打包能力与性能取舍。
---

上一篇把依赖从 registry 装进了 node_modules,`import React from 'react'` 在编辑器里能跳转;把同样的路径交给浏览器,它只会去请求 `/react` 并得到 404。构建工具负责把源码与依赖变成浏览器能执行的产物。

## 浏览器缺的三样东西

浏览器原生支持 ESM,但不支持开发时常用的写法:

1. 裸模块说明符: `import x from 'lodash'` 不是 URL,浏览器只接受 URL 或 `/`、`./`、`../` 开头的路径。
2. 非 JavaScript 文件: `.ts`、`.jsx`、`.vue` 与 `import './a.css'` 都无法直接执行。
3. 请求数量: 大型应用有上千个模块,开发期逐个请求还能接受,线上不能这么发。

开发服务器解决前两项,生产构建三项都要解决,还要加上压缩、分包与缓存。

## 开发期:Vite 不打包源码

Vite 的 dev server 把源码按浏览器原生 ESM 直接提供,不做整包打包。请求到达时才转译那个文件,并把 import 的裸模块名改写成可请求的地址:

```text
浏览器请求 /src/main.ts
  → Vite 读文件,esbuild 转译 TS / JSX(单文件,不打包)
  → 改写说明符: 'react' → /node_modules/.vite/deps/react.js
  → 浏览器拿到 ESM,继续请求它 import 的模块
```

依赖走另一套流程:node_modules 里的包在启动时由 esbuild 预构建(pre-bundling),结果缓存在 node_modules/.vite/deps。两个目的:

- 格式转换:很多包只发 CommonJS,esbuild 把它们转成 ESM;
- 减少请求:一个包内部可能有上百个文件,预构建合并成一个文件,浏览器只请求一次。

启动耗时与依赖数量相关,与页面数量基本无关。没被请求的页面、没打开的弹窗,代码根本没有进入转译流程。

## 依赖预构建与 optimizeDeps

扫描阶段只能看到静态 import。运行时才决定的依赖(例如按插件名动态加载)发现不了,浏览器会拿到裸模块名;Vite 检测到新依赖后重新预构建,并刷新页面:

```text
new dependencies optimized: some-lib
[vite] optimized dependencies changed. reloading
```

这行日志意味着整页刷新,不是 HMR,表单里没提交的内容会丢。把这类依赖显式写进配置可以避免:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['some-lib', 'another-lib/deep-entry'],
    exclude: ['local-linked-package'],
  },
});
```

- include: 启动时就预构建,适合动态 import、子路径导入的包;
- exclude: 跳过预构建,适合本身是 ESM、且需要保留模块结构的本地 link 包。

改了预构建配置或依赖版本后缓存可能失效,`vite --force` 强制重建 node_modules/.vite。

## 生产构建:Rollup 打包,esbuild 压缩

`vite build` 换成另一条链路。Rollup 从 HTML 入口出发收集整个依赖图,做 tree-shaking、拆分 chunk、抽出 CSS,输出带内容哈希的静态文件。压缩默认交给 esbuild,也就是 build.minify 的默认值 `'esbuild'`。

```bash
vite build
# dist/index.html                  0.63 kB
# dist/assets/index-a1b2c3d4.js   142.18 kB │ gzip: 45.72 kB
# dist/assets/index-e5f6g7h8.css    8.41 kB │ gzip:  2.66 kB
```

数字是示意,结构是真实的:HTML 引用带哈希的 JS 与 CSS,文件内容一变文件名就变,浏览器缓存的旧文件自然失效。

Rollup 的强项是依赖图与 tree-shaking:从入口出发,只保留真正被用到的导出,把公共依赖拆成可复用的 chunk。动态 import 的模块会被单独切出来,在需要时才下载:

```js
button.addEventListener('click', async () => {
  const { openDialog } = await import('./dialog.js');
  openDialog();
});
```

这段代码在产物里对应一个独立 chunk,主包不包含 dialog 的实现。

## build.target 决定降级程度

target 是构建产物面向的语法版本。默认面向支持原生 ESM 的浏览器,需要兼容更老的运行时时显式指定:

```ts
export default defineConfig({
  build: {
    target: 'es2018',
    sourcemap: true,
  },
});
```

设得过低,async 函数会被改写成状态机,可选链与空值合并会被展开,产物明显变大。target 应与实际用户分布一致,不是「越低越安全」。只在某个第三方库需要兼容旧浏览器时,可以给它单独降级,而不是拖累整个应用。

## 为什么 dev 快、build 慢

| 阶段 | 做什么 | 工具 | 耗时特征 |
| --- | --- | --- | --- |
| dev 启动 | 预构建依赖,源码不动 | esbuild | 随依赖数量增长 |
| dev 请求 | 单文件转译与说明符改写 | esbuild | 单文件,按需发生 |
| build | 全量依赖图、tree-shaking、分包、压缩 | Rollup + esbuild | 与整个项目规模成正比 |

开发期的模块图是「用到的才编译」,构建期必须看到全部代码才能安全删除未使用的导出。同一个项目 dev 启动几秒、build 花上一分钟,是两条链路的正常差异,不是配置写坏了。

## ESM 与 CJS 混用的坑

- 命名导入缺失: 只发 CommonJS 的包,在 dev 里 `import { debounce } from 'pkg'` 可能报找不到导出。预构建靠静态分析 CommonJS 源码推断导出名,`module.exports = factory()` 这类动态结果推不出来。把包加进 optimizeDeps.include,或改成默认导入再取属性。
- 子路径被 exports 挡住: 包声明 exports 字段后,`import 'pkg/dist/index.js'` 会解析失败,因为这个子路径没有导出。用包提供的入口,或换一个暴露了该子路径的版本。
- 双重包: 同一个库被 ESM 与 CJS 各加载一份,模块级状态分裂,React 的 hooks 报错就是典型症状。用 npm ls 或产物分析确认只有一份。

一个依赖「在 Node 里能跑,在 Vite 里报错」,先看它的模块格式与 exports,再看有没有被预构建。

## 小结

- 浏览器只认 URL 形式的 ESM,裸模块名、TS、JSX 都需要转换;
- Vite 开发期不打包源码,按请求转译单文件,依赖用 esbuild 预构建;
- optimizeDeps.include 处理运行时才出现的依赖,避免整页刷新;
- 生产构建由 Rollup 收集依赖图、tree-shaking 与分包,esbuild 负责压缩;
- build.target 决定语法降级程度,设得过低会增大体积;
- CJS 命名导出、exports 子路径与双重包,是混用模块格式时最常见的三类问题。
