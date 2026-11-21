---
title: 覆盖率与 CI 门禁
summary: '覆盖率有语句、行、函数、分支四个口径，分支最难做满，也最能暴露漏测。它只说明代码被执行过，不说明结果被断言过，所以只能当参考线不能当目标。CI 里真正该卡的是： 阈值掉了就红、类型与 lint 全量跑、依赖缓存好、用例分片并行。失败重试会把 flaky 藏起来，要单独统计而不是让它变绿就算过。'
category: frontend
node: frontend-testing-ci
order: 96
level: 进阶
tags: [覆盖率, CI, GitHub Actions, flaky, 门禁]
updated: 2026-11-19
mindmap: testing-ci.mindmap.json
terms: []
sources:
  - title: Vitest · Coverage
    url: https://vitest.dev/guide/coverage
    note: v8 与 istanbul 两个 provider 的差异,以及 thresholds 配置。
  - title: Playwright · Retries
    url: https://playwright.dev/docs/test-retries
    note: 重试用例被标记为 flaky 的行为,以及为什么不建议长期依赖。
  - title: GitHub Docs · Caching dependencies
    url: https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows
    note: setup-node 的 cache 参数与缓存键的组织方式。
---

前面几篇的测试在本机能跑绿。绿了不等于能合： 覆盖率掉了没人拦、只在某台机器上过的用例、CI 跑二十分钟没人等结果。这一篇讲门禁怎么定，以及哪些指标会骗人。

