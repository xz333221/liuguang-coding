---
title: 包管理与语义化版本
summary: 'package.json 声明依赖，版本范围决定 npm 能解析到哪个版本，锁文件把这次解析的结果固定下来。理解 ^ 与 ~ 的实际区间、npm ci 与 npm install 的差别，以及 peerDependencies 与 workspaces 的用途，多人协作时才不会出现「只有我这里能跑」。'
category: frontend
node: frontend-module-package
order: 55
level: 入门
tags: [npm, 语义化版本, 锁文件, 依赖管理]
updated: 2026-11-19
mindmap: module-package.mindmap.json
terms: []
sources:
  - title: Semantic Versioning 2.0.0 中文版
    url: https://semver.org/lang/zh-CN/
    note: MAJOR.MINOR.PATCH 的定义与 0.x 阶段的约定。
  - title: npm docs · package.json
    url: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
    note: dependencies、peerDependencies 与 workspaces 字段的官方说明。
  - title: npm docs · npm ci
    url: https://docs.npmjs.com/cli/v11/commands/npm-ci
    note: npm ci 按锁文件安装、要求两者一致的行为。
---

上一篇用 import 与 export 划清了文件之间的边界；边界之外还有一层：项目里大量代码来自 registry，不是自己写的。这些包怎么声明、怎么挑版本、怎么保证每台机器装出同一棵树，是包管理处理的事。

## package.json 的依赖字段

npm 项目的清单是 package.json。依赖按用途分开放：

```json
{
  "name": "shop-web",
  "version": "1.4.0",
  "private": true,
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "typescript": "~5.6.2"
  }
}
```

- dependencies: 运行时真正会执行的代码，会被打进产物；
- devDependencies: 只在开发、测试、构建时使用，不进产物；
- optionalDependencies: 装不上也不影响整体安装，例如带平台二进制的包；
- peerDependencies: 声明「我需要宿主提供这个包」，由使用方保证版本。

`private: true` 阻止误发布到 registry，应用项目都应该加。类型包与构建工具属于 devDependencies；判断标准是「产物运行时是否还需要它」，不是「是不是代码」。

## 语义化版本的三段数字

version 写成 MAJOR.MINOR.PATCH。三段各自对应改动的性质：

| 段位 | 何时加 | 例子 |
| --- | --- | --- |
| MAJOR | 有不兼容的改动 | 1.6.0 → 2.0.0 |
| MINOR | 新增功能，保持兼容 | 1.6.0 → 1.7.0 |
| PATCH | 修 bug，保持兼容 | 1.6.0 → 1.6.1 |

版本号是一份承诺：只看数字，调用方就能判断升级会不会改坏代码。1.0 之前(0.x)API 不保证稳定，这条约定放宽，MINOR 也可能带破坏性改动。

预发布版本加后缀，例如 2.0.0-beta.1，排序上小于 2.0.0。npm 的 latest 是 dist-tag，不是版本范围；`npm install pkg@latest` 取的是标签当前指向的版本，下次标签移动，同样的命令装到的东西会变。

## 范围符号能装到哪

package.json 通常不写死版本，而是写范围：

| 写法 | 展开区间 | 说明 |
| --- | --- | --- |
| `1.2.3` | 只有 1.2.3 | 精确锁定，升级要手动改 |
| `^1.2.3` | >=1.2.3 <2.0.0 | 允许 MINOR 与 PATCH |
| `~1.2.3` | >=1.2.3 <1.3.0 | 只允许 PATCH |
| `>=1.2.3 <1.4.0` | 自己拼区间 | 需要跨 MINOR 时使用 |
| `*` | 任意版本 | 等于没有约束，不要用 |

`^` 是 npm install 写入的默认范围，`~` 更保守。两者在 0.x 上都比直觉严格：

- `^0.2.3` 展开为 >=0.2.3 <0.3.0，不是 <1.0.0;
- `^0.0.3` 只允许 0.0.3，因为 0.0.x 的每一位都视为可能不兼容。

预发布版本默认不落入范围。`^1.2.3` 不会装 1.3.0-beta.1，即使它比 1.2.3 大；要用预发布版必须把后缀写进范围。

