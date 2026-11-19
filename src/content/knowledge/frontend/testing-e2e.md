---
title: 端到端：Playwright
summary: '端到端在真浏览器里跑打包产物,验证路由、登录、跨页跳转这些 jsdom 看不到的东西。Playwright 的价值在自动等待:动作前检查元素可见、稳定、可交互,断言失败会反复重试到超时,所以代码里不该出现 waitForTimeout。登录态用 storageState 存一次复用,调试看 trace,慢用 --shard 拆到多台机器。'
category: frontend
node: frontend-testing-e2e
order: 94
level: 进阶
tags: [Playwright, 端到端, storageState, trace, 分片]
updated: 2026-11-19
mindmap: testing-e2e.mindmap.json
terms: []
sources:
  - title: Playwright · Auto-waiting
    url: https://playwright.dev/docs/actionability
    note: 动作执行前的可见、稳定、可交互检查清单。
  - title: Playwright · Authentication
    url: https://playwright.dev/docs/auth
    note: storageState 保存与复用登录态,以及 setup 项目的写法。
  - title: Playwright · Sharding
    url: https://playwright.dev/docs/test-sharding
    note: --shard 参数与多机并行的组织方式。
---

上一篇的组件测试跑在 jsdom 里,路由是假的、请求是假的、样式布局也几乎不算。真机上才会出现的问题,比如打包后某个 chunk 404、登录态续期失败、浏览器后退白屏,只能开真浏览器跑一遍。这一篇讲这条路怎么铺得稳。

## 端到端到底跑什么

一条真实的链路: 打开地址、点登录、跳转、提交表单、看到结果。中间不允许有任何替身,后端要么是测试环境,要么是本地起的一套 mock 服务。

代价是慢和贵。一条用例几百毫秒到几秒,失败时你手上只有一张截图,得回放才知道哪一步错了。所以这一层只覆盖主路径: 登录、下单与支付、权限校验这几条。分支逻辑交给下面两层,见第 16 章第一篇。

要跑打包产物,而不是 `npm run dev`。开发服务器的模块按需编译,产物里的代码分割、资源指纹、环境变量替换一个都没生效,这个差别正好藏 bug。

## 定位器

和 Testing Library 一样,优先用无障碍语义定位: `page.getByRole('button', { name: '提交订单' })`、`getByLabel('邮箱')`、`getByPlaceholder()`、`getByText()`、`getByTestId()`。CSS 选择器和 XPath 是最后手段,它们和 DOM 结构绑死,改一层布局就全废。

`getByRole` 的 `name` 匹配可访问名称,支持正则。页面上有多个同名按钮时,Playwright 默认开启严格模式: 定位器命中多个元素时直接报 `strict mode violation`,不会随便挑一个。这比「悄悄点了第一个」友好得多。

处理办法是把范围收窄,而不是加 `.first()` 糊过去:

```ts
// 报错: 命中 2 个「删除」
await page.getByRole('button', { name: '删除' }).click()

// OK: 先定位到那一行,再在行内找
const row = page.getByRole('row', { name: /耳机/ })
await row.getByRole('button', { name: '删除' }).click()
```

## 自动等待

Playwright 的每个动作执行前都会做一组检查,任何一项不满足就重试,直到超时:

| 检查 | 含义 |
| --- | --- |
| visible | 元素有非空尺寸,且不是 `visibility: hidden` |
| stable | 连续两帧位置没变,动画停下了 |
| receives events | 该点上没有被别的元素盖住 |
| enabled | 不是 `disabled` 状态 |
| editable | 输入类元素可编辑 |

断言也有同样的机制,叫 web-first assertion:

```ts
// 会重试到 5 秒超时
await expect(page.getByText('下单成功')).toBeVisible()
await expect(page.getByRole('heading')).toHaveText('确认订单')

// 只取一次,拿到什么就是什么
expect(await page.getByRole('heading').textContent()).toBe('确认订单')
```

第二种写法在页面还没渲染完时拿到空字符串,直接失败,而且不会重试。`textContent()`、`isVisible()`、`count()` 这类取值方法都不等待,要配 `expect(locator)` 的形式才有重试。

## 登录态复用

每条用例都走一遍登录,既慢又容易在登录页上翻车。做法是先跑一个 setup 项目,把 cookie 与 localStorage 存进文件,其余项目直接加载。

```ts
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'

setup('登录并保存状态', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('邮箱').fill('qa@example.com')
  await page.getByLabel('密码').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByRole('heading', { name: '控制台' })).toBeVisible()
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

`storageState` 存的是 cookie 与 localStorage,sessionStorage 不在里面。应用如果把 token 放 sessionStorage,这套复用不生效,得在 setup 项目里改成注入初始化脚本。

`webServer` 让 Playwright 自己起服务,起来之后才跑用例,跑完自动关。`reuseExistingServer` 只在本地为真,复用手动起的那个进程,省去反复构建。

## 调试

```bash
npx playwright test --ui              # 本地可视化,可单步、可看 DOM 快照
npx playwright test --headed          # 看着浏览器跑
npx playwright codegen http://localhost:4173   # 录制操作,生成定位器
npx playwright show-trace test-results/xxx/trace.zip
```

`trace` 是最有用的一个。它记录了每一步的 DOM 快照、网络请求、控制台输出和时间轴,失败时能倒回任意一步看当时页面长什么样。配置成 `on-first-retry`,只在重试时录,不拖慢正常跑。

trace 文件会占空间,CI 上记得作为产物上传,否则失败信息里只有一个「超时」。

## 并行与分片

Playwright 默认按文件并行,一个文件里的用例串行。`workers` 控制并发数,本地默认是核数的一半,CI 上按机器来。

用例多到单机跑不完时,用 `--shard` 拆开:

```bash
npx playwright test --shard=1/3
npx playwright test --shard=2/3
npx playwright test --shard=3/3
```

三个 job 并行,每个只跑三分之一。分片按文件切,所以用例分布要均匀。一个文件里塞了 200 条用例,它就会成为木桶最短的那块板。CI 里用矩阵跑这三个 job,见第 16 章讲 CI 门禁那篇。

## 几个常见的坑

- `waitForTimeout`: 代码里出现 `await page.waitForTimeout(2000)`,说明在拿固定睡眠赌加载时间。机器快就白等,机器慢还是红。换成对目标状态的断言。
- 用 `isVisible()` 做等待: 它立刻返回当前状态,元素还没出现就是 `false`,不会重试。要等就用 `expect(locator).toBeVisible()`。
- 严格模式撞上多个元素: 报 `strict mode violation`,把定位器收窄到具体的行、卡片或对话框,不要加 `.first()` 糊过去。
- 用例互相依赖: 上一条建了订单,下一条去查。Playwright 默认每条用例一个新 context,顺序一改就全崩。需要串行的场景显式用 `test.describe.serial`,并接受它不能分片。
- 只在本地绿的用例: 本地连的是 dev 服务器,CI 起的是 preview 产物,路由回退、资源路径的差异会让一批用例只在 CI 红。两边跑同一份产物。
- 忘了装浏览器: CI 上报 `Executable doesn't exist`,要先跑 `npx playwright install --with-deps chromium`。

## 小结

- 端到端只覆盖主路径,分支逻辑留在下面两层;
- 跑打包产物,不要跑开发服务器;
- 定位器按 role 与 label 写,CSS 选择器是兜底;
- 动作与断言都自带重试,`waitForTimeout` 基本没有正当理由;
- 登录态用 `storageState` 存一次,setup 项目加 `dependencies` 复用;
- 失败先看 trace,慢就用 `--shard` 拆到多台机器。
