---
title: 单元测试：Vitest
summary: 'Vitest 复用 Vite 的转换管线,TypeScript 与 ESM 不用额外配置,断言与 describe/it 的写法基本沿用 Jest。配置里唯一要动的是 environment: 只测纯逻辑用 node,碰 DOM 才换 jsdom 或 happy-dom。vi.mock 会被提升到 import 之前执行,引用外部变量要包一层 vi.hoisted,否则报初始化前访问。'
category: frontend
node: frontend-testing-unit
order: 92
level: 进阶
tags: [Vitest, 单元测试, vi.mock, jsdom]
updated: 2026-11-19
mindmap: testing-unit.mindmap.json
terms: []
sources:
  - title: Vitest · Getting Started
    url: https://vitest.dev/guide/
    note: 安装、配置文件位置与 test 字段的基本写法。
  - title: Vitest · Mocking
    url: https://vitest.dev/guide/mocking.html
    note: vi.mock 的提升规则、vi.hoisted 与自动 mock 的行为。
  - title: Vitest · Test Environment
    url: https://vitest.dev/guide/environment.html
    note: node、jsdom、happy-dom 三种环境的差异与切换方式。
---

上一篇把大部分用例压在单元测试这一层,理由是毫秒级、失败定位准。这一篇把工具搭起来,顺便讲清几处容易踩的默认行为,尤其是 `vi.mock` 到底在什么时候执行。

## 与 Jest 的关系

Vitest 的 API 照着 Jest 长,迁移时大多数代码不用改。差别集中在全局对象的命名与模块加载方式:

| Jest | Vitest | 说明 |
| --- | --- | --- |
| `jest.fn()` | `vi.fn()` | 造一个假函数 |
| `jest.mock('./x')` | `vi.mock('./x')` | 模块级 mock |
| `jest.spyOn(o, 'm')` | `vi.spyOn(o, 'm')` | 只替换一个方法 |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | 接管定时器 |
| `jest.requireActual()` | `await vi.importActual()` | 取真实实现 |
| `describe` / `it` / `expect` | 同名 | 语义一致 |

真正省事的地方在模块加载。Vitest 直接复用 Vite 的转换管线,`.ts`、`.tsx`、路径别名、CSS 导入这些东西开箱可用;Jest 要配 `ts-jest` 或 babel,要写 `moduleNameMapper`,ESM 还得开实验开关。所以新项目基本不用犹豫,老项目如果 Jest 已经跑得稳,也没有非换不可的理由。

```bash
npm install -D vitest @vitest/coverage-v8
npx vitest run        # 跑一遍就退出,CI 用这个
npx vitest            # 监听模式,本地开发用
```

`vitest` 默认是监听模式,`package.json` 里的 `test` 脚本记得写 `vitest run`,否则 CI 会一直挂着等文件变化。

## 配置文件

配置写在 `vite.config.ts` 里也行,单独放 `vitest.config.ts` 更清楚:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
  },
})
```

`clearMocks` 让每个用例开始前清空 `mock.calls`,`mockReturnValue` 之类的实现保留。需要连实现一起重置时用 `mockReset`。这两个开关不打开,上一个用例设的返回值会漏到下一个用例,红的地方看着莫名其妙。

## 运行环境

默认是 `node`,没有 `window`、`document`。要测组件或碰 DOM 的代码才换环境:

| 环境 | 提供什么 | 速度 | 适用 |
| --- | --- | --- | --- |
| `node` | 只有 Node 的全局对象 | 最快 | 工具函数、数据转换、状态逻辑 |
| `jsdom` | 较完整的 DOM 与部分浏览器 API | 慢,启动要几百毫秒 | 需要贴近浏览器行为的组件测试 |
| `happy-dom` | 轻量 DOM 实现 | 比 jsdom 快 | 组件测试,对边界行为要求不高 |

可以在配置里全局设,也可以只给某个文件换,在文件第一行写 `// @vitest-environment jsdom` 即可。注释必须写在第一行,写在 import 之后就失效了。写了 `environment: 'node'` 却在测试里读 `document.title`,报的是 `ReferenceError: document is not defined`,和被测代码看起来毫无关系。

## 用例组织

```ts
import { describe, it, expect } from 'vitest'
import { subtotal } from './price'

describe('subtotal', () => {
  it.each([
    { qty: 1, unit: 100, total: 100 },
    { qty: 3, unit: 100, total: 270 },   // 满 3 件 9 折
    { qty: 0, unit: 100, total: 0 },
  ])('qty=$qty 时总价 $total', ({ qty, unit, total }) => {
    expect(subtotal(qty, unit)).toBe(total)
  })

  it('数量为负时抛错', () => {
    expect(() => subtotal(-1, 100)).toThrow(/数量/)
  })
})
```