`npm outdated` 有三列：current 是本地已装，wanted 是当前范围能升到的最高版本，latest 是 registry 上的最新版。wanted 长期落后于 latest，说明升级被 MAJOR 挡住了。

## 锁文件与 npm ci

范围只描述「允许装什么」，同一份 package.json 在不同时间可能解析出不同结果。package-lock.json 记录这次解析的完整依赖树：每个包的精确版本、下载地址与 integrity 哈希。

两个命令的行为不同：

- `npm install`: 锁文件存在且与 package.json 不冲突时按锁文件安装；新增或升级依赖时重新解析并更新锁文件。
- `npm ci`: 只按锁文件安装。先删除 node_modules，要求锁文件存在且与 package.json 一致，不一致直接报错退出，全程不改写锁文件。

CI 与部署环境用后者：

```bash
# 本地新增依赖,锁文件一起提交
npm install lodash-es

# CI / 部署:严格按锁文件,结果可重复
npm ci
npm run build
```

CI 里跑 npm install 会让每次构建重新解析范围。上游某天发了一个新 PATCH，构建结果就变了，而代码一行没动；更隐蔽的情况是锁文件被 CI 改写却没有提交，本地与线上再次分叉。

锁文件必须进版本库。合并冲突时不要手工拼 JSON:先合到一边，重新执行 npm install 让 npm 按 package.json 重新解析，再跑一遍测试确认。

## 重复依赖与 peerDependencies

node_modules 是一棵树，不是扁平列表。A 依赖 lodash@4.17.20、B 依赖 lodash@4.17.21 时，两个版本可以同时存在：

```text
node_modules
├── lodash@4.17.21          # 提升到顶层,多数包共用
└── a
    └── node_modules
        └── lodash@4.17.20  # 与顶层版本冲突,嵌套安装
```

排查某个包为什么出现多份：

```bash
npm ls lodash        # 只看相关分支,标 deduped 的是复用
npm ls --all         # 整棵树,输出很长
npm dedupe           # 尝试合并可复用的版本
```

同一个库装了两份，单例、缓存与 Context 都会分裂。React 项目里出现两个 react，典型症状是 hooks 报错或 Context 读不到值。先 `npm ls react` 确认，再对齐版本；dedupe 只能合并满足所有范围的版本，跨 MAJOR 的冲突合不了。

peerDependencies 表达另一层关系：插件声明自己需要某个宿主版本，由使用方提供。React 组件库、Babel 插件、ESLint 插件都这么写。npm 7 之后默认自动安装 peer，范围冲突时报 ERESOLVE 并中止安装。

`--legacy-peer-deps` 跳过自动安装，`--force` 强行继续，两者都能让安装通过，但依赖关系并没有变正确。先看冲突的两个范围，能对齐就升级；确实无解时，把绕过写进文档，别让它变成团队默认。

## workspaces

一个仓库维护多个包时，用 workspaces 串起来：

```json
{
  "name": "design-system",
  "private": true,
  "workspaces": ["packages/*"]
}
```

在根目录执行一次 npm install，会为所有子包安装依赖，把本地包软链到根 node_modules，并且只生成一份根锁文件。子包之间直接 import，不用先发版；`npm run build -w packages/ui` 只跑指定 workspace 的脚本。

workspaces 解决的是本地联动与依赖提升，不解决发布。子包对外发包时，版本号与依赖范围仍要自己维护；公共依赖提到根目录，能避免每个子包各装一份。

## 小结

- dependencies 进产物，devDependencies 只用于开发，peerDependencies 声明宿主版本；
- 版本按 MAJOR.MINOR.PATCH 递增，`^` 允许 MINOR 与 PATCH,`~` 只允许 PATCH,0.x 的规则更严；
- 锁文件固定整棵依赖树，npm ci 严格按锁文件安装且不改写，CI 与部署用它；
- 重复依赖用 npm ls 定位，npm dedupe 只能合并互相兼容的版本；
- peer 冲突先对齐范围，`--legacy-peer-deps` 只是绕过检查；
- workspaces 把多包仓库的依赖、软链与脚本收拢到根目录。