## 覆盖率的四个口径

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.tsx', 'src/mocks/**'],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
})
```

四个数字统计的不是一回事：

| 指标 | 统计什么 | 容易骗人的地方 |
| --- | --- | --- |
| 语句 statements | 每条可执行语句有没有跑过 | 跑到了，结果没断言 |
| 行 lines | 源文件每一行有没有执行 | 一行多条语句只算一次 |
| 函数 functions | 每个函数有没有被调用 | 调用一次就覆盖整个函数 |
| 分支 branches | `if`/`else`、三元、`||`、`&&`、`switch` 的每个走向 | 最难做满，也最能暴露漏测 |

分支覆盖通常比行覆盖低十几个点，差额就是那些没测的错误分支。看报告时先看分支，它比另外三个更接近「逻辑有没有测全」。

阈值不要一口气定到 90。先跑一次拿到当前数字，在此基础上加两三个点，让它随着改动慢慢往上走。定一个做不到的数，结果就是长期红着，最后所有人都无视它。

## v8 与 istanbul

`provider: 'v8'` 用 V8 引擎自带的覆盖信息，不插桩，跑得快，开销小。它统计的是字节码层面的执行情况，要靠 source map 映回 TS 源码，映射不准时代码行会偏移。

`provider: 'istanbul'` 在转换阶段往代码里插计数，分支的统计更贴源码，代价是构建变慢、产物变大。

默认选 v8。发现分支数明显不对劲(比如一个三元的两个分支都标成已覆盖)，再换 istanbul 对照一次。两条命令对比一遍，比看文档猜要快。

## 覆盖率不等于质量

一条什么都不检查的用例，能把覆盖率刷到 100%:

```ts
// 覆盖了 calcTotal 的每一行,但什么都没验证
it('计算总价', () => {
  calcTotal([{ price: 100, qty: 2 }])
})
```

函数被调用了，行被执行了，分支可能也走过了，只要参数凑得巧。把 `qty` 写成 `qty * 2`，这条用例照样绿。

所以覆盖率的正确用法是「发现没测到的地方」，不是「证明测过了」。看报告时找那些标红的分支： 错误处理的 `catch`、边界判断的 `else`、空数组的兜底。这些地方最容易藏 bug。

想让指标更硬一点，可以上变异测试： 工具自动把 `>` 改成 `>=`、把 `+` 改成 `-`，看有多少条用例能发现。存活率高说明断言太弱。这项跑得慢，一般放在夜间任务里，不进门禁。

## 只跑改动相关的用例

全量跑几百条用例要几分钟，本地改一行等不起。Vitest 的 `--changed` 会读 git 的改动，顺着模块依赖找出受影响的用例：

```bash
npx vitest --changed            # 相对 HEAD 的未提交改动
npx vitest --changed HEAD~1     # 相对上一次提交
npx vitest related src/utils/price.ts   # 指定文件的下游用例
```

它依赖 git，浅克隆的 CI 里历史不全，判断会失灵。所以这个开关只适合本地开发，CI 仍然跑全量。

`--changed` 的盲区也值得记： 改的是类型定义、CSS、mock 数据、环境变量时，依赖图上看不出影响，相关用例不会被选中。改这类文件就老实跑全量。

## CI 里跑什么

一个够用的流水线分三个 job，并行执行：

```yaml
name: test
on: [push, pull_request]

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint . --max-warnings=0

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage

  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/3
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: trace-${{ matrix.shard }}
          path: test-results/
```

几点是必须的：

- `npm ci` 而不是 `npm install`，按 lockfile 精确安装，不会在 CI 上悄悄升级依赖；
- `cache: npm` 缓存下载目录，省掉每次几十秒的下载。缓存键跟着 lockfile 走，依赖没变才命中；
- `--max-warnings=0` 把警告当错误，否则 `warn` 级别的规则等于没开，细节见第 10 章那篇讲 ESLint 的；
- 端到端拆成多个 shard 并行跑，`fail-fast: false` 让一片失败不影响其他片出结果；
- 失败时上传 trace 与截图，不然只有一行「超时」。

覆盖率阈值挂在 `thresholds` 上，不达标时 `vitest run --coverage` 直接以非零码退出，job 就红了。这比把报告传到某个平台再人工看有效得多。

## 重试会掩盖 flaky

流水线红了，最常见的处理是加 `retries: 2`。加上之后确实绿了，但问题没消失，只是被藏起来了。Playwright 的语义是： 第一次失败、重试通过，标记为 flaky，整轮仍然算通过。

flaky 的代价是信任。一条偶尔失败的用例，两周之后所有人的第一反应都是「重跑一下」，真的回归也会被重跑过去。等它连续绿了三次，谁也不知道哪次是真的。

可以保留重试，但要配两件事：

- 把 flaky 数作为指标看着，每周清零一批，而不是让它长期存在；
- 失败时保留 trace 与视频，顺着时间轴找到哪一步不稳定。成因多半是等错了元素、依赖了顺序、或者数据被别人改过。

只重试不加观测，等于把报警器拆了。

## 几个常见的坑

- 阈值定太高： 90% 的目标定在只测了 60% 的项目上，第一天就红，一周后有人注释掉整段 `thresholds`。
- 排除目录写太宽： `exclude: ['src/**']` 之类的手滑，覆盖率变成 100%，报告里一行代码都没有。
- 缓存键不带 lockfile: 依赖升级后仍然命中旧缓存，CI 装的是上一版包，本地复现不出来。
- 只在 PR 上跑 lint: 合并到主干后发现整个仓库红了，回滚成本比在 PR 上拦一下高得多。
- 报告只在 CI 里： 本地想知道哪一行没测到，还得等 CI 跑完。`npx vitest run --coverage` 一条命令的事。
- 把覆盖率当 review 结论： 「覆盖率 85%，可以合」这句话没有信息量。该看的是新增代码有没有测、错误分支有没有测。

## 小结

- 覆盖率分语句、行、函数、分支四个口径，先看分支；
- 阈值从现状往上加两三个点，别定一个长期做不到的数；
- 覆盖率只证明代码被执行，不证明结果被断言；
- `--changed` 适合本地，CI 跑全量；
- CI 分静态检查、单元、端到端三个并行 job,`npm ci` 加依赖缓存；
- 重试可以让流水线变绿，但要把 flaky 单独统计，别让它变成常态。