`it.each` 把一组数据展开成多条用例,失败时标题里带着是哪组参数,比在循环里 `it` 好查。`toThrow` 要传函数而不是调用结果,写成 `expect(subtotal(-1, 100)).toThrow()` 会因为先抛出来而直接让用例崩掉。

异步用例只做一件事: 记得 `await`。

```ts
// 错的:没有 await,断言在 Promise 上,永远绿
it('取用户', () => {
  expect(getUser(1)).resolves.toMatchObject({ id: 1 })
})

// 对的
it('取用户', async () => {
  await expect(getUser(1)).resolves.toMatchObject({ id: 1 })
})
```

第一种写法不会报错,只是什么都不检查。Vitest 的 `expect` 有 `expect.hasAssertions()` 和配置项 `expect.assertions(n)`,对这类用例可以兜一层。

## vi.mock 会被提升

`vi.mock` 的调用在编译时被移到所有 `import` 之上。这样写是对的:

```ts
import { vi, test, expect } from 'vitest'
import { getUser } from './user'
import { fetchJSON } from './http'

vi.mock('./http')   // 实际执行在 import 之前

test('取用户', async () => {
  vi.mocked(fetchJSON).mockResolvedValue({ id: 1, name: 'Ann' })
  await expect(getUser(1)).resolves.toMatchObject({ name: 'Ann' })
})
```

不传工厂函数时是自动 mock: 模块里所有导出都变成假函数,返回值是 `undefined`。所以要给每个用到的方法设返回值,漏一个就会在没提示的地方拿到 `undefined`。

需要引用外部变量时,工厂函数也在提升后的位置执行,直接引用 `const` 会撞上暂时性死区:

```ts
// 报错: Cannot access 'send' before initialization
const send = vi.fn()
vi.mock('./mailer', () => ({ send }))

// 正确: 用 vi.hoisted 把声明也提上去
const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('./mailer', () => ({ send }))
```

只替换一个方法、其余保持真实实现时,用 `vi.spyOn(mailer, 'send').mockResolvedValue(undefined)` 更省事,它不需要理解模块结构。

`vi.spyOn` 打模块的命名导出只在 Node 环境成立,Browser Mode 下无效,得改回 `vi.mock`。模块级替换用 `vi.mock`,单对象上的方法用 `vi.spyOn`,这条分界线基本能避开问题。

## 快照的维护成本

`expect(renderReceipt(order)).toMatchSnapshot()` 第一次跑会生成 `__snapshots__/receipt.test.ts.snap`,内容由机器写入。问题在评审: 几十行 HTML 贴在 PR 里,没人逐字看,点个 approving 就过了。之后每次改动样式,快照全部失败,有人一把 `vitest -u` 更新,里面混进去的真实回归也就一起被抹掉。

快照适合结构稳定、体积小、人能扫一眼的东西: 错误对象的形状、配置合并的结果。不适合整页 HTML。要留在组件里用,`toMatchInlineSnapshot` 把期望值写回测试文件,至少 review 时能看见 diff。

## 几个常见的坑

- 环境不对: 在 `node` 环境里测组件,报 `document is not defined`;反过来在 jsdom 里测纯函数,每条用例白等几百毫秒。
- mock 没清: 上一个用例 `mockReturnValue(true)`,这个用例期望 `false`,拿到的是 `true`。开 `clearMocks`,或在 `beforeEach` 里手动清。
- 假定时器没还原: `vi.useFakeTimers()` 之后忘了 `vi.useRealTimers()`,后面的 `await` 全部卡住,测试超时。
- 测到了私有实现: 导出只为了测试而改可见性,说明这层逻辑本该单独抽成模块。

## 小结

- Vitest 复用 Vite 的转换,TS、ESM、别名不用额外配置,API 与 Jest 基本兼容;
- `vitest run` 跑一次就退出,监听模式只留给本地;
- 纯逻辑用 `node`,碰 DOM 才换 `jsdom` 或 `happy-dom`,别全局开;
- `vi.mock` 提升到 `import` 之前,引用外部变量要包 `vi.hoisted`;
- 异步断言务必 `await`,漏掉不会报错,只会永远绿;
- 快照只留给小而稳定的结构,整页 HTML 的快照没人真的 review。
