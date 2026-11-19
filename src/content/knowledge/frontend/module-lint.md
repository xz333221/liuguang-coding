---
title: 规范与质量：ESLint、Prettier 与 Git 钩子
summary: 'ESLint 找可能出错的代码,Prettier 只重排格式,冲突规则由 eslint-config-prettier 关闭。ESLint 9 默认使用 eslint.config.js 这套 flat config,配置由数组按顺序叠加;提交前用 lint-staged 只处理暂存文件,CI 再用 --max-warnings=0 兜底。'
category: frontend
node: frontend-module-lint
order: 57
level: 入门
tags: [ESLint, Prettier, lint-staged, Git 钩子]
updated: 2026-11-19
mindmap: module-lint.mindmap.json
terms: []
sources:
  - title: ESLint · Configuration Files
    url: https://eslint.org/docs/latest/use/configure/configuration-files
    note: flat config 的数组结构、files 与 ignores 的用法。
  - title: Prettier · Integrating with Linters
    url: https://prettier.io/docs/integrating-with-linters
    note: 用 eslint-config-prettier 关闭冲突规则,以及不推荐 eslint-plugin-prettier 的原因。
  - title: lint-staged · README
    url: https://github.com/lint-staged/lint-staged
    note: 只对暂存文件执行任务并自动重新加入暂存区的机制。
---

上一篇的构建把源码变成了能运行的产物,能跑不等于没问题:未使用的变量、漏掉的 await、随手混用的引号,构建都不会拦。这类问题交给静态检查、格式化与提交钩子。

## 两件事:找问题与排版

| 维度 | ESLint | Prettier |
| --- | --- | --- |
| 关注点 | 可疑写法、潜在错误、团队约定 | 缩进、引号、换行、括号位置 |
| 是否理解语义 | 是,能分析作用域与控制流 | 否,解析语法树后重新打印 |
| 能否自动修 | 部分规则支持 `--fix` | 几乎所有格式问题 |
| 典型问题 | 未使用变量、重复 case、漏掉的 await | 行宽、分号、尾随逗号 |

两者都能改代码,但不要互相代劳。用 ESLint 管缩进会写出一堆格式规则,和格式化工具反复争夺同一行;用 Prettier 查逻辑问题,它看不懂控制流。

## ESLint 的 flat config

ESLint 9 起默认读取 eslint.config.js,不再读 .eslintrc。配置文件导出一个数组,每个对象是一层配置,按顺序叠加:

```js
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
];
```

与 .eslintrc 的差别集中在结构:

- extends 变成把配置对象直接放进数组,来源清楚,也能按文件类型拆开;
- parserOptions 与 env 合并进 languageOptions,包括 globals、ecmaVersion 与 parser;
- 忽略文件写在配置里,不再依赖 .eslintignore。flat config 下该文件不生效,只在配置里写。

只忽略某些文件时,用单独的 `{ ignores: [...] }` 对象,并且必须排在最前,否则只对后面的配置生效。只在某个目录生效的规则,放进带 files 的对象。

配置文件用 import 语法时,package.json 要有 `"type": "module"`,或者把文件命名为 eslint.config.mjs。TypeScript 项目接 typescript-eslint,把它的 recommended 配置展开进数组;需要类型信息的规则(如 no-floating-promises)要额外配置解析器,并接受明显的检查耗时。

## Prettier 只负责格式

Prettier 读源码、丢掉原有排版、按固定规则重新打印。它不理解变量是否被使用,只保证同一份代码永远输出同一结果。

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "all"
}
```

配置越少越好。团队争论 80 还是 100 列没有意义,定下来就不再改。

两套工具会在同一行上给出相反要求,例如 ESLint 要求双引号、Prettier 改成单引号。正确做法不是逐条对齐规则,而是用 eslint-config-prettier 关掉 ESLint 中所有与格式冲突的规则:

```js
// eslint.config.js
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [js.configs.recommended, eslintConfigPrettier];
```

它必须放在数组最后,后面的配置才会覆盖前面的。也不要装 eslint-plugin-prettier 把 Prettier 当成一条 ESLint 规则:格式问题会混进 lint 结果,`--fix` 变慢,报错原因也更难分辨。Prettier 官方明确建议直接跑 `prettier --check`。

## 提交前只检查改动的文件

对整个项目跑 ESLint 每次都要扫全量文件,每次提交都跑会拖慢节奏。lint-staged 只把暂存区里的文件交给命令,修改后自动重新加入暂存区:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,md,json}": "prettier --write"
  }
}
```

钩子用 simple-git-hooks 或 husky,选一个。前者配置就在 package.json,装好后执行一次 `npx simple-git-hooks` 写入 .git/hooks/pre-commit;后者用 .husky/ 目录存脚本,先 `npx husky init` 再在 .husky/pre-commit 里写 `npx lint-staged`,生态更常见。两个都装会争抢 Git 的 core.hooksPath,最后只有一个生效。

一次提交经过的步骤:

```text
git commit
  → pre-commit 钩子执行 lint-staged
  → 取出暂存文件的路径
  → eslint --fix / prettier --write 只改这些文件
  → 修改结果重新加入暂存区
  → 全部通过才真正提交
```

钩子只看这次改动,不清理历史问题。仓库里已有的几千行旧代码不会被顺手格式化,这是刻意的:一次提交混进全仓库的格式变更,review 就没法看了。

## CI 兜底

钩子可以被 `git commit --no-verify` 跳过,新克隆的仓库在没执行 prepare 前也没有钩子。CI 必须再跑一遍全量检查:

```bash
npm ci
npx eslint . --max-warnings=0
npx prettier --check .
```

`--max-warnings=0` 把警告当错误。默认情况下有警告时 ESLint 仍以 0 退出,CI 会放行,no-console 这类 warn 级别的规则等于没开。`prettier --check` 只比对不写文件,格式不一致时以非零码退出。

## 几个常见的坑

- 忽略没生效: 从 .eslintrc 迁到 flat config 后继续留着 .eslintignore,dist 里的产物被当源码检查,报出大量 no-undef。忽略规则要搬进配置数组。
- 被忽略的文件传给 ESLint: 暂存区里有被 ignores 排除的文件时,ESLint 会提示该文件被忽略,并可能以非零码退出。在 lint-staged 的命令里加 `--no-warn-ignored`,或把匹配范围收窄。
- 钩子静默失效: 有人用 GUI 客户端提交,或习惯性加 --no-verify,钩子根本不执行。强制点只能放在 CI。
- 规则与格式化打架: 忘了放 eslint-config-prettier,`eslint --fix` 与 `prettier --write` 来回改同一行,暂存区反复变动,提交历史里全是无意义的格式 diff。

## 小结

- ESLint 查可疑代码,Prettier 只管排版,两者不要互相代劳;
- ESLint 9 默认 flat config,配置是数组,按 files 与 ignores 分层叠加;
- eslint-config-prettier 放在最后,关闭与格式冲突的规则;
- lint-staged 只处理暂存文件,配 simple-git-hooks 或 husky 做 pre-commit;
- CI 用 `eslint . --max-warnings=0` 与 `prettier --check` 兜底,钩子只是辅助;
- 忽略规则、被忽略文件与 --no-verify,是钩子体系最常见的三个漏洞。
